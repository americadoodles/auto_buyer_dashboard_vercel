# Software Requirements Specification (SRS)

## Auto Buyer Dashboard

**Version:** 1.0
**Date:** February 11, 2026
**Project:** Auto Buyer Dashboard (Vercel Deployment)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Database Design](#6-database-design)
7. [API Specification](#7-api-specification)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Current Limitations](#11-current-limitations)
12. [Suggested Features & Enhancements](#12-suggested-features--enhancements)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification documents the current implementation of the Auto Buyer Dashboard — a full-stack SaaS application for the automotive industry. It serves as a reference for developers, stakeholders, and future contributors by describing the system's architecture, functional capabilities, and technical decisions. It also proposes suggested features for future development.

### 1.2 Scope

The Auto Buyer Dashboard is a vehicle acquisition and sales management platform that combines:

- **Vehicle Listing Management** — Ingest, score, and manage vehicle listings from multiple sources
- **CRM (Customer Relationship Management)** — Track leads, contacts, deals, and tasks through a unified pipeline
- **Communications Hub** — Integrated calling and SMS via Twilio with unified activity logging
- **Analytics & Reporting** — KPI dashboards, buyer performance metrics, activity heatmaps, and trend analysis
- **AI-Powered Scoring** — OpenAI-driven vehicle evaluation with customizable scoring criteria
- **Team Collaboration** — Role-based access, Slack notifications, and task assignment workflows

### 1.3 Intended Audience

| Audience | Purpose |
|----------|---------|
| Developers | Implementation reference and onboarding |
| Product Managers | Feature inventory and gap analysis |
| QA Engineers | Test case design and coverage planning |
| Stakeholders | System capability overview |
| DevOps | Deployment and infrastructure reference |

### 1.4 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| **VIN** | Vehicle Identification Number |
| **DOM** | Days on Market |
| **MMR** | Manheim Market Report — wholesale vehicle valuation data |
| **AccuTrade** | Third-party vehicle valuation service |
| **KPI** | Key Performance Indicator |
| **CRM** | Customer Relationship Management |
| **RBAC** | Role-Based Access Control |
| **JWT** | JSON Web Token |
| **A2P 10DLC** | Application-to-Person 10-Digit Long Code (SMS compliance) |
| **SLA** | Service Level Agreement |
| **TwiML** | Twilio Markup Language |

---

## 2. Overall Description

### 2.1 Product Perspective

The Auto Buyer Dashboard is a standalone web application designed for automotive dealerships and vehicle acquisition teams. It centralizes the vehicle buying workflow — from sourcing and evaluating listings to managing customer relationships and closing deals.

The system follows a decoupled architecture with a Next.js frontend and FastAPI backend, deployed on Vercel with PostgreSQL (Neon) for data persistence.

### 2.2 User Classes and Characteristics

| Role | Description | Access Level |
|------|-------------|-------------|
| **Admin** | System administrators managing users, roles, and platform configuration | Full access to all modules including user management, role management, signup approvals, and all data |
| **Buyer** | Vehicle acquisition specialists who source, evaluate, and purchase vehicles | Create and manage own listings, leads, deals, tasks; view personal performance KPIs |
| **Analyst** | Read-only users who review data and generate reports | View listings, scores, and analytics; cannot create or modify records |

### 2.3 Operating Environment

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 15.1.0 (App Router), React 19, TypeScript 5.5.2 |
| **Backend** | FastAPI 0.111.0, Python 3.8+, Uvicorn 0.30.0 |
| **Database** | PostgreSQL (Neon for Vercel, or self-hosted) |
| **Hosting** | Vercel (frontend CDN + serverless functions for backend) |
| **File Storage** | Vercel Blob Storage or Google Cloud Storage |

### 2.4 Design Constraints

- **Serverless Backend**: FastAPI runs as Vercel Serverless Functions, imposing cold-start latency and connection limits
- **Stateless Authentication**: JWT-based with no server-side session store
- **Connection Pooling**: PostgreSQL pool limited to 2–10 connections per function instance
- **No WebSocket Support**: Real-time features limited by Vercel's serverless model
- **Single Database**: All modules share one PostgreSQL instance

### 2.5 Assumptions and Dependencies

- Users have modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- PostgreSQL database is accessible from Vercel's network
- Environment variables are correctly configured for all third-party integrations
- Twilio account has A2P 10DLC registration for SMS compliance
- Slack workspace has configured incoming webhooks and bot tokens

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Client Browser                       │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          Next.js 15 (App Router / React 19)         │ │
│  │  ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │ │
│  │  │ Pages/    │ │Components │ │ Hooks / Services  │  │ │
│  │  │ Routes    │ │ (Atomic)  │ │ (API Client)      │  │ │
│  │  └───────────┘ └───────────┘ └──────────────────┘  │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          │ HTTPS (JWT Bearer)
┌─────────────────────────┼────────────────────────────────┐
│                  Vercel Edge / CDN                         │
│  ┌──────────────────────┼──────────────────────────────┐ │
│  │       FastAPI (Serverless Functions)                 │ │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────────────┐  │ │
│  │  │ Routes   │ │ Services   │ │ Repositories     │  │ │
│  │  │ (17)     │ │ (Business  │ │ (Data Access)    │  │ │
│  │  │          │ │  Logic)    │ │                   │  │ │
│  │  └──────────┘ └────────────┘ └──────────────────┘  │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          │ psycopg3 (Connection Pool)
┌─────────────────────────┼────────────────────────────────┐
│                   PostgreSQL (Neon)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Users/   │ │ Listings │ │ CRM      │ │ Activity   │  │
│  │ Roles    │ │ Vehicles │ │ Leads/   │ │ Events/    │  │
│  │          │ │ Scores   │ │ Deals    │ │ Heatmaps   │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────┘
          │                    │                │
  ┌───────┴───┐     ┌─────────┴──┐    ┌───────┴───────┐
  │  Twilio   │     │   Slack    │    │  OpenAI / GCP │
  │ Call/SMS  │     │ Webhooks   │    │  AI + Storage │
  └───────────┘     └────────────┘    └───────────────┘
```

### 3.2 Frontend Architecture

**Design Pattern:** Atomic Design (atoms → molecules → organisms → templates → pages)

| Layer | Location | Description |
|-------|----------|-------------|
| **Atoms** | `components/atoms/` | Button, Input, Badge, Icon, Toast |
| **Molecules** | `components/molecules/` | Card, KpiCard, ListingCard, DateRangePicker, Pagination |
| **Organisms** | `components/organisms/` | Header, AdminNavPanel, CRMDashboard, DealPipeline, KanbanBoard |
| **Templates** | `components/templates/` | AdminLayout, ConditionalAdminLayout |
| **Pages** | `app/` | Next.js App Router pages |

**State Management:**
- React Context API for global auth state
- Custom hooks (22 hooks in `lib/hooks/`) encapsulating API calls and local state
- localStorage for token persistence and date range preferences
- No external state library (no Redux/Zustand)

### 3.3 Backend Architecture

**Design Pattern:** Layered architecture (Routes → Services → Repositories)

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Routes** | `api/routes/` (17 files) | HTTP endpoint definitions, request validation, response formatting |
| **Services** | `api/services/` (9 files) | Business logic, third-party integrations, event publishing |
| **Repositories** | `api/repositories/` (29 files) | Database queries, data access, SQL execution |
| **Schemas** | `api/schemas/` (18 files) | Pydantic models for request/response validation |
| **Core** | `api/core/` | Authentication, configuration, database connection management |
| **Utils** | `api/utils/` | Pagination, validation, date utilities, response formatting |

### 3.4 Styling Architecture

- **Tailwind CSS 3.4.7** with utility-first approach
- **Dark mode** support via `class` strategy
- **Framer Motion** for animations and transitions
- **Lucide React** for consistent iconography
- **ApexCharts** for data visualizations
- **Custom Tailwind extensions** for grid layouts (14, 16, 17, 20 column grids)

---

## 4. Functional Requirements

### 4.1 Authentication & User Management

#### FR-AUTH-001: User Registration
- Users can register via a signup form providing email, username, and password
- Registrations are placed in a pending queue (`user_signup_requests` table)
- Admin approval is required before the account is activated
- Password is hashed with bcrypt before storage

#### FR-AUTH-002: User Login
- Users authenticate with email and password
- System validates credentials against bcrypt hash
- On success, returns a JWT access token with user details
- Token contains claims: `sub` (email), `uid` (user_id), `role`, `exp`

#### FR-AUTH-003: Session Management
- JWT tokens stored in browser localStorage
- Token expiry configurable via `JWT_EXPIRES_MINUTES` (default: 60 minutes)
- Expired tokens trigger redirect to login page
- No automatic token refresh mechanism

#### FR-AUTH-004: User Management (Admin)
- Admins can list all users, approve signup requests, update user info, reset passwords, and remove users
- Admins can assign roles to users

#### FR-AUTH-005: Profile Management
- Users can view and update their own profile information
- Users can change their display name and contact details

### 4.2 Role-Based Access Control

#### FR-RBAC-001: Role Definitions
- Three predefined roles: Admin, Buyer, Analyst
- Roles stored in database with configurable permissions
- Admin can create, update, and delete roles

#### FR-RBAC-002: Permission Enforcement
- API endpoints enforce role requirements via dependency injection
- `require_admin` decorator restricts endpoints to admin users
- `require_buyer_or_admin` allows buyers and admins, excludes analysts
- Task ownership checks prevent unauthorized modifications

### 4.3 Vehicle Listing Management

#### FR-LIST-001: Listing Ingestion
- `POST /api/ingest/` accepts vehicle listing data from external sources
- Stores vehicle master data (VIN, year, make, model, trim) in `vehicles` table
- Creates listing records with source, price, mileage, location, and extended data (JSONB)

#### FR-LIST-002: Listing Browsing
- Grid and table view toggle for browsing listings
- Filtering by date range, source, status, and buyer assignment
- Pagination with configurable page size
- Sorting by multiple columns

#### FR-LIST-003: Listing Detail View
- Full vehicle details display (VIN, specs, pricing, mileage, DOM)
- Image carousel/gallery with multi-image support
- Score display with reason codes
- AccuTrade and MMR valuation data integration
- Vehicle condition report (when available)

#### FR-LIST-004: Listing Updates
- Update listing status, notes, images, and assignment
- Image upload to Vercel Blob or Google Cloud Storage
- Track modification history via `updated_at` timestamps

#### FR-LIST-005: Listing Scoring
- AI-powered scoring (0–100) via OpenAI integration
- Score factors: mileage, condition, market trends, price competitiveness
- Historical score tracking in `scores` table
- View `v_latest_scores` for current scores

#### FR-LIST-006: Listing Deletion
- Authorized users can delete listings
- Hard delete (no soft-delete mechanism)

### 4.4 CRM — Lead Management

#### FR-LEAD-001: Lead Creation
- Create leads manually or from listing conversion
- Associate with contact, listing, and source
- Assign to specific buyer/agent
- Set initial status and lead score

#### FR-LEAD-002: Lead Pipeline
- Configurable lead statuses: New, Contacted, Qualified, Converted, Lost
- Status transitions tracked with timestamps (`qualified_at`, `converted_at`)
- Lead summary dashboard with status distribution
- Filtering by status, source, assigned user, and date range

#### FR-LEAD-003: Lead Activities
- Log activities (email, call, meeting, note) against leads
- Activity history with chronological display
- Track who performed each activity and when

#### FR-LEAD-004: Lead Sources & Statuses (Admin)
- Admin can create, update, and delete lead sources (Online, Phone, Referral, etc.)
- Admin can configure lead statuses with color codes and sort order

#### FR-LEAD-005: Lead Metrics
- Conversion rate tracking
- Lead-to-purchase funnel analytics
- Per-source performance metrics (admin access)

### 4.5 CRM — Contact Management

#### FR-CONT-001: Contact CRUD
- Create contacts with full profile: name, email, phone, mobile, company, job title
- Contact types: Customer, Prospect, Vendor, Partner
- Structured address storage (JSONB)
- Social profile links (LinkedIn, etc.)
- Communication preferences

#### FR-CONT-002: Contact Search & Filtering
- Search by name, email, company
- Filter by contact type, assigned user, active status
- Paginated results

#### FR-CONT-003: Contact Activities
- Log interactions per contact
- Activity types: email, call, meeting, note
- Chronological activity timeline

### 4.6 CRM — Deal Management

#### FR-DEAL-001: Deal Pipeline
- Create deals linked to leads and contacts
- Track deal value, probability (0–100%), and expected close date
- Pipeline stages: Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost
- Visual pipeline view with stage distribution

#### FR-DEAL-002: Deal Progression
- Move deals between pipeline stages
- Mark deals as won or lost with timestamps
- Deal categories: New, Used, Trade-in

#### FR-DEAL-003: Deal Activities
- Log activities per deal
- Activity trail for audit purposes

#### FR-DEAL-004: Deal Metrics
- Sales metrics dashboard (admin)
- Revenue forecast based on probability and expected close date
- Win/loss ratio analysis

#### FR-DEAL-005: AI Deal Draft
- `POST /api/crm/deals/{deal_id}/draft` generates AI-powered deal content
- Uses OpenAI to create deal summaries and proposals

### 4.7 CRM — Task Management

#### FR-TASK-001: Task CRUD
- Create tasks with title, description, due date, priority, and status
- Link tasks to leads, deals, or contacts
- Assign tasks to users

#### FR-TASK-002: Task Board (Kanban)
- Kanban board view with drag-and-drop status transitions
- Task statuses: Open, In Progress, Done
- Priority levels: Low, Medium, High, Urgent
- Syncfusion Kanban component integration

#### FR-TASK-003: Task Ownership
- Ownership validation prevents unauthorized modifications
- Task history tracking for status changes

#### FR-TASK-004: SLA Monitoring
- SLA violation tracking for response time and closure deadlines
- Automated scheduling via `sla_scheduler.py`

### 4.8 Communications

#### FR-COMM-001: Phone Calls (Twilio)
- Initiate outbound calls from the application
- Call modal with contact phone number and TwiML configuration
- Call SID tracking and status monitoring
- Incoming call notification component

#### FR-COMM-002: SMS Messaging (Twilio)
- Send SMS messages to contacts
- A2P 10DLC compliant via Messaging Service SID
- SMS history view per contact
- Chat-style interface for SMS conversations

#### FR-COMM-003: Communication Logging
- Unified log for all communication types (email, call, SMS, meeting)
- Direction tracking (inbound/outbound)
- Status tracking (sent, delivered, read, failed)
- Link communications to contacts and leads

### 4.9 Analytics & Reporting

#### FR-ANAL-001: KPI Dashboard
- Key metrics: average profit per unit, lead-to-purchase time, aged inventory, total listings, active buyers, conversion rate
- Real-time calculation from database
- Trend indicators (7, 14, 30-day comparisons)

#### FR-ANAL-002: Charts & Visualizations
- Sourcing activities per agent (bar chart)
- Car categories performance (donut chart)
- States/regions geographic performance (spline area chart)
- Lead-to-purchase funnel (funnel chart)
- Time range picker for chart filtering

#### FR-ANAL-003: Activity Heatmap
- GitHub-style activity heatmap showing user engagement over the past year
- Daily activity counts per user
- Cached in `activity_heatmap_cache` for performance

#### FR-ANAL-004: Buyer Performance
- Per-buyer listing metrics and stats
- Performance KPI cards
- Individual buyer activity detail pages

### 4.10 Data Export

#### FR-EXPORT-001: Export Functionality
- Export listings, leads, and deals to CSV or Excel format
- Customizable field selection via export modal
- Date range filtering for exported data
- Triggered via Export button on relevant pages

### 4.11 Notifications

#### FR-NOTIF-001: Slack Integration
- Send structured notifications to Slack channels
- Trigger Slack workflows on key events (lead creation, deal wins, task assignment)
- Configurable webhook and bot token
- Optional — gracefully disabled if not configured

#### FR-NOTIF-002: Event Bus
- Event-driven notification system
- Event outbox pattern for reliable delivery
- Event types: CommunicationLogged, DealWon, LeadConverted
- Extensible for additional event consumers

### 4.12 Vehicle Valuation Integration

#### FR-VAL-001: AccuTrade Lookup
- VIN-based vehicle valuation lookup
- Cache results in `accu_trade_data` table
- Display valuation data on listing detail and lead pages

#### FR-VAL-002: MMR Lookup
- Manheim Market Report VIN lookup
- Cache results in `mmr_data` table
- Market pricing intelligence for buying decisions

#### FR-VAL-003: Condition Reports
- Vehicle condition assessment storage
- Exterior, interior, mechanical, and tire condition tracking (JSONB)
- Overall condition rating
- Modal display on listing detail page

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Page load time (initial) | < 3 seconds on broadband |
| API response time (95th percentile) | < 500ms for standard queries |
| Database connection pool | 2–10 connections per function instance |
| Connection acquire timeout | 30 seconds |
| Connection recycle interval | 1 hour |

### 5.2 Security

| Requirement | Implementation |
|-------------|---------------|
| Password hashing | bcrypt with salt rounds |
| Authentication | JWT (HS256) with configurable expiry |
| Authorization | Role-based access control (Admin, Buyer, Analyst) |
| SQL injection prevention | Parameterized queries via psycopg3 |
| CORS | Whitelisted origins only |
| HTTPS | Enforced in production via Vercel |
| Input validation | Pydantic models on all API inputs |

### 5.3 Scalability

| Concern | Current State |
|---------|---------------|
| Horizontal scaling | Vercel auto-scales serverless functions |
| Database connections | Pooled (2–10 per instance); Neon supports connection pooling |
| File storage | Cloud-based (Vercel Blob / GCS) with no local dependencies |
| Cold starts | Schema migration runs on first request; subsequent requests are fast |

### 5.4 Reliability

| Requirement | Implementation |
|-------------|---------------|
| Database migrations | Idempotent — safe to re-run on cold starts |
| Health checks | `/healthz` and `/db-check` endpoints |
| Event delivery | Outbox pattern for reliable messaging |
| Error handling | Structured error responses with appropriate HTTP status codes |
| Graceful degradation | Optional integrations (Twilio, Slack, OpenAI) disabled if unconfigured |

### 5.5 Maintainability

| Practice | Implementation |
|----------|---------------|
| Code organization | Atomic Design (frontend), Layered Architecture (backend) |
| Type safety | TypeScript (frontend), Pydantic (backend) |
| API documentation | FastAPI auto-generated OpenAPI/Swagger |
| Component reuse | Shared components via barrel exports (`components/index.ts`) |
| Separation of concerns | Routes → Services → Repositories |

### 5.6 Usability

| Requirement | Implementation |
|-------------|---------------|
| Responsive design | Mobile-first with Tailwind breakpoints (sm, md, lg, xl, 2xl) |
| Dark mode | Toggle via class-based dark mode |
| Accessibility | Semantic HTML, keyboard navigation (partial) |
| Navigation | Sidebar admin panel with collapsible sections |
| Feedback | Toast notifications for user actions |

### 5.7 Browser Compatibility

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Microsoft Edge (latest 2 versions)

---

## 6. Database Design

### 6.1 Entity Relationship Overview

```
roles ─────────────┐
                    │ 1:N
users ◄─────────────┘
  │
  ├── 1:N ──► listings ──► vehicles
  │               │
  │               ├── 1:N ──► scores
  │               ├── 1:1 ──► condition_reports
  │               └── 1:N ──► accu_trade_data / mmr_data
  │
  ├── 1:N ──► contacts ──► contact_activities
  │               │
  │               └── 1:N ──► communications
  │
  ├── 1:N ──► leads ──► lead_activities
  │               │
  │               └── 1:N ──► deals ──► deal_activities
  │
  ├── 1:N ──► tasks
  │
  └── 1:N ──► user_activity ──► activity_heatmap_cache
```

### 6.2 Core Tables

#### vehicles
| Column | Type | Constraints |
|--------|------|------------|
| vehicle_key | text | PRIMARY KEY |
| vin | text | INDEXED |
| year | integer | |
| make | text | |
| model | text | |
| trim | text | |

#### listings
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| vehicle_key | text | FK → vehicles |
| vin | text | INDEXED |
| source | text | |
| price | numeric | |
| miles | integer | |
| dom | integer | Days on market |
| location | text | |
| buyer_id | text | UUID reference |
| payload | JSONB | Extended data |
| images | text[] | Image URLs |
| status | text | |
| mmr_price | numeric | |
| score | integer | |
| radius | text | |
| created_at | timestamptz | DEFAULT now() |

#### scores
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| vehicle_key | text | FK → vehicles, INDEXED |
| vin | text | INDEXED |
| score | integer | Range 0–100 |
| buy_max | numeric | |
| reason_codes | text[] | |
| created_at | timestamptz | DEFAULT now() |

### 6.3 Authentication Tables

#### users
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| email | text | UNIQUE, INDEXED |
| username | text | INDEXED |
| hashed_password | text | bcrypt hash |
| role_id | integer | FK → roles, INDEXED |
| is_confirmed | boolean | DEFAULT false |
| last_login | timestamptz | |
| created_at | timestamptz | DEFAULT now() |

#### roles
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| name | text | UNIQUE |
| description | text | |

### 6.4 CRM Tables

#### contacts
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| first_name | text | NOT NULL |
| last_name | text | NOT NULL |
| email | text | |
| phone | text | |
| mobile | text | |
| company | text | |
| job_title | text | |
| contact_type_id | integer | FK → contact_types |
| assigned_to | UUID | FK → users |
| address | JSONB | |
| social_profiles | JSONB | |
| preferences | JSONB | |
| notes | text | |
| is_active | boolean | DEFAULT true |
| created_by | UUID | FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### leads
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| listing_id | integer | FK → listings |
| contact_id | UUID | FK → contacts |
| status_id | integer | FK → lead_statuses |
| source_id | integer | FK → lead_sources |
| assigned_to | UUID | FK → users |
| vehicle_interest | JSONB | |
| budget_range | JSONB | Min/max price |
| notes | text | |
| lead_score | integer | Range 0–100 |
| qualified_at | timestamptz | |
| converted_at | timestamptz | |
| created_by | UUID | FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### deals
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| lead_id | UUID | FK → leads |
| contact_id | UUID | FK → contacts |
| stage_id | integer | FK → deal_stages |
| category_id | integer | FK → deal_categories |
| assigned_to | UUID | FK → users |
| title | text | |
| description | text | |
| value | numeric | Deal amount |
| probability | integer | Range 0–100 |
| expected_close_date | date | |
| is_won | boolean | |
| is_lost | boolean | |
| won_at | timestamptz | |
| lost_at | timestamptz | |
| created_by | UUID | FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### tasks
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| title | text | NOT NULL |
| description | text | |
| status_id | integer | FK → task_statuses |
| priority_id | integer | FK → task_priorities |
| assigned_to | UUID | FK → users |
| due_date | date | |
| lead_id | UUID | FK → leads, nullable |
| deal_id | UUID | FK → deals, nullable |
| contact_id | UUID | FK → contacts, nullable |
| created_by | UUID | FK → users |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| completed_at | timestamptz | nullable |

### 6.5 Communication Tables

#### communications
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| from_user_id | UUID | FK → users |
| to_contact_id | UUID | FK → contacts, nullable |
| to_lead_id | UUID | FK → leads, nullable |
| communication_type | text | email, call, sms, meeting |
| subject | text | |
| content | text | |
| direction | text | inbound, outbound |
| status | text | sent, delivered, read, failed |
| phone_number | text | nullable |
| call_sid | text | Twilio call ID, nullable |
| sms_sid | text | Twilio message ID, nullable |
| template_id | UUID | nullable |
| created_at | timestamptz | |

### 6.6 Analytics Tables

#### user_activity
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users |
| activity_type | text | view_listing, create_lead, etc. |
| entity_type | text | listing, lead, deal |
| entity_id | text | |
| metadata | JSONB | |
| created_at | timestamptz | |

#### event_outbox
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY |
| aggregate_type | text | |
| aggregate_id | text | |
| event_type | text | |
| payload | JSONB | |
| created_at | timestamptz | |
| published_at | timestamptz | nullable |

### 6.7 Database Views

- **v_latest_scores** — Materialized view showing the latest score per vehicle key, joining `scores` with `vehicles` for quick access

### 6.8 Indexes

Performance-critical indexes on:
- `idx_listings_vehicle_key`, `idx_listings_vin`
- `idx_scores_vehicle_key`, `idx_scores_vin`
- `idx_vehicles_vin`
- `idx_users_email`, `idx_users_username`, `idx_users_role_id`
- Foreign key indexes on all relationship columns

---

## 7. API Specification

### 7.1 Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8001/api` |
| Production | `https://<domain>/api` |

### 7.2 Authentication

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

### 7.3 Endpoints Summary

#### System Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/healthz` | Health check | No |
| GET | `/db-check` | Database connectivity | No |
| GET | `/_schema_status` | Schema migration status | No |
| GET | `/_roles_status` | Roles table status | No |
| GET | `/_listings_status` | Listings schema status | No |

#### User Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/users/signup` | Register new user | No |
| POST | `/users/login` | Authenticate user | No |
| GET | `/users/` | List all users | Admin |
| GET | `/users/me` | Get current user | User |
| GET | `/users/{user_id}` | Get user by ID | Admin |
| GET | `/users/signup-requests` | List pending signups | Admin |
| POST | `/users/confirm-signup` | Approve signup | Admin |
| POST | `/users/remove-user` | Delete user | Admin |
| PUT | `/users/{user_id}` | Update user | Admin |
| PUT | `/users/{user_id}/password` | Reset password | Admin |
| PUT | `/users/me` | Update own profile | User |

#### Role Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/roles/` | List roles | User |
| POST | `/roles/` | Create role | Admin |
| GET | `/roles/{role_id}` | Get role | User |
| PUT | `/roles/{role_id}` | Update role | Admin |
| DELETE | `/roles/{role_id}` | Delete role | Admin |

#### Listings
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ingest/` | Ingest listings | User |
| GET | `/listings/` | List all listings | User |
| GET | `/listings/{listing_id}` | Get listing details | User |
| PUT | `/listings/{listing_id}` | Update listing | User |
| DELETE | `/listings/{listing_id}` | Delete listing | User |
| GET | `/listings/buyer/{buyer_id}` | Listings by buyer | User |
| GET | `/listings/buyer/{buyer_id}/stats` | Buyer stats | User |

#### CRM — Leads
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/crm/leads/` | Create lead | User |
| GET | `/crm/leads/` | List leads | User |
| GET | `/crm/leads/summary` | Lead summary | User |
| GET | `/crm/leads/metrics` | Lead metrics | Admin |
| POST | `/crm/leads/{lead_id}` | Update lead | User |
| DELETE | `/crm/leads/{lead_id}` | Delete lead | User |
| GET | `/crm/leads/{lead_id}/activities` | Lead activities | User |
| POST | `/crm/leads/{lead_id}/activities` | Log activity | User |
| CRUD | `/crm/leads/sources` | Lead sources | Admin |
| CRUD | `/crm/leads/statuses` | Lead statuses | Admin |

#### CRM — Contacts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/crm/contacts/` | Create contact | User |
| GET | `/crm/contacts/` | List contacts | User |
| GET | `/crm/contacts/{contact_id}` | Contact details | User |
| PUT | `/crm/contacts/{contact_id}` | Update contact | User |
| DELETE | `/crm/contacts/{contact_id}` | Delete contact | User |
| GET | `/crm/contacts/{contact_id}/activities` | Contact activities | User |
| POST | `/crm/contacts/{contact_id}/activities` | Log activity | User |
| CRUD | `/crm/contacts/types` | Contact types | Admin |

#### CRM — Deals
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/crm/deals/` | Create deal | User |
| GET | `/crm/deals/` | List deals | User |
| GET | `/crm/deals/pipeline` | Pipeline view | User |
| GET | `/crm/deals/metrics` | Sales metrics | Admin |
| GET | `/crm/deals/{deal_id}` | Deal details | User |
| PUT | `/crm/deals/{deal_id}` | Update deal | User |
| DELETE | `/crm/deals/{deal_id}` | Delete deal | User |
| POST | `/crm/deals/{deal_id}/draft` | AI deal draft | User |
| CRUD | `/crm/deals/stages` | Deal stages | Admin |
| CRUD | `/crm/deals/categories` | Deal categories | Admin |

#### CRM — Tasks
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/crm/tasks/` | Create task | User |
| GET | `/crm/tasks/` | List tasks | User |
| GET | `/crm/tasks/{task_id}` | Task details | User |
| PUT | `/crm/tasks/{task_id}` | Update task | User |
| DELETE | `/crm/tasks/{task_id}` | Delete task | User |
| GET | `/crm/tasks/{task_id}/history` | Task history | User |

#### Communications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/crm/communications/` | Log communication | User |
| POST | `/crm/communications/calls` | Make call (Twilio) | User |
| POST | `/crm/communications/sms` | Send SMS (Twilio) | User |
| GET | `/crm/communications/` | List communications | User |
| GET | `/crm/communications/{contact_id}` | Contact history | User |

#### Analytics
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/kpi/` | KPI metrics | User |
| GET | `/trends/` | KPI trends | User |
| GET | `/chart/sourcing-activities` | Agent activity chart | User |
| GET | `/chart/car-categories` | Category chart | User |
| GET | `/chart/states-regions` | Geographic chart | User |
| GET | `/chart/lead-to-purchase-funnel` | Funnel chart | User |
| GET | `/user-activity/` | Activity log | User |
| GET | `/user-activity/{user_id}` | User's activity | User |
| GET | `/activity-heatmap/` | Heatmap data | User |

#### Export
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/export/listings` | Export listings | User |
| POST | `/export/leads` | Export leads | User |
| POST | `/export/deals` | Export deals | User |

#### Integrations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accu-trade/lookup/{vin}` | AccuTrade lookup | User |
| GET | `/mmr/lookup/{vin}` | MMR lookup | User |
| GET | `/condition-report/{listing_id}` | Condition report | User |
| POST | `/slack/webhook` | Slack events | No |
| POST | `/slack/notify` | Send Slack message | User |
| POST | `/slack/workflow` | Trigger workflow | User |
| POST | `/notify/` | Send notification | User |

### 7.4 Standard Response Formats

**Success (Single Entity):**
```json
{
  "id": "uuid",
  "field": "value",
  "created_at": "2026-01-15T10:30:00Z"
}
```

**Success (List):**
```json
[
  { "id": 1, "name": "Item 1" },
  { "id": 2, "name": "Item 2" }
]
```

**Login Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role_id": 2,
    "role": "buyer",
    "is_confirmed": true
  }
}
```

**Error Response:**
```json
{
  "detail": "Error description"
}
```
Status codes: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error)

---

## 8. Authentication & Authorization

### 8.1 Authentication Flow

```
┌──────┐    POST /users/login     ┌──────────┐
│Client├─────────────────────────►│  FastAPI  │
│      │  { email, password }     │          │
│      │                          │  bcrypt  │
│      │◄─────────────────────────┤  verify  │
│      │  { access_token, user }  │          │
└──┬───┘                          └──────────┘
   │
   │  localStorage.setItem('auth.token', token)
   │
   │  GET /api/listings/
   │  Authorization: Bearer <token>
   │
   ▼
┌──────┐                          ┌──────────┐
│Client├─────────────────────────►│  FastAPI  │
│      │                          │  decode  │
│      │◄─────────────────────────┤  JWT     │
│      │  { listings data }       │  verify  │
└──────┘                          └──────────┘
```

### 8.2 JWT Token Structure

```json
{
  "sub": "user@example.com",
  "uid": "550e8400-e29b-41d4-a716-446655440000",
  "role": "buyer",
  "exp": 1707649200
}
```

- **Algorithm:** HS256
- **Secret:** Configurable via `JWT_SECRET` environment variable
- **Expiry:** Configurable via `JWT_EXPIRES_MINUTES` (default: 60)

### 8.3 Role Permissions Matrix

| Feature | Admin | Buyer | Analyst |
|---------|-------|-------|---------|
| View listings | Yes | Yes | Yes |
| Create/edit listings | Yes | Own only | No |
| Delete listings | Yes | Own only | No |
| Manage users | Yes | No | No |
| Approve signups | Yes | No | No |
| Configure roles | Yes | No | No |
| CRM — Create leads/deals | Yes | Yes | No |
| CRM — Edit leads/deals | Yes | Own/assigned | No |
| CRM — View leads/deals | Yes | Yes | Yes |
| CRM — Delete leads/deals | Yes | Own only | No |
| CRM — Tasks | Yes | Assigned | No |
| View KPIs | Yes | Yes | Yes |
| View metrics/analytics | Yes | Own | Yes |
| Lead/Deal metrics | Yes | No | No |
| Export data | Yes | Yes | Yes |
| Slack/Notifications | Yes | Yes | No |
| Communications (call/SMS) | Yes | Yes | No |

---

## 9. Third-Party Integrations

### 9.1 Twilio (Communications)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Phone calls and SMS messaging |
| **SDK** | `twilio==9.3.5` |
| **Features** | Outbound calls, SMS (A2P 10DLC), call tracking |
| **Configuration** | Account SID, Auth Token, Phone Number, optional Messaging Service SID |
| **Fallback** | Gracefully disabled if environment variables not set |

### 9.2 Slack (Notifications)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Team notifications and workflow automation |
| **Integration Types** | Incoming webhooks, Bot API, Workflow webhooks |
| **Triggers** | Lead creation, deal wins, task assignment |
| **Configuration** | Webhook URL, Bot Token, Workflow Webhook URL, Channel |
| **Fallback** | Disabled if webhook URL not configured |

### 9.3 OpenAI (AI Services)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Vehicle listing scoring, deal draft generation |
| **Endpoints** | Score calculation, deal content drafting |
| **Configuration** | `OPENAI_API_KEY` |
| **Fallback** | Features unavailable if key not set |

### 9.4 Google Cloud Storage

| Aspect | Detail |
|--------|--------|
| **Purpose** | Image and document storage |
| **Configuration** | Project ID, Bucket Name, Service Account JSON |
| **Toggle** | `GCP_STORAGE_ENABLED=true/false` |
| **Alternative** | Vercel Blob Storage |

### 9.5 Vercel Blob Storage

| Aspect | Detail |
|--------|--------|
| **Purpose** | Image hosting optimized for Vercel |
| **Configuration** | `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_URL` |
| **Usage** | Default for Vercel deployments |

### 9.6 AccuTrade

| Aspect | Detail |
|--------|--------|
| **Purpose** | Third-party vehicle valuation |
| **Endpoint** | `GET /accu-trade/lookup/{vin}` |
| **Caching** | Results cached in `accu_trade_data` table |

### 9.7 Manheim Market Report (MMR)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Wholesale market pricing intelligence |
| **Endpoint** | `GET /mmr/lookup/{vin}` |
| **Caching** | Results cached in `mmr_data` table |

---

## 10. Deployment & Infrastructure

### 10.1 Deployment Architecture

```
GitHub Repository
       │
       ▼ (git push)
┌──────────────────────┐
│     Vercel CI/CD     │
│  ┌────────────────┐  │
│  │ Next.js Build  │  │      ┌─────────────────┐
│  │ (SSR + Static) │──┼─────►│ Vercel CDN/Edge │
│  └────────────────┘  │      └─────────────────┘
│  ┌────────────────┐  │      ┌─────────────────┐
│  │ Python Runtime │──┼─────►│ Serverless Fns  │
│  │ (FastAPI)      │  │      └────────┬────────┘
│  └────────────────┘  │               │
└──────────────────────┘               │
                                       ▼
                              ┌─────────────────┐
                              │  PostgreSQL      │
                              │  (Neon)          │
                              └─────────────────┘
```

### 10.2 Environment Configuration

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NEXT_PUBLIC_BACKEND_URL` | API base URL for frontend | Yes |
| `TWILIO_*` | Twilio integration | No |
| `SLACK_*` | Slack integration | No |
| `OPENAI_API_KEY` | AI features | No |
| `GCP_*` | Google Cloud Storage | No |
| `BLOB_*` | Vercel Blob Storage | No |

### 10.3 Build & Development

```bash
# Frontend development
npm run dev              # Next.js dev server (port 3000)

# Backend development
uvicorn api.index:app --reload --port 8001

# Production build
npm run build            # Next.js production build
npm run lint             # ESLint validation
```

### 10.4 Database Initialization

Database schema is applied automatically on cold start via `apply_schema_if_needed()` in `api/core/db.py`. Migration files are applied in order:

1. `db/schema.sql` — Base tables (users, roles, vehicles, listings, scores)
2. `db/crm_schema.sql` — CRM tables (leads, contacts, deals, tasks, communications)
3. `db/add_user_activity.sql` — User activity tracking
4. `db/001_*` through `db/015_*` — Incremental migrations
5. `db/seed_roles.sql` — Default role data

All migrations are idempotent and safe to re-run.

---

## 11. Current Limitations

### 11.1 Security Gaps

| Issue | Impact | Severity |
|-------|--------|----------|
| No rate limiting on API endpoints | Vulnerable to brute-force attacks | High |
| No multi-factor authentication (MFA) | Single factor auth only | High |
| No token refresh mechanism | Users must re-login on expiry | Medium |
| JWT secret rotation not automated | Secret compromise affects all tokens | Medium |
| No CSRF protection | Potential cross-site request forgery | Medium |
| Password minimum length only 6 chars | Weak password policy | Low |

### 11.2 Performance Gaps

| Issue | Impact | Severity |
|-------|--------|----------|
| No caching layer (Redis/Memcached) | Every request hits database | High |
| No image thumbnails or compression | Large image downloads | Medium |
| No API response compression | Increased bandwidth usage | Medium |
| No database query optimization for aggregations | Slow analytics on large datasets | Medium |
| Client-side pagination only | Full dataset loaded for filtering | Medium |

### 11.3 Feature Gaps

| Issue | Impact |
|-------|--------|
| No automated test suite | No regression protection |
| No email integration | SMS and Slack only |
| No calendar/scheduling integration | Manual appointment management |
| No document management system | No file attachment beyond images |
| No advanced reporting/BI | Limited to built-in charts |
| Condition report module incomplete | Partial implementation |
| No webhook/API for external integrations | Limited extensibility |
| No audit log for compliance | Basic timestamps only |

### 11.4 Architectural Gaps

| Issue | Impact |
|-------|--------|
| No WebSocket support | No real-time updates |
| No soft deletes | Deleted data unrecoverable |
| No data retention policies | Unlimited data growth |
| No GDPR/data anonymization | Privacy compliance risk |
| Single database for all modules | No service isolation |
| No background job queue (persistent) | Background jobs lost on restart |

---

## 12. Suggested Features & Enhancements

### 12.1 Security Enhancements

#### SF-SEC-001: Multi-Factor Authentication (MFA)
- Add TOTP-based 2FA (Google Authenticator / Authy compatible)
- Enforce MFA for admin accounts
- Provide recovery codes for account access
- **Priority:** High

#### SF-SEC-002: API Rate Limiting
- Implement per-user and per-IP rate limits on all endpoints
- Configurable limits per endpoint category (auth: strict, data: moderate)
- Return `429 Too Many Requests` with `Retry-After` header
- **Priority:** High

#### SF-SEC-003: Token Refresh Mechanism
- Add `/users/refresh` endpoint for token renewal
- Implement short-lived access tokens (15 min) with long-lived refresh tokens (7 days)
- Secure refresh token rotation
- **Priority:** High

#### SF-SEC-004: Enhanced Password Policy
- Minimum 8 characters with complexity requirements (uppercase, lowercase, number, special character)
- Password history to prevent reuse
- Account lockout after failed attempts
- **Priority:** Medium

#### SF-SEC-005: Audit Logging
- Comprehensive audit trail for all data modifications
- Track who changed what, when, and the before/after values
- Tamper-proof logging with append-only storage
- Exportable audit reports for compliance
- **Priority:** Medium

### 12.2 Communication Enhancements

#### SF-COMM-001: Email Integration
- Integrate with SendGrid, Amazon SES, or Mailgun for transactional email
- Email templates for common communications (lead follow-up, deal proposals, task notifications)
- Email tracking (open, click, bounce)
- Unified inbox combining email, SMS, and call logs
- **Priority:** High

#### SF-COMM-002: In-App Notifications
- Real-time notification center in the application header
- Notification types: task assignments, deal updates, lead activity, system alerts
- Read/unread tracking and bulk actions
- Push notification support (browser / mobile)
- **Priority:** High

#### SF-COMM-003: WhatsApp Business Integration
- Add WhatsApp messaging channel via Twilio or Meta Business API
- Template-based messaging for customer outreach
- Conversation threading
- **Priority:** Medium

### 12.3 Analytics & Reporting Enhancements

#### SF-ANAL-001: Advanced Reporting Engine
- Custom report builder with drag-and-drop field selection
- Scheduled report generation and email delivery
- Report templates for common use cases (monthly sales, buyer performance, pipeline health)
- PDF export for reports
- **Priority:** High

#### SF-ANAL-002: Real-Time Dashboard
- WebSocket-based live updates for KPIs and pipeline changes
- Auto-refreshing charts without page reload
- Real-time notification feed
- **Priority:** Medium

#### SF-ANAL-003: Predictive Analytics
- Machine learning models for deal win probability prediction
- Lead scoring automation based on historical conversion patterns
- Inventory aging prediction and pricing recommendations
- Market trend forecasting using MMR/AccuTrade historical data
- **Priority:** Medium

#### SF-ANAL-004: Custom Dashboard Widgets
- Allow users to configure their own dashboard layout
- Draggable, resizable widget grid
- Save and share dashboard configurations
- Widget library: KPI cards, charts, lists, activity feeds
- **Priority:** Low

### 12.4 CRM Enhancements

#### SF-CRM-001: Workflow Automation Builder
- Visual workflow builder for automated actions (e.g., "when lead status changes to Qualified, create a task and send Slack notification")
- Trigger types: status change, date-based, field value change
- Action types: send email/SMS, create task, assign user, update field, notify Slack
- Conditional branching and time delays
- **Priority:** High

#### SF-CRM-002: Calendar & Scheduling
- Integrated calendar for appointments, follow-ups, and test drives
- Google Calendar / Outlook Calendar sync
- Appointment booking links for customers
- Automated reminders via email and SMS
- **Priority:** High

#### SF-CRM-003: Document Management
- Attach documents to leads, deals, and contacts (contracts, invoices, inspection reports)
- Document versioning and approval workflows
- E-signature integration (DocuSign, HelloSign)
- Template library for common documents
- **Priority:** Medium

#### SF-CRM-004: Lead Scoring Automation
- Automated lead scoring based on configurable rules
- Scoring factors: engagement level, budget match, response time, vehicle interest
- Decay scoring for aging leads
- Score thresholds for automated actions (e.g., auto-assign high-score leads)
- **Priority:** Medium

#### SF-CRM-005: Duplicate Detection
- Automatic duplicate contact/lead detection on creation
- Merge functionality for duplicate records
- Fuzzy matching on name, email, phone
- **Priority:** Medium

### 12.5 Listing Management Enhancements

#### SF-LIST-001: Automated Listing Ingestion
- Scheduled scraping/API polling from configured listing sources
- Deduplication based on VIN
- Automatic scoring on ingestion
- Source health monitoring and alerts
- **Priority:** High

#### SF-LIST-002: Vehicle History Reports
- Integration with Carfax / AutoCheck for vehicle history
- Display accident history, service records, ownership count
- Cache reports locally to reduce API costs
- **Priority:** High

#### SF-LIST-003: Comparative Market Analysis
- Side-by-side vehicle comparison tool
- Market position visualization (price vs. market average)
- Competitor inventory monitoring
- Price recommendation engine based on market data
- **Priority:** Medium

#### SF-LIST-004: Image AI Analysis
- Automatic damage detection from vehicle photos using computer vision
- Image quality scoring
- Auto-categorization of images (exterior, interior, engine, tires)
- **Priority:** Low

### 12.6 User Experience Enhancements

#### SF-UX-001: Mobile Application
- React Native or Progressive Web App (PWA) for mobile access
- Push notifications for critical events
- Offline capability for viewing cached data
- Camera integration for photo capture
- **Priority:** High

#### SF-UX-002: Keyboard Shortcuts & Power User Features
- Keyboard shortcuts for common actions (search, navigate, create)
- Quick search command palette (Cmd+K / Ctrl+K)
- Bulk operations on listings, leads, and deals
- **Priority:** Medium

#### SF-UX-003: Improved Accessibility (WCAG 2.1 AA)
- Full screen reader compatibility
- Keyboard navigation for all interactive elements
- Color contrast compliance
- Focus management and ARIA labels
- **Priority:** Medium

#### SF-UX-004: Multi-Language Support (i18n)
- Internationalization framework for UI strings
- Initial languages: English, Spanish
- Currency and date format localization
- **Priority:** Low

### 12.7 Platform & Infrastructure Enhancements

#### SF-INFRA-001: Caching Layer
- Add Redis for frequently accessed data (KPIs, user sessions, listing counts)
- Cache invalidation strategy tied to data mutations
- Configurable TTL per data type
- **Priority:** High

#### SF-INFRA-002: Automated Testing Suite
- Unit tests for backend repositories and services (pytest)
- Integration tests for API endpoints
- Frontend component tests (React Testing Library)
- End-to-end tests (Playwright or Cypress)
- CI pipeline running tests on every pull request
- **Priority:** High

#### SF-INFRA-003: API Versioning
- Versioned API routes (`/api/v1/`, `/api/v2/`)
- Deprecation headers for old endpoints
- Migration guides for breaking changes
- **Priority:** Medium

#### SF-INFRA-004: Webhook System for External Integrations
- Outbound webhooks for external systems to subscribe to events
- Configurable event subscriptions per webhook endpoint
- Retry logic with exponential backoff
- Webhook delivery logs and debugging tools
- **Priority:** Medium

#### SF-INFRA-005: Multi-Tenancy Support
- Tenant-level data isolation for multi-dealership deployments
- Tenant-specific configuration (branding, integrations, roles)
- Shared infrastructure with logical separation
- **Priority:** Low

### 12.8 AI & Automation Enhancements

#### SF-AI-001: AI-Powered Chat Assistant
- In-app chat assistant for users to query data conversationally
- Natural language queries: "Show me all Ford F-150s under $30k in Texas"
- AI-generated daily briefings for buyers
- Smart suggestions based on user activity patterns
- **Priority:** Medium

#### SF-AI-002: Automated Follow-Up Sequences
- AI-generated follow-up messages based on lead stage and history
- Multi-channel sequences (email → SMS → call)
- A/B testing for message templates
- Performance tracking per sequence
- **Priority:** Medium

#### SF-AI-003: Smart Inventory Recommendations
- Recommend vehicles to acquire based on sales history and market demand
- Identify underpriced listings in the market
- Suggest optimal pricing for dealership inventory
- Seasonal demand pattern recognition
- **Priority:** Medium

### 12.9 Compliance & Data Management

#### SF-COMP-001: GDPR / CCPA Compliance
- Data subject access requests (export personal data)
- Right to deletion (anonymize personal data)
- Consent management for communications
- Data retention policies with automated cleanup
- **Priority:** High

#### SF-COMP-002: Soft Deletes
- Replace hard deletes with soft deletes across all entities
- `deleted_at` timestamp for recovery window
- Admin ability to permanently purge soft-deleted records
- Exclude soft-deleted records from queries by default
- **Priority:** Medium

#### SF-COMP-003: Data Backup & Recovery
- Automated daily database backups
- Point-in-time recovery capability
- Backup verification and restore testing
- Cross-region backup replication
- **Priority:** Medium

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 15.1.0 |
| UI Library | React | 19 |
| Language (Frontend) | TypeScript | 5.5.2 |
| CSS Framework | Tailwind CSS | 3.4.7 |
| Charts | ApexCharts + react-apexcharts | 5.3.6 |
| Animations | Framer Motion | 12.23.25 |
| Icons | Lucide React | 0.439.0 |
| Kanban | Syncfusion EJ2 React Kanban | 24.1.47 |
| Backend Framework | FastAPI | 0.111.0 |
| ASGI Server | Uvicorn | 0.30.0 |
| Language (Backend) | Python | 3.8+ |
| Database Driver | psycopg | 3.1.19 |
| Data Validation | Pydantic | 2.7.4 |
| Password Hashing | bcrypt | 4.1.2 |
| SMS/Calls | Twilio | 9.3.5 |
| Database | PostgreSQL | (Neon hosted) |
| Hosting | Vercel | — |
| File Storage | Vercel Blob / GCS | — |

## Appendix B: File Structure Reference

```
auto_buyer_dashboard_vercel/
├── api/                    # FastAPI backend
│   ├── core/              # Auth, config, DB, middleware
│   ├── routes/            # 17 route files
│   ├── services/          # 9 service files
│   ├── repositories/      # 29 repository files
│   ├── schemas/           # 18 Pydantic schema files
│   ├── utils/             # Pagination, validation, dates
│   └── index.py           # App entry point
├── app/                    # Next.js pages (App Router)
│   ├── auth/              # Login, signup
│   ├── crm/               # Leads, contacts, deals, tasks
│   ├── listings/          # Vehicle listings
│   ├── buyer-activity/    # Performance monitoring
│   ├── user-management/   # Admin panel
│   └── profile/           # User profile
├── components/             # React components (Atomic Design)
│   ├── atoms/             # Button, Input, Badge, etc.
│   ├── molecules/         # Card, KpiCard, Pagination, etc.
│   ├── organisms/         # Header, DealPipeline, KanbanBoard, etc.
│   ├── templates/         # AdminLayout
│   └── charts/            # BarChart, DonutChart, SplineAreaChart
├── lib/                    # Shared utilities
│   ├── hooks/             # 22 custom React hooks
│   ├── services/          # API client services
│   ├── types/             # TypeScript type definitions
│   ├── contexts/          # React contexts
│   ├── constants/         # App constants
│   └── utils/             # Formatters, date utilities
├── db/                     # SQL schema and migrations
└── styles/                 # Global CSS (Tailwind)
```

---

*This document was generated from the current codebase as of February 2026 and reflects the implemented state of the Auto Buyer Dashboard application.*
