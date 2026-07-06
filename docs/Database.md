# JunkQuote Pro Database Blueprint

Version 2.0

---

# Philosophy

The database is the foundation of JunkQuote Pro.

Every piece of information has one owner.

Every relationship has one source of truth.

No duplicated data.

No orphaned records.

Every record belongs to a company.

The database is designed for a multi-tenant SaaS platform capable of supporting thousands of independent junk removal businesses.

---

# Platform

The platform contains many companies.

Each company operates inside its own isolated workspace.

No company can access another company's data.

Platform

↓

Companies

↓

Users

↓

Customers

↓

Properties

↓

Estimates

↓

Jobs

↓

Invoices

↓

Payments

---

# Companies

Represents a junk removal business.

Fields

- Company Name
- Logo
- Phone
- Email
- Website
- Address
- Business Hours
- Time Zone
- Subscription Plan
- Tax Rate
- Currency
- Created Date
- Active

Relationships

Company

├── Users

├── Employees

├── Customers

├── Estimates

├── Jobs

├── Invoices

├── Pricing Rules

├── Trucks

├── Reports

├── Activities

└── Settings

---

# Users

Represents login accounts.

Fields

- Name
- Email
- Password Hash
- Role
- Last Login
- Active

Roles

Owner

Manager

Estimator

Crew Leader

Crew Member

Office

Future versions support custom permissions.

---

# Employees

Represents employees.

Fields

- First Name
- Last Name
- Phone
- Email
- Hire Date
- Hourly Rate
- Certifications
- Driver License
- Assigned Truck
- Active

---

# Customers

Stores customer information.

Fields

- First Name
- Last Name
- Phone
- Email
- Preferred Contact
- Notes
- Status

Relationships

Customer

↓

Properties

↓

Estimates

↓

Jobs

↓

Invoices

---

# Properties

Represents every service location.

Fields

- Nickname
- Address
- City
- State
- ZIP
- Gate Code
- Access Notes
- Parking Notes
- HOA Rules
- Dangerous Pets

Relationships

Property

↓

Estimates

↓

Jobs

↓

Attachments

---

# Estimates

Represents customer quotes.

Status

Draft

Ready

Sent

Viewed

Pending Signature

Approved

Scheduled

Completed

Invoiced

Paid

Archived

Fields

- Estimate Number
- Created Date
- Estimator
- Status
- Total
- Notes

Contains

Customer

Property

Job Sites

Estimate Items

Pricing

Timeline

Attachments

Approval Information

---

# Job Sites

Examples

Garage

Basement

Bedroom

Kitchen

Attic

Office

Warehouse

Custom Area

Each Job Site contains

Items

Photos

Notes

Subtotal

---

# Estimate Items

Fields

- Item
- Quantity
- Volume
- Labor
- Disposal
- Price Override
- Photos
- Notes

---

# Jobs

Created only after an estimate is approved.

Fields

- Job Number
- Crew
- Truck
- Schedule
- Status
- Completion Photos
- Completion Notes
- Completion Signature

Relationships

Job

↓

Invoice

↓

Payment

---

# Invoices

Fields

- Invoice Number
- Issue Date
- Due Date
- Amount
- Tax
- Status

Statuses

Draft

Sent

Paid

Overdue

Cancelled

---

# Payments

Fields

- Method
- Amount
- Date
- Transaction ID
- Notes

Methods

Cash

Card

Check

ACH

Online

---

# Pricing Rules

Stores company pricing.

Truck Pricing

Labor Rates

Disposal Fees

Fuel Surcharges

Stair Charges

Taxes

Discount Rules

Minimum Charges

---

# Trucks

Fields

- Truck Number
- License Plate
- VIN
- Capacity
- Mileage
- Status
- Assigned Crew

---

# Attachments

Stores uploaded files.

Photos

Videos

Signed Estimates

Invoices

Receipts

Contracts

Permits

---

# Timeline

Every estimate records events.

Estimate Created

Estimate Updated

Estimate Sent

Estimate Viewed

Estimate Approved

Estimate Declined

Job Scheduled

Crew Assigned

Job Completed

Invoice Generated

Invoice Paid

---

# Activities

Every major action creates an activity.

Customer Created

Estimate Created

Estimate Sent

Customer Viewed Estimate

Customer Signed Estimate

Estimate Approved

Job Scheduled

Job Completed

Invoice Paid

Activities power:

Dashboard

Notifications

Timeline

Reports

Audit Logs

---

# Reports

Revenue

Average Ticket

Conversion Rate

Jobs Completed

Employee Performance

Truck Utilization

Marketing Sources

Customer Retention

---

# Notifications

Estimate Viewed

Estimate Approved

Job Assigned

Job Reminder

Invoice Paid

Overdue Invoice

Follow-up Reminder

---

# Company Settings

Business Information

Branding

Logo

Business Hours

Service Area

Pricing Defaults

Tax Rate

Accepted Payments

Terms & Conditions

Email Templates

SMS Templates

---

# Customer Portal

Customers can

View Estimates

Approve Estimates

Sign Estimates

Download PDFs

View Invoices

Pay Online

View Job History

Message the Company

---

# Integrations

PostgreSQL

Prisma ORM

Authentication

Stripe

Twilio

Resend

Google Calendar

QuickBooks

Cloud Storage

GPS Routing

---

# Long-Term Vision

JunkQuote Pro is not simply estimating software.

It is a complete operating platform built specifically for junk removal companies.

Every feature should reduce work, improve customer experience, and help companies complete more jobs with less effort.