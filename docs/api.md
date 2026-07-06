# JunkQuote Pro API Blueprint

Version 1.0

---

# Purpose

This document defines every public API endpoint used by JunkQuote Pro.

It is the contract between the frontend and backend.

No endpoint should exist without being documented here.

---

# API Design Principles

RESTful

Stateless

JSON Requests

JSON Responses

Authenticated

Company Isolated

Predictable

Versioned

---

# Authentication

POST /api/auth/login

Authenticate user.

POST /api/auth/logout

End user session.

POST /api/auth/register

Create a new company and owner account.

GET /api/auth/me

Returns current user.

POST /api/auth/reset-password

Password reset.

---

# Companies

GET /api/company

Returns company information.

PATCH /api/company

Update company settings.

POST /api/company/logo

Upload company logo.

---

# Users

GET /api/users

Returns company users.

POST /api/users

Create user.

GET /api/users/:id

Get user.

PATCH /api/users/:id

Update user.

DELETE /api/users/:id

Deactivate user.

---

# Customers

GET /api/customers

Search customers.

POST /api/customers

Create customer.

GET /api/customers/:id

Customer details.

PATCH /api/customers/:id

Update customer.

DELETE /api/customers/:id

Archive customer.

GET /api/customers/:id/properties

Customer properties.

GET /api/customers/:id/history

Customer history.

---

# Properties

GET /api/properties

Search properties.

POST /api/properties

Create property.

GET /api/properties/:id

Property details.

PATCH /api/properties/:id

Update property.

DELETE /api/properties/:id

Archive property.

---

# Estimates

GET /api/estimates

Search estimates.

POST /api/estimates

Create estimate.

GET /api/estimates/:id

Estimate details.

PATCH /api/estimates/:id

Update estimate.

DELETE /api/estimates/:id

Archive estimate.

POST /api/estimates/:id/send

Send estimate.

POST /api/estimates/:id/approve

Approve estimate.

POST /api/estimates/:id/decline

Decline estimate.

POST /api/estimates/:id/pdf

Generate PDF.

GET /api/estimates/:id/timeline

Estimate timeline.

GET /api/estimates/:id/activity

Estimate activity.

---

# Jobs

GET /api/jobs

Search jobs.

POST /api/jobs

Create job.

GET /api/jobs/:id

Job details.

PATCH /api/jobs/:id

Update job.

POST /api/jobs/:id/complete

Complete job.

POST /api/jobs/:id/photos

Upload photos.

---

# Scheduling

GET /api/calendar

Calendar events.

POST /api/calendar/jobs

Schedule job.

PATCH /api/calendar/jobs/:id

Reschedule job.

DELETE /api/calendar/jobs/:id

Remove job from calendar.

---

# Invoices

GET /api/invoices

Search invoices.

POST /api/invoices

Create invoice.

GET /api/invoices/:id

Invoice details.

POST /api/invoices/:id/send

Send invoice.

POST /api/invoices/:id/pay

Record payment.

---

# Payments

GET /api/payments

Payment history.

POST /api/payments

Create payment.

GET /api/payments/:id

Payment details.

POST /api/payments/refund

Refund payment.

---

# Pricing

GET /api/pricing

Company pricing.

PATCH /api/pricing

Update pricing.

GET /api/pricing/defaults

Pricing defaults.

---

# Trucks

GET /api/trucks

Company trucks.

POST /api/trucks

Create truck.

PATCH /api/trucks/:id

Update truck.

DELETE /api/trucks/:id

Archive truck.

---

# Employees

GET /api/employees

Employee list.

POST /api/employees

Create employee.

PATCH /api/employees/:id

Update employee.

DELETE /api/employees/:id

Deactivate employee.

---

# Reports

GET /api/reports/dashboard

Dashboard metrics.

GET /api/reports/revenue

Revenue report.

GET /api/reports/jobs

Job report.

GET /api/reports/customers

Customer report.

GET /api/reports/employees

Employee report.

---

# Attachments

POST /api/uploads

Upload file.

DELETE /api/uploads/:id

Delete attachment.

GET /api/uploads/:id

Download attachment.

---

# Notifications

GET /api/notifications

User notifications.

PATCH /api/notifications/:id/read

Mark notification as read.

---

# Customer Portal

GET /portal/estimate/:token

Customer views estimate.

POST /portal/estimate/:token/approve

Customer approves estimate.

POST /portal/estimate/:token/sign

Customer signs estimate.

GET /portal/invoice/:token

Customer views invoice.

POST /portal/invoice/:token/pay

Customer pays invoice.

---

# Future Integrations

Stripe

Twilio

Resend

QuickBooks

Google Calendar

Google Maps

Cloud Storage

OpenAI

---

# API Standards

Every request must be authenticated unless explicitly public.

Every request belongs to exactly one company.

Every response returns JSON.

Every error returns a standard error object.

Every successful write creates an Activity.

Every significant action creates a Timeline Event.

Soft deletes are used whenever possible.

API versioning begins with v1.