# CRM Deal Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from ..schemas.crm import (
    DealCreate, DealUpdate, DealOut, DealActivityCreate, DealActivityOut,
    DealStageCreate, DealStageOut, DealCategoryCreate, DealCategoryOut,
    DealPipeline, SalesPerformanceMetrics, DealAIDraftRequest, DealAIDraftResponse
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..core.config import settings
from ..repositories.crm_deals import (
    create_deal, get_deal, update_deal, delete_deal, list_deals,
    create_deal_activity, get_deal_activities,
    create_deal_stage, get_deal_stages, update_deal_stage, delete_deal_stage,
    create_deal_category, get_deal_categories, update_deal_category, delete_deal_category,
    get_deal_pipeline, get_sales_performance_metrics
)
from openai import OpenAI
import os
import logging
import json
import traceback
import sys

# Set API key via environment variable once at app startup
if settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

deal_router = APIRouter(prefix="/crm/deals", tags=["crm-deals"])

# ==============================================
# DEAL MANAGEMENT ENDPOINTS
# ==============================================

@deal_router.post("", response_model=DealOut, include_in_schema=False)  # /api/crm/deals
@deal_router.post("/", response_model=DealOut)  # /api/crm/deals/
def create_new_deal(
    deal: DealCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new deal"""
    try:
        return create_deal(deal, current_user.id)
    except Exception as e:
        logging.error(f"Error creating deal: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal")

@deal_router.get("", response_model=List[DealOut], include_in_schema=False)  # /api/crm/deals
@deal_router.get("/", response_model=List[DealOut])  # /api/crm/deals/
def get_all_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    stage_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    contact_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    is_won: Optional[bool] = Query(None),
    is_lost: Optional[bool] = Query(None),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all deals with optional filtering"""
    try:
        return list_deals(skip=skip, limit=limit, stage_id=stage_id,
                         category_id=category_id, assigned_to=assigned_to,
                         contact_id=contact_id, search=search,
                         is_won=is_won, is_lost=is_lost)
    except Exception as e:
        logging.error(f"Error fetching deals: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deals")

@deal_router.get("/pipeline", response_model=List[DealPipeline])
def get_deal_pipeline_view(
    current_user: UserOut = Depends(get_current_user)
):
    """Get deal pipeline view for dashboard"""
    try:
        return get_deal_pipeline()
    except Exception as e:
        logging.error(f"Error fetching deal pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal pipeline")

@deal_router.get("/metrics", response_model=SalesPerformanceMetrics)
def get_sales_metrics(
    current_user: UserOut = Depends(require_admin)
):
    """Get sales performance metrics (admin only)"""
    try:
        return get_sales_performance_metrics()
    except Exception as e:
        logging.error(f"Error fetching sales metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch sales metrics")

# ==============================================
# DEAL STAGE MANAGEMENT ENDPOINTS (must come before /{deal_id})
# ==============================================

@deal_router.post("/stages", response_model=DealStageOut)
def create_deal_stage_endpoint(
    stage: DealStageCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new deal stage (admin only)"""
    try:
        return create_deal_stage(stage)
    except Exception as e:
        logging.error(f"Error creating deal stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal stage")

@deal_router.get("/stages", response_model=List[DealStageOut])
def get_deal_stages_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all deal stages"""
    try:
        return get_deal_stages()
    except Exception as e:
        logging.error(f"Error fetching deal stages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal stages")

@deal_router.put("/stages/{stage_id}", response_model=DealStageOut)
def update_deal_stage_endpoint(
    stage_id: int,
    stage: DealStageCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a deal stage (admin only)"""
    try:
        updated_stage = update_deal_stage(stage_id, stage)
        if not updated_stage:
            raise HTTPException(status_code=404, detail="Deal stage not found")
        return updated_stage
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating deal stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal stage")

@deal_router.delete("/stages/{stage_id}")
def delete_deal_stage_endpoint(
    stage_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a deal stage (admin only)"""
    try:
        success = delete_deal_stage(stage_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal stage not found")
        return {"message": "Deal stage deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting deal stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal stage")

# ==============================================
# DEAL CATEGORY MANAGEMENT ENDPOINTS (must come before /{deal_id})
# ==============================================

@deal_router.post("/categories", response_model=DealCategoryOut)
def create_deal_category_endpoint(
    category: DealCategoryCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new deal category (admin only)"""
    try:
        return create_deal_category(category)
    except Exception as e:
        logging.error(f"Error creating deal category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal category")

@deal_router.get("/categories", response_model=List[DealCategoryOut])
def get_deal_categories_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all deal categories"""
    try:
        return get_deal_categories()
    except Exception as e:
        logging.error(f"Error fetching deal categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal categories")

@deal_router.put("/categories/{category_id}", response_model=DealCategoryOut)
def update_deal_category_endpoint(
    category_id: int,
    category: DealCategoryCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a deal category (admin only)"""
    try:
        updated_category = update_deal_category(category_id, category)
        if not updated_category:
            raise HTTPException(status_code=404, detail="Deal category not found")
        return updated_category
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating deal category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal category")

@deal_router.delete("/categories/{category_id}")
def delete_deal_category_endpoint(
    category_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a deal category (admin only)"""
    try:
        success = delete_deal_category(category_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal category not found")
        return {"message": "Deal category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting deal category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal category")

@deal_router.get("/{deal_id}", response_model=DealOut)
def get_deal_by_id(
    deal_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific deal by ID"""
    try:
        deal = get_deal(deal_id)
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        return deal
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching deal {deal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal")

@deal_router.put("/{deal_id}", response_model=DealOut)
def update_deal_by_id(
    deal_id: UUID,
    deal_update: DealUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a specific deal"""
    try:
        updated_deal = update_deal(deal_id, deal_update)
        if not updated_deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        return updated_deal
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating deal {deal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal")

@deal_router.delete("/{deal_id}")
def delete_deal_by_id(
    deal_id: UUID,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a specific deal (admin only)"""
    try:
        success = delete_deal(deal_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal not found")
        return {"message": "Deal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting deal {deal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal")

# ==============================================
# DEAL ACTIVITY ENDPOINTS
# ==============================================

@deal_router.post("/{deal_id}/activities", response_model=DealActivityOut)
def create_deal_activity(
    deal_id: UUID,
    activity: DealActivityCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new activity for a deal"""
    try:
        activity.deal_id = deal_id
        return create_deal_activity(activity, current_user.id)
    except Exception as e:
        logging.error(f"Error creating deal activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal activity")

@deal_router.get("/{deal_id}/activities", response_model=List[DealActivityOut])
def get_deal_activities_list(
    deal_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get all activities for a specific deal"""
    try:
        return get_deal_activities(deal_id)
    except Exception as e:
        logging.error(f"Error fetching deal activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal activities")

# ==============================================
# AI DRAFT GENERATION ENDPOINT
# ==============================================

@deal_router.post("/ai-draft", response_model=DealAIDraftResponse)
def generate_ai_draft(
    request: DealAIDraftRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Generate AI-powered draft for deal creation"""
    try:
        # Step 1: Check OpenAI library version
        try:
            import openai
            logging.info(f"OpenAI library version: {openai.__version__}")
        except Exception as e:
            logging.warning(f"Could not get OpenAI version: {str(e)}")
        
        # Step 2: Check API key configuration
        if not settings.OPENAI_API_KEY:
            logging.error("OpenAI API key not configured - OPENAI_API_KEY is empty or missing")
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Log that API key was found (mask the actual key for security)
        api_key_masked = f"{settings.OPENAI_API_KEY[:8]}...{settings.OPENAI_API_KEY[-4:]}" if len(settings.OPENAI_API_KEY) > 12 else "***masked***"
        logging.info(f"OpenAI API key found (masked: {api_key_masked}), length: {len(settings.OPENAI_API_KEY)}")
        
        # Step 3: Check for proxy-related environment variables
        proxy_vars = {
            'HTTP_PROXY': os.getenv('HTTP_PROXY'),
            'HTTPS_PROXY': os.getenv('HTTPS_PROXY'),
            'http_proxy': os.getenv('http_proxy'),
            'https_proxy': os.getenv('https_proxy'),
            'OPENAI_PROXY': os.getenv('OPENAI_PROXY'),
            'ALL_PROXY': os.getenv('ALL_PROXY'),
        }
        logging.info(f"Proxy environment variables: {[(k, 'SET' if v else 'NOT SET') for k, v in proxy_vars.items()]}")
        
        # Step 3b: Check httpx configuration (OpenAI uses httpx internally)
        try:
            import httpx
            logging.info(f"httpx version: {httpx.__version__}")
        except Exception as e:
            logging.warning(f"Could not check httpx configuration: {str(e)}")
        
        # Step 4: Inspect OpenAI Client class signature
        try:
            import inspect
            client_signature = inspect.signature(OpenAI.__init__)
            logging.info(f"OpenAI.__init__ signature: {client_signature}")
            logging.info(f"OpenAI.__init__ parameters: {list(client_signature.parameters.keys())}")
        except Exception as e:
            logging.warning(f"Could not inspect OpenAI signature: {str(e)}")
        
        # Step 5: Prepare client initialization arguments
        client_kwargs = {
            'api_key': settings.OPENAI_API_KEY
        }
        logging.info(f"Preparing to initialize OpenAI client with kwargs: {list(client_kwargs.keys())}")
        logging.info(f"API key type: {type(settings.OPENAI_API_KEY)}, length: {len(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else 0}")
        
        # Step 6: Initialize OpenAI client with explicit API key to avoid environment variable issues
        logging.info("Attempting to initialize OpenAI client...")
        try:
            client = OpenAI(**client_kwargs)
            logging.info("OpenAI client initialized successfully")
        except TypeError as e:
            # This will catch the specific error about unexpected keyword arguments
            logging.error(f"TypeError during OpenAI client initialization: {str(e)}")
            logging.error(f"Error type: {type(e).__name__}")
            logging.error(f"Full traceback:\n{traceback.format_exc()}")
            
            # Try to get more details about what arguments OpenAI expects
            try:
                import inspect
                sig = inspect.signature(OpenAI.__init__)
                logging.error(f"Expected parameters: {list(sig.parameters.keys())}")
                logging.error(f"Parameters we tried to pass: {list(client_kwargs.keys())}")
            except Exception as inspect_error:
                logging.error(f"Could not inspect parameters: {str(inspect_error)}")
            
            raise
        except Exception as init_error:
            logging.error(f"Unexpected error during OpenAI client initialization: {str(init_error)}")
            logging.error(f"Error type: {type(init_error).__name__}")
            logging.error(f"Full traceback:\n{traceback.format_exc()}")
            raise
              
        # Build context for AI prompt
        context_parts = []
        
        if request.vehicle_info:
            vehicle = request.vehicle_info
            vehicle_desc = f"Vehicle: {vehicle.get('year', '')} {vehicle.get('make', '')} {vehicle.get('model', '')}"
            if vehicle.get('trim'):
                vehicle_desc += f" {vehicle.get('trim')}"
            if vehicle.get('vin'):
                vehicle_desc += f" (VIN: {vehicle.get('vin')})"
            context_parts.append(vehicle_desc)
        
        if request.contact_info:
            contact = request.contact_info
            contact_desc = f"Contact: {contact.get('first_name', '')} {contact.get('last_name', '')}"
            if contact.get('company'):
                contact_desc += f" from {contact.get('company')}"
            context_parts.append(contact_desc)
        
        if request.additional_context:
            context_parts.append(f"Additional context: {request.additional_context}")
        
        context = "\n".join(context_parts) if context_parts else "General vehicle purchase deal"
        
        # Create prompt for OpenAI
        prompt = f"""You are a CRM assistant helping to create a professional deal record for a vehicle purchase. 
Based on the following information, generate a comprehensive deal draft:

{context}

Please provide:
1. A professional deal name (e.g., "2024 Toyota Camry Purchase - John Smith")
2. A detailed description. The contacts that are related to this lead is a seller of that vehicle. We are the one who interested in buying that vehicle. (2-3 sentences about the deal opportunity)
3. Comprehensive notes (include key details, customer preferences, vehicle specifics, and next steps)
4. A realistic expected close date (MUST be today or in the future, suggest a date 2-4 weeks from today in YYYY-MM-DD format. Never use a past date.)

Respond in JSON format with these exact keys:
{{
    "name": "deal name here",
    "description": "deal description here",
    "notes": "detailed notes here",
    "expected_close_date": "YYYY-MM-DD"
}}"""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional CRM assistant specializing in automotive sales. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse response
        content = response.choices[0].message.content
        if content is None:
            logging.error("OpenAI API returned None content")
            raise HTTPException(status_code=500, detail="OpenAI API returned empty response")
        
        content = content.strip()
        
        # Try to extract JSON from response (handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        try:
            ai_data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: try to extract fields manually or use defaults
            logging.warning(f"Failed to parse AI response as JSON: {content}")
            # Calculate default close date (30 days from today, ensuring it's not in the past)
            today = datetime.now().date()
            default_close_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
            
            # Try to extract name from content
            name = "AI Generated Deal"
            if request.vehicle_info:
                name = f"{request.vehicle_info.get('year', '')} {request.vehicle_info.get('make', '')} {request.vehicle_info.get('model', '')} Purchase"
            
            ai_data = {
                "name": name,
                "description": "AI-generated deal opportunity. Please review and update with specific details.",
                "notes": content[:500] if len(content) > 500 else content,
                "expected_close_date": default_close_date
            }
        
        # Validate and set defaults
        name = ai_data.get("name", "AI Generated Deal")
        description = ai_data.get("description", "Deal opportunity created with AI assistance.")
        notes = ai_data.get("notes", "AI-generated notes. Please review and update.")
        expected_close_date = ai_data.get("expected_close_date")
        
        # Validate date format and ensure it's not in the past
        today = datetime.now().date()
        try:
            if expected_close_date:
                parsed_date = datetime.strptime(expected_close_date, "%Y-%m-%d").date()
                # If the date is in the past, set it to today
                if parsed_date < today:
                    logging.warning(f"AI returned past date {expected_close_date}, adjusting to today")
                    expected_close_date = today.strftime("%Y-%m-%d")
                else:
                    expected_close_date = parsed_date.strftime("%Y-%m-%d")
            else:
                # Default to 30 days from today if not provided
                expected_close_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        except (ValueError, TypeError) as e:
            logging.warning(f"Invalid date format '{expected_close_date}': {str(e)}, using default")
            # Default to 30 days from today if invalid format
            expected_close_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        
        return DealAIDraftResponse(
            name=name,
            description=description,
            notes=notes,
            expected_close_date=expected_close_date
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating AI draft: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI draft: {str(e)}")

