from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import jwt
import bcrypt
import uuid
import requests
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

# Object Storage configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "tomit-solution"
storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "csv": "text/csv", "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

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
    quantity: int = Field(ge=1, le=1000)
    estimated_value: float

class UploadedFileRef(BaseModel):
    id: str
    filename: str
    storage_path: str
    content_type: Optional[str] = None

class QuoteCreate(BaseModel):
    client_name: str
    company_name: Optional[str] = None
    email: str
    phone: str
    city: str
    equipment_items: List[AssetQuoteItem]
    custom_message: Optional[str] = None
    uploaded_files: Optional[List[UploadedFileRef]] = None

class QuoteResponse(BaseModel):
    id: str
    client_name: str
    company_name: Optional[str] = None
    email: str
    phone: str
    city: str
    equipment_items: List[AssetQuoteItem]
    custom_message: Optional[str] = None
    uploaded_files: List[UploadedFileRef] = []
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
        secure=True,
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
        "uploaded_files": [f.model_dump() for f in quote_data.uploaded_files] if quote_data.uploaded_files else [],
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

# File Upload Endpoints
ALLOWED_EXT = {"jpg", "jpeg", "png", "gif", "webp", "pdf", "csv", "xls", "xlsx", "doc", "docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@api_router.post("/uploads")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: images, PDF, Excel, Word.")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB per file.")
    file_id = str(uuid.uuid4())
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed. Please try again.")
    storage_path = result.get("path", path)
    await db.files.insert_one({
        "_id": file_id,
        "storage_path": storage_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": len(data),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"id": file_id, "filename": file.filename, "storage_path": storage_path, "content_type": content_type}

@api_router.get("/files/{file_id}")
async def download_file(file_id: str, _: dict = Depends(get_admin_user)):
    record = await db.files.find_one({"_id": file_id, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = get_object(record["storage_path"])
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve file")
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Content-Disposition": f'inline; filename="{record.get("original_filename", file_id)}"'}
    )

# Contact Message Endpoints
class ContactCreate(BaseModel):
    name: str
    email: str
    message: str

class ContactResponse(BaseModel):
    id: str
    name: str
    email: str
    message: str
    status: str
    created_at: str

@api_router.post("/contact", response_model=ContactResponse)
async def create_contact(data: ContactCreate):
    contact_id = str(uuid.uuid4())
    doc = {
        "_id": contact_id,
        "name": data.name,
        "email": data.email,
        "message": data.message,
        "status": "New",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(doc)
    return ContactResponse(id=contact_id, name=data.name, email=data.email, message=data.message, status="New", created_at=doc["created_at"])

@api_router.get("/contact/admin", response_model=List[ContactResponse])
async def get_contacts_admin(_: dict = Depends(get_admin_user)):
    cursor = db.contacts.find().sort("created_at", -1)
    contacts = await cursor.to_list(1000)
    return [ContactResponse(id=c["_id"], name=c["name"], email=c["email"], message=c["message"], status=c.get("status", "New"), created_at=c["created_at"]) for c in contacts]


# Pricing Rate Endpoints (admin-managed valuation rates)
DEFAULT_PRICING = [
    {"name": "Laptops", "base_value": 12000},
    {"name": "Desktops", "base_value": 8000},
    {"name": "Servers", "base_value": 45000},
    {"name": "Networking Gears", "base_value": 20000},
    {"name": "Printers", "base_value": 6000},
    {"name": "RAM 8GB DDR4", "base_value": 800},
    {"name": "SSD 256GB", "base_value": 1500},
    {"name": "SSD 512GB", "base_value": 2800},
    {"name": "Other ITAD Assets", "base_value": 5000},
]

class PricingCreate(BaseModel):
    name: str
    base_value: float = Field(gt=0)

class PricingUpdate(BaseModel):
    name: Optional[str] = None
    base_value: Optional[float] = Field(default=None, gt=0)
    active: Optional[bool] = None

class PricingItem(BaseModel):
    id: str
    name: str
    base_value: float
    active: bool

@api_router.get("/pricing", response_model=List[PricingItem])
async def get_pricing():
    cursor = db.pricing.find({"active": True}).sort("created_at", 1)
    items = await cursor.to_list(1000)
    return [PricingItem(id=i["_id"], name=i["name"], base_value=i["base_value"], active=i.get("active", True)) for i in items]

@api_router.get("/pricing/admin", response_model=List[PricingItem])
async def get_pricing_admin(_: dict = Depends(get_admin_user)):
    cursor = db.pricing.find().sort("created_at", 1)
    items = await cursor.to_list(1000)
    return [PricingItem(id=i["_id"], name=i["name"], base_value=i["base_value"], active=i.get("active", True)) for i in items]

@api_router.post("/pricing/admin", response_model=PricingItem)
async def create_pricing(data: PricingCreate, _: dict = Depends(get_admin_user)):
    item_id = str(uuid.uuid4())
    doc = {"_id": item_id, "name": data.name, "base_value": data.base_value, "active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.pricing.insert_one(doc)
    return PricingItem(id=item_id, name=data.name, base_value=data.base_value, active=True)

@api_router.patch("/pricing/admin/{item_id}", response_model=PricingItem)
async def update_pricing(item_id: str, data: PricingUpdate, _: dict = Depends(get_admin_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.pricing.find_one_and_update({"_id": item_id}, {"$set": updates}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Pricing item not found")
    return PricingItem(id=result["_id"], name=result["name"], base_value=result["base_value"], active=result.get("active", True))

@api_router.delete("/pricing/admin/{item_id}")
async def delete_pricing(item_id: str, _: dict = Depends(get_admin_user)):
    result = await db.pricing.delete_one({"_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing item not found")
    return {"message": "Deleted"}

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

    # Initialize object storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

    # Seed default pricing rates (only if empty)
    if await db.pricing.count_documents({}) == 0:
        for p in DEFAULT_PRICING:
            await db.pricing.insert_one({
                "_id": str(uuid.uuid4()),
                "name": p["name"],
                "base_value": p["base_value"],
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        logger.info("Seeded default pricing rates")
    
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
