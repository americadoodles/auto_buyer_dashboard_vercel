"""
Script to refactor vehicle data in the vehicles table.
Fetches all vehicles, creates a string with year, make, model,
and uses AI to extract corrected year, make, model, and trim.
Optimized with parallel processing and batch updates.
"""
import logging
import sys
import time
from typing import Optional, Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from api.core.db import DB_ENABLED, _ensure_pool_initialized
from api.core.db_helpers import get_db_connection
from api.core.connection_pool import initialize_pool, close_pool
from api.services.ai_service import extract_vehicle_info_from_title
from api.repositories.repositories import upsert_vehicle

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
BATCH_SIZE = 50  # Number of vehicles to process in parallel
UPDATE_BATCH_SIZE = 200  # Number of updates to batch together
LOG_INTERVAL = 50  # Log progress every N vehicles


def fetch_all_vehicles():
    """Fetch all vehicles from the database."""
    if not DB_ENABLED:
        logger.error("Database is not enabled")
        return []
    
    vehicles = []
    with get_db_connection() as conn:
        if not conn:
            logger.error("Failed to get database connection")
            return []
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT vehicle_key, vin, year, make, model, trim
                FROM vehicles
                ORDER BY vehicle_key
            """)
            
            for row in cur.fetchall():
                vehicles.append({
                    'vehicle_key': row[0],
                    'vin': row[1],
                    'year': row[2],
                    'make': row[3],
                    'model': row[4],
                    'trim': row[5]
                })
    
    return vehicles


def create_vehicle_string(year: Optional[int], make: Optional[str], model: Optional[str]) -> str:
    """Create a vehicle string from year, make, and model."""
    parts = []
    if year:
        parts.append(str(year))
    if make:
        parts.append(str(make).strip())
    if model:
        parts.append(str(model).strip())
    
    return ' '.join(parts) if parts else ''


def process_vehicle_ai(vehicle: Dict) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Process a single vehicle with AI extraction.
    Returns (extracted_info, error_message) tuple.
    """
    vehicle_key = vehicle['vehicle_key']
    year = vehicle['year']
    make = vehicle['make']
    model = vehicle['model']
    
    # Create vehicle string
    vehicle_string = create_vehicle_string(year, make, model)
    
    if not vehicle_string:
        return None, f"No year, make, or model to create string"
    
    # Extract vehicle info using AI
    try:
        extracted_info = extract_vehicle_info_from_title(vehicle_string)
        return {
            'vehicle_key': vehicle_key,
            'vin': vehicle.get('vin') or '',
            'year': extracted_info.get('year'),
            'make': extracted_info.get('make'),
            'model': extracted_info.get('model'),
            'trim': extracted_info.get('trim')
        }, None
    except Exception as e:
        return None, str(e)


def bulk_update_vehicles(vehicles_to_update: List[Dict]) -> int:
    """Bulk update vehicles in the database using batch operations."""
    if not vehicles_to_update:
        return 0
    
    if not DB_ENABLED:
        return 0
    
    updated_count = 0
    with get_db_connection() as conn:
        if not conn:
            return 0
        
        with conn.cursor() as cur:
            # Process in smaller batches to avoid memory issues
            for i in range(0, len(vehicles_to_update), UPDATE_BATCH_SIZE):
                batch = vehicles_to_update[i:i + UPDATE_BATCH_SIZE]
                
                # Prepare batch data
                batch_data = [
                    (
                        vehicle['vehicle_key'],
                        vehicle['vin'],
                        vehicle['year'],
                        vehicle['make'],
                        vehicle['model'],
                        vehicle['trim']
                    )
                    for vehicle in batch
                ]
                
                try:
                    # Use executemany for efficient bulk updates
                    cur.executemany(
                        """
                        INSERT INTO vehicles (vehicle_key, vin, year, make, model, trim)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (vehicle_key) DO UPDATE
                        SET vin = excluded.vin,
                            year = excluded.year,
                            make = excluded.make,
                            model = excluded.model,
                            trim = excluded.trim
                        """,
                        batch_data
                    )
                    updated_count += len(batch)
                except Exception as e:
                    # Fallback to individual updates if batch fails
                    logger.warning(f"Batch update failed, falling back to individual updates: {e}")
                    for vehicle in batch:
                        try:
                            cur.execute(
                                """
                                INSERT INTO vehicles (vehicle_key, vin, year, make, model, trim)
                                VALUES (%s, %s, %s, %s, %s, %s)
                                ON CONFLICT (vehicle_key) DO UPDATE
                                SET vin = excluded.vin,
                                    year = excluded.year,
                                    make = excluded.make,
                                    model = excluded.model,
                                    trim = excluded.trim
                                """,
                                (
                                    vehicle['vehicle_key'],
                                    vehicle['vin'],
                                    vehicle['year'],
                                    vehicle['make'],
                                    vehicle['model'],
                                    vehicle['trim']
                                )
                            )
                            updated_count += 1
                        except Exception as e2:
                            logger.error(f"Error updating vehicle {vehicle['vehicle_key']}: {e2}")
    
    return updated_count


def refactor_vehicles():
    """Main function to refactor all vehicles with parallel processing."""
    if not DB_ENABLED:
        logger.error("Database is not enabled. Please check DATABASE_URL environment variable.")
        return
    
    # Initialize connection pool
    try:
        if not _ensure_pool_initialized():
            logger.error("Failed to initialize database connection pool")
            return
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Error initializing database pool: {e}")
        return
    
    # Fetch all vehicles
    logger.info("Fetching all vehicles from database...")
    vehicles = fetch_all_vehicles()
    
    if not vehicles:
        logger.warning("No vehicles found in database")
        return
    
    logger.info(f"Found {len(vehicles)} vehicles to refactor")
    logger.info(f"Using {BATCH_SIZE} parallel workers for AI processing")
    start_time = time.time()
    
    # Process vehicles in parallel batches
    success_count = 0
    error_count = 0
    skipped_count = 0
    vehicles_to_update = []
    update_lock = Lock()
    
    def process_batch(batch_vehicles: List[Dict], batch_num: int) -> Tuple[int, int, int]:
        """Process a batch of vehicles in parallel."""
        batch_success = 0
        batch_errors = 0
        batch_skipped = 0
        batch_updates = []
        
        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
            # Submit all vehicles in batch for processing
            future_to_vehicle = {
                executor.submit(process_vehicle_ai, vehicle): vehicle 
                for vehicle in batch_vehicles
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_vehicle):
                vehicle = future_to_vehicle[future]
                vehicle_key = vehicle['vehicle_key']
                
                try:
                    extracted_info, error_msg = future.result()
                    
                    if error_msg:
                        if "No year, make, or model" in error_msg:
                            batch_skipped += 1
                        else:
                            batch_errors += 1
                            if batch_errors <= 5:  # Only log first few errors
                                logger.error(f"Error processing {vehicle_key}: {error_msg}")
                    elif extracted_info:
                        batch_updates.append(extracted_info)
                        batch_success += 1
                    else:
                        batch_skipped += 1
                        
                except Exception as e:
                    batch_errors += 1
                    if batch_errors <= 5:  # Only log first few errors
                        logger.error(f"Unexpected error processing {vehicle_key}: {e}")
        
        # Batch update database
        if batch_updates:
            with update_lock:
                updated = bulk_update_vehicles(batch_updates)
                if updated != len(batch_updates):
                    logger.warning(f"Batch {batch_num}: Expected {len(batch_updates)} updates, got {updated}")
        
        return batch_success, batch_errors, batch_skipped
    
    # Process vehicles in batches
    total_batches = (len(vehicles) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for batch_num in range(total_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min(start_idx + BATCH_SIZE, len(vehicles))
        batch = vehicles[start_idx:end_idx]
        
        batch_start_time = time.time()
        batch_success, batch_errors, batch_skipped = process_batch(batch, batch_num + 1)
        
        success_count += batch_success
        error_count += batch_errors
        skipped_count += batch_skipped
        
        batch_time = time.time() - batch_start_time
        processed = end_idx
        
        # Log progress periodically
        if (batch_num + 1) % (LOG_INTERVAL // BATCH_SIZE) == 0 or batch_num == total_batches - 1:
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            remaining = len(vehicles) - processed
            eta = remaining / rate if rate > 0 else 0
            
            logger.info(
                f"Progress: {processed}/{len(vehicles)} vehicles "
                f"({processed*100//len(vehicles)}%) | "
                f"Success: {success_count} | Errors: {error_count} | Skipped: {skipped_count} | "
                f"Rate: {rate:.1f} vehicles/sec | ETA: {eta:.0f}s"
            )
    
    # Final summary
    total_time = time.time() - start_time
    logger.info("=" * 60)
    logger.info("Refactoring complete!")
    logger.info(f"Total vehicles: {len(vehicles)}")
    logger.info(f"Successfully updated: {success_count}")
    logger.info(f"Errors: {error_count}")
    logger.info(f"Skipped: {skipped_count}")
    logger.info(f"Total time: {total_time:.2f} seconds")
    logger.info(f"Average rate: {len(vehicles)/total_time:.2f} vehicles/second")
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        refactor_vehicles()
    except KeyboardInterrupt:
        logger.info("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        # Close connection pool
        try:
            close_pool()
            logger.info("Database connection pool closed")
        except Exception as e:
            logger.warning(f"Error closing connection pool: {e}")

