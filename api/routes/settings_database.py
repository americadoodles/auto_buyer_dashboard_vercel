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


def _get_column_types(cur, table: str) -> dict[str, str]:
    """
    Return {column_name: udt_name} for the given table.
    udt_name examples: 'jsonb', 'json', '_text' (text[]), '_int4' (int[]), 'text', 'int4', ...
    Array types always have a udt_name starting with '_'.
    """
    cur.execute(
        """
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table,),
    )
    return {row[0]: row[1] for row in cur.fetchall()}


# Constraint info passed between helpers.
# is_constraint=True  → real pg_constraint  → use ON CONFLICT ON CONSTRAINT name
# is_constraint=False → expression index    → use ON CONFLICT (expression)
from typing import TypedDict


class _ConstraintInfo(TypedDict):
    name: str
    cols: list[str]        # empty for expression-based indexes
    is_constraint: bool
    expression: str | None # e.g. 'lower(name)' — only set when is_constraint=False


def _get_all_constraints(cur, table: str) -> list[_ConstraintInfo]:
    """
    Return constraint/index info for the PK and all UNIQUE constraints/indexes on
    the table, ordered PK-first.

    Distinguishes between:
    - Real pg_constraint entries (PRIMARY KEY, UNIQUE constraint): use
      ON CONFLICT ON CONSTRAINT <name>.
    - Expression-based unique indexes created with CREATE UNIQUE INDEX that are NOT
      backed by a pg_constraint (e.g. CREATE UNIQUE INDEX ... ON t (lower(name))):
      use ON CONFLICT (<expression>).
    """
    result: list[_ConstraintInfo] = []

    # ── Real constraints (PRIMARY KEY + UNIQUE) ──────────────────────────────
    cur.execute(
        """
        SELECT c.conname,
               c.contype,
               array_agg(a.attname ORDER BY pos.ord) AS cols
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS pos(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = t.oid AND a.attnum = pos.attnum
        WHERE n.nspname = 'public'
          AND t.relname = %s
          AND c.contype IN ('p', 'u')
        GROUP BY c.conname, c.contype
        ORDER BY c.contype,   -- 'p' (primary key) < 'u' (unique)
                 c.conname
        """,
        (table,),
    )
    for conname, _contype, cols in cur.fetchall():
        result.append(
            _ConstraintInfo(
                name=conname,
                cols=list(cols),
                is_constraint=True,
                expression=None,
            )
        )

    # ── Expression-based unique indexes (no backing pg_constraint) ───────────
    cur.execute(
        """
        SELECT i.relname,
               pg_get_expr(ix.indexprs, ix.indrelid) AS expr
        FROM pg_index ix
        JOIN pg_class t  ON t.oid  = ix.indrelid
        JOIN pg_class i  ON i.oid  = ix.indexrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = %s
          AND ix.indisunique  = true
          AND ix.indisprimary = false
          AND ix.indexprs IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM pg_constraint c
              WHERE c.conindid = ix.indexrelid
          )
        ORDER BY i.relname
        """,
        (table,),
    )
    for index_name, expr in cur.fetchall():
        result.append(
            _ConstraintInfo(
                name=index_name,
                cols=[],
                is_constraint=False,
                expression=expr,
            )
        )

    return result


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


def _upsert_rows(
    cur,
    table: str,
    rows: list[dict],
    pk_cols: list[str],
    col_types: dict[str, str] | None = None,
    all_constraints: list["_ConstraintInfo"] | None = None,
) -> tuple[int, list[str]]:
    if not rows:
        return 0, []

    # Filter backup columns to only those that actually exist in the target table.
    all_backup_cols = list(rows[0].keys())
    cols = [c for c in all_backup_cols if c in col_types] if col_types else all_backup_cols

    if not cols:
        return 0, ["no matching columns found in target table"]

    col_list = ", ".join(f'"{c}"' for c in cols)
    placeholders = ", ".join("%s" for _ in cols)

    def _build_sql(ci: "_ConstraintInfo", is_pk: bool) -> str | None:
        """
        Build an upsert statement for a given constraint/index.

        - Real constraints  → ON CONFLICT ON CONSTRAINT <name>
        - Expression indexes → ON CONFLICT (<expression>)

        When the conflict target is NOT the PK, pk columns are excluded from the
        DO UPDATE SET list to prevent secondary PK violations.
        Returns None when insufficient info is available to build the clause.
        """
        excluded_from_update = set(pk_cols) if not is_pk else set()
        update_set = ", ".join(
            f'"{c}" = EXCLUDED."{c}"'
            for c in cols
            if c not in excluded_from_update
        )
        do_clause = f"DO UPDATE SET {update_set}" if update_set else "DO NOTHING"

        if ci["is_constraint"]:
            conflict_clause = f"ON CONFLICT ON CONSTRAINT {ci['name']} {do_clause}"
        elif ci["expression"]:
            conflict_clause = f"ON CONFLICT ({ci['expression']}) {do_clause}"
        else:
            return None  # Cannot build a safe conflict clause

        return f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) {conflict_clause}'

    # Build ordered list of SQL strategies. PK-backed constraint first so that
    # an exact id match is handled without touching other unique columns.
    pk_constraint_names = {
        ci["name"]
        for ci in (all_constraints or [])
        if ci["cols"] and set(ci["cols"]) == set(pk_cols)
    }
    sqls: list[str] = []
    for ci in (all_constraints or []):
        is_pk = ci["name"] in pk_constraint_names
        sql = _build_sql(ci, is_pk)
        if sql:
            sqls.append(sql)

    if not sqls:
        # No constraints found – fall back to plain INSERT (best-effort)
        sqls = [f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})']

    try:
        is_autocommit = bool(getattr(cur.connection, "autocommit", True))
    except Exception:
        is_autocommit = True

    count = 0
    row_errors: list[str] = []

    for i, row in enumerate(rows):
        values = [
            _serialize_value(row.get(col), (col_types or {}).get(col, ""))
            for col in cols
        ]

        inserted = False
        last_error: Exception | None = None

        for sql in sqls:
            try:
                if not is_autocommit:
                    cur.execute("SAVEPOINT _restore_row")
                cur.execute(sql, values)
                if not is_autocommit:
                    cur.execute("RELEASE SAVEPOINT _restore_row")
                count += 1
                inserted = True
                break
            except Exception as e:
                last_error = e
                if not is_autocommit:
                    try:
                        cur.execute("ROLLBACK TO SAVEPOINT _restore_row")
                    except Exception:
                        pass

        if not inserted:
            if last_error is not None:
                row_errors.append(f"row {i + 1}: {last_error}")
            if not is_autocommit:
                try:
                    cur.execute("RELEASE SAVEPOINT _restore_row")
                except Exception:
                    pass

    return count, row_errors


def _serialize_value(v: object, udt_name: str) -> object:
    """
    Prepare a Python value for insertion via psycopg3.

    - dict  → always json.dumps (targets jsonb/json columns)
    - list  → json.dumps ONLY for jsonb/json columns;
              pass as a Python list for PostgreSQL array columns (text[], int[], etc.)
              so psycopg3's array dumper handles the correct wire format.
    """
    if isinstance(v, dict):
        return json.dumps(v)
    if isinstance(v, list):
        if udt_name in ("json", "jsonb"):
            return json.dumps(v)
        # Array column (udt_name starts with '_', e.g. '_text', '_int4'):
        # return as Python list — psycopg3 adapts it to the correct array literal.
        return v
    return v


def _insert_rows(
    cur,
    table: str,
    rows: list[dict],
    col_types: dict[str, str] | None = None,
) -> tuple[int, list[str]]:
    """
    Plain INSERT — no conflict handling.
    Use this after the target table has been pre-cleared so that exact IDs
    from the backup are preserved.
    """
    if not rows:
        return 0, []

    all_backup_cols = list(rows[0].keys())
    cols = [c for c in all_backup_cols if c in col_types] if col_types else all_backup_cols

    if not cols:
        return 0, ["no matching columns found in target table"]

    col_list = ", ".join(f'"{c}"' for c in cols)
    placeholders = ", ".join("%s" for _ in cols)
    sql = f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})'

    try:
        is_autocommit = bool(getattr(cur.connection, "autocommit", True))
    except Exception:
        is_autocommit = True

    count = 0
    row_errors: list[str] = []
    for i, row in enumerate(rows):
        values = [
            _serialize_value(row.get(col), (col_types or {}).get(col, ""))
            for col in cols
        ]
        try:
            if not is_autocommit:
                cur.execute("SAVEPOINT _restore_row")
            cur.execute(sql, values)
            if not is_autocommit:
                cur.execute("RELEASE SAVEPOINT _restore_row")
            count += 1
        except Exception as e:
            row_errors.append(f"row {i + 1}: {e}")
            if not is_autocommit:
                try:
                    cur.execute("ROLLBACK TO SAVEPOINT _restore_row")
                    cur.execute("RELEASE SAVEPOINT _restore_row")
                except Exception:
                    pass
    return count, row_errors


def _reset_sequences(cur, table: str, pk_cols: list[str]) -> None:
    """Reset serial sequences to max(id) so future inserts do not collide."""
    for col in pk_cols:
        try:
            cur.execute("SELECT pg_get_serial_sequence(%s, %s)", (table, col))
            result = cur.fetchone()
            if not result or not result[0]:
                continue  # No sequence (e.g. UUID primary keys)
            seq = result[0]
            cur.execute(
                f'SELECT setval(%s, COALESCE((SELECT MAX("{col}") FROM "{table}"), 1))',
                (seq,),
            )
        except Exception:
            pass  # Non-fatal – sequences may not exist for all pk types


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


def _sse_event(event: str, data: dict) -> str:
    """Format a Server-Sent Events message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@settings_database_router.post("/restore")
async def restore_database(
    backup_file: UploadFile = File(...),
    _: UserOut = Depends(require_admin),
):
    """
    Restore database from a .zip backup.

    Returns a text/event-stream (SSE) response so the client can display
    live progress.  Event types emitted:

    - ``progress``  {"stage": "delete"|"insert", "table": str, "total": int, "current": int}
    - ``table_done`` {"table": str, "rows": int, "errors": [...]}
    - ``done``       {"restored": {...}, "errors": [...]}
    - ``error``      {"detail": str}
    """
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
        raise HTTPException(status_code=400, detail="Invalid backup archive: manifest.json not found")

    manifest = json.loads(zf.read("manifest.json"))
    if manifest.get("version") != 1:
        raise HTTPException(status_code=400, detail=f"Unsupported backup version: {manifest.get('version')}")

    # Pre-load all backup rows before streaming starts.
    backup_data: dict[str, list[dict]] = {}
    tables_to_restore: list[str] = []
    for table in _BACKUP_TABLES:
        entry = f"{table}.json"
        if entry in zip_names:
            backup_data[table] = json.loads(zf.read(entry))
            tables_to_restore.append(table)

    async def _stream():
        restore_summary: dict[str, int] = {}
        all_errors: list[str] = []
        total = len(tables_to_restore)

        with get_db_connection() as conn:
            if not conn:
                yield _sse_event("error", {"detail": "Database connection unavailable"})
                return

            original_autocommit = getattr(conn, "autocommit", True)

            try:
                conn.autocommit = False

                with conn.cursor() as cur:
                    # ── Phase 1: delete in reverse FK order ──────────────────
                    for i, table in enumerate(reversed(tables_to_restore), 1):
                        yield _sse_event("progress", {
                            "stage": "delete",
                            "table": table,
                            "current": i,
                            "total": total,
                        })
                        if not _table_exists(cur, table):
                            raise RuntimeError(
                                f'{table}: table does not exist in target database'
                            )
                        cur.execute(f'DELETE FROM "{table}"')

                    # ── Phase 2: insert with exact IDs from backup ───────────
                    for i, table in enumerate(tables_to_restore, 1):
                        rows = backup_data[table]
                        yield _sse_event("progress", {
                            "stage": "insert",
                            "table": table,
                            "current": i,
                            "total": total,
                        })
                        if not _table_exists(cur, table):
                            raise RuntimeError(
                                f'{table}: table does not exist in target database'
                            )
                        if not rows:
                            restore_summary[table] = 0
                            yield _sse_event("table_done", {"table": table, "rows": 0, "errors": []})
                            continue

                        col_types = _get_column_types(cur, table)
                        count, row_errors = _insert_rows(cur, table, rows, col_types)
                        if row_errors:
                            first_error = row_errors[0]
                            raise RuntimeError(
                                f"{table}: restore failed with {len(row_errors)} row error(s); {first_error}"
                            )

                        restore_summary[table] = count
                        pk_cols = _get_primary_keys(cur, table)
                        _reset_sequences(cur, table, pk_cols)
                        yield _sse_event("table_done", {
                            "table": table,
                            "rows": count,
                            "errors": [],
                        })

                conn.commit()
            except Exception as exc:
                detail = str(exc)
                all_errors.append(detail)
                try:
                    conn.rollback()
                except Exception:
                    pass
                yield _sse_event("error", {"detail": detail})
                yield _sse_event("done", {
                    "message": "Database restore failed and was rolled back",
                    "restored": {},
                    "errors": all_errors,
                })
                return
            finally:
                try:
                    conn.autocommit = original_autocommit
                except Exception:
                    pass

        yield _sse_event("done", {
            "message": "Database restore completed",
            "restored": restore_summary,
            "errors": all_errors,
        })

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )
