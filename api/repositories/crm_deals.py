# CRM Deal Management Repository
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.crm import (
    DealCreate, DealUpdate, DealOut, DealActivityCreate, DealActivityOut,
    DealStageCreate, DealStageOut, DealCategoryCreate, DealCategoryOut,
    DealPipeline, SalesPerformanceMetrics
)

# ==============================================
# DEAL MANAGEMENT FUNCTIONS
# ==============================================

def create_deal(deal_data: DealCreate, created_by: UUID) -> DealOut:
    """Create a new deal"""
    if not DB_ENABLED:
        deal_id = UUID('12345678-1234-1234-1234-123456789012')
        return DealOut(
            id=deal_id,
            **deal_data.model_dump(),
            created_by=created_by,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO deals (
                        name, description, contact_id, assigned_to, deal_stage_id,
                        deal_category_id, expected_close_date, actual_close_date,
                        deal_value, probability, notes, is_won, is_lost, created_by, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, created_at, updated_at
                """, (
                    deal_data.title, deal_data.description, deal_data.contact_id,
                    deal_data.assigned_to, deal_data.deal_stage_id, deal_data.deal_category_id,
                    deal_data.expected_close_date, deal_data.actual_close_date,
                    deal_data.deal_value, deal_data.probability, deal_data.notes,
                    deal_data.is_won or False, deal_data.is_lost or False, created_by, datetime.now(), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    deal_id, created_at, updated_at = result
                    return DealOut(
                        id=deal_id,
                        **deal_data.model_dump(),
                        created_by=created_by,
                        created_at=created_at,
                        updated_at=updated_at
                    )
                else:
                    raise Exception("Failed to create deal")
                    
        except Exception as e:
            logging.error(f"Error creating deal: {str(e)}")
            raise

def get_deal(deal_id: UUID) -> Optional[DealOut]:
    """Get a deal by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, contact_id, assigned_to, deal_stage_id,
                           deal_category_id, expected_close_date, actual_close_date,
                           deal_value, probability, notes, is_won, is_lost, created_by, created_at, updated_at
                    FROM deals WHERE id = %s
                """, (deal_id,))
                
                result = cur.fetchone()
                if result:
                    return DealOut(
                        id=result[0], title=result[1], description=result[2], contact_id=result[3],
                        assigned_to=result[4], deal_stage_id=result[5], deal_category_id=result[6],
                        expected_close_date=result[7], actual_close_date=result[8],
                        deal_value=result[9], probability=result[10], notes=result[11],
                        is_won=result[12], is_lost=result[13], created_by=result[14], created_at=result[15], updated_at=result[16]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error fetching deal: {str(e)}")
            return None

def update_deal(deal_id: UUID, deal_update: DealUpdate) -> Optional[DealOut]:
    """Update a deal"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                values = []
                
                for field, value in deal_update.model_dump(exclude_unset=True).items():
                    if value is not None:
                        if field == 'title':
                            update_fields.append("name = %s")
                        else:
                            update_fields.append(f"{field} = %s")
                        values.append(value)
                
                if not update_fields:
                    return get_deal(deal_id)
                
                update_fields.append("updated_at = %s")
                values.append(datetime.now())
                values.append(deal_id)
                
                cur.execute(f"""
                    UPDATE deals SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING id, name, description, contact_id, assigned_to, deal_stage_id,
                             deal_category_id, expected_close_date, actual_close_date,
                             deal_value, probability, notes, is_won, is_lost, created_by, created_at, updated_at
                """, values)
                
                result = cur.fetchone()
                if result:
                    return DealOut(
                        id=result[0], title=result[1], description=result[2], contact_id=result[3],
                        assigned_to=result[4], deal_stage_id=result[5], deal_category_id=result[6],
                        expected_close_date=result[7], actual_close_date=result[8],
                        deal_value=result[9], probability=result[10], notes=result[11],
                        is_won=result[12], is_lost=result[13], created_by=result[14], created_at=result[15], updated_at=result[16]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating deal: {str(e)}")
            return None

def delete_deal(deal_id: UUID) -> bool:
    """Delete a deal"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM deals WHERE id = %s", (deal_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting deal: {str(e)}")
            return False

def list_deals(skip: int = 0, limit: int = 100, stage_id: Optional[int] = None,
               category_id: Optional[int] = None, assigned_to: Optional[UUID] = None,
               contact_id: Optional[UUID] = None, search: Optional[str] = None, 
               is_won: Optional[bool] = None, is_lost: Optional[bool] = None) -> List[DealOut]:
    """List deals with optional filtering"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                where_conditions = []
                params = []
                
                if stage_id is not None:
                    where_conditions.append("deal_stage_id = %s")
                    params.append(stage_id)
                
                if category_id is not None:
                    where_conditions.append("deal_category_id = %s")
                    params.append(category_id)
                
                if contact_id is not None:
                    where_conditions.append("contact_id = %s")
                    params.append(contact_id)
                
                if assigned_to is not None:
                    where_conditions.append("assigned_to = %s")
                    params.append(assigned_to)
                
                if is_won is not None:
                    where_conditions.append("actual_close_date IS NOT NULL AND deal_value > 0")
                
                if is_lost is not None:
                    where_conditions.append("actual_close_date IS NOT NULL AND deal_value = 0")
                
                if search:
                    where_conditions.append("(name ILIKE %s OR description ILIKE %s)")
                    search_param = f"%{search}%"
                    params.extend([search_param, search_param])
                
                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
                
                cur.execute(f"""
                    SELECT id, name, description, contact_id, assigned_to, deal_stage_id,
                           deal_category_id, expected_close_date, actual_close_date,
                           deal_value, probability, notes, is_won, is_lost, created_by, created_at, updated_at
                    FROM deals {where_clause}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, params + [limit, skip])
                
                results = cur.fetchall()
                deals = []
                for result in results:
                    deals.append(DealOut(
                        id=result[0], title=result[1], description=result[2], contact_id=result[3],
                        assigned_to=result[4], deal_stage_id=result[5], deal_category_id=result[6],
                        expected_close_date=result[7], actual_close_date=result[8],
                        deal_value=result[9], probability=result[10], notes=result[11],
                        is_won=result[12], is_lost=result[13], created_by=result[14], created_at=result[15], updated_at=result[16]
                    ))
                
                return deals
                
        except Exception as e:
            logging.error(f"Error listing deals: {str(e)}")
            return []

# ==============================================
# DEAL ACTIVITY FUNCTIONS
# ==============================================

def create_deal_activity(activity_data: DealActivityCreate, created_by: UUID) -> DealActivityOut:
    """Create a new deal activity"""
    if not DB_ENABLED:
        activity_id = UUID('12345678-1234-1234-1234-123456789012')
        return DealActivityOut(
            id=activity_id,
            deal_id=activity_data.deal_id,
            **activity_data.model_dump(exclude={'deal_id'}),
            created_by=created_by,
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO deal_activities (
                        deal_id, activity_type, subject, description, activity_date, created_by, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    activity_data.deal_id, activity_data.activity_type, activity_data.subject,
                    activity_data.description, activity_data.activity_date or datetime.now(),
                    created_by, datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    activity_id, created_at = result
                    return DealActivityOut(
                        id=activity_id,
                        deal_id=activity_data.deal_id,
                        **activity_data.model_dump(exclude={'deal_id'}),
                        created_by=created_by,
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create deal activity")
                    
        except Exception as e:
            logging.error(f"Error creating deal activity: {str(e)}")
            raise

def get_deal_activities(deal_id: UUID) -> List[DealActivityOut]:
    """Get all activities for a deal"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, deal_id, activity_type, subject, description, activity_date, created_by, created_at
                    FROM deal_activities WHERE deal_id = %s
                    ORDER BY created_at DESC
                """, (deal_id,))
                
                results = cur.fetchall()
                activities = []
                for result in results:
                    activities.append(DealActivityOut(
                        id=result[0], deal_id=result[1], activity_type=result[2],
                        subject=result[3], description=result[4], activity_date=result[5],
                        created_by=result[6], created_at=result[7]
                    ))
                
                return activities
                
        except Exception as e:
            logging.error(f"Error fetching deal activities: {str(e)}")
            return []

# ==============================================
# DEAL STAGE MANAGEMENT FUNCTIONS
# ==============================================

def create_deal_stage(stage_data: DealStageCreate) -> DealStageOut:
    """Create a new deal stage"""
    if not DB_ENABLED:
        return DealStageOut(
            id=1,
            **stage_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO deal_stages (name, description, color_code, is_active, sort_order, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (stage_data.name, stage_data.description, stage_data.color_code,
                      stage_data.is_active, stage_data.sort_order, datetime.now()))
                
                result = cur.fetchone()
                if result:
                    stage_id, created_at = result
                    return DealStageOut(
                        id=stage_id,
                        **stage_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create deal stage")
                    
        except Exception as e:
            logging.error(f"Error creating deal stage: {str(e)}")
            raise

def get_deal_stages() -> List[DealStageOut]:
    """Get all deal stages"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, color_code, is_active, sort_order, created_at
                    FROM deal_stages
                    WHERE is_active = true
                    ORDER BY sort_order, name
                """)
                
                results = cur.fetchall()
                stages = []
                for result in results:
                    stages.append(DealStageOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4], sort_order=result[5],
                        created_at=result[6]
                    ))
                
                return stages
                
        except Exception as e:
            logging.error(f"Error fetching deal stages: {str(e)}")
            return []

def update_deal_stage(stage_id: int, stage_data: DealStageCreate) -> Optional[DealStageOut]:
    """Update a deal stage"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE deal_stages SET name = %s, description = %s, color_code = %s,
                                         is_active = %s, sort_order = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, is_active, sort_order, created_at
                """, (stage_data.name, stage_data.description, stage_data.color_code,
                      stage_data.is_active, stage_data.sort_order, stage_id))
                
                result = cur.fetchone()
                if result:
                    return DealStageOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4], sort_order=result[5],
                        created_at=result[6]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating deal stage: {str(e)}")
            return None

def delete_deal_stage(stage_id: int) -> bool:
    """Delete a deal stage"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM deal_stages WHERE id = %s", (stage_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting deal stage: {str(e)}")
            return False

# ==============================================
# DEAL CATEGORY MANAGEMENT FUNCTIONS
# ==============================================

def create_deal_category(category_data: DealCategoryCreate) -> DealCategoryOut:
    """Create a new deal category"""
    if not DB_ENABLED:
        return DealCategoryOut(
            id=1,
            **category_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO deal_categories (name, description, is_active, created_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at
                """, (category_data.name, category_data.description, category_data.is_active, datetime.now()))
                
                result = cur.fetchone()
                if result:
                    category_id, created_at = result
                    return DealCategoryOut(
                        id=category_id,
                        **category_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create deal category")
                    
        except Exception as e:
            logging.error(f"Error creating deal category: {str(e)}")
            raise

def get_deal_categories() -> List[DealCategoryOut]:
    """Get all deal categories"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, is_active, created_at
                    FROM deal_categories
                    WHERE is_active = true
                    ORDER BY name
                """)
                
                results = cur.fetchall()
                categories = []
                for result in results:
                    categories.append(DealCategoryOut(
                        id=result[0], name=result[1], description=result[2],
                        is_active=result[3], created_at=result[4]
                    ))
                
                return categories
                
        except Exception as e:
            logging.error(f"Error fetching deal categories: {str(e)}")
            return []

def update_deal_category(category_id: int, category_data: DealCategoryCreate) -> Optional[DealCategoryOut]:
    """Update a deal category"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE deal_categories SET name = %s, description = %s, is_active = %s
                    WHERE id = %s
                    RETURNING id, name, description, is_active, created_at
                """, (category_data.name, category_data.description, category_data.is_active, category_id))
                
                result = cur.fetchone()
                if result:
                    return DealCategoryOut(
                        id=result[0], name=result[1], description=result[2],
                        is_active=result[3], created_at=result[4]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating deal category: {str(e)}")
            return None

def delete_deal_category(category_id: int) -> bool:
    """Delete a deal category"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM deal_categories WHERE id = %s", (category_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting deal category: {str(e)}")
            return False

# ==============================================
# DEAL ANALYTICS FUNCTIONS
# ==============================================

def get_deal_pipeline() -> List[DealPipeline]:
    """Get deal pipeline data"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        ds.id as stage_id,
                        ds.name as stage_name,
                        ds.color_code,
                        COUNT(d.id) as deal_count,
                        COALESCE(SUM(d.deal_value), 0) as total_value,
                        COALESCE(AVG(d.probability), 0) as avg_probability
                    FROM deal_stages ds
                    LEFT JOIN deals d ON ds.id = d.deal_stage_id AND d.is_won = false AND d.is_lost = false
                    WHERE ds.is_active = true
                    GROUP BY ds.id, ds.name, ds.color_code, ds.sort_order
                    ORDER BY ds.sort_order
                """)
                
                results = cur.fetchall()
                pipeline = []
                for result in results:
                    pipeline.append(DealPipeline(
                        stage_id=result[0], stage_name=result[1], color_code=result[2],
                        deal_count=result[3], total_value=float(result[4]), avg_probability=float(result[5])
                    ))
                
                return pipeline
                
        except Exception as e:
            logging.error(f"Error fetching deal pipeline: {str(e)}")
            return []

def get_sales_performance_metrics() -> SalesPerformanceMetrics:
    """Get sales performance metrics"""
    if not DB_ENABLED:
        return SalesPerformanceMetrics(
            total_deals=0, active_deals=0, closed_deals=0, won_deals=0,
            total_value=0.0, won_value=0.0, avg_deal_size=0.0, win_rate=0.0
        )
    
    with get_db_connection() as conn:
        if not conn:
            return SalesPerformanceMetrics(
                total_deals=0, active_deals=0, closed_deals=0, won_deals=0,
                total_value=0.0, won_value=0.0, avg_deal_size=0.0, win_rate=0.0
            )
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_deals,
                        COUNT(CASE WHEN is_won = false AND is_lost = false THEN 1 END) as active_deals,
                        COUNT(CASE WHEN actual_close_date IS NOT NULL THEN 1 END) as closed_deals,
                        COUNT(CASE WHEN is_won = true THEN 1 END) as won_deals,
                        COALESCE(SUM(deal_value), 0) as total_value,
                        COALESCE(SUM(CASE WHEN is_won = true THEN deal_value ELSE 0 END), 0) as won_value,
                        COALESCE(AVG(deal_value), 0) as avg_deal_size
                    FROM deals
                """)
                
                result = cur.fetchone()
                if result:
                    total_deals, active_deals, closed_deals, won_deals, total_value, won_value, avg_deal_size = result
                    win_rate = (won_deals / closed_deals * 100) if closed_deals > 0 else 0.0
                    
                    return SalesPerformanceMetrics(
                        total_deals=total_deals, active_deals=active_deals, closed_deals=closed_deals,
                        won_deals=won_deals, total_value=float(total_value), won_value=float(won_value),
                        avg_deal_size=float(avg_deal_size), win_rate=win_rate
                    )
                
                return SalesPerformanceMetrics(
                    total_deals=0, active_deals=0, closed_deals=0, won_deals=0,
                    total_value=0.0, won_value=0.0, avg_deal_size=0.0, win_rate=0.0
                )
                
        except Exception as e:
            logging.error(f"Error fetching sales performance metrics: {str(e)}")
            return SalesPerformanceMetrics(
                total_deals=0, active_deals=0, closed_deals=0, won_deals=0,
                total_value=0.0, won_value=0.0, avg_deal_size=0.0, win_rate=0.0
            )