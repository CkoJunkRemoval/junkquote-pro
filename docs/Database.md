# JunkQuote Pro Database Blueprint

Version 1.0

---

# Philosophy

The database is the backbone of JunkQuote Pro.

Everything should connect naturally.

No duplicated information.

No unnecessary complexity.

Every piece of information should have one source of truth.

---

# Company

Stores company-wide settings.

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

Relationships

Company

├── Users

├── Customers

├── Pricing Rules

├── Jobs

├── Reports

└── Settings

---

# Users

Represents employees.

Fields

- Name
- Email
- Password
- Role
- Active
- Last Login

Roles

Owner

Manager

Estimator

Crew

Office

---

# Customers

Stores customer information.

Fields

- First Name
- Last Name
- Phone
- Email

Relationships

Customer

↓

Properties

↓

Walkthroughs

↓

Invoices

---

# Properties

Every physical location.

Fields

- Address
- City
- State
- ZIP

- Gate Code

- Access Notes

- Preferred Parking

- Dangerous Pets

- HOA Rules

Relationships

Property

↓

Walkthrough History

↓

Jobs

↓

Photos

---

# Walkthroughs

One walkthrough equals one estimate.

Fields

- Date
- Estimator
- Status
- Total
- Notes

Contains

Job Sites

Pricing

Photos

Customer Approval

Timeline

---

# Job Sites

Garage

Attic

Basement

Kitchen

Bedroom

Office

Warehouse

OR

Custom Area

Each Job Site contains

Items

Photos

Notes

Completion Status

Subtotal

---

# Estimate Items

Fields

Item

Quantity

Photos

Notes

Price

Overrides

---

# Jobs

Scheduled work.

Fields

Crew

Truck

Date

Time

Status

Completion Photos

---

# Invoices

Invoice Number

Due Date

Amount

Paid

Payment History

---

# Payments

Cash

Card

Check

Online

Amount

Reference Number

---

# Pricing

Company Defaults

Truck Pricing

Item Pricing

Labor

Stairs

Fuel

Disposal

Taxes

Discounts

---

# Reports

Revenue

Employees

Customers

Jobs

Conversion Rate

Average Ticket

---

# Notifications

Estimate Approved

Job Assigned

Payment Received

Invoice Overdue

Customer Follow-up

---

# Support

Tickets

Chat

AI Assistant

Feature Requests

Bug Reports

---

# Future

AI

CRM

Marketing

Fleet

Inventory

Payroll

Accounting