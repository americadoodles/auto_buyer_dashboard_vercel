from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from datetime import datetime
import io
from ..schemas.export import ExportRequest, ExportResponse, ExportType
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..services.export_service import ExportService

export_router = APIRouter(prefix="/export", tags=["export"])

@export_router.post("/listings", response_class=Response)
def export_listings_csv(
    request: ExportRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Export listings to CSV format.
    - Admins can export all listings
    - Buyers can only export their own listings
    """
    try:
        # Validate export type specific requirements
        if request.export_type == ExportType.RANGE:
            if not request.start_date or not request.end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date and end date are required for range export"
                )
            if request.start_date > request.end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date cannot be after end date"
                )
        elif request.export_type == ExportType.SELECTED:
            if not request.selected_listing_ids or len(request.selected_listing_ids) == 0:
                raise HTTPException(
                    status_code=400, 
                    detail="At least one listing must be selected for selective export"
                )
        
        # Export data
        csv_content, record_count = ExportService.export_listings_csv(
            user=current_user,
            export_type=request.export_type,
            start_date=request.start_date,
            end_date=request.end_date,
            buyer_id=request.buyer_id,
            selected_listing_ids=request.selected_listing_ids
        )
        
        if not csv_content:
            raise HTTPException(
                status_code=404, 
                detail="No data found for the specified criteria"
            )
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"listings_export_{timestamp}.csv"
        
        # Return CSV as streaming response
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Export failed: {str(e)}"
        )

@export_router.post("/users", response_class=Response)
def export_users_csv(
    request: ExportRequest,
    current_user: UserOut = Depends(require_admin)
):
    """
    Export users to CSV format (admin only).
    """
    try:
        # Validate date range for RANGE export type
        if request.export_type == ExportType.RANGE:
            if not request.start_date or not request.end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date and end date are required for range export"
                )
            if request.start_date > request.end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date cannot be after end date"
                )
        
        # Export data
        csv_content, record_count = ExportService.export_users_csv(
            user=current_user,
            export_type=request.export_type,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        if not csv_content:
            raise HTTPException(
                status_code=404, 
                detail="No data found for the specified criteria"
            )
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"users_export_{timestamp}.csv"
        
        # Return CSV as streaming response
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Export failed: {str(e)}"
        )

@export_router.get("/listings/preview")
def preview_listings_export(
    export_type: ExportType,
    start_date: str = None,
    end_date: str = None,
    buyer_id: str = None,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Preview export data without downloading (shows record count and sample data).
    """
    try:
        from datetime import datetime
        
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        parsed_buyer_id = None
        
        if start_date:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if end_date:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        if buyer_id:
            from uuid import UUID
            parsed_buyer_id = UUID(buyer_id)
        
        # Validate date range for RANGE export type
        if export_type == ExportType.RANGE:
            if not parsed_start_date or not parsed_end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date and end date are required for range export"
                )
            if parsed_start_date > parsed_end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date cannot be after end date"
                )
        
        # Get preview data (first 5 records)
        csv_content, record_count = ExportService.export_listings_csv(
            user=current_user,
            export_type=export_type,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            buyer_id=parsed_buyer_id,
            selected_listing_ids=None  # Preview doesn't support selected export
        )
        
        # Parse first few lines for preview
        lines = csv_content.split('\n')[:6]  # Header + 5 data rows
        preview_data = '\n'.join(lines)
        
        return {
            "record_count": record_count,
            "preview_data": preview_data,
            "export_type": export_type,
            "date_range": {
                "start_date": parsed_start_date.isoformat() if parsed_start_date else None,
                "end_date": parsed_end_date.isoformat() if parsed_end_date else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Preview failed: {str(e)}"
        )
