import csv
import io
import json
import os
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
from ..core.db import get_conn, DB_ENABLED
from ..schemas.export import ExportType
from ..schemas.listing import ListingOut
from ..schemas.user import UserOut

class ExportService:
    @staticmethod
    def export_listings_csv(
        user: UserOut,
        export_type: ExportType,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        buyer_id: Optional[UUID] = None,
        selected_listing_ids: Optional[List[str]] = None
    ) -> tuple[str, int]:
        """
        Export listings to CSV format based on user role and export type.
        Returns (csv_content, record_count)
        """
        if not DB_ENABLED:
            return "", 0
        
        # Determine date range based on export type
        if export_type == ExportType.DAILY:
            start_date = date.today()
            end_date = date.today()
        elif export_type == ExportType.ALL:
            start_date = None
            end_date = None
        # For RANGE, use provided dates
        # For SELECTED, use selected_listing_ids
        
        # Build query based on user role and export type
        if export_type == ExportType.SELECTED:
            if not selected_listing_ids:
                return "", 0
            query, params = ExportService._build_selected_query(selected_listing_ids, user.role == "admin", user.id)
        elif user.role == "admin":
            if buyer_id:
                # Admin exporting specific buyer's data
                query, params = ExportService._build_buyer_query(buyer_id, start_date, end_date)
            else:
                # Admin exporting all data
                query, params = ExportService._build_admin_query(start_date, end_date)
        else:
            # Buyers can only export their own data (ignore buyer_id parameter for security)
            query, params = ExportService._build_buyer_query(user.id, start_date, end_date)
        
        conn = get_conn()
        if not conn:
            return "", 0
        
        try:
            with conn, conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                
                # Convert to CSV
                csv_content = ExportService._rows_to_csv(rows, user.role == "admin")
                return csv_content, len(rows)
        finally:
            conn.close()
    
    @staticmethod
    def export_users_csv(
        user: UserOut,
        export_type: ExportType,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> tuple[str, int]:
        """
        Export users to CSV format (admin only).
        Returns (csv_content, record_count)
        """
        if user.role != "admin":
            return "", 0
        
        if not DB_ENABLED:
            return "", 0
        
        # Determine date range based on export type
        if export_type == ExportType.DAILY:
            start_date = date.today()
            end_date = date.today()
        elif export_type == ExportType.ALL:
            start_date = None
            end_date = None
        
        query, params = ExportService._build_users_query(start_date, end_date)
        
        conn = get_conn()
        if not conn:
            return "", 0
        
        try:
            with conn, conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                
                # Convert to CSV
                csv_content = ExportService._rows_to_csv(rows, is_admin=True, is_users=True)
                return csv_content, len(rows)
        finally:
            conn.close()
    
    @staticmethod
    def _build_admin_query(start_date: Optional[date], end_date: Optional[date]) -> tuple[str, list]:
        """Build query for admin to export all listings"""
        base_query = """
            SELECT 
                l.id,
                l.vehicle_key,
                l.vin,
                v.year,
                v.make,
                v.model,
                v.trim,
                l.miles,
                l.price,
                s.score,
                l.dom,
                l.source,
                25 as radius,
                s.reason_codes,
                s.buy_max,
                'active' as status,
                l.location,
                l.buyer_id,
                u.username as buyer_username,
                l.created_at,
                s.buy_max as decision_buy_max,
                'pending' as decision_status,
                s.reason_codes as decision_reasons
            FROM listings l
            LEFT JOIN vehicles v ON l.vehicle_key = v.vehicle_key
            LEFT JOIN v_latest_scores s ON l.vehicle_key = s.vehicle_key
            LEFT JOIN users u ON l.buyer_id::uuid = u.id
        """
        
        where_conditions = []
        params = []
        
        if start_date and end_date:
            where_conditions.append("DATE(l.created_at) BETWEEN %s AND %s")
            params.extend([start_date, end_date])
        elif start_date:
            where_conditions.append("DATE(l.created_at) >= %s")
            params.append(start_date)
        elif end_date:
            where_conditions.append("DATE(l.created_at) <= %s")
            params.append(end_date)
        
        if where_conditions:
            query = f"{base_query} WHERE {' AND '.join(where_conditions)} ORDER BY l.created_at DESC"
        else:
            query = f"{base_query} ORDER BY l.created_at DESC"
        
        return query, params
    
    @staticmethod
    def _build_buyer_query(buyer_id: UUID, start_date: Optional[date], end_date: Optional[date]) -> tuple[str, list]:
        """Build query for buyer to export only their listings"""
        base_query = """
            SELECT 
                l.id,
                l.vehicle_key,
                l.vin,
                v.year,
                v.make,
                v.model,
                v.trim,
                l.miles,
                l.price,
                s.score,
                l.dom,
                l.source,
                25 as radius,
                s.reason_codes,
                s.buy_max,
                'active' as status,
                l.location,
                l.buyer_id,
                u.username as buyer_username,
                l.created_at,
                s.buy_max as decision_buy_max,
                'pending' as decision_status,
                s.reason_codes as decision_reasons
            FROM listings l
            LEFT JOIN vehicles v ON l.vehicle_key = v.vehicle_key
            LEFT JOIN v_latest_scores s ON l.vehicle_key = s.vehicle_key
            LEFT JOIN users u ON l.buyer_id::uuid = u.id
            WHERE l.buyer_id::uuid = %s
        """
        
        params = [str(buyer_id)]
        additional_conditions = []
        
        if start_date and end_date:
            additional_conditions.append("DATE(l.created_at) BETWEEN %s AND %s")
            params.extend([start_date, end_date])
        elif start_date:
            additional_conditions.append("DATE(l.created_at) >= %s")
            params.append(start_date)
        elif end_date:
            additional_conditions.append("DATE(l.created_at) <= %s")
            params.append(end_date)
        
        if additional_conditions:
            query = f"{base_query} AND {' AND '.join(additional_conditions)} ORDER BY l.created_at DESC"
        else:
            query = f"{base_query} ORDER BY l.created_at DESC"
        return query, params
    
    @staticmethod
    def _build_selected_query(selected_listing_ids: List[str], is_admin: bool, user_id: UUID) -> tuple[str, list]:
        """Build query for exporting selected listings"""
        base_query = """
            SELECT 
                l.id,
                l.vehicle_key,
                l.vin,
                v.year,
                v.make,
                v.model,
                v.trim,
                l.miles,
                l.price,
                s.score,
                l.dom,
                l.source,
                25 as radius,
                s.reason_codes,
                s.buy_max,
                'active' as status,
                l.location,
                l.buyer_id,
                u.username as buyer_username,
                l.created_at,
                s.buy_max as decision_buy_max,
                'pending' as decision_status,
                s.reason_codes as decision_reasons
            FROM listings l
            LEFT JOIN vehicles v ON l.vehicle_key = v.vehicle_key
            LEFT JOIN v_latest_scores s ON l.vehicle_key = s.vehicle_key
            LEFT JOIN users u ON l.buyer_id::uuid = u.id
            WHERE l.id = ANY(%s)
        """
        
        params = [selected_listing_ids]
        
        # Add buyer restriction for non-admin users
        if not is_admin:
            base_query += " AND l.buyer_id::uuid = %s"
            params.append(str(user_id))
        
        query = f"{base_query} ORDER BY l.created_at DESC"
        return query, params
    
    @staticmethod
    def _build_users_query(start_date: Optional[date], end_date: Optional[date]) -> tuple[str, list]:
        """Build query for exporting users (admin only)"""
        base_query = """
            SELECT 
                u.id,
                u.email,
                u.username,
                u.role_id,
                r.name as role_name,
                u.is_confirmed,
                u.created_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
        """
        
        where_conditions = []
        params = []
        
        if start_date and end_date:
            where_conditions.append("DATE(u.created_at) BETWEEN %s AND %s")
            params.extend([start_date, end_date])
        elif start_date:
            where_conditions.append("DATE(u.created_at) >= %s")
            params.append(start_date)
        elif end_date:
            where_conditions.append("DATE(u.created_at) <= %s")
            params.append(end_date)
        
        if where_conditions:
            query = f"{base_query} WHERE {' AND '.join(where_conditions)} ORDER BY u.created_at DESC"
        else:
            query = f"{base_query} ORDER BY u.created_at DESC"
        
        return query, params
    
    @staticmethod
    def _rows_to_csv(rows: List[tuple], is_admin: bool = False, is_users: bool = False) -> str:
        """Convert database rows to CSV format"""
        if not rows:
            return ""
        
        output = io.StringIO()
        
        if is_users:
            # Users CSV headers
            headers = [
                "ID", "Email", "Username", "Role ID", "Role Name", 
                "Is Confirmed", "Created At"
            ]
            writer = csv.writer(output)
            writer.writerow(headers)
            
            for row in rows:
                writer.writerow([
                    str(row[0]),  # id
                    row[1],       # email
                    row[2],       # username
                    row[3],       # role_id
                    row[4],       # role_name
                    row[5],       # is_confirmed
                    row[6].strftime('%Y-%m-%d %H:%M:%S') if row[6] else ''  # created_at
                ])
        else:
            # Listings CSV headers
            if is_admin:
                headers = [
                    "ID", "Vehicle Key", "VIN", "Year", "Make", "Model", "Trim",
                    "Miles", "Price", "Score", "DOM", "Source", "Radius",
                    "Reason Codes", "Buy Max", "Status", "Location",
                    "Buyer ID", "Buyer Username", "Created At",
                    "Decision Buy Max", "Decision Status", "Decision Reasons"
                ]
            else:
                headers = [
                    "ID", "Vehicle Key", "VIN", "Year", "Make", "Model", "Trim",
                    "Miles", "Price", "Score", "DOM", "Source", "Radius",
                    "Reason Codes", "Buy Max", "Status", "Location",
                    "Created At", "Decision Buy Max", "Decision Status", "Decision Reasons"
                ]
            
            writer = csv.writer(output)
            writer.writerow(headers)
            
            for row in rows:
                # Parse reason codes if it's a string
                reason_codes = row[13] if row[13] else []
                if isinstance(reason_codes, str):
                    try:
                        reason_codes = json.loads(reason_codes)
                    except:
                        reason_codes = []
                
                # Parse decision reasons if it's a string
                decision_reasons = row[22] if len(row) > 22 and row[22] else []
                if isinstance(decision_reasons, str):
                    try:
                        decision_reasons = json.loads(decision_reasons)
                    except:
                        decision_reasons = []
                
                if is_admin:
                    writer.writerow([
                        str(row[0]),   # id
                        row[1],        # vehicle_key
                        row[2] or '',  # vin
                        row[3],        # year
                        row[4],        # make
                        row[5],        # model
                        row[6] or '',  # trim
                        row[7],        # miles
                        row[8],        # price
                        row[9] or '',  # score
                        row[10],       # dom
                        row[11] or '', # source
                        row[12] or '', # radius
                        ', '.join(reason_codes) if reason_codes else '',  # reason_codes
                        row[14] or '', # buy_max
                        row[15] or '', # status
                        row[16] or '', # location
                        str(row[17]) if row[17] else '',  # buyer_id
                        row[18] or '', # buyer_username
                        row[19].strftime('%Y-%m-%d %H:%M:%S') if row[19] else '',  # created_at
                        row[20] or '', # decision_buy_max
                        row[21] or '', # decision_status
                        ', '.join(decision_reasons) if decision_reasons else ''  # decision_reasons
                    ])
                else:
                    writer.writerow([
                        str(row[0]),   # id
                        row[1],        # vehicle_key
                        row[2] or '',  # vin
                        row[3],        # year
                        row[4],        # make
                        row[5],        # model
                        row[6] or '',  # trim
                        row[7],        # miles
                        row[8],        # price
                        row[9] or '',  # score
                        row[10],       # dom
                        row[11] or '', # source
                        row[12] or '', # radius
                        ', '.join(reason_codes) if reason_codes else '',  # reason_codes
                        row[14] or '', # buy_max
                        row[15] or '', # status
                        row[16] or '', # location
                        row[19].strftime('%Y-%m-%d %H:%M:%S') if row[19] else '',  # created_at
                        row[20] or '', # decision_buy_max
                        row[21] or '', # decision_status
                        ', '.join(decision_reasons) if decision_reasons else ''  # decision_reasons
                    ])
        
        return output.getvalue()
