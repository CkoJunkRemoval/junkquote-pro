# JunkQuote Pro Schema

Version 1.0

---

# Purpose

This document defines every major entity in JunkQuote Pro before implementation.

Each section describes:

- Purpose
- Ownership
- Relationships
- Required Fields
- Optional Fields
- Future Expansion

---

# Company

Purpose

Represents one junk removal business.

Ownership

Platform

Relationships

Company

├── Users

├── Employees

├── Customers

├── Properties

├── Estimates

├── Jobs

├── Invoices

├── Pricing Rules

├── Trucks

└── Settings

Required Fields

id

name

email

phone

timezone

subscriptionPlan

createdAt

updatedAt

Future

Brand colors

Multiple locations

Custom domains

---

# User

Purpose

Represents a login account.

Belongs To

Company

Relationships

User

↓

Created Estimates

↓

Timeline Events

↓

Activity Log

Required Fields

id

companyId

name

email

passwordHash

role

active

createdAt

updatedAt

Future

Two-factor authentication

SSO

API Keys

---

# Customer

Purpose

Represents one customer.

Belongs To

Company

Relationships

Customer

↓

Properties

↓

Estimates

↓

Invoices

↓

Payments

Required Fields

id

companyId

firstName

lastName

phone

createdAt

updatedAt

Optional Fields

email

notes

preferredContact

Future

Marketing tags

Referral source

Lead status

---

# Property

Purpose

Represents one service location.

Belongs To

Customer

Relationships

Property

↓

Estimates

↓

Jobs

↓

Attachments

Required Fields

id

customerId

address

city

state

zip

createdAt

updatedAt

Optional Fields

gateCode

accessNotes

parkingNotes

dangerousPets

hoaNotes

Future

GPS Coordinates

Property Photos

Map Integration

---

# Estimate

Purpose

Represents a customer quote.

Belongs To

Customer

Relationships

Estimate

↓

Job Sites

↓

Timeline

↓

Attachments

↓

Approval

↓

Job

Required Fields

id

companyId

customerId

propertyId

estimateNumber

status

subtotal

labor

disposal

discount

total

createdAt

updatedAt

Future

Version history

Change orders

Duplicate estimate

---

# Job Site

Purpose

Represents one area within an estimate.

Belongs To

Estimate

Required Fields

id

estimateId

name

subtotal

Future

Area templates

Area ordering

---

# Estimate Item

Purpose

Represents one item inside a job site.

Belongs To

Job Site

Required Fields

id

jobSiteId

itemId

name

category

quantity

Optional Fields

priceOverride

notes

Future

AI Recognition

Barcode Support

Weight Tracking

---

# Timeline Event

Purpose

Tracks estimate history.

Belongs To

Estimate

Required Fields

id

estimateId

event

timestamp

Future

User attribution

IP Address

Customer device

---

# Job

Purpose

Created after estimate approval.

Belongs To

Estimate

Required Fields

id

estimateId

status

scheduledDate

Future

Crew

Truck

Route

Completion photos

---

# Invoice

Purpose

Represents billing.

Belongs To

Job

Required Fields

id

jobId

invoiceNumber

status

amount

Future

Partial payments

Taxes

Credits

---

# Payment

Purpose

Records payments.

Belongs To

Invoice

Required Fields

id

invoiceId

amount

method

receivedAt

Future

Stripe

ACH

Refunds

---

# Truck

Purpose

Represents company vehicles.

Belongs To

Company

Required Fields

id

companyId

truckNumber

status

Future

GPS

Maintenance

Fuel

Mileage

---

# Pricing Rule

Purpose

Stores company pricing.

Belongs To

Company

Required Fields

id

companyId

name

value

Future

Regional pricing

Seasonal pricing

Customer-specific pricing

---

# Attachment

Purpose

Stores uploaded files.

Belongs To

Estimate

Required Fields

id

estimateId

type

url

uploadedAt

Future

Videos

Voice Notes

Drone Photos

---

# Design Rules

Every entity has:

id

createdAt

updatedAt

Every business record belongs to exactly one Company.

Soft deletes will be used instead of permanent deletion.

All relationships use unique IDs.

Business logic never depends on display names.

Primary keys never change.

Every important action creates a Timeline Event.

Every significant event creates an Activity.