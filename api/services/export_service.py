import csv
import io
import json
import os
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.export import ExportType
from ..schemas.listing import ListingOut
from ..schemas.user import UserOut
from ..repositories.crm_leads import list_leads

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
        
        with get_db_connection() as conn:
            if not conn:
                return "", 0
            
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                
                # Convert to CSV
                csv_content = ExportService._rows_to_csv(rows, user.role == "admin")
                return csv_content, len(rows)
    
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
        
        with get_db_connection() as conn:
            if not conn:
                return "", 0
            
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                
                # Convert to CSV
                csv_content = ExportService._rows_to_csv(rows, is_admin=True, is_users=True)
                return csv_content, len(rows)
    
    @staticmethod
    def export_leads_csv(
        status_id: Optional[int] = None,
        source_id: Optional[int] = None,
        assigned_to: Optional[UUID] = None,
        search: Optional[str] = None
    ) -> tuple[str, int]:
        """
        Export leads to CSV format.
        Returns (csv_content, record_count)
        """
        if not DB_ENABLED:
            return "", 0
        
        # Get all leads with filters (no pagination for export)
        leads = list_leads(
            skip=0,
            limit=10000,  # Large limit for export
            status_id=status_id,
            source_id=source_id,
            assigned_to=assigned_to,
            search=search
        )
        
        if not leads:
            return "", 0
        
        # Convert leads to CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # CSV headers
        headers = [
            "ID", "Status", "Source", "Assigned To", "Contact Name", "Contact Email", 
            "Contact Phone", "Contact Company", "VIN", "Year", "Make", "Model",
            "Location", "Price", "Miles", "Lead Score", "Notes", 
            "Qualified At", "Converted At", "Created At", "Updated At"
        ]
        writer.writerow(headers)
        
        # Write lead data
        for lead in leads:
            contact_name = ""
            contact_email = ""
            contact_phone = ""
            contact_company = ""
            if lead.contact:
                contact_name = f"{lead.contact.first_name or ''} {lead.contact.last_name or ''}".strip()
                contact_email = lead.contact.email or ""
                contact_phone = lead.contact.phone or lead.contact.mobile or ""
                contact_company = lead.contact.company or ""
            
            status_name = lead.status.name if lead.status else ""
            source_name = lead.source.name if lead.source else ""
            assigned_to_name = lead.assigned_to_user.username if lead.assigned_to_user else ""
            
            vin = ""
            year = ""
            make = ""
            model = ""
            location = ""
            price = ""
            miles = ""
            if lead.listing:
                # Handle both dict and object access
                if isinstance(lead.listing, dict):
                    vin = lead.listing.get("vin") or ""
                    year = str(lead.listing.get("year") or "")
                    make = lead.listing.get("make") or ""
                    model = lead.listing.get("model") or ""
                    location = lead.listing.get("location") or ""
                    price = str(lead.listing.get("price") or "")
                    miles = str(lead.listing.get("miles") or "")
                else:
                    # Handle Pydantic model or object with attributes
                    vin = getattr(lead.listing, "vin", "") or ""
                    year = str(getattr(lead.listing, "year", "") or "")
                    make = getattr(lead.listing, "make", "") or ""
                    model = getattr(lead.listing, "model", "") or ""
                    location = getattr(lead.listing, "location", "") or ""
                    price = str(getattr(lead.listing, "price", "") or "")
                    miles = str(getattr(lead.listing, "miles", "") or "")
            
            notes = lead.notes or ""
            lead_score = str(lead.lead_score or 0)
            qualified_at = lead.qualified_at.strftime('%Y-%m-%d %H:%M:%S') if lead.qualified_at else ""
            converted_at = lead.converted_at.strftime('%Y-%m-%d %H:%M:%S') if lead.converted_at else ""
            created_at = lead.created_at.strftime('%Y-%m-%d %H:%M:%S') if lead.created_at else ""
            updated_at = lead.updated_at.strftime('%Y-%m-%d %H:%M:%S') if lead.updated_at else ""
            
            writer.writerow([
                str(lead.id),
                status_name,
                source_name,
                assigned_to_name,
                contact_name,
                contact_email,
                contact_phone,
                contact_company,
                vin,
                year,
                make,
                model,
                location,
                price,
                miles,
                lead_score,
                notes,
                qualified_at,
                converted_at,
                created_at,
                updated_at
            ])
        
        csv_content = output.getvalue()
        return csv_content, len(leads)

    @staticmethod
    def export_deals_csv(
        stage_id: Optional[int] = None,
        category_id: Optional[int] = None,
        assigned_to: Optional[UUID] = None,
        contact_id: Optional[UUID] = None,
        search: Optional[str] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None,
        include_hidden: bool = False
    ) -> tuple[str, int]:
        """
        Export deals to CSV including related contact, owner, stage,
        category, lead, and vehicle (listing) information.
        Returns (csv_content, record_count).
        """
        if not DB_ENABLED:
            return "", 0

        where_conditions: List[str] = []
        params: List[Any] = []

        if stage_id is not None:
            where_conditions.append("d.deal_stage_id = %s")
            params.append(stage_id)
        if category_id is not None:
            where_conditions.append("d.deal_category_id = %s")
            params.append(category_id)
        if contact_id is not None:
            where_conditions.append("d.contact_id = %s")
            params.append(contact_id)
        if assigned_to is not None:
            where_conditions.append("d.assigned_to = %s")
            params.append(assigned_to)
        if is_won is not None:
            where_conditions.append("d.is_won = %s")
            params.append(is_won)
        if is_lost is not None:
            where_conditions.append("d.is_lost = %s")
            params.append(is_lost)
        if not include_hidden:
            where_conditions.append("COALESCE(d.is_hidden, false) = false")
        if search:
            where_conditions.append("(d.name ILIKE %s OR d.description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

        query = f"""
            SELECT
                d.id, d.name, d.description, d.deal_value, d.probability,
                d.expected_close_date, d.actual_close_date, d.notes,
                d.is_won, d.is_lost, d.is_hidden, d.lost_reason,
                d.created_at, d.updated_at,
                ds.name AS stage_name,
                dc.name AS category_name,
                u.username AS assigned_to_username,
                c.first_name, c.last_name, c.company, c.email, c.phone, c.mobile,
                d.lead_id,
                li.id AS listing_id, li.vin, li.price AS listing_price, li.miles,
                li.dom, li.location, li.source AS listing_source,
                li.interior_color, li.exterior_color, li.transmission,
                li.fuel_type, li.drivetrain, li.body_style,
                li.mpg, li.images,
                li.year, li.make, li.model, li.trim
            FROM deals d
            LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
            LEFT JOIN deal_categories dc ON d.deal_category_id = dc.id
            LEFT JOIN users u ON d.assigned_to = u.id
            LEFT JOIN contacts c ON d.contact_id = c.id
            LEFT JOIN leads l ON d.lead_id = l.id
            LEFT JOIN listings li ON l.listing_id = li.id
            {where_clause}
            ORDER BY d.created_at DESC
        """

        with get_db_connection() as conn:
            if not conn:
                return "", 0
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

        if not rows:
            return "", 0

        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Deal ID", "Title", "Description", "Deal Value", "Probability (%)",
            "Expected Close Date", "Actual Close Date", "Notes",
            "Is Won", "Is Lost", "Is Hidden", "Lost Reason",
            "Created At", "Updated At",
            "Stage", "Category", "Assigned To",
            "Contact First Name", "Contact Last Name", "Contact Company",
            "Contact Email", "Contact Phone", "Contact Mobile",
            "Lead ID", "Listing ID",
            "VIN", "Year", "Make", "Model", "Trim",
            "Listing Price", "Miles", "Days On Market", "Location", "Listing Source",
            "Interior Color", "Exterior Color", "Transmission",
            "Fuel Type", "Drivetrain", "Body Style",
            "MPG", "image_urls",
        ]
        writer.writerow(headers)

        def fmt_dt(value: Any) -> str:
            if value is None:
                return ""
            if isinstance(value, datetime):
                return value.strftime("%Y-%m-%d %H:%M:%S")
            if isinstance(value, date):
                return value.strftime("%Y-%m-%d")
            return str(value)

        def s(value: Any) -> str:
            return "" if value is None else str(value)

        def fmt_images(value: Any) -> str:
            if not value:
                return ""
            if isinstance(value, str):
                return value
            try:
                return ",".join(str(v) for v in value if v)
            except TypeError:
                return str(value)

        for row in rows:
            (deal_id, title, description, deal_value, probability,
             expected_close, actual_close, notes,
             is_won, is_lost, is_hidden, lost_reason,
             created_at, updated_at,
             stage_name, category_name, assigned_username,
             first_name, last_name, company, email, phone, mobile,
             lead_id, listing_id, vin, listing_price, miles,
             dom, location, listing_source,
             interior_color, exterior_color, transmission,
             fuel_type, drivetrain, body_style,
             mpg, images,
             year, make, model, trim) = row

            writer.writerow([
                s(deal_id), s(title), s(description), s(deal_value), s(probability),
                fmt_dt(expected_close), fmt_dt(actual_close), s(notes),
                "Yes" if is_won else "No",
                "Yes" if is_lost else "No",
                "Yes" if is_hidden else "No",
                s(lost_reason),
                fmt_dt(created_at), fmt_dt(updated_at),
                s(stage_name), s(category_name), s(assigned_username),
                s(first_name), s(last_name), s(company),
                s(email), s(phone), s(mobile),
                s(lead_id), s(listing_id),
                s(vin), s(year), s(make), s(model), s(trim),
                s(listing_price), s(miles), s(dom), s(location), s(listing_source),
                s(interior_color), s(exterior_color), s(transmission),
                s(fuel_type), s(drivetrain), s(body_style),
                s(mpg), fmt_images(images),
            ])

        return output.getvalue(), len(rows)

    @staticmethod
    def _build_admin_query(start_date: Optional[date], end_date: Optional[date]) -> tuple[str, list]:
        """Build query for admin to export all listings"""
        base_query = """
            SELECT
                l.id,
                l.vehicle_key,
                l.vin,
                l.year,
                l.make,
                l.model,
                l.trim,
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
            LEFT JOIN v_latest_scores s ON l.vin = s.vin
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
                l.year,
                l.make,
                l.model,
                l.trim,
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
            LEFT JOIN v_latest_scores s ON l.vin = s.vin
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
                l.year,
                l.make,
                l.model,
                l.trim,
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
            LEFT JOIN v_latest_scores s ON l.vin = s.vin
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
