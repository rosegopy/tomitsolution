from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import jwt
import bcrypt
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated

# Initialize dotenv and path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB Client setup
mongo_url = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', "test_database")]

# Logging config
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI Application
app = FastAPI(title="IT Asset Recovery API")

# JWT configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "e9bc7e7b8c2db76da5465e6df7db0675bf3d89ef678d4c927f98e79cbfa600a9")
JWT_ALGORITHM = "HS256"

# Helper for Pydantic ObjectId coercion
PyObjectId = Annotated[str, BeforeValidator(str)]

# Base Class with Mongo to/from helpers
class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True, json_encoders={datetime: lambda dt: dt.isoformat()})

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Auth dependency
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        
        # Pull from DB
        user = await db.users.find_one({"email": payload["email"]})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required")
    return current_user

# Models
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str

class AssetQuoteItem(BaseModel):
    category: str
    specification: str
    condition: str
    quantity: int
    estimated_value: float

class QuoteCreate(BaseModel):
    client_name: str
    company_name: Optional[str] = None
    email: str
    phone: str
    city: str
    equipment_items: List[AssetQuoteItem]
    custom_message: Optional[str] = None
    uploaded_files: Optional[List[str]] = None

class QuoteResponse(BaseModel):
    id: str
    client_name: str
    company_name: Optional[str] = None
    email: str
    phone: str
    city: str
    equipment_items: List[AssetQuoteItem]
    custom_message: Optional[str] = None
    uploaded_files: List[str] = []
    status: str
    created_at: str
    estimated_total: float

# Router declaration
api_router = APIRouter(prefix="/api")

# Auth Endpoints
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserRegister):
    email_lower = user.email.lower().strip()
    existing = await db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    user_id = str(uuid.uuid4())
    
    new_user = {
        "_id": user_id,
        "name": user.name,
        "email": email_lower,
        "password_hash": hashed,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    return UserResponse(id=user_id, name=user.name, email=email_lower, role="user")

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    email_lower = credentials.email.lower().strip()
    user = await db.users.find_one({"email": email_lower})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    role = user.get("role", "user")
    
    access_token = create_access_token(user_id, email_lower, role)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production with SSL
        samesite="lax",
        max_age=3600,
        path="/"
    )
    
    return {
        "access_token": access_token,
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "email": email_lower,
            "role": role
        }
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"]
    )

# Lead / Quotes endpoints
@api_router.post("/quotes", response_model=QuoteResponse)
async def create_quote(quote_data: QuoteCreate):
    quote_id = str(uuid.uuid4())
    estimated_total = sum(item.estimated_value * item.quantity for item in quote_data.equipment_items)
    
    doc = {
        "_id": quote_id,
        "client_name": quote_data.client_name,
        "company_name": quote_data.company_name,
        "email": quote_data.email,
        "phone": quote_data.phone,
        "city": quote_data.city,
        "equipment_items": [item.model_dump() for item in quote_data.equipment_items],
        "custom_message": quote_data.custom_message,
        "uploaded_files": quote_data.uploaded_files or [],
        "status": "Pending Evaluation",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "estimated_total": estimated_total
    }
    
    await db.quotes.insert_one(doc)
    doc["id"] = quote_id
    return QuoteResponse(**doc)

@api_router.get("/quotes/admin", response_model=List[QuoteResponse])
async def get_quotes_admin(_: dict = Depends(get_admin_user)):
    quotes_cursor = db.quotes.find()
    quotes = await quotes_cursor.to_list(1000)
    response_list = []
    for q in quotes:
        q["id"] = q["_id"]
        response_list.append(QuoteResponse(**q))
    return response_list

@api_router.patch("/quotes/admin/{quote_id}", response_model=QuoteResponse)
async def update_quote_status(quote_id: str, payload: dict, _: dict = Depends(get_admin_user)):
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Missing status field")
    
    result = await db.quotes.find_one_and_update(
        {"_id": quote_id},
        {"$set": {"status": new_status}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    result["id"] = result["_id"]
    return QuoteResponse(**result)

@api_router.get("/quotes/admin/stats", dependencies=[Depends(get_admin_user)])
async def get_quote_stats():
    # Fetch simple counts and statistics
    total_quotes = await db.quotes.count_documents({})
    pending_quotes = await db.quotes.count_documents({"status": "Pending Evaluation"})
    approved_quotes = await db.quotes.count_documents({"status": "Approved"})
    completed_quotes = await db.quotes.count_documents({"status": "Completed & Paid"})
    
    quotes_cursor = db.quotes.find()
    quotes = await quotes_cursor.to_list(1000)
    
    total_valuation = sum(q.get("estimated_total", 0.0) for q in quotes)
    
    # Calculate categories chart data
    categories = {}
    for q in quotes:
        for item in q.get("equipment_items", []):
            cat = item.get("category", "Other")
            categories[cat] = categories.get(cat, 0) + item.get("quantity", 1)
            
    category_breakdown = [{"name": k, "value": v} for k, v in categories.items()]
    
    return {
        "total_quotes": total_quotes,
        "pending_quotes": pending_quotes,
        "approved_quotes": approved_quotes,
        "completed_quotes": completed_quotes,
        "total_valuation": total_valuation,
        "category_breakdown": category_breakdown
    }

# Include main router
app.include_router(api_router)

# Enable CORS using explicit environment variables and frontend local origin
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["https://itasset-buyback.preview.emergentagent.com", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup events
@app.on_event("startup")
async def seed_admin():
    # Ensure indexes
    await db.users.create_index("email", unique=True)
    
    # Seed Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@reitindia.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "EnterpriseRecovery2026!")
    
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "name": "ReIT India Admin",
            "email": admin_email,
            "password_hash": hashed,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Seeded admin: {admin_email}")
    else:
        # Update admin password if env changed
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}}
            )
            logger.info("Updated admin password hash based on .env")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
