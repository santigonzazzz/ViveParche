# Integration Testing Guide

## Overview

This guide provides instructions for testing the integration between the FastAPI backend and Next.js frontend for the VibeMap AI Week 1 MVP.

## Prerequisites

- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:3000` (or configured port)
- Valid Supabase credentials in `.env`
- Valid OpenAI API key in `.env`

## Backend-Frontend Integration Points

### 1. CORS Configuration

**Test**: Verify frontend can make requests to backend

```bash
# From frontend, check if API is accessible
curl -X GET http://localhost:8000/ \
  -H "Origin: http://localhost:3000"
```

**Expected**: Response should include CORS headers allowing the frontend origin.

**Common Issues**:
- `Access-Control-Allow-Origin` header missing
- CORS policy blocking requests
- **Fix**: Update `allow_origins` in `app/main.py` to include frontend URL

---

### 2. Event API Contract

**Endpoint**: `POST /events/`

**Frontend Request Format**:
```json
{
  "title": "Summer Jazz Festival",
  "description": "Annual jazz festival...",
  "municipality_id": "uuid-here",
  "owner_id": "uuid-here",
  "vibe_tags": ["music", "outdoor"],
  "event_date": "2026-07-15T18:00:00",
  "location_address": "Central Park",
  "price": 25.00,
  "image_url": "https://example.com/image.jpg"
}
```

**Backend Response Format**:
```json
{
  "id": "uuid-here",
  "title": "Summer Jazz Festival",
  "description": "Annual jazz festival...",
  "municipality_id": "uuid-here",
  "owner_id": "uuid-here",
  "vibe_tags": ["music", "outdoor"],
  "event_date": "2026-07-15T18:00:00",
  "location_address": "Central Park",
  "price": 25.00,
  "image_url": "https://example.com/image.jpg",
  "created_at": "2026-01-29T16:00:00"
}
```

**Validation Rules**:
- `event_date` must be in the future (422 error if past)
- `price` must be >= 0 (422 error if negative)
- `title` must be 1-200 characters (422 error if invalid)

---

### 3. Booking API Contract

**Endpoint**: `POST /bookings/`

**Frontend Request Format**:
```json
{
  "event_id": "uuid-here",
  "user_id": "uuid-here"
}
```

**Backend Response Format**:
```json
{
  "id": "uuid-here",
  "event_id": "uuid-here",
  "user_id": "uuid-here",
  "qr_code_token": "ABC123DEF4567890",
  "attended": false,
  "created_at": "2026-01-29T16:00:00"
}
```

**QR Code Requirements**:
- Token is exactly 16 uppercase alphanumeric characters
- Token is unique for each booking
- Frontend should display QR code using the token

---

### 4. AI Chat API Contract

**Endpoint**: `POST /ai/chat`

**Frontend Request Format**:
```json
{
  "event_id": "uuid-here",
  "user_question": "What time does the event start?"
}
```

**Backend Response Format**:
```json
{
  "event_title": "Summer Jazz Festival",
  "answer": "The event starts at 6 PM according to the event information."
}
```

**AI Behavior**:
- AI only uses event description
- AI doesn't hallucinate external information
- AI gracefully handles questions outside event scope

---

## Error Response Format

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

**Common Status Codes**:
- `400` - Bad Request (malformed data)
- `404` - Not Found (resource doesn't exist)
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error (backend issue)

---

## Testing Checklist

### Event Management
- [ ] Create event with valid data
- [ ] Create event with past date (should fail with 422)
- [ ] Create event with negative price (should fail with 422)
- [ ] Get all events
- [ ] Get events by municipality (including empty results)
- [ ] Get single event by ID
- [ ] Get event with invalid UUID (should fail with 422)
- [ ] Update event
- [ ] Delete event

### Booking Management
- [ ] Create booking and receive QR code token
- [ ] Verify QR code token is 16 characters
- [ ] Display QR code on frontend
- [ ] Get bookings by user
- [ ] Get bookings by event
- [ ] Mark booking as attended

### AI Chat
- [ ] Ask question about event
- [ ] Verify AI uses only event description
- [ ] Ask question outside event scope
- [ ] Verify AI doesn't hallucinate
- [ ] Test with event having no description

### Mobile Responsiveness
- [ ] QR code visible on mobile screens
- [ ] QR code scannable with mobile camera
- [ ] Event cards responsive on mobile
- [ ] Forms usable on mobile devices

---

## Common Integration Issues

### Issue 1: UUID Format Mismatch

**Symptom**: 422 errors when sending UUIDs from frontend

**Cause**: Frontend sending UUID as object instead of string

**Fix**: Ensure frontend sends UUIDs as strings:
```javascript
// Correct
const eventData = {
  municipality_id: municipalityId.toString()
}

// Incorrect
const eventData = {
  municipality_id: municipalityId  // UUID object
}
```

---

### Issue 2: Date Format Mismatch

**Symptom**: 422 errors when sending dates

**Cause**: Frontend sending dates in wrong format

**Fix**: Use ISO 8601 format:
```javascript
// Correct
const eventData = {
  event_date: new Date().toISOString()  // "2026-07-15T18:00:00.000Z"
}

// Incorrect
const eventData = {
  event_date: "07/15/2026"  // Wrong format
}
```

---

### Issue 3: CORS Errors

**Symptom**: Browser blocks requests with CORS error

**Cause**: Backend not configured for frontend origin

**Fix**: Update `app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Issue 4: QR Code Not Displaying

**Symptom**: QR code token received but not displayed

**Cause**: Frontend not generating QR code image from token

**Fix**: Use a QR code library like `qrcode.react`:
```javascript
import QRCode from 'qrcode.react';

<QRCode value={booking.qr_code_token} size={256} />
```

---

## Manual Testing Script

```bash
# 1. Test health endpoint
curl http://localhost:8000/

# 2. Create an event
curl -X POST http://localhost:8000/events/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "description": "Test description",
    "municipality_id": "123e4567-e89b-12d3-a456-426614174000",
    "owner_id": "123e4567-e89b-12d3-a456-426614174001",
    "event_date": "2026-12-31T23:59:59",
    "location_address": "Test Location",
    "price": 10.0
  }'

# 3. Get all events
curl http://localhost:8000/events/

# 4. Create a booking (replace event_id with actual ID from step 2)
curl -X POST http://localhost:8000/bookings/ \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "user_id": "123e4567-e89b-12d3-a456-426614174002"
  }'

# 5. Test AI chat (replace event_id with actual ID)
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "user_question": "What is this event about?"
  }'
```

---

## Automated Integration Tests

Run the full test suite:

```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=app --cov-report=html

# Run specific integration tests
pytest tests/test_api_events.py tests/test_api_bookings.py -v
```

---

## Performance Testing

### Load Testing Events API

```bash
# Install Apache Bench (if not installed)
# Windows: Download from Apache website
# Linux: sudo apt-get install apache2-utils

# Test GET /events/ with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:8000/events/
```

**Expected**: Response time < 100ms for most requests

---

## Security Testing

### Test SQL Injection Protection

```bash
# Try SQL injection in event title
curl -X POST http://localhost:8000/events/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test'; DROP TABLE events;--",
    "description": "Test",
    "municipality_id": "123e4567-e89b-12d3-a456-426614174000",
    "owner_id": "123e4567-e89b-12d3-a456-426614174001",
    "event_date": "2026-12-31T23:59:59",
    "location_address": "Test",
    "price": 10.0
  }'
```

**Expected**: Event created with title as-is (Supabase handles escaping)

---

## Deployment Testing

Before deploying to production:

1. [ ] All automated tests pass
2. [ ] Manual integration tests pass
3. [ ] CORS configured for production frontend URL
4. [ ] Environment variables set correctly
5. [ ] Database migrations applied
6. [ ] API documentation updated
7. [ ] Error logging configured
8. [ ] Rate limiting configured (if applicable)
