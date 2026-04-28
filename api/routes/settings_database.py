import io
import json
import zipfile
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..core.auth import require_admin
from ..core.db_helpers import get_db_connection
from ..schemas.user import UserOut


settings_database_router = APIRouter(prefix="/settings/database", tags=["settings"])

# Tables to include in backup, in dependency-safe order for restore.
_BACKUP_TABLES = [
    "roles",
    "users",
    "user_signup_requests",
    "vehicles",
    "listings",
    "scores",
    "contact_types",
    "contacts",
    "contact_activities",
    "lead_sources",
    "lead_statuses",
    "leads",
    "lead_activities",
    "lead_vehicles",
    "deal_stages",
    "deal_categories",
    "deals",
    "deal_activities",
    "deal_vehicles",
    "task_priorities",
    "task_statuses",
    "task_boards",
    "task_columns",
    "tasks",
    "task_activity",
    "email_templates",
    "communications",
    "event_outbox",
    "accu_trade_data",
    "mmr_data",
    "condition_reports",
]


def _json_default(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serialisable")


def _table_exists(cur, table: str) -> bool:
    cur.execute(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = %s",
        (table,),
    )
    return cur.fetchone() is not None


def _dump_table(cur, table: str) -> list[dict]:
    cur.execute(f"SELECT * FROM {table}")  # noqa: S608 – admin-only internal route
    cols = [desc[0] for desc in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _get_primary_keys(cur, table: str) -> list[str]:
    cur.execute(
        """
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = %s
        ORDER BY kcu.ordinal_position
        """,
        (table,),
    )
    return [row[0] for row in cur.fetchall()]


def _upsert_rows(cur, table: str, rows: list[dict], pk_cols: list[str]) -> int:
    if not rows:
        return 0

    cols = list(rows[0].keys())
    col_list = ", ".join(f'"{c}"' for c in cols)
    placeholders = ", ".join("%s" for _ in cols)

    if pk_cols:
        conflict_target = ", ".join(f'"{c}"' for c in pk_cols)
        update_set = ", ".join(
            f'"{c}" = EXCLUDED."{c}"' for c in cols if c not in pk_cols
        )
        if update_set:
            conflict_clause = (
                f"ON CONFLICT ({conflict_target}) DO UPDATE SET {update_set}"
            )
        else:
            conflict_clause = f"ON CONFLICT ({conflict_target}) DO NOTHING"
    else:
        conflict_clause = ""

    sql = (
        f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) {conflict_clause}'
    )

    count = 0
    for row in rows:
        values = []
        for col in cols:
            v = row[col]
            # Re-serialise list/dict values that were round-tripped through JSON
            if isinstance(v, (list, dict)):
                v = json.dumps(v)
            values.append(v)
        cur.execute(sql, values)
        count += 1
    return count


@settings_database_router.get("/backup")
def backup_database(_: UserOut = Depends(require_admin)):
    with get_db_connection() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection unavailable")

        zip_buffer = io.BytesIO()
        table_counts: dict[str, int] = {}

        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            with conn.cursor() as cur:
                for table in _BACKUP_TABLES:
                    if not _table_exists(cur, table):
                        continue
                    rows = _dump_table(cur, table)
                    table_counts[table] = len(rows)
                    zf.writestr(
                        f"{table}.json",
                        json.dumps(rows, default=_json_default, ensure_ascii=False, indent=2),
                    )

            # Write a manifest so restore can validate the archive
            manifest = {
                "created_at": datetime.utcnow().isoformat(),
                "tables": table_counts,
                "version": 1,
            }
            zf.writestr("manifest.json", json.dumps(manifest, indent=2))

    zip_buffer.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"database_backup_{timestamp}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@settings_database_router.post("/restore")
async def restore_database(
    backup_file: UploadFile = File(...),
    _: UserOut = Depends(require_admin),
):
    file_name = (backup_file.filename or "").lower()
    if not file_name.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip backup files are supported")

    file_bytes = await backup_file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        zf = zipfile.ZipFile(io.BytesIO(file_bytes))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file")

    zip_names = zf.namelist()
    if "manifest.json" not in zip_names:
        raise HTTPException(
            status_code=400,
            detail="Invalid backup archive: manifest.json not found",
        )

    manifest = json.loads(zf.read("manifest.json"))
    if manifest.get("version") != 1:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported backup version: {manifest.get('version')}",
        )

    restore_summary: dict[str, int] = {}
    errors: list[str] = []

    with get_db_connection() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection unavailable")

        with conn.cursor() as cur:
            for table in _BACKUP_TABLES:
                entry = f"{table}.json"
                if entry not in zip_names:
                    continue
                try:
                    rows = json.loads(zf.read(entry))
                    if not rows:
                        restore_summary[table] = 0
                        continue
                    if not _table_exists(cur, table):
                        errors.append(f"{table}: table does not exist, skipped")
                        continue
                    pk_cols = _get_primary_keys(cur, table)
                    count = _upsert_rows(cur, table, rows, pk_cols)
                    restore_summary[table] = count
                except Exception as exc:
                    errors.append(f"{table}: {exc}")

    return {
        "message": "Database restore completed",
        "restored": restore_summary,
        "errors": errors,
    }
