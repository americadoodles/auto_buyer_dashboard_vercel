# AI Service for Deal Draft Generation
from openai import OpenAI
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os
import logging
import json
import traceback
import inspect
import httpx

from ..schemas.crm import DealAIDraftRequest, DealAIDraftResponse
from ..core.config import settings


def _get_openai_client() -> OpenAI:
    """Get initialized OpenAI client with proper error handling"""
    if not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")
    
    client_kwargs = {
        'api_key': settings.OPENAI_API_KEY
    }
    
    try:
        client = OpenAI(**client_kwargs)
        return client
    except Exception as e:
        logging.error(f"Error initializing OpenAI client: {str(e)}")
        raise ValueError(f"Failed to initialize OpenAI client: {str(e)}")


def extract_vehicle_info_from_title(title: str) -> Dict[str, Any]:
    """
    Extract vehicle information from a title string using AI.
    
    Extracts: used, year, make, model, trim, bodystyle, doors
    Returns: dict with year, make, model, trim, and optionally bodystyle
    
    Args:
        title: String containing vehicle information (e.g., "Used 2020 Toyota Camry XLE Sedan 4D")
    
    Returns:
        Dictionary with keys: year (int), make (str), model (str), trim (Optional[str]), bodystyle (Optional[str])
    """
    if not title or not title.strip():
        raise ValueError("Title cannot be empty")
    
    # Check API key configuration
    if not settings.OPENAI_API_KEY:
        logging.warning("OpenAI API key not configured, cannot extract vehicle info from title")
        raise ValueError("OpenAI API key not configured")
    
    try:
        client = _get_openai_client()
    except ValueError:
        raise
    
    # Create prompt for OpenAI
    prompt = f"""Extract vehicle information from the following title string:

Title: {title}

Extract the following information:
1. used - whether the vehicle is used (true/false)
2. year - the model year (integer, e.g., 2020)
3. make - the manufacturer (e.g., Toyota, Ford, Honda)
4. model - the model name (e.g., Camry, F-150, Accord)
5. trim - the trim level if mentioned (e.g., XLE, Limited, SE)
6. bodystyle - the body style (e.g., Sedan, SUV, Truck, Coupe, Hatchback)
7. doors - number of doors if mentioned (e.g., 2, 4)

Respond in JSON format with these exact keys:
{{
    "used": true or false,
    "year": 2020,
    "make": "Toyota",
    "model": "Camry",
    "trim": "XLE" or null,
    "bodystyle": "Sedan" or null,
    "doors": 4 or null
}}

If any field cannot be determined, use null for that field. Always return valid JSON."""

    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a vehicle information extraction assistant. Always respond with valid JSON only. Extract vehicle details accurately from title strings."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent extraction
            max_tokens=200
        )
        
        # Parse response
        content = response.choices[0].message.content
        if content is None:
            logging.error("OpenAI API returned None content for vehicle extraction")
            raise ValueError("OpenAI API returned empty response")
        
        content = content.strip()
        
        # Try to extract JSON from response (handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        try:
            ai_data = json.loads(content)
        except json.JSONDecodeError as e:
            logging.warning(f"Failed to parse AI response as JSON: {content}")
            raise ValueError(f"Failed to parse AI response: {str(e)}")
        
        # Extract and validate required fields
        year = ai_data.get("year")
        make = ai_data.get("make")
        model = ai_data.get("model")
        
        # Only fail if all fields are missing
        if not year and not make and not model:
            raise ValueError(f"Missing all required fields: year={year}, make={make}, model={model}")
        
        # Validate year is an integer if it exists
        if year:
            try:
                year = int(year)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid year format: {year}")
        
        # Return extracted data (only year, make, model, trim, and bodystyle)
        trim_value = ai_data.get("trim")
        bodystyle_value = ai_data.get("bodystyle")
        
        result = {
            "year": year,
            "make": str(make).strip() if make else None,
            "model": str(model).strip() if model else None,
            "trim": str(trim_value).strip() if trim_value else None,
            "bodystyle": str(bodystyle_value).strip() if bodystyle_value else None
        }
        
        return result
        
    except ValueError:
        raise
    except Exception as e:
        logging.error(f"Error extracting vehicle info from title '{title}': {str(e)}")
        raise ValueError(f"Failed to extract vehicle information: {str(e)}")


def generate_deal_draft(request: DealAIDraftRequest) -> DealAIDraftResponse:
    """Generate AI-powered draft for deal creation"""
    # Step 1: Check OpenAI library version
    try:
        import openai
        logging.info(f"OpenAI library version: {openai.__version__}")
    except Exception as e:
        logging.warning(f"Could not get OpenAI version: {str(e)}")
    
    # Step 2: Check API key configuration
    if not settings.OPENAI_API_KEY:
        logging.error("OpenAI API key not configured - OPENAI_API_KEY is empty or missing")
        raise ValueError("OpenAI API key not configured")
    
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
        logging.info(f"httpx version: {httpx.__version__}")
    except Exception as e:
        logging.warning(f"Could not check httpx configuration: {str(e)}")
    
    # Step 4: Inspect OpenAI Client class signature
    try:
        client_signature = inspect.signature(OpenAI.__init__)
        logging.info(f"OpenAI.__init__ signature: {client_signature}")
        logging.info(f"OpenAI.__init__ parameters: {list(client_signature.parameters.keys())}")
    except Exception as e:
        logging.warning(f"Could not inspect OpenAI signature: {str(e)}")
    
    # Step 5: Initialize OpenAI client
    logging.info("Attempting to initialize OpenAI client...")
    try:
        client = _get_openai_client()
        logging.info("OpenAI client initialized successfully")
    except ValueError:
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
        raise ValueError("OpenAI API returned empty response")
    
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

