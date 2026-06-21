"""
Backend test suite for TomIT Solution
Covers: auth, public quote submission with uploaded file, file upload + admin file fetch,
contact create/list, admin quote list/stats/status update, cleanup.
"""
import os
import io
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://itasset-buyback.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@tomitsolution.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "EnterpriseRecovery2026!")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module", autouse=True)
def cleanup(db):
    yield
    db.quotes.delete_many({"client_name": {"$regex": "^TEST_"}})
    db.contacts.delete_many({"name": {"$regex": "^TEST_"}})


# --- Auth tests ---
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "admin"
        assert "access_token" in body
        assert "access_token" in api_client.cookies

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 400

    def test_me_endpoint(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# --- File upload tests ---
class TestFileUpload:
    def test_upload_image_public(self):
        # 1x1 PNG bytes
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C63F8CFC0000000030001"
            "5E22DE780000000049454E44AE426082"
        )
        files = {"file": ("test_pixel.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{BASE_URL}/api/uploads", files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        assert body["filename"] == "test_pixel.png"
        assert body["content_type"].startswith("image/")
        pytest.uploaded_file_id = body["id"]
        pytest.uploaded_file_obj = body

    def test_upload_rejects_bad_extension(self):
        files = {"file": ("bad.exe", io.BytesIO(b"abc"), "application/octet-stream")}
        r = requests.post(f"{BASE_URL}/api/uploads", files=files)
        assert r.status_code == 400

    def test_file_download_requires_admin(self):
        fid = getattr(pytest, "uploaded_file_id", None)
        if not fid:
            pytest.skip("upload prior test failed")
        r = requests.get(f"{BASE_URL}/api/files/{fid}")
        assert r.status_code == 401

    def test_file_download_admin_ok(self, admin_client):
        fid = getattr(pytest, "uploaded_file_id", None)
        if not fid:
            pytest.skip("upload prior test failed")
        r = admin_client.get(f"{BASE_URL}/api/files/{fid}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 0


# --- Quotes ---
class TestQuotes:
    def test_create_quote_with_uploaded_file(self):
        upl = getattr(pytest, "uploaded_file_obj", None)
        assert upl is not None, "Need a prior uploaded file"
        payload = {
            "client_name": "TEST_QuoteClient",
            "company_name": "TEST_Corp",
            "email": "test_q@example.com",
            "phone": "9876543210",
            "city": "Mumbai",
            "equipment_items": [
                {"category": "Laptops", "specification": "i7 16GB",
                 "condition": "Working - Excellent", "quantity": 5, "estimated_value": 12000.0}
            ],
            "custom_message": "TEST_msg",
            "uploaded_files": [upl],
        }
        r = requests.post(f"{BASE_URL}/api/quotes", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "Pending Evaluation"
        assert body["estimated_total"] == 60000.0
        assert len(body["uploaded_files"]) == 1
        assert body["uploaded_files"][0]["id"] == upl["id"]
        pytest.test_quote_id = body["id"]

    def test_admin_list_quotes(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/quotes/admin")
        assert r.status_code == 200
        ids = [q["id"] for q in r.json()]
        assert getattr(pytest, "test_quote_id", None) in ids

    def test_admin_stats(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/quotes/admin/stats")
        assert r.status_code == 200
        data = r.json()
        for key in ("total_quotes", "pending_quotes", "approved_quotes",
                    "completed_quotes", "total_valuation", "category_breakdown"):
            assert key in data
        assert data["total_quotes"] >= 1

    def test_admin_update_status(self, admin_client):
        qid = getattr(pytest, "test_quote_id", None)
        assert qid
        r = admin_client.patch(f"{BASE_URL}/api/quotes/admin/{qid}", json={"status": "Approved"})
        assert r.status_code == 200
        assert r.json()["status"] == "Approved"

    def test_admin_endpoints_require_auth(self):
        r = requests.get(f"{BASE_URL}/api/quotes/admin")
        assert r.status_code == 401


# --- Contact ---
class TestContact:
    def test_create_contact_public(self):
        r = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "TEST_Contact", "email": "tc@example.com", "message": "TEST hello"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "New"
        assert body["name"] == "TEST_Contact"
        pytest.test_contact_id = body["id"]

    def test_admin_list_contacts(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/contact/admin")
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "TEST_Contact" in names

    def test_contact_admin_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/contact/admin")
        assert r.status_code == 401
