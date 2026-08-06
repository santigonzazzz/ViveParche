# ViveParche

AI-Powered Event Discovery & Venue Management Platform

> A production-ready SaaS platform that helps users discover local events while enabling businesses to manage venues, sell tickets, automate customer interactions, and improve engagement through Artificial Intelligence.

---

# 📸 Preview

<!-- Add screenshots here -->

![Home](./screenshots/home.png)

![Dashboard](./screenshots/dashboard.png)

![AI Chat](./screenshots/chat.png)

---

# 🚀 Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- Python
- FastAPI
- Pydantic

### Database & Authentication

- Supabase
- PostgreSQL
- JWT Authentication

### AI

- OpenAI
- Groq

### External Services

- Stripe
- Twilio
- SendGrid

### Infrastructure

- Ubuntu VPS
- Nginx
- GitHub Actions
- HTTPS (Let's Encrypt)

---

# 💡 Why I Built This

ViveParche was created to simplify how people discover local events while providing businesses with a centralized platform to publish events, manage venues, sell tickets, and communicate with customers.

Instead of being just another event listing website, the goal was to build a complete SaaS platform where organizers could manage their business from a single dashboard.

Artificial Intelligence was integrated as part of the customer experience, allowing visitors to ask natural language questions about events without manually searching through event details.

---

# ✨ Key Features

- Event discovery by municipality
- Venue management dashboard
- Business administration panel
- Ticket management
- AI-powered event assistant
- User authentication
- Role-based authorization (RBAC)
- Subscription management
- Payment integration
- WhatsApp notifications
- Email notifications
- REST API
- Responsive interface

---

# 🤖 AI Features

The platform includes an AI assistant capable of answering questions about specific events.

Instead of returning static information, the assistant receives the event context and generates contextual responses using OpenAI and Groq language models.

Example questions include:

- What time does the event start?
- Is there a dress code?
- Is parking available?
- Can children attend?
- What activities are included?

This creates a significantly better user experience than traditional FAQ pages.

---

# 🏗 Architecture

```
                         Users
                           │
                           ▼
                  React Frontend
                           │
                           ▼
                         Nginx
                           │
                           ▼
                    FastAPI Backend
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   Supabase          OpenAI / Groq        Stripe
        │                  │                  │
        ▼                  ▼                  ▼
 PostgreSQL          AI Assistant        Payments

               Twilio • SendGrid
```

---

# ⚙️ How It Works

A typical request follows this flow:

```
User

↓

React Frontend

↓

FastAPI REST API

↓

Authentication (JWT)

↓

Business Logic

↓

Supabase (PostgreSQL)

↓

External Services (AI, Payments, Notifications)

↓

Response
```

Every request is validated using Pydantic models before reaching the business logic layer.

---

# 🔐 Security

Several security mechanisms were implemented across the platform.

- JWT Authentication
- Role-Based Access Control (RBAC)
- Request validation with Pydantic
- CORS protection
- Rate Limiting
- Security HTTP Headers
- Environment Variables
- HTTPS encryption

---

# 📂 Project Structure

```
/
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── backend/
│   ├── app/
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── dependencies.py
│
└── README.md
```

---

# ⚡ Deployment

The platform was deployed on an Ubuntu VPS.

Deployment was automated using GitHub Actions.

The deployment pipeline performs:

- Frontend build
- Secure file synchronization
- Backend restart
- HTTPS support
- Automatic rollback
- System monitoring scripts

---

# 🛠 Getting Started

## Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Environment Variables

```env
SUPABASE_URL=

SUPABASE_KEY=

OPENAI_API_KEY=

GROQ_API_KEY=

STRIPE_SECRET_KEY=

TWILIO_ACCOUNT_SID=

SENDGRID_API_KEY=
```

---

# 🎯 Engineering Highlights

This project demonstrates experience with:

- Full-Stack Development
- SaaS Architecture
- REST API Design
- AI Integration
- Authentication & Authorization
- PostgreSQL
- Third-Party API Integrations
- Cloud Deployment
- Production Infrastructure
- CI/CD Pipelines
- Software Architecture
- Backend Engineering

---

# 📚 Lessons Learned

Building ViveParche taught me several important engineering lessons beyond writing code.

The biggest challenge wasn't developing the platform itself, but understanding the importance of validating a product before investing significant development effort.

From a technical perspective, the project also highlighted opportunities for future improvements, including containerization with Docker, zero-downtime deployments, and moving background jobs to dedicated workers instead of running them inside the web server.

Those lessons have significantly influenced how I design software today.

---

# 🔮 Future Improvements

- Dockerized infrastructure
- Background workers using Celery + Redis
- Zero-downtime deployments
- Event recommendation engine
- Advanced analytics dashboard
- Multi-language support
- Mobile application

---

# 📄 License

This project was developed as a portfolio project demonstrating full-stack software engineering, backend architecture, AI integration, and cloud deployment.
