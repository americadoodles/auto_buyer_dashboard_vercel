# CRM Dashboard Repository
import logging
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.crm import (
    CRMStats, LeadConversionMetrics, SalesPerformanceMetrics,
    LeadSummary, DealPipeline, TaskDashboard
)

# ==============================================
# DASHBOARD STATISTICS FUNCTIONS
# ==============================================

def get_crm_stats() -> CRMStats:
    """Get comprehensive CRM statistics for dashboard"""
    if not DB_ENABLED:
        return CRMStats(
            total_leads=0, total_contacts=0,
            active_deals=0, won_deals=0, lost_deals=0,
            total_revenue=Decimal('0'), pending_tasks=0, overdue_tasks=0
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                # Get lead statistics
                cur.execute("SELECT COUNT(*) FROM leads")
                total_leads = cur.fetchone()[0]
                
                # Get contact statistics
                cur.execute("SELECT COUNT(*) FROM contacts WHERE is_active = true")
                total_contacts = cur.fetchone()[0]
                
                # Get deal statistics
                cur.execute("""
                    SELECT COUNT(*) FROM deals 
                    WHERE is_won = false AND is_lost = false
                """)
                active_deals = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM deals WHERE is_won = true")
                won_deals = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM deals WHERE is_lost = true")
                lost_deals = cur.fetchone()[0]
                
                # Get revenue statistics
                cur.execute("""
                    SELECT COALESCE(SUM(deal_value), 0) FROM deals 
                    WHERE is_won = true AND deal_value IS NOT NULL
                """)
                total_revenue = cur.fetchone()[0] or Decimal('0')
                
                # Get task statistics
                cur.execute("""
                    SELECT COUNT(*) FROM tasks t
                    LEFT JOIN task_statuses ts ON t.status_id = ts.id
                    WHERE ts.name != 'Completed' OR ts.name IS NULL
                """)
                pending_tasks = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT COUNT(*) FROM tasks 
                    WHERE due_date < NOW() AND completed_at IS NULL
                """)
                overdue_tasks = cur.fetchone()[0]
                
                return CRMStats(
                    total_leads=total_leads,
                    total_contacts=total_contacts,
                    active_deals=active_deals,
                    won_deals=won_deals,
                    lost_deals=lost_deals,
                    total_revenue=total_revenue,
                    pending_tasks=pending_tasks,
                    overdue_tasks=overdue_tasks
                )
                
        except Exception as e:
            logging.error(f"Error fetching CRM stats: {str(e)}")
            raise

def get_lead_conversion_metrics() -> LeadConversionMetrics:
    """Get lead conversion metrics"""
    if not DB_ENABLED:
        return LeadConversionMetrics(
            total_leads=0, converted_leads=0,
            conversion_rate=0.0, avg_score=0.0
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                # Get lead counts
                cur.execute("SELECT COUNT(*) FROM leads")
                total_leads = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT COUNT(*) FROM leads 
                    WHERE converted_at IS NOT NULL
                """)
                converted_leads = cur.fetchone()[0]
                
                # Calculate conversion rate
                conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0.0
                
                # Calculate average lead score
                cur.execute("""
                    SELECT AVG(lead_score) as avg_score
                    FROM leads 
                    WHERE lead_score IS NOT NULL
                """)
                result = cur.fetchone()
                avg_score = float(result[0]) if result and result[0] is not None else 0.0
                
                return LeadConversionMetrics(
                    total_leads=total_leads,
                    converted_leads=converted_leads,
                    conversion_rate=conversion_rate,
                    avg_score=avg_score
                )
                
        except Exception as e:
            logging.error(f"Error fetching lead conversion metrics: {str(e)}")
            raise

def get_sales_performance_metrics() -> SalesPerformanceMetrics:
    """Get sales performance metrics"""
    if not DB_ENABLED:
        return SalesPerformanceMetrics(
            deals_created=0, deals_won=0, deals_lost=0,
            win_rate=0.0, total_revenue=Decimal('0'), avg_deal_size=Decimal('0'),
            revenue_by_stage={}
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                # Get deal counts
                cur.execute("SELECT COUNT(*) FROM deals")
                deals_created = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM deals WHERE is_won = true")
                deals_won = cur.fetchone()[0]
                
                cur.execute("SELECT COUNT(*) FROM deals WHERE is_lost = true")
                deals_lost = cur.fetchone()[0]
                
                # Calculate win rate
                total_closed = deals_won + deals_lost
                win_rate = (deals_won / total_closed * 100) if total_closed > 0 else 0.0
                
                # Get revenue metrics
                cur.execute("""
                    SELECT COALESCE(SUM(deal_value), 0) FROM deals 
                    WHERE is_won = true AND deal_value IS NOT NULL
                """)
                total_revenue = cur.fetchone()[0] or Decimal('0')
                
                cur.execute("""
                    SELECT COALESCE(AVG(deal_value), 0) FROM deals 
                    WHERE is_won = true AND deal_value IS NOT NULL
                """)
                avg_deal_size = cur.fetchone()[0] or Decimal('0')
                
                # Calculate average sales cycle
                cur.execute("""
                    SELECT AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at))/86400) as avg_days
                    FROM deals 
                    WHERE is_won = true AND actual_close_date IS NOT NULL
                """)
                avg_sales_cycle = cur.fetchone()[0]
                
                # Get revenue by stage
                cur.execute("""
                    SELECT ds.name, COALESCE(SUM(d.deal_value), 0) as revenue
                    FROM deal_stages ds
                    LEFT JOIN deals d ON ds.id = d.deal_stage_id AND d.is_won = true
                    GROUP BY ds.id, ds.name
                    ORDER BY ds.sort_order
                """)
                revenue_by_stage = {row[0]: Decimal(str(row[1])) for row in cur.fetchall()}
                
                return SalesPerformanceMetrics(
                    deals_created=deals_created,
                    deals_won=deals_won,
                    deals_lost=deals_lost,
                    win_rate=win_rate,
                    total_revenue=total_revenue,
                    avg_deal_size=avg_deal_size,
                    avg_sales_cycle=avg_sales_cycle,
                    revenue_by_stage=revenue_by_stage
                )
                
        except Exception as e:
            logging.error(f"Error fetching sales performance metrics: {str(e)}")
            raise

def get_recent_activities() -> List[Dict[str, Any]]:
    """Get recent activities across all CRM modules"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                # Get recent lead activities
                cur.execute("""
                    SELECT 'lead' as type, la.activity_type, la.subject, la.description,
                           la.activity_date, l.first_name || ' ' || l.last_name as entity_name,
                           u.username as user_name
                    FROM lead_activities la
                    JOIN leads l ON la.lead_id = l.id
                    JOIN users u ON la.created_by = u.id
                    ORDER BY la.activity_date DESC
                    LIMIT 10
                """)
                
                lead_activities = []
                for row in cur.fetchall():
                    lead_activities.append({
                        'type': row[0],
                        'activity_type': row[1],
                        'subject': row[2],
                        'description': row[3],
                        'activity_date': row[4],
                        'entity_name': row[5],
                        'user_name': row[6]
                    })
                
                # Get recent contact activities
                cur.execute("""
                    SELECT 'contact' as type, ca.activity_type, ca.subject, ca.description,
                           ca.activity_date, c.first_name || ' ' || c.last_name as entity_name,
                           u.username as user_name
                    FROM contact_activities ca
                    JOIN contacts c ON ca.contact_id = c.id
                    JOIN users u ON ca.created_by = u.id
                    ORDER BY ca.activity_date DESC
                    LIMIT 10
                """)
                
                contact_activities = []
                for row in cur.fetchall():
                    contact_activities.append({
                        'type': row[0],
                        'activity_type': row[1],
                        'subject': row[2],
                        'description': row[3],
                        'activity_date': row[4],
                        'entity_name': row[5],
                        'user_name': row[6]
                    })
                
                # Get recent deal activities
                cur.execute("""
                    SELECT 'deal' as type, da.activity_type, da.subject, da.description,
                           da.activity_date, d.name as entity_name,
                           u.username as user_name
                    FROM deal_activities da
                    JOIN deals d ON da.deal_id = d.id
                    JOIN users u ON da.created_by = u.id
                    ORDER BY da.activity_date DESC
                    LIMIT 10
                """)
                
                deal_activities = []
                for row in cur.fetchall():
                    deal_activities.append({
                        'type': row[0],
                        'activity_type': row[1],
                        'subject': row[2],
                        'description': row[3],
                        'activity_date': row[4],
                        'entity_name': row[5],
                        'user_name': row[6]
                    })
                
                # Combine and sort all activities
                all_activities = lead_activities + contact_activities + deal_activities
                all_activities.sort(key=lambda x: x['activity_date'], reverse=True)
                
                return all_activities[:20]  # Return top 20 most recent
                
        except Exception as e:
            logging.error(f"Error fetching recent activities: {str(e)}")
            return []

def get_upcoming_tasks(user_id: UUID) -> List[TaskDashboard]:
    """Get upcoming tasks for a specific user"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT t.id, t.title, t.due_date, tp.name as priority_name,
                           tp.color_code as priority_color, ts.name as status_name,
                           ts.color_code as status_color, u.username as assigned_to_name,
                           t.created_at
                    FROM tasks t
                    LEFT JOIN task_priorities tp ON t.priority_id = tp.id
                    LEFT JOIN task_statuses ts ON t.status_id = ts.id
                    LEFT JOIN users u ON t.assigned_to = u.id
                    WHERE t.assigned_to = %s 
                    AND (t.due_date IS NULL OR t.due_date >= NOW())
                    AND (ts.name != 'Completed' OR ts.name IS NULL)
                    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
                    LIMIT 10
                """, (user_id,))
                
                results = cur.fetchall()
                tasks = []
                
                for result in results:
                    tasks.append(TaskDashboard(
                        id=result[0], title=result[1], due_date=result[2],
                        priority_name=result[3], priority_color=result[4],
                        status_name=result[5], status_color=result[6],
                        assigned_to_name=result[7], created_at=result[8]
                    ))
                
                return tasks
                
        except Exception as e:
            logging.error(f"Error fetching upcoming tasks: {str(e)}")
            return []

def get_deal_forecast() -> List[Dict[str, Any]]:
    """Get deal forecast data"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT d.id, d.name, d.deal_value, d.probability,
                           d.expected_close_date, ds.name as stage_name,
                           c.first_name || ' ' || c.last_name as contact_name,
                           u.username as assigned_to_name
                    FROM deals d
                    LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
                    LEFT JOIN contacts c ON d.contact_id = c.id
                    LEFT JOIN users u ON d.assigned_to = u.id
                    WHERE d.is_won = false AND d.is_lost = false
                    AND d.expected_close_date IS NOT NULL
                    ORDER BY d.expected_close_date ASC
                """)
                
                results = cur.fetchall()
                forecast = []
                
                for result in results:
                    forecast.append({
                        'id': result[0],
                        'name': result[1],
                        'deal_value': float(result[2]) if result[2] else 0,
                        'probability': result[3],
                        'expected_close_date': result[4],
                        'stage_name': result[5],
                        'contact_name': result[6],
                        'assigned_to_name': result[7]
                    })
                
                return forecast
                
        except Exception as e:
            logging.error(f"Error fetching deal forecast: {str(e)}")
            return []
