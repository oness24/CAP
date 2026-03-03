# CAP_DASH — Unified Security Operations Dashboard

> **Visibilidade CAP** — Single-pane-of-glass security dashboard for **Club Athletico Paulistano**, built by **Contego Security**.

![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)
![Docker](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-Private-red)

---

## Overview

CAP_DASH aggregates data from **5 security platforms** into a unified executive dashboard with real-time KPIs, a composite security score, and an AI-powered assistant.

| Platform | Category | Status |
|----------|----------|--------|
| **CrowdStrike** | Endpoint Detection & Response (EDR) | Live API |
| **Zabbix** | Infrastructure Monitoring | Live API |
| **Wazuh** | SIEM (OpenSearch) | Live API |
| **Outpost24** | Vulnerability Management | Live API |
| **Keeper** | Password Security & Vault | Live API |

### Key Features

- **Executive Summary** — Composite CAP Score (0–100) combining threats, vulnerabilities, compliance, coverage, and endpoint health
- **Per-Platform Dashboards** — Full pages for each security tool with KPIs, charts, tables, and drill-down
- **AI Assistant** — ChatGPT-powered security analyst with local fallback (no API key required for basic questions)
- **JWT Auth** — Role-based access (admin, analyst, viewer) with refresh tokens
- **Dark Theme** — Tailwind CSS with platform-specific color theming
- **Print-Ready Reports** — Export executive summaries to PDF

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand |
| Charts | Recharts |
| Backend | Python 3.12 + FastAPI + Uvicorn |
| Database | SQLite (via SQLAlchemy + Alembic) |
| Auth | JWT (python-jose + passlib/bcrypt) |
| HTTP Client | HTTPX (async) |
| AI | OpenAI GPT-4o-mini |
| Deploy | Docker Compose + Nginx |

---

## Quick Start (Development)

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.12
- **npm** or **yarn**

### 1. Clone

```bash
git clone https://github.com/oness24/CAP.git
cd CAP
```

### 2. Backend

```bash
cd backend
python -m venv ../.venv
# Windows:
..\.venv\Scripts\activate
# Linux/Mac:
source ../.venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # edit with your API keys
python seed.py          # create default users
uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend

```bash
# From the project root:
npm install
cp .env.example .env   # set VITE_API_BASE_URL and VITE_OPENAI_API_KEY
npm run dev
```

Open **http://localhost:5173** and login:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@capdash.io` | `Admin@123` |
| Analyst | `analyst@capdash.io` | `Analyst@123` |
| Viewer | `viewer@capdash.io` | `Viewer@123` |

---

## Production Deploy (Docker)

The app deploys as two Docker containers (backend + frontend/nginx) via Docker Compose.

### Quick Deploy

```bash
# On the server:
git clone https://github.com/oness24/CAP.git ~/apps/capdash
cd ~/apps/capdash

# Edit backend/.env with production credentials
nano backend/.env

# Build & run
docker compose up --build -d

# Verify
docker compose ps
curl http://localhost/api/v1/
```

### Architecture

```
┌─────────────────────────────────────────┐
│           Docker Compose                │
│                                         │
│  ┌─────────────┐   ┌─────────────┐     │
│  │  Frontend    │   │  Backend    │     │
│  │  (Nginx)    │──▶│  (FastAPI)  │     │
│  │  :80        │   │  :8000      │     │
│  └─────────────┘   └─────────────┘     │
│                                         │
│  Browser ──▶ :80 ──▶ SPA + /api proxy  │
└─────────────────────────────────────────┘
```

For detailed deployment instructions (including Docker installation, VM setup, and multi-app hosting), see **[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## Project Structure

```
CAP/
├── backend/                 # Python FastAPI API
│   ├── main.py              # App entrypoint
│   ├── seed.py              # Database seeder
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Backend environment variables
│   ├── Dockerfile           # Backend container
│   ├── app/
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # SQLAlchemy engine
│   │   ├── auth/            # JWT auth (login, refresh, models)
│   │   ├── platforms/       # Platform router, service, schemas
│   │   ├── integrations/    # API clients (CrowdStrike, Zabbix, etc.)
│   │   └── executive/       # Executive summary & reports
│   ├── alembic/             # Database migrations
│   └── tests/               # Pytest test suite
├── src/                     # React TypeScript frontend
│   ├── App.tsx              # Routes & layout
│   ├── main.tsx             # Entry point
│   ├── components/          # Reusable UI components
│   ├── pages/               # Route pages (per platform + executive)
│   ├── lib/                 # API client, OpenAI, utilities
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand stores (auth, platform)
│   ├── types/               # TypeScript type definitions
│   └── constants/           # Platform registry
├── nginx/                   # Nginx reverse proxy config
│   └── default.conf
├── docker-compose.yml       # Production orchestration
├── Dockerfile               # Frontend multi-stage build
├── deploy.sh                # Server bootstrap script
├── docs/
│   ├── ARCHITECTURE.md      # Detailed architecture docs
│   └── DEPLOY.md            # Step-by-step deploy guide
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite connection string | `sqlite:///./capdash.db` |
| `JWT_SECRET` | Secret for JWT signing | (random hex string) |
| `ENVIRONMENT` | `development` or `production` | `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `CROWDSTRIKE_CLIENT_ID` | CrowdStrike API client ID | |
| `CROWDSTRIKE_CLIENT_SECRET` | CrowdStrike API secret | |
| `ZABBIX_URL` | Zabbix server URL | `https://noc.example.com` |
| `ZABBIX_API_TOKEN` | Zabbix API token | |
| `OUTPOST24_URL` | Outpost24 Outscan URL | |
| `OUTPOST24_USERNAME` | Outpost24 credentials | |
| `OUTPOST24_PASSWORD` | Outpost24 credentials | |
| `WAZUH_DASHBOARD_URL` | Wazuh OpenSearch URL | |
| `WAZUH_USERNAME` | Wazuh credentials | |
| `WAZUH_PASSWORD` | Wazuh credentials | |
| `KEEPER_EMAIL` | Keeper admin email | |
| `KEEPER_PASSWORD` | Keeper admin password | |

### Frontend (`.env` at project root)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `/api/v1` (production) or `http://localhost:8000/api/v1` (dev) |
| `VITE_OPENAI_API_KEY` | OpenAI API key for AI assistant | `sk-proj-...` |

---

## CAP Score Algorithm

The composite security score (0–100) is calculated from 5 weighted factors:

| Factor | Weight | Source |
|--------|--------|--------|
| Active Threats | 30% | CrowdStrike detections (critical/high) |
| Vulnerability Exposure | 15% | Outpost24 CVEs + Keeper risk users |
| Compliance | 25% | Outpost24 patch % + Keeper security score |
| Coverage | 15% | Live platform count (out of 3 score platforms) |
| Endpoint Health | 15% | CrowdStrike online/total devices ratio |

Score platforms: **CrowdStrike**, **Outpost24**, **Keeper**.

---

## API Documentation

When the backend is running, interactive docs are available at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Maintenance Commands

```bash
# Rebuild after code changes
docker compose up --build -d

# View logs
docker compose logs -f

# Restart backend only
docker compose restart backend

# Clean old images
docker system prune -af

# Update from git
git pull origin master && docker compose up --build -d
```

---

## License

Private — Contego Security © 2026. All rights reserved.
