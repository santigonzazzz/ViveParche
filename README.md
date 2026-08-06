# VibeMap AI Backend

A production-ready FastAPI backend for event management with AI-powered chat capabilities.

## Features

- 🎯 **CRUD Operations** for events and bookings
- 🏛️ **Municipality Filtering** for location-based event searches
- 🤖 **AI Chat Integration** using OpenAI GPT-4o-mini as a local expert
- 🎫 **QR Code Generation** with unique hash for each booking
- 📊 **Supabase Integration** for database operations
- ✅ **Pydantic Validation** for all models
- 🚀 **Async/Await** for high performance

## Tech Stack

- **FastAPI** - Modern, fast web framework
- **Supabase** - Backend database and authentication
- **OpenAI** - GPT-4o-mini for AI chat
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## Installation

1. **Clone the repository**
```bash
cd eventos_ai
```

2. **Create a virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## Database Setup

Create the following tables in your Supabase project:

### Events Table
```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  municipality_id INTEGER NOT NULL,
  date TIMESTAMP NOT NULL,
  location VARCHAR(200) NOT NULL,
  price NUMERIC NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  user_name VARCHAR(100) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  qr_hash VARCHAR(16) NOT NULL UNIQUE,
  booking_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Running the Server

**Development mode with auto-reload:**
```bash
uvicorn app.main:app --reload
```

**Production mode:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Events

- `POST /events` - Create a new event
- `GET /events` - Get all events
- `GET /events/{event_id}` - Get a specific event
- `GET /events/municipality/{municipality_id}` - Filter events by municipality
- `PUT /events/{event_id}` - Update an event
- `DELETE /events/{event_id}` - Delete an event

### Bookings

- `POST /bookings` - Create a new booking (auto-generates QR hash)
- `GET /bookings` - Get all bookings
- `GET /bookings/{booking_id}` - Get a specific booking
- `PUT /bookings/{booking_id}` - Update a booking
- `DELETE /bookings/{booking_id}` - Delete a booking

### AI Chat

- `POST /ai/chat` - Ask questions about an event
  ```json
  {
    "event_id": 1,
    "user_question": "What should I bring to this event?"
  }
  ```

## Usage Examples

### Create an Event
```bash
curl -X POST "http://localhost:8000/events" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Summer Jazz Festival",
    "description": "Annual jazz festival featuring local and international artists",
    "municipality_id": 1,
    "date": "2026-07-15T18:00:00",
    "location": "Central Park Amphitheater",
    "price": 25.00,
    "category": "Music"
  }'
```

### Create a Booking
```bash
curl -X POST "http://localhost:8000/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "booking_date": "2026-07-15T18:00:00"
  }'
```

### Ask AI About an Event
```bash
curl -X POST "http://localhost:8000/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_question": "What time does the event start?"
  }'
```

## Project Structure

```
eventos_ai/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment configuration
│   ├── models/              # Pydantic schemas
│   │   ├── event.py
│   │   ├── booking.py
│   │   └── ai.py
│   ├── services/            # Business logic
│   │   ├── supabase_service.py
│   │   └── openai_service.py
│   ├── routers/             # API endpoints
│   │   ├── events.py
│   │   ├── bookings.py
│   │   └── ai.py
│   └── utils/               # Utilities
│       └── qr_generator.py
├── requirements.txt
├── .env.example
└── README.md
```

## Code Standards

- **PEP8** compliant
- **Type hints** throughout
- **Async/await** for all I/O operations
- **HTTPException** for error handling
- **Comprehensive docstrings**

## License

MIT License
