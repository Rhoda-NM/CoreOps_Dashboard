# CoreOps Dashboard

CoreOps Dashboard is a business operations dashboard designed for freelancers and small digital agencies to manage clients, projects, tasks, invoices, and revenue from one workspace.

It is built as a full-stack Next.js application using PostgreSQL and Prisma, with a reusable architecture suitable for scaling into a larger SaaS product.

## Screenshots

### Dashboard

![CoreOps Dashboard](./public/screenshots/dashboard.png)

### Clients Page

![Clients Page](./public/screenshots/clients.png)

### Client Detail Page

![Client Detail Page](./public/screenshots/client-detail.png)

### Projects Page

![Projects Page](./public/screenshots/projects.png)

### Project Detail Page

![Project Detail Page](./public/screenshots/project-detail.png)

### Tasks Page

![Tasks Page](./public/screenshots/tasks.png)

### Invoices Page

![Invoices Page](./public/screenshots/invoices.png)

## Overview

CoreOps Dashboard is a business operations dashboard designed for freelancers and small digital agencies to manage clients, projects, tasks, invoices, and revenue from one workspace.

The core workflow is:

Client → Project → Tasks → Invoices → Dashboard Metrics

The goal of the MVP is to give an agency owner a clear view of clients, active projects, pending tasks, overdue work, paid revenue, and outstanding invoices.

## Clients

The Clients module allows the user to manage their business relationships.

Features include:

- add new clients
- view all clients
- search and filter clients
- view client contact details
- edit client information
- archive clients
- view projects and invoices linked to each client

## Projects

The Projects module allows the user to manage work connected to specific clients.

Features include:

- create projects under specific clients
- view all projects across the workspace
- view project detail pages
- edit project information
- update project status
- filter projects by status
- track project progress based on completed tasks

Project statuses:

- ACTIVE
- COMPLETED
- PAUSED
- CANCELLED

## Tasks

The Tasks module allows the user to manage execution across projects.

Features include:

- create tasks under specific projects
- view tasks inside project detail pages
- view all tasks globally
- set task priority
- set due dates
- update task status
- detect overdue tasks
- search and filter tasks

Task statuses:

- TODO
- IN_PROGRESS
- REVIEW
- DONE

Task priorities:

- LOW
- MEDIUM
- HIGH
- URGENT

## Invoices

The Invoices module allows the user to manage billing and revenue.

Features include:

- create invoices for clients
- optionally link invoices to specific projects
- view invoices globally
- view invoices under clients
- view project-linked invoices inside project detail pages
- update invoice status
- track paid and outstanding revenue
- filter invoices by status and billing state

Invoice statuses:

- DRAFT
- SENT
- PAID
- OVERDUE
- CANCELLED

## Dashboard Metrics

The dashboard displays real metrics from PostgreSQL.

Metrics include:

- total active clients
- active projects
- pending tasks
- overdue tasks
- revenue this month
- outstanding invoices
- recent workspace activity
- today’s operational focus

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | Tailwind CSS |
| UI | Custom reusable UI primitives |
| Icons | Lucide React |
| Runtime | Node.js |
| Local Database | Docker PostgreSQL |

## Architecture

CoreOps uses a feature-oriented structure to keep the application scalable and maintainable.

```txt
src/
  app/
    (dashboard)/
      dashboard/
      clients/
      projects/
      tasks/
      invoices/
      activity/
      settings/

  components/
    layout/
    shared/
    ui/

  features/
    clients/
      actions/
      components/
      schemas/

    projects/
      actions/
      components/
      schemas/

    tasks/
      actions/
      components/
      schemas/

    invoices/
      actions/
      components/
      schemas/

  server/
    auth/
    db/
    services/

  lib/

```

```md
## Architectural Principles

The project follows these principles:

- `app/` handles routing and page composition
- `features/` contains domain-specific UI, server actions, and validation schemas
- `server/services/` contains business logic and Prisma database access
- `components/ui/` contains reusable design primitives
- `components/shared/` contains reusable product-level components
- database access is scoped through the current workspace
- pages remain clean and avoid holding business logic directly

## Data Model

CoreOps follows this relationship structure:

```txt
User
  → Workspace
      → Clients
          → Projects
              → Tasks
          → Invoices
```


## Workspace Scope

The MVP currently uses a seeded development user:

```txt
rhoda@coreops.dev
```

## UI System

CoreOps uses a small custom design system with reusable components:

- Button
- Card
- Table
- Badge
- Input
- EmptyState
- PageHeader
- ClickableRow
- BackButton

This keeps the interface consistent across clients, projects, tasks, invoices, and dashboard pages.

The visual direction is a dark, professional SaaS dashboard style with a restrained color palette and clean hierarchy.


## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd coreops_dashboard

### 2. Installl dependencies

npm install

### 3. Start PosgreSQL with Docker

docker start core_ops_db
docker run --name core_ops_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=core_ops \
  -p 5433:5432 \
  -d postgres

### 4. Configure environment variables

Create or update .env:
DATABASE_URL="postgresql://postgres:password@localhost:5433/core_ops"

### 5. Run Prisma migrations

npx prisma migrate dev

### 6. Seed demo data

ts-node prisma/seed.ts

### 7. Start the development server

npm run dev

### Open:

http://localhost:3000/dashboard

### Open Prisma Studio:

npx prisma studio

### Run migrations:

npx prisma migrate dev

### Generate Prisma client:

npx prisma generate

### Seed database:

ts-node prisma/seed.ts

### Run development server:

npm run dev

### Build for production:

npm run build
```
## Phase 2 Roadmap

Potential next features include:

- Clerk or Auth.js authentication
- multi-user workspaces
- role-based access control
- invoice PDF export
- activity logs
- task comments
- task assignments
- client portal
- email notifications
- analytics charts
- AI-powered business insights

## What This Project Demonstrates

CoreOps demonstrates:

- building a full-stack application with Next.js App Router
- using Server Components and Server Actions
- modeling relational business data with PostgreSQL
- using Prisma for type-safe database access
- designing workspace-scoped data access
- creating reusable UI primitives
- building real dashboard metrics
- thinking through product workflows, not just CRUD screens
- structuring a scalable feature-based application

## Project Positioning

CoreOps is positioned as:

> A business operations dashboard for freelancers and small digital agencies to manage clients, projects, tasks, invoices, and revenue from one workspace.

It is designed as a portfolio-grade MVP that can later evolve into a SaaS product.

## Author

Built by Rhoda Njeri.
email: rhodanmuya@gmail.com
www.rhodanjeri.dev