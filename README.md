# BeautyOS — Salon Management System

A production-ready, scalable salon and service-based business management platform with a web admin dashboard and ultra-fast POS interface.

## Architecture

```
Beauty/
├── backend/          # ASP.NET Core Web API (Clean Architecture)
│   └── src/
│       ├── Beauty.Api/            # Controllers, JWT auth, Swagger
│       ├── Beauty.Application/    # Services, DTOs, interfaces
│       ├── Beauty.Domain/         # Entities, enums
│       └── Beauty.Infrastructure/ # EF Core, PostgreSQL, repositories
├── frontend/         # Next.js 16 + TypeScript + Tailwind CSS
└── docker-compose.yml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Zustand, Recharts |
| Backend | ASP.NET Core 10, Clean Architecture |
| Database | PostgreSQL 16 |
| Auth | JWT + Role-Based Access Control (Admin, Manager, Cashier) |

## Features

- **POS System** — Fast touch-friendly interface for in-salon sales
- **Admin Dashboard** — Revenue, profit, customer analytics
- **Multi-Branch** — Isolated operations per branch, centralized analytics
- **Inventory** — Stock tracking, low-stock alerts, purchase logs
- **Employee Management** — Roles, performance tracking, commission support
- **Reporting** — Daily/weekly/monthly/yearly financial reports
- **Multi-Tenant Ready** — Tenant isolation for future SaaS deployment
- **Business Agnostic** — Configurable services/categories (salon, spa, clinic, retail)

## Quick Start

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)

### 1. Start the Beauty PostgreSQL Database

**Option A — Setup script (Windows):**
```powershell
.\scripts\setup-database.ps1
```

**Option B — Docker Compose:**
```bash
docker compose up -d
```

### Option A — Local PostgreSQL (your current setup)

You have **PostgreSQL 18** installed locally on **port 5400** (not 5432).

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | **`5400`** |
| Database | **`Beauty`** |
| Username | `postgres` |
| Password | `postgres` |

**View tables in pgAdmin:**
1. Open **pgAdmin**
2. Connect to `localhost:5400` (user: `postgres`)
3. Expand **Databases → Beauty → Schemas → public → Tables**

You should see 15 tables including `Users`, `Tenants`, `Invoices`, `Products`, etc.

### Option B — Docker PostgreSQL

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | **`Beauty`** |
| Username | `beauty` |
| Password | `beauty123` |

> If you previously used `beauty_db`, recreate the volume: `docker compose down -v && docker compose up -d`

> **Note:** Docker Desktop must be running before starting the database.

### 2. Start the Backend API

```bash
cd backend
dotnet run --project src/Beauty.Api
```

API runs at `http://localhost:5000` — Swagger UI at `http://localhost:5000/swagger`

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`

### 4. Sign In

**Demo admin** (auto-seeded on first startup):
- Email: `admin@beauty.com`
- Password: `Admin@123`

Or register a new business at `http://localhost:3000/register`

### 5. Verify Database Connection

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/health/database
```

**Production** — override the connection string via environment variable:
```bash
ConnectionStrings__DefaultConnection="Host=prod-host;Port=5432;Database=Beauty;Username=beauty;Password=SECRET;SSL Mode=Require"
```

---

## Authentication & User Management

### Security Features
- **BCrypt** password hashing (work factor 11)
- **JWT** token authentication (24h expiry, issuer/audience validation)
- **RBAC** role-based endpoint protection
- **Audit logging** for login and password changes

### Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Full system — users, branches, settings, reports, POS |
| **Manager** | Reports, inventory, services, customers, POS |
| **Cashier** | POS, customers (read/create), services/products (read only) |

### User Management API

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Public | Secure login, returns JWT |
| `/api/auth/register` | POST | Public | Register new business + admin |
| `/api/auth/me` | GET | All | Current user profile |
| `/api/auth/change-password` | POST | All | Change own password |
| `/api/users` | GET | Manager+ | List all users |
| `/api/users` | POST | Admin | Create user (any role) |
| `/api/users/{id}` | PUT | Admin | Update user |
| `/api/users/roles` | GET | Public | Available roles list |

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Branches | `GET/POST/PUT /api/branches` |
| Customers | `GET/POST/PUT/DELETE /api/customers` |
| Services | `GET/POST /api/services/categories`, `GET/POST /api/services/offerings` |
| Products | `GET/POST/PUT /api/products`, `GET /api/products/low-stock` |
| Invoices | `GET/POST /api/invoices`, `GET /api/invoices/{id}/receipt` |
| Employees | `GET/POST/PUT /api/employees`, `GET /api/employees/performance` |
| Reports | `GET /api/reports/dashboard`, `GET /api/reports/period/{period}` |

## Roles

| Role | Permissions |
|------|------------|
| Admin | Full access — branches, employees, settings |
| Manager | Products, services, reports, expenses |
| Cashier | POS, customers, view catalog |

## Database Migrations

```bash
cd backend
dotnet ef migrations add MigrationName --project src/Beauty.Infrastructure --startup-project src/Beauty.Api
dotnet ef database update --project src/Beauty.Infrastructure --startup-project src/Beauty.Api
```

## Environment Variables

### Backend (`appsettings.json`)
- `ConnectionStrings:DefaultConnection` — PostgreSQL connection string
- `Jwt:Key` — JWT signing key (change in production!)
- `Cors:Origins` — Allowed frontend origins

### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_URL` — Backend API base URL (default: `http://localhost:5000/api`)

## Extending to Other Business Types

The system is not hardcoded for salons. Configure via:
- `BusinessType` enum (Salon, Spa, Clinic, Retail, Other)
- `ServiceCategory` — any service categories per tenant
- `ServiceOffering` — any services with custom pricing
- `Product` — retail products with inventory
