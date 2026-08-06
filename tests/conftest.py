"""
Pytest configuration and shared fixtures for VibeMap AI tests.
"""

import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient
from app.main import app


@pytest.fixture
def mock_uuid():
    """Generate a consistent UUID for testing."""
    return uuid4()


@pytest.fixture
def future_date():
    """Generate a future date for testing."""
    return datetime.utcnow() + timedelta(days=30)


@pytest.fixture
def past_date():
    """Generate a past date for testing."""
    return datetime.utcnow() - timedelta(days=30)


@pytest.fixture
def sample_event_data(mock_uuid, future_date):
    """Sample event data for testing."""
    return {
        "title": "Summer Jazz Festival",
        "description": "Annual jazz festival featuring local and international artists. Bring your own chairs and blankets. Food trucks will be available.",
        "municipality_id": str(mock_uuid),
        "owner_id": str(mock_uuid),
        "vibe_tags": ["music", "outdoor", "family-friendly"],
        "event_date": future_date.isoformat(),
        "location_address": "Central Park Amphitheater",
        "price": 25.00,
        "image_url": "https://example.com/image.jpg"
    }


@pytest.fixture
def sample_booking_data(mock_uuid):
    """Sample booking data for testing."""
    return {
        "event_id": str(mock_uuid),
        "user_id": str(mock_uuid),
    }


@pytest.fixture
def sample_event_response(mock_uuid, sample_event_data):
    """Sample event API response."""
    return {
        **sample_event_data,
        "id": str(mock_uuid),
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    return mock_client


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="This is a test AI response."))
    ]
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


@pytest.fixture
async def async_client():
    """Async HTTP client for testing FastAPI endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_supabase_service(monkeypatch, sample_event_response):
    """Mock the supabase_service module."""
    from app.services import supabase_service
    
    # Mock service functions
    async def mock_create_event(event_data):
        return {**sample_event_response, **event_data}
    
    async def mock_get_events():
        return [sample_event_response]
    
    async def mock_get_event_by_id(event_id):
        return sample_event_response
    
    async def mock_get_events_by_municipality(municipality_id):
        return [sample_event_response]
    
    async def mock_update_event(event_id, update_data):
        return {**sample_event_response, **update_data}
    
    async def mock_delete_event(event_id):
        return None
    
    monkeypatch.setattr(supabase_service, "create_event", mock_create_event)
    monkeypatch.setattr(supabase_service, "get_events", mock_get_events)
    monkeypatch.setattr(supabase_service, "get_event_by_id", mock_get_event_by_id)
    monkeypatch.setattr(supabase_service, "get_events_by_municipality", mock_get_events_by_municipality)
    monkeypatch.setattr(supabase_service, "update_event", mock_update_event)
    monkeypatch.setattr(supabase_service, "delete_event", mock_delete_event)
    
    return supabase_service
