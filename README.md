# MotorConnect

Web app (mobile-first responsive) for motorcycle repair shops. Employees can consult a RAG assistant for information about repairs, technical service, and fault diagnosis for motorcycles.

## New Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS |
| **Build Tool** | Vite |
| **Components** | Lucide React + Custom components |
| **State Management** | Zustand + TanStack Query |
| **Backend** | FastAPI or Node.js (NestJS) |
| **Database** | PostgreSQL |
| **Vector Store** | Qdrant |
| **LLM** | OpenAI / Claude / Local (Ollama) |

## Features

-  **Responsive Design** — Mobile-first, works on phones, tablets, desktop
-  **Chat RAG** — Ask questions about motorcycle repairs and diagnostics
-  **Conversation History** — Keep track of past conversations
-  **User Profile** — View usage statistics
-  **Admin Dashboard** — View all users' statistics
-  **JWT Authentication** — Secure employee & admin roles

## Project Structure

```
motorconnect/
├── web/ # React + Vite app
│ ├── src/
│ │ ├── pages/ # Routes: login, chat, history, profile, admin
│ │ ├── components/ # Reusable UI components
│ │ │ ├── auth/ # Login, signup forms
│ │ │ ├── chat/ # Chat interface
│ │ │ ├── layout/ # Navbar, sidebar, footer
│ │ │ └── shared/ # Buttons, modals, cards, etc.
│ │ ├── hooks/ # Custom hooks (useChat, useAuth, useHistory)
│ │ ├── services/ # API client, RAG service
│ │ ├── store/ # Zustand stores (auth, chat, ui)
│ │ ├── types/ # TypeScript interfaces
│ │ ├── utils/ # Helpers, constants
│ │ ├── App.tsx
│ │ └── main.tsx
│ ├── public/
│ ├── package.json
│ ├── tsconfig.json
│ ├── vite.config.ts
│ ├── tailwind.config.js
│ ├── postcss.config.js
│ ├── nginx.conf
│ └── Dockerfile
├── backend/ # FastAPI or NestJS
│ ├── auth/ # JWT authentication, roles
│ ├── chat/
│ │ ├── use_cases/ # Chat business logic
│ │ └── models/ # Message, Conversation, Motorcycle
│ ├── rag/
│ │ ├── ingestion/ # Load manuals to vector store
│ │ ├── retrieval/ # Semantic and hybrid search
│ │ └── generation/ # Prompt engineering + LLM
│ ├── history/ # Conversation CRUD
│ ├── analytics/ # Usage stats by role
│ ├── vector_store/ # Qdrant config
│ ├── requirements.txt
│ └── Dockerfile
├── knowledge_base/ # PDFs, manuals, diagrams
├── docker-compose.yml
├── .env.example
└── README.md
```

## Roles

- **Employee** — Access to chat, history, and personal profile
- **Admin** — All employee features + view all users' statistics

## User Flow

1. Employee opens web app → sees **login** screen
2. Signs in → redirected to **chat** screen
3. Starts **new chat** for each motorcycle repair case
4. Asks RAG agent about the problem (with context)
5. Checks **conversation history** to review past chats
6. Views **profile** to see their usage stats (admin sees all users)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev)
- Python 3.11+ (for backend dev)

### Run with Docker

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and start services
docker-compose up -d

# 3. Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# Qdrant: http://localhost:6333
# Database: localhost:5432
```
