# AI Service for Deal and Task Draft Generation
from openai import OpenAI
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os
import logging
import json
import traceback
import inspect
import httpx

from ..schemas.crm import DealAIDraftRequest, DealAIDraftResponse, TaskAIDraftRequest, TaskAIDraftResponse
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
    
    Extracts all possible vehicle features that can be determined from the title:
    - Basic info: used, year, make, model, trim, bodystyle, doors
    - Colors: exteriorColor, interiorColor
    - Specifications: transmission, fuelType, driveType, engine, engine_size, mpg
    
    Args:
        title: String containing vehicle information (e.g., "Used 2020 Toyota Camry XLE Sedan 4D Automatic")
    
    Returns:
        Dictionary with keys: year, make, model, trim, bodystyle, exteriorColor, interiorColor,
        transmission, fuelType, driveType, engine, engine_size, mpg (all optional except year/make/model)
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
    
    # Create comprehensive prompt for OpenAI
    prompt = f"""Extract ALL possible vehicle information from the following title string:

Title: {title}

Extract the following information if mentioned:
1. used - whether the vehicle is used (true/false)
2. year - the model year (integer, e.g., 2020)
3. make - the manufacturer (e.g., Toyota, Ford, Honda)
4. model - the model name (e.g., Camry, F-150, Accord)
5. trim - the trim level if mentioned (e.g., XLE, Limited, SE)
6. bodystyle - the body style (e.g., Sedan, SUV, Truck, Coupe, Hatchback, Wagon)
7. doors - number of doors if mentioned (e.g., 2, 4)
8. exteriorColor - exterior color if mentioned (e.g., Black, White, Silver, Red, Blue)
9. interiorColor - interior color if mentioned (e.g., Black, Beige, Gray, Tan)
10. transmission - transmission type if mentioned (e.g., Automatic, Manual, CVT, DCT)
11. fuelType - fuel type if mentioned (e.g., Gasoline, Diesel, Hybrid, Electric, Plug-in Hybrid)
12. driveType - drivetrain if mentioned (e.g., FWD, RWD, AWD, 4WD, Front-Wheel Drive, All-Wheel Drive)
13. engine - engine description if mentioned (e.g., "3.5L V6", "2.0L Turbo", "Electric")
14. engine_size - engine size if mentioned (e.g., "3.5", "2.0", "1.8")
15. mpg - fuel economy if mentioned (e.g., "25", "30", "35 mpg")

Respond in JSON format with these exact keys:
{{
    "used": true or false,
    "year": 2020,
    "make": "Toyota",
    "model": "Camry",
    "trim": "XLE" or null,
    "bodystyle": "Sedan" or null,
    "doors": 4 or null,
    "exteriorColor": "Black" or null,
    "interiorColor": "Beige" or null,
    "transmission": "Automatic" or null,
    "fuelType": "Gasoline" or null,
    "driveType": "FWD" or null,
    "engine": "3.5L V6" or null,
    "engine_size": "3.5" or null,
    "mpg": "25" or null
}}

If any field cannot be determined, use null for that field. Always return valid JSON.
Be thorough and extract all information that can be reasonably inferred from the title."""

    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a vehicle information extraction assistant. Always respond with valid JSON only. Extract ALL possible vehicle details accurately from title strings. Be thorough and extract colors, transmission, fuel type, drivetrain, engine, and other specifications when mentioned."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent extraction
            max_tokens=400  # Increased for more fields
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
        
        # Helper function to normalize string values
        def _norm_str(value):
            if value is None:
                return None
            if isinstance(value, str):
                value = value.strip()
                return value if value else None
            return str(value).strip() if value else None
        
        # Return extracted data with all possible features
        result = {
            "year": year,
            "make": _norm_str(make),
            "model": _norm_str(model),
            "trim": _norm_str(ai_data.get("trim")),
            "bodystyle": _norm_str(ai_data.get("bodystyle")),
            "exteriorColor": _norm_str(ai_data.get("exteriorColor")),
            "interiorColor": _norm_str(ai_data.get("interiorColor")),
            "transmission": _norm_str(ai_data.get("transmission")),
            "fuelType": _norm_str(ai_data.get("fuelType")),
            "driveType": _norm_str(ai_data.get("driveType")),
            "engine": _norm_str(ai_data.get("engine")),
            "engine_size": _norm_str(ai_data.get("engine_size")),
            "mpg": _norm_str(ai_data.get("mpg"))
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


def generate_task_draft(request: TaskAIDraftRequest) -> TaskAIDraftResponse:
    """Generate AI-powered draft for task creation"""
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
    
    # Step 3: Initialize OpenAI client
    logging.info("Attempting to initialize OpenAI client for task draft...")
    try:
        client = _get_openai_client()
        logging.info("OpenAI client initialized successfully")
    except ValueError:
        raise
          
    # Build context for AI prompt
    context_parts = []
    
    if request.deal_id:
        context_parts.append(f"Related Deal ID: {request.deal_id}")
    
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
        if contact.get('email'):
            contact_desc += f" (Email: {contact.get('email')})"
        if contact.get('phone'):
            contact_desc += f" (Phone: {contact.get('phone')})"
        context_parts.append(contact_desc)
    
    if request.additional_context:
        context_parts.append(f"Additional context: {request.additional_context}")
    
    context = "\n".join(context_parts) if context_parts else "General task"
    
    # Create prompt for OpenAI
    prompt = f"""You are a CRM assistant helping to create a professional task record. 
Based on the following information from a related deal, generate a task draft:

{context}

Please provide:
1. A clear and actionable task title (e.g., "Follow up with John Smith about 2024 Toyota Camry")
2. A detailed task description (2-3 sentences explaining what needs to be done, including relevant details from the deal)

Respond in JSON format with these exact keys:
{{
    "title": "task title here",
    "description": "task description here"
}}"""

    # Call OpenAI API
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a professional CRM assistant specializing in task management. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=300
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
        
        # Try to extract title from content
        title = "AI Generated Task"
        if request.contact_info:
            title = f"Follow up with {request.contact_info.get('first_name', '')} {request.contact_info.get('last_name', '')}"
        
        ai_data = {
            "title": title,
            "description": content[:300] if len(content) > 300 else content or "AI-generated task. Please review and update with specific details."
        }
    
    # Validate and set defaults
    title = ai_data.get("title", "AI Generated Task")
    description = ai_data.get("description", "Task created with AI assistance. Please review and update with specific details.")
    
    return TaskAIDraftResponse(
        title=title,
        description=description
    )


def calculate_listing_score(listing_data: Dict[str, Any], contact_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Calculate listing score using AI based on all listing fields and contact information.
    
    Args:
        listing_data: Dictionary containing all listing fields (price, miles, dom, condition, etc.)
        contact_data: Optional dictionary containing contact information (name, email, phone, company, etc.)
    
    Returns:
        Dictionary with keys: score (int 0-100), buyMax (float), reasonCodes (list of strings)
    """
    # Check API key configuration
    if not settings.OPENAI_API_KEY:
        logging.warning("OpenAI API key not configured, falling back to default scoring")
        # Fallback to basic scoring if AI is not available
        return _fallback_score_calculation(listing_data)
    
    try:
        client = _get_openai_client()
    except ValueError:
        logging.warning("Failed to initialize OpenAI client, falling back to default scoring")
        return _fallback_score_calculation(listing_data)
    
    # Build comprehensive listing information string
    listing_info_parts = []
    
    # Vehicle information
    if listing_data.get('year'):
        listing_info_parts.append(f"Year: {listing_data.get('year')}")
    if listing_data.get('make'):
        listing_info_parts.append(f"Make: {listing_data.get('make')}")
    if listing_data.get('model'):
        listing_info_parts.append(f"Model: {listing_data.get('model')}")
    if listing_data.get('trim'):
        listing_info_parts.append(f"Trim: {listing_data.get('trim')}")
    if listing_data.get('vin'):
        listing_info_parts.append(f"VIN: {listing_data.get('vin')}")
    
    # Pricing and market data
    if listing_data.get('price'):
        listing_info_parts.append(f"Price: ${listing_data.get('price'):,.0f}")
    if listing_data.get('mmr'):
        listing_info_parts.append(f"MMR (Manheim Market Report): ${listing_data.get('mmr'):,.0f}")
    if listing_data.get('miles'):
        listing_info_parts.append(f"Miles: {listing_data.get('miles'):,}")
    if listing_data.get('dom'):
        listing_info_parts.append(f"Days on Market: {listing_data.get('dom')}")
    
    # Vehicle condition and details
    if listing_data.get('condition'):
        listing_info_parts.append(f"Condition: {listing_data.get('condition')}")
    if listing_data.get('overallRating'):
        listing_info_parts.append(f"Overall Rating: {listing_data.get('overallRating')}")
    if listing_data.get('detailedRatings'):
        listing_info_parts.append(f"Detailed Ratings: {', '.join(listing_data.get('detailedRatings', []))}")
    if listing_data.get('cleanTitle') is not None:
        listing_info_parts.append(f"Clean Title: {'Yes' if listing_data.get('cleanTitle') else 'No'}")
    
    # Vehicle specifications
    if listing_data.get('bodyStyle'):
        listing_info_parts.append(f"Body Style: {listing_data.get('bodyStyle')}")
    if listing_data.get('transmission'):
        listing_info_parts.append(f"Transmission: {listing_data.get('transmission')}")
    if listing_data.get('fuelType'):
        listing_info_parts.append(f"Fuel Type: {listing_data.get('fuelType')}")
    if listing_data.get('driveType'):
        listing_info_parts.append(f"Drivetrain: {listing_data.get('driveType')}")
    if listing_data.get('engine'):
        listing_info_parts.append(f"Engine: {listing_data.get('engine')}")
    if listing_data.get('mpg'):
        listing_info_parts.append(f"MPG: {listing_data.get('mpg')}")
    if listing_data.get('exteriorColor'):
        listing_info_parts.append(f"Exterior Color: {listing_data.get('exteriorColor')}")
    if listing_data.get('interiorColor'):
        listing_info_parts.append(f"Interior Color: {listing_data.get('interiorColor')}")
    
    # Location and source
    if listing_data.get('location'):
        listing_info_parts.append(f"Location: {listing_data.get('location')}")
    if listing_data.get('source'):
        listing_info_parts.append(f"Source: {listing_data.get('source')}")
    
    # Seller information
    if listing_data.get('sellerName'):
        listing_info_parts.append(f"Seller Name: {listing_data.get('sellerName')}")
    if listing_data.get('phoneNumber'):
        listing_info_parts.append(f"Phone Number: {listing_data.get('phoneNumber')}")
    if listing_data.get('sellerDescription'):
        listing_info_parts.append(f"Seller Description: {listing_data.get('sellerDescription')}")
    if listing_data.get('sellerJoinedDate'):
        listing_info_parts.append(f"Seller Joined Date: {listing_data.get('sellerJoinedDate')}")
    if listing_data.get('paidStatus'):
        listing_info_parts.append(f"Paid Status: {listing_data.get('paidStatus')}")
    
    # Additional notes
    if listing_data.get('notes'):
        listing_info_parts.append(f"Notes: {listing_data.get('notes')}")
    
    listing_info = "\n".join(listing_info_parts)
    
    # Build contact information string
    contact_info = ""
    if contact_data:
        contact_parts = []
        if contact_data.get('first_name') or contact_data.get('last_name'):
            contact_parts.append(f"Name: {contact_data.get('first_name', '')} {contact_data.get('last_name', '')}".strip())
        if contact_data.get('email'):
            contact_parts.append(f"Email: {contact_data.get('email')}")
        if contact_data.get('phone'):
            contact_parts.append(f"Phone: {contact_data.get('phone')}")
        if contact_data.get('company'):
            contact_parts.append(f"Company: {contact_data.get('company')}")
        if contact_parts:
            contact_info = "\nContact Information:\n" + "\n".join(contact_parts)
    
    # Create comprehensive prompt for OpenAI
    prompt = f"""You are an expert automotive valuation and scoring system. Analyze the following vehicle listing and calculate a score from 0-100 based on:
1. Price competitiveness (compare to MMR if available)
2. Vehicle condition and ratings
3. Days on market (lower is better)
4. Mileage (lower is better for most vehicles)
5. Vehicle specifications and features
6. Seller information and credibility
7. Market factors and location
8. Contact information quality (if available)

Vehicle Listing Information:
{listing_info}
{contact_info}

Provide a comprehensive score analysis. Consider:
- Price vs MMR (if available): Is the price competitive?
- Condition: Excellent condition vehicles score higher
- DOM: Lower days on market indicate higher demand
- Mileage: Lower mileage generally increases value
- Clean title: Vehicles with clean titles are more valuable
- Seller credibility: Established sellers with good ratings score higher
- Market factors: Location, demand, and market conditions

Respond in JSON format with these exact keys:
{{
    "score": 75,
    "buyMax": 25000.00,
    "reasonCodes": ["LowMiles", "GoodCondition", "CompetitivePrice"],
    "explanation": "Brief explanation of the score"
}}

Score Guidelines:
- 90-100: Exceptional deal, highly recommended
- 80-89: Very good deal, strong recommendation
- 70-79: Good deal, worth considering
- 60-69: Average deal, proceed with caution
- 50-59: Below average, negotiate or pass
- 0-49: Poor deal, not recommended

BuyMax should be a realistic maximum purchase price recommendation based on the analysis.
ReasonCodes should be 1-5 short descriptive codes explaining the score (e.g., "LowMiles", "HighPrice", "AgedInventory", "CleanTitle", "GoodCondition", "CompetitivePrice", "HighDOM", "LowMMR", etc.)."""

    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert automotive valuation and scoring system. Always respond with valid JSON only. Provide accurate, data-driven scores based on comprehensive vehicle analysis."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent scoring
            max_tokens=500
        )
        
        # Parse response
        content = response.choices[0].message.content
        if content is None:
            logging.error("OpenAI API returned None content for scoring")
            return _fallback_score_calculation(listing_data)
        
        content = content.strip()
        
        # Try to extract JSON from response (handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        try:
            ai_data = json.loads(content)
        except json.JSONDecodeError as e:
            logging.warning(f"Failed to parse AI scoring response as JSON: {content}")
            return _fallback_score_calculation(listing_data)
        
        # Validate and extract score data
        score = ai_data.get("score", 50)
        buy_max = ai_data.get("buyMax", 0.0)
        reason_codes = ai_data.get("reasonCodes", [])
        
        # Ensure score is within valid range
        score = max(0, min(100, int(score)))
        
        # Ensure buyMax is a valid float
        try:
            buy_max = float(buy_max)
        except (ValueError, TypeError):
            # Calculate buyMax based on price if AI didn't provide valid value
            price = listing_data.get('price', 0)
            buy_max = price * 1.03 if price > 0 else 0.0
        
        # Ensure reasonCodes is a list
        if not isinstance(reason_codes, list):
            reason_codes = ["Heuristic"]
        
        return {
            "score": score,
            "buyMax": round(buy_max, 2),
            "reasonCodes": reason_codes
        }
        
    except Exception as e:
        logging.error(f"Error calculating AI score: {str(e)}")
        logging.error(traceback.format_exc())
        return _fallback_score_calculation(listing_data)


def _fallback_score_calculation(listing_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback scoring calculation when AI is not available.
    Uses a simplified version of the original scoring logic.
    """
    reasons = []
    dom = listing_data.get('dom', 30)
    miles = listing_data.get('miles', 50000)
    price = listing_data.get('price', 25000)
    
    dom_penalty = max(0, 30 - dom) / 30
    miles_penalty = max(0, 100_000 - miles) / 100_000
    base = 40 * dom_penalty + 40 * miles_penalty
    
    price_boost = 0
    if price < 25_000:
        price_boost = min(20, (25_000 - price) / 1000)
        reasons.append("PriceVsBaseline")
    if dom < 20:
        reasons.append("LowDOM")
    if miles < 50_000:
        reasons.append("LowMiles")
    
    score_val = int(max(0, min(100, base + price_boost)))
    buy_max = max(0.0, price * 1.03)
    if dom > 45:
        buy_max = price * 0.98
        reasons.append("AgedInventory")
    
    return {
        "score": score_val,
        "buyMax": round(buy_max, 2),
        "reasonCodes": reasons or ["Heuristic"]
    }

