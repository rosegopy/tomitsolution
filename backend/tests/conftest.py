import os
import pytest
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv("/app/frontend/.env")

@pytest.fixture(scope="session")
def base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fallback to local
        url = "http://localhost:8001"
    return url.rstrip("/")

@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
