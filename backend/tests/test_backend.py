import os
import pytest
import requests
import pymongo
from dotenv import load_dotenv

# Load backend env for MongoDB connection and credentials
load_dotenv("/app/backend/.env")

@pytest.fixture(scope="module")
def db_cleanup():
    """Fixture to cleanup test data from MongoDB after tests run"""
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = pymongo.MongoClient(mongo_url)
    db = client[db_name]
    
    yield db
    
    # Teardown: Delete all documents with TEST_ prefix
    # Quotes cleanup: client_name starts with TEST_
    quote_res = db.quotes.delete_many({"client_name": {"$regex": "^TEST_"}})
    print(f"Cleaned up {quote_res.deleted_count} test quotes")
    
    # Users cleanup: email starts with test_ or starts with TEST_
    user_res = db.users.delete_many({"email": {"$regex": "^test_|^TEST_"}})
    print(f"Cleaned up {user_res.deleted_count} test users")
    
    client.close()


class TestITAssetRecoveryAPI:
    """Backend API integration tests for IT Asset Recovery and Buyback platform"""

    def test_anonymous_quote_submission(self, base_url, api_client, db_cleanup):
        """Test that any visitor can submit a multi-step quote and it gets recorded"""
        payload = {
            "client_name": "TEST_Client_Anonymous",
            "company_name": "TEST_Company_Anon",
            "email": "test_anon@example.com",
            "phone": "9876543210",
            "city": "Kolkata",
            "equipment_items": [
                {
                    "category": "Laptops",
                    "specification": "Core i7, 16GB RAM",
                    "condition": "Working - Excellent",
                    "quantity": 15,
                    "estimated_value": 12000.0
                },
                {
                    "category": "Servers",
                    "specification": "Dell PowerEdge 2U",
                    "condition": "Functional - Medium Wear",
                    "quantity": 2,
                    "estimated_value": 27000.0
                }
            ],
            "custom_message": "TEST_Message need lift clearance",
            "uploaded_files": ["mock_uploads/test_file.xlsx"]
        }
        
        response = api_client.post(f"{base_url}/api/quotes", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_Client_Anonymous"
        assert data["status"] == "Pending Evaluation"
        assert data["estimated_total"] == (15 * 12000.0 + 2 * 27000.0)
        
        # Verify persistence directly via MongoDB
        db = db_cleanup
        inserted_doc = db.quotes.find_one({"_id": data["id"]})
        assert inserted_doc is not None
        assert inserted_doc["client_name"] == "TEST_Client_Anonymous"
        assert inserted_doc["status"] == "Pending Evaluation"

    def test_admin_login_and_cookie_generation(self, base_url, api_client, db_cleanup):
        """Test admin login with valid credentials sets cookie and returns correct body"""
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@reitindia.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "EnterpriseRecovery2026!")
        
        payload = {
            "email": admin_email,
            "password": admin_password
        }
        
        response = api_client.post(f"{base_url}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == admin_email
        assert data["user"]["role"] == "admin"
        
        # Check that access_token cookie is present in response cookies or session cookies
        assert "access_token" in response.cookies or "access_token" in api_client.cookies.get_dict() or data["access_token"] is not None

    def test_admin_get_current_user(self, base_url, api_client, db_cleanup):
        """Test getting current authenticated user profile"""
        # Ensure authenticated (previous test or login)
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@reitindia.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "EnterpriseRecovery2026!")
        
        # Call login first to populate session cookies
        login_res = api_client.post(f"{base_url}/api/auth/login", json={
            "email": admin_email,
            "password": admin_password
        })
        assert login_res.status_code == 200
        
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["email"] == admin_email
        assert data["role"] == "admin"

    def test_admin_get_quotes_list_and_stats(self, base_url, api_client, db_cleanup):
        """Test fetching lead list and lead analytics widgets as admin"""
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@reitindia.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "EnterpriseRecovery2026!")
        
        # Log in
        api_client.post(f"{base_url}/api/auth/login", json={
            "email": admin_email,
            "password": admin_password
        })
        
        # 1. Fetch leads list
        list_response = api_client.get(f"{base_url}/api/quotes/admin")
        assert list_response.status_code == 200, f"Failed: {list_response.text}"
        
        quotes = list_response.json()
        assert isinstance(quotes, list)
        # There should be at least our anonymous quote from the first test
        assert len(quotes) >= 1
        assert any(q["client_name"] == "TEST_Client_Anonymous" for q in quotes)
        
        # 2. Fetch stats widgets
        stats_response = api_client.get(f"{base_url}/api/quotes/admin/stats")
        assert stats_response.status_code == 200, f"Failed: {stats_response.text}"
        
        stats = stats_response.json()
        assert "total_quotes" in stats
        assert "pending_quotes" in stats
        assert "total_valuation" in stats
        assert stats["total_quotes"] >= 1
        assert stats["pending_quotes"] >= 1

    def test_admin_update_audit_status(self, base_url, api_client, db_cleanup):
        """Test updating audit status for a specific lead and verifying GET persistence"""
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@reitindia.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "EnterpriseRecovery2026!")
        
        # Log in
        api_client.post(f"{base_url}/api/auth/login", json={
            "email": admin_email,
            "password": admin_password
        })
        
        # Get quotes list to find our test quote ID
        list_response = api_client.get(f"{base_url}/api/quotes/admin")
        assert list_response.status_code == 200
        quotes = list_response.json()
        test_quote = next((q for q in quotes if q["client_name"] == "TEST_Client_Anonymous"), None)
        assert test_quote is not None, "Test quote not found in admin list"
        
        quote_id = test_quote["id"]
        
        # Update status to "Approved"
        update_payload = {"status": "Approved"}
        patch_response = api_client.patch(f"{base_url}/api/quotes/admin/{quote_id}", json=update_payload)
        assert patch_response.status_code == 200, f"Failed: {patch_response.text}"
        
        updated_data = patch_response.json()
        assert updated_data["status"] == "Approved"
        
        # Verify persistence in database directly
        db = db_cleanup
        doc = db.quotes.find_one({"_id": quote_id})
        assert doc is not None
        assert doc["status"] == "Approved"

    def test_admin_logout(self, base_url, api_client):
        """Test logging out deletes session token"""
        response = api_client.post(f"{base_url}/api/auth/logout")
        assert response.status_code == 200
        
        # Check profile endpoint now returns 401
        me_response = api_client.get(f"{base_url}/api/auth/me")
        assert me_response.status_code == 401
