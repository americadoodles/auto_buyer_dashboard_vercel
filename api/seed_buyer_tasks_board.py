import uuid
from api.core.db import DB_ENABLED
from api.core.db_helpers import get_db_connection

# Fixed UUID for the Buyer Tasks board (for idempotency)
BUYER_TASKS_BOARD_ID = uuid.UUID('00000000-0000-0000-0000-000000000004')

# Column definitions: (id, name, position, wip_limit)
# Using fixed UUIDs for idempotency (following migration pattern)
BUYER_TASKS_COLUMNS = [
    (uuid.UUID('00000000-0000-0000-0000-000000000041'), 'Inbox', 0, None),
    (uuid.UUID('00000000-0000-0000-0000-000000000042'), 'Follow-Up', 1, 10),
    (uuid.UUID('00000000-0000-0000-0000-000000000043'), 'Negotiation', 2, None),
    (uuid.UUID('00000000-0000-0000-0000-000000000044'), 'Docs/Title', 3, None),
    (uuid.UUID('00000000-0000-0000-0000-000000000045'), 'Done', 4, None),
]

def seed_buyer_tasks_board():
    """Seed the default Buyer Tasks board and its columns"""
    if not DB_ENABLED:
        print("Database is not enabled/configured.")
        return
    
    with get_db_connection() as conn:
        if not conn:
            print("No database connection available.")
            return
        
        try:
            with conn.cursor() as cur:
                # Check if board already exists
                cur.execute("SELECT id FROM task_boards WHERE id = %s", (BUYER_TASKS_BOARD_ID,))
                board_exists = cur.fetchone()
                
                if not board_exists:
                    # Create the Buyer Tasks board
                    cur.execute(
                        "INSERT INTO task_boards (id, name, scope) VALUES (%s, %s, %s)",
                        (BUYER_TASKS_BOARD_ID, 'Buyer Tasks', 'global')
                    )
                    print(f"Seeded board: Buyer Tasks")
                else:
                    print("Buyer Tasks board already exists.")
                
                # Seed columns for the board
                for column_id, column_name, position, wip_limit in BUYER_TASKS_COLUMNS:
                    # Check if column already exists (by id for idempotency)
                    cur.execute("SELECT id FROM task_columns WHERE id = %s", (column_id,))
                    column_exists = cur.fetchone()
                    
                    if not column_exists:
                        cur.execute(
                            """INSERT INTO task_columns (id, board_id, name, wip_limit, position) 
                               VALUES (%s, %s, %s, %s, %s)""",
                            (column_id, BUYER_TASKS_BOARD_ID, column_name, wip_limit, position)
                        )
                        wip_info = f" (WIP limit: {wip_limit})" if wip_limit else ""
                        print(f"  Seeded column: {column_name} at position {position}{wip_info}")
                    else:
                        print(f"  Column '{column_name}' at position {position} already exists.")
                
                conn.commit()
                print("Buyer Tasks board seeding completed successfully.")
                
        except Exception as e:
            print(f"Error seeding Buyer Tasks board: {str(e)}")
            conn.rollback()
            raise

if __name__ == "__main__":
    seed_buyer_tasks_board()

