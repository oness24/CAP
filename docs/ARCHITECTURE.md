# CAP_DASH — Architecture & Developer Documentation

> Visibilidade CAP — Unified Security Operations Dashboard
> React + TypeScript + Vite frontend · Python FastAPI backend

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Running the App](#4-running-the-app)
5. [Backend Architecture](#5-backend-architecture)
   - 5.1 [API Structure](#51-api-structure)
   - 5.2 [Authentication (JWT)](#52-authentication-jwt)
   - 5.3 [Platform Integrations](#53-platform-integrations)
   - 5.4 [CrowdStrike Integration](#54-crowdstrike-integration)
   - 5.5 [Zabbix Integration](#55-zabbix-integration)
6. [Frontend Architecture](#6-frontend-architecture)
   - 6.1 [Platform Registry](#61-platform-registry)
   - 6.2 [CSS Variable Theming](#62-css-variable-theming)
   - 6.3 [State Management](#63-state-management)
   - 6.4 [Routing](#64-routing)
   - 6.5 [Shell Layout](#65-shell-layout)
   - 6.6 [Live Data Hook](#66-live-data-hook)
7. [Platform Pages](#7-platform-pages)
   - 7.1 [CrowdStrike Falcon EDR](#71-crowdstrike-falcon-edr)
   - 7.2 [Zabbix](#72-zabbix)
   - 7.3 [Wazuh, Outpost24, Keeper](#73-other-platforms)
8. [AI Features (OpenAI)](#8-ai-features-openai)
9. [Chart Design System](#9-chart-design-system)
10. [Environment Variables](#10-environment-variables)
11. [Default Users](#11-default-users)
12. [How to Add a Platform](#12-how-to-add-a-platform)

---

## 1. Project Overview

CAP_DASH is an MSSP-ready security operations dashboard built for **Club Paulistano** by **Contego Security**. It provides a single-pane-of-glass view across 5 security platforms:

| Platform     | Category                          | Live API | Color   |
|-------------|-----------------------------------|----------|---------|  
| CrowdStrike | Endpoint Detection & Response     | ✅ Yes   | #1D6AE5 |
| Zabbix      | Infrastructure Monitoring         | ✅ Yes   | #DC2626 |
| Wazuh       | SIEM                              | ❌ Mock  | #7C3AED |
| Outpost24   | Vulnerability Management          | ❌ Mock  | #EA580C |
| Keeper      | Password Security & Vault         | ❌ Mock  | #16A34A |

---

## 2. Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS v3** + CSS custom properties for platform theming
- **React Router v6** (lazy-loaded routes)
- **Zustand** with `persist` middleware (localStorage)
- **Recharts** for all data visualization
- **Framer Motion** for animations
- **Lucide React** for icons
- **date-fns** for timestamp helpers

### Backend
- **Python 3.12** + **FastAPI 0.115**
- **SQLAlchemy 2** + **SQLite** (dev database)
- **JWT auth** (access token 15min, refresh token 7 days)
- **httpx** for HTTP calls to external APIs
- **bcrypt 4.0.1** (pinned — passlib incompatible with 5.x)
- **uvicorn** ASGI server

---

## 3. Folder Structure

```
CAP_DASH/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, routers
│   ├── seed.py                    # Seed default users
│   ├── .env                       # Backend secrets (API keys, DB URL)
│   ├── capdash.db                 # SQLite database
│   └── app/
│       ├── config.py              # Settings (pydantic-settings)
│       ├── database.py            # SQLAlchemy engine + session
│       ├── auth/                  # JWT auth, user model, login/refresh
│       ├── platforms/
│       │   ├── router.py          # All /platforms/* endpoints
│       │   ├── service.py         # Business logic, live vs mock dispatch
│       │   ├── schemas.py         # Pydantic response models
│       │   └── mock/              # Static mock data per platform
│       └── integrations/
│           ├── crowdstrike.py     # CrowdStrike Falcon API client
│           └── zabbix.py         # Zabbix JSON-RPC client
│
├── src/
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Router + lazy routes
│   ├── index.css                  # CSS variables, dark theme, Tailwind base
│   ├── constants/
│   │   └── platforms.ts           # Platform registry (6 platforms, nav items)
│   ├── data/                      # Static mock data per platform
│   │   ├── crowdstrike/dashboard.ts
│   │   ├── zabbix/dashboard.ts
│   │   └── executive/weeklyReports.ts
│   ├── hooks/
│   │   ├── useDashboard.ts        # Fetches live data from backend
│   │   ├── usePlatform.ts         # Active platform config
│   │   └── useNavigation.ts       # Nav items for active platform
│   ├── layouts/
│   │   ├── RootLayout.tsx         # Shell: TopBar + Sidebar + Outlet
│   │   └── PageLayout.tsx         # Per-page content wrapper
│   ├── lib/
│   │   ├── api.ts                 # Authenticated fetch client (auto-refresh)
│   │   └── openai.ts             # OpenAI GPT-4o-mini integration
│   ├── pages/
│   │   ├── auth/LoginPage.tsx
│   │   ├── crowdstrike/           # CrowdStrike pages (Dashboard, Detections, Endpoints, Incidents, Vulnerabilities, Policies, Reports)
│   │   ├── zabbix/                # Zabbix pages (Dashboard, Triggers, HostAvailability, HostGroups, NetworkMonitoring, SLAReports, Reports)
│   │   └── [wazuh|outpost24|keeper]/
│   ├── store/
│   │   ├── authStore.ts           # Zustand JWT store (persisted)
│   │   └── uiStore.ts             # Sidebar collapsed state
│   └── components/
│       ├── sidebar/               # Sidebar, PlatformSwitcher (accordion)
│       ├── topbar/                # TopBar with branding + user card
│       ├── charts/                # AreaChart, LineChart, PieChart, RadarChart, BarChart
│       ├── executive/             # PrintReport, ExecutiveSummary
│       └── badges/SeverityBadge.tsx
│
├── .env                           # Frontend env (VITE_API_BASE_URL, VITE_OPENAI_API_KEY)
└── docs/
    └── ARCHITECTURE.md            # This file
```

---

## 4. Running the App

### Prerequisites
- Python 3.12, Node.js 18+

### Backend
```bash
cd backend
python3 -m pip install -r requirements.txt
python3 seed.py          # create default users
python3 -m uvicorn main:app --port 8003 --log-level info
```

> Note: If port 8003 is in use, choose any free port and update `VITE_API_BASE_URL` in `.env`.

### Frontend
```bash
npm install
npm run dev              # starts on http://localhost:5173 (or next free port)
```

### Both together
Keep two terminals open. Frontend at `http://localhost:5173`, backend at `http://localhost:8003`.

---

## 5. Backend Architecture

### 5.1 API Structure

Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/platforms/` | List all platforms |
| GET | `/platforms/{id}/dashboard` | Dashboard data (live or mock) |
| GET | `/platforms/{id}/incidents` | Paginated incidents |
| GET | `/platforms/{id}/timeseries` | Time-series metrics |
| GET | `/platforms/crowdstrike/devices` | Paginated device list (live) |
| GET | `/platforms/crowdstrike/detections` | Paginated alerts (live) |
| GET | `/platforms/crowdstrike/real-incidents` | Paginated incidents (live) |
| POST | `/platforms/crowdstrike/devices/{id}/contain` | Isolate host |
| POST | `/platforms/crowdstrike/devices/{id}/lift-containment` | Lift isolation |
| GET | `/platforms/zabbix/triggers` | Paginated active triggers (live) |
| GET | `/platforms/zabbix/hosts` | Paginated host list with status (live) |

### 5.2 Authentication (JWT)

- Access token: 15 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Refresh token: 7 days (configurable via `REFRESH_TOKEN_EXPIRE_DAYS`)
- Frontend auto-refreshes on 401 via `api.ts`
- Tokens stored in Zustand localStorage store

### 5.3 Platform Integrations

`service.py` dispatches per platform:

```python
def get_dashboard(platform_id: str) -> dict:
    mock = get_platform_data(platform_id)
    if platform_id == "crowdstrike" and settings.crowdstrike_client_id:
        return cs_client.fetch_dashboard(mock)   # live, falls back to mock on error
    if platform_id == "zabbix" and settings.zabbix_url:
        return zabbix_client.fetch_dashboard(mock)
    return mock  # all other platforms use static mock
```

### 5.4 CrowdStrike Integration

**File:** `backend/app/integrations/crowdstrike.py`

- OAuth2 client credentials flow (`/oauth2/token`)
- Token cached in memory, refreshed 60s before expiry
- Dashboard built via 12 parallel API calls (`ThreadPoolExecutor`)
- TTL cache (120s) — first request is live, subsequent requests return cache
- Background refresh when cache is 75% through TTL
- Individual task failures keep mock value; `_live: True` is always set if fetch_dashboard runs
- Endpoints used:
  - `/devices/queries/devices/v1` — device IDs and counts
  - `/devices/entities/devices/v2` — full device details
  - `/alerts/queries/alerts/v1` — alert IDs and counts
  - `/alerts/entities/alerts/v1` — alert details
  - `/incidents/queries/incidents/v1` — incident IDs
  - `/incidents/entities/incidents/v1` — incident details
  - `/devices/entities/devices-actions/v2` — contain/lift host

**Live data confirmed:** 453 endpoints, 129 active detections, 1 critical alert (as of Feb 2026)

### 5.5 Zabbix Integration

**File:** `backend/app/integrations/zabbix.py`

- JSON-RPC API (`/api_jsonrpc.php`) with API token auth
- Scoped to host group `CAP` (all queries filtered by group ID)
- No TTL cache — fresh query on each request
- Derives host status from unreachable/ping triggers (Zabbix 6.0 doesn't expose per-host availability directly)
- Methods:
  - `fetch_dashboard()` — KPIs, triggers by severity, host group status, active problems
  - `get_triggers_page()` — paginated active triggers with severity filter
  - `get_hosts_page()` — paginated hosts with Up/Down status

**Live data confirmed:** 240 hosts, 10 down, 10 active triggers including real hosts like "IMPRESSORA ZEBRA - 10.0.200.123" (Feb 2026)

---

## 6. Frontend Architecture

### 6.1 Platform Registry

`src/constants/platforms.ts` — single source of truth for all 6 platforms.

Each platform entry contains:
- `id`, `name`, `category`
- `colors` — primary, gradient, glow
- `logo` — SVG icon component
- `nav` — array of `NavItem` with `id`, `label`, `icon`, `path`, optional `badge`

### 6.2 CSS Variable Theming

`src/index.css` defines CSS custom properties on `:root`:

```css
--bg-base:      #060C1A   /* darkest background */
--bg-surface:   #091525   /* card backgrounds */
--bg-elevated:  #0D1E38   /* elevated elements */
--bg-overlay:   #122240   /* modals, overlays */
--accent-primary: set dynamically per platform
--accent-gradient: set dynamically per platform
```

The `useAccentColor` hook (inside `usePlatform`) injects platform accent colors into CSS variables on platform switch, enabling full dynamic theming without re-renders.

### 6.3 State Management

| Store | Purpose | Persisted |
|-------|---------|-----------|
| `authStore.ts` | Access/refresh tokens, user info, login/logout | ✅ localStorage |
| `uiStore.ts` | `sidebarCollapsed` flag | ❌ memory |
| `platformStore.ts` | `activePlatform` id | ✅ localStorage |

### 6.4 Routing

`src/App.tsx` uses React Router v6 with lazy-loaded pages. Protected routes are wrapped in `ProtectedRoute` which checks `authStore.accessToken`.

### 6.5 Shell Layout

```
RootLayout (flex-col, full screen)
├── TopBar (h-16, full width)
│   ├── Left: Shield icon + "Visibilidade CAP" + tagline
│   └── Right: Bell (notification) + User card (name, email, chevron) + Logout
└── div (flex-row, flex-1, overflow hidden)
    ├── Sidebar (w-64 expanded / w-16 collapsed, h-full)
    │   ├── PlatformSwitcher (accordion — each platform expands nav items)
    │   └── Collapse toggle button
    └── main (flex-1, overflow-y-auto)
        └── <Outlet /> — page content
```

### 6.6 Live Data Hook

`src/hooks/useDashboard.ts`

```typescript
const { data, isLoading, error } = useDashboard('crowdstrike')
const d = (data as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard
```

- Makes authenticated GET to `/platforms/{id}/dashboard`
- On success: `data` = inner data object (with `_live: true` when backend got live data)
- On error or loading: `data = null`, component uses static mock as fallback
- **Live indicator pattern:**
  ```tsx
  const isLive = Boolean((data as { _live?: boolean } | null)?._live)
  // isLoading → yellow "Syncing…" badge
  // isLive    → green  "Live"    badge
  // !isLive   → orange "Mock"    badge
  ```

---

## 7. Platform Pages

### 7.1 CrowdStrike Falcon EDR

| Page | Path | Data Source |
|------|------|-------------|
| Dashboard | `/crowdstrike` | Live API (`_live: true`) |
| Detections | `/crowdstrike/detections` | Live API (`/crowdstrike/detections`) |
| Endpoints (Hosts) | `/crowdstrike/endpoints` | Live API (`/crowdstrike/devices`) |
| Incidents | `/crowdstrike/incidents` | Live API (`/crowdstrike/real-incidents`) |
| Vulnerabilities | `/crowdstrike/vulnerabilities` | ComingSoon |
| Policies | `/crowdstrike/policies` | ComingSoon |
| Reports | `/crowdstrike/reports` | Live KPIs + AI narrative |

**Reports page features:**
- Period selector: Weekly / Monthly / 3-Month / Annual
- Dynamic narrative built from live KPI data
- "Regenerar com IA" button → GPT-4o-mini generates Portuguese narrative
- "Gerar com IA" button → GPT-4o-mini generates 3 strategic recommendations
- Print/PDF preview modal with "Baixar" button
- AI content is threaded into the printed report

### 7.2 Zabbix

| Page | Path | Data Source |
|------|------|-------------|
| Dashboard | `/zabbix` | Live API (Zabbix JSON-RPC) |
| Triggers | `/zabbix/triggers` | Live API (`/zabbix/triggers`) — paginated, severity filter |
| Host Availability | `/zabbix/host-availability` | Live API (`/zabbix/hosts`) — search, paginated |
| Host Groups | `/zabbix/host-groups` | Dashboard data (`hostGroupStatus`) |
| Network Monitoring | `/zabbix/network` | ComingSoon |
| SLA Reports | `/zabbix/sla` | ComingSoon |
| Reports | `/zabbix/reports` | ComingSoon |

**Dashboard shows:**
- KPI bar: Total Hosts, Hosts Up (%), Hosts Down, Active Triggers, Problems (1h), Avg Availability
- Pie chart: Triggers by severity (Disaster / High / Average / Warning / Information)
- Active problems table (top 7, with host name and duration)
- Network throughput area chart (mock — requires per-item history queries)
- Host group status list

### 7.3 Other Platforms

Wazuh, Outpost24, and Keeper use static mock data only. Their dashboard pages are implemented with generic chart widgets. Sub-pages use `ComingSoon` stubs.

---

## 8. AI Features (OpenAI)

**File:** `src/lib/openai.ts`

Uses `gpt-4o-mini` via direct browser `fetch()` (not a server proxy).

### generateSecurityNarrative(params)

Generates a Portuguese executive narrative paragraph for the Reports page. Input includes:
- Platform name, client, period, date range
- Live KPIs: totalEndpoints, activeDetections, resolvedIncidents, openIncidents, mttr, coverage, criticalAlerts, riskRating
- Severity breakdown array
- OS breakdown array
- Full incident log (ref, category, description, severity, status)

### generateStrategicRecommendations(params)

Generates 3 strategic recommendations as a JSON array (with fallback string parsing). Same data as narrative plus full incident log.

**API key:** Stored in `VITE_OPENAI_API_KEY` in root `.env`.

---

## 9. Chart Design System

All chart components in `src/components/charts/`:

| Component | Type | Features |
|-----------|------|---------|
| `AreaChartWidget` | Area/Line | Gradient fill, glow filter, custom tooltip |
| `LineChartWidget` | Line | Multi-series, glow filter |
| `PieChartWidget` | Pie/Donut | Center total label, custom legend with % |
| `BarChartWidget` | Bar | Gradient bars per Cell, custom tooltip |
| `RadarChartWidget` | Radar | Gradient polygon fill, score summary |

**Design patterns:**
- Card container: radial gradient bg + accent-tinted border + box shadows
- Top accent line: 2px horizontal gradient at card top
- SVG glow: `feGaussianBlur + feMerge` filter on chart elements
- Tooltips: dark glass (rgba + backdropFilter blur) with accent border
- Animations: Framer Motion card entrance + Recharts line draw animation

---

## 10. Environment Variables

### Frontend (`/.env`)
```env
VITE_API_BASE_URL=http://localhost:8003/api/v1
VITE_OPENAI_API_KEY=sk-proj-...
```

### Backend (`/backend/.env`)
```env
DATABASE_URL=sqlite:///./capdash.db
JWT_SECRET=<32+ char random hex>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,...

# CrowdStrike Falcon API
CROWDSTRIKE_CLIENT_ID=<client_id>
CROWDSTRIKE_CLIENT_SECRET=<client_secret>
CROWDSTRIKE_BASE_URL=https://api.us-2.crowdstrike.com

# Zabbix API
ZABBIX_URL=https://noc.contego.com.br
ZABBIX_API_TOKEN=<api_token>
ZABBIX_GROUP=CAP
```

---

## 11. Default Users

Seeded by `backend/seed.py`:

| Email | Password | Role |
|-------|----------|------|
| admin@capdash.io | Admin@123 | Admin |
| analyst@capdash.io | Analyst@123 | Analyst |
| viewer@capdash.io | Viewer@123 | Viewer |

---

## 12. How to Add a Platform

### Backend
1. Create `backend/app/platforms/mock/{platform_id}.py` with static data
2. Register it in `mock/__init__.py`
3. Optionally create `backend/app/integrations/{platform}.py` with live client
4. Add dispatch logic in `service.py`

### Frontend
1. Add platform entry to `src/constants/platforms.ts`
2. Create pages in `src/pages/{platform}/`
3. Add routes to `src/App.tsx`
4. Add mock data to `src/data/{platform}/dashboard.ts`
5. The sidebar accordion, theming, and nav automatically pick up the new platform

---

*Last updated: February 2026 — Contego Security / Club Paulistano*
