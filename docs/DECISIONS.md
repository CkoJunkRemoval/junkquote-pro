# JunkQuote Pro Architecture Decisions

---

## ADR-001

### PostgreSQL

Decision

Use PostgreSQL as the primary database.

Reason

Reliable.

Scalable.

Industry standard.

Supports complex relationships required by JunkQuote Pro.

Status

Accepted

---

## ADR-002

### Database Hosting

Decision

Use Neon during development.

Reason

Serverless PostgreSQL.

Excellent free tier.

Easy deployment with Vercel.

Can migrate later if necessary.

Status

Accepted

---

## ADR-003

### ORM

Decision

Use Prisma ORM.

Reason

Type safety.

Excellent developer experience.

Easy migrations.

Good Next.js support.

Status

Accepted

---

## ADR-004

### Primary Keys

Decision

Use UUIDs.

Reason

Secure.

Non-sequential.

Suitable for SaaS.

Prevents predictable IDs.

Status

Accepted

---

## ADR-005

### Backend Pattern

Decision

Use Server Actions for internal application workflows.

Reason

Simple.

Type safe.

No unnecessary API boilerplate.

Status

Accepted

---

## ADR-006

### Database Access

Decision

Never access Prisma directly from React components.

Pattern

React

↓

Server Action

↓

Business Logic

↓

Prisma

↓

PostgreSQL

Reason

Keeps UI independent of database implementation.

Status

Accepted

---

## ADR-007

### Multi-Tenant Architecture

Decision

Every business record belongs to one Company.

Reason

Supports multiple junk removal companies on one platform.

Status

Accepted

---

## ADR-008

### Development Workflow

Decision

Complete one feature before beginning another.

Reason

Reduces bugs.

Simplifies testing.

Creates clean Git checkpoints.

Status

Accepted

---

## ADR-009

### Git Workflow

Decision

Commit after every completed feature.

Reason

Easy rollback.

Clear project history.

Reliable checkpoints.

Status

Accepted

---

## ADR-010

### Product Philosophy

Decision

JunkQuote Pro is a business operating system.

Not simply estimating software.

Reason

Everything should connect:

Customer

↓

Property

↓

Estimate

↓

Approval

↓

Scheduling

↓

Job

↓

Invoice

↓

Payment

↓

Customer History

Status

Accepted