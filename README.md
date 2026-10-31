Brightloop – Subscription Management System

Odoo x Make-A-Ton 9.0 | Kochi 2026**

A simple and centralized way for businesses to manage their products, subscriptions, recurring payments, invoices, and revenue.

About the Project

Managing subscriptions can become complicated when everything is handled manually. Businesses often have to track customers in spreadsheets, remember renewal dates, create invoices, and check payments separately.

Brightloop aims to make this process easier by bringing everything into one platform.

Our Subscription Management System allows businesses to manage their products and plans, create subscriptions, generate invoices, record payments, apply discounts, and keep track of their overall revenue.

The platform also includes separate access for admins, staff, and customers, so everyone can use the features relevant to their role.

Problem We're Solving

Many businesses still depend on manual processes to manage their subscriptions. This can result in:

Missing important subscription renewals.
Spending time creating invoices manually.
Making mistakes while calculating taxes and totals.
Difficulty matching payments with invoices.
Struggling to track outstanding payments.
Spending too much time preparing revenue reports.
Our goal is to bring these activities together in one system and make subscription management more organized and efficient.

Key Features

User Authentication & Role Management
User registration and login.
Email uniqueness validation.
Password validation and reset functionality.
Separate roles for Admin, Staff, and Customers.
Only admins can create staff accounts.
Access to features based on user roles.
Product Management
Add, edit, and manage products.
Store product names, types, sales prices, and cost prices.
Add product descriptions and notes.
Support different product variants.
Apply additional prices based on selected variants.
Subscription Plan Management
Create and manage subscription plans.
Support daily, weekly, monthly, and yearly billing.
Set minimum purchase quantities.
Configure plan availability dates.
Choose whether plans can be paused, renewed, closed early, or closed automatically.
Subscription Management
Create subscriptions using quotations.

Use reusable quotation templates.

Generate a unique number for every subscription.

Set customers, plans, start dates, expiry dates, and payment terms.

Track the complete subscription journey:

Draft → Quotation → Confirmed → Active → Closed

Manage renewals, pauses, and closures.

Invoice Management
Generate invoices directly from subscriptions.

Automatically fill in customer and product details.

Calculate taxes and invoice totals.

Manage invoice statuses:

Draft → Confirmed → Paid

Confirm, cancel, send, and print invoices.

Avoid duplicate or missed billing.

Discount Management
Support fixed-amount and percentage-based discounts.
Set minimum purchase and quantity requirements.
Configure discount start and end dates.
Set limits on discount usage.
Automatically apply eligible discounts to invoices.
Payment Management
Record payments against invoices.
Store payment methods, amounts, dates, and notes.
Keep track of paid and unpaid invoices.
Identify overdue payments.
Dashboard & Reports
View the total number of active subscriptions.
Track revenue and payments received.
Monitor outstanding balances.
Identify overdue invoices.
Filter and review important business information.
Customer Portal
View personal subscription details.
Access invoices.
Check payment and subscription status.
Manage available subscription options.
Access only their own information.
Technology Stack

We are using the following technologies to build the application:

Technology	Purpose
React	Building the user interface
TypeScript	Writing more reliable and maintainable code
Vite	Fast development and build setup
Tailwind CSS	Styling and responsive layouts
Supabase	Backend services
PostgreSQL	Storing application data
Supabase Auth	Managing user authentication
Supabase RLS	Controlling database access
Lucide React	Icons
Git & GitHub	Team collaboration and version control
How the System Works

The application connects the frontend with Supabase, which handles authentication, database operations, and backend functionality.

              Users
                |
                v
        React + TypeScript
                |
                v
         Supabase Client
                |
        -----------------
        |       |       |
        v       v       v
    Supabase PostgreSQL Edge
      Auth    Database Functions
        |       |       |
        -----------------
                |
                v
       Subscription System
Database Structure

The application uses PostgreSQL to organize and manage its data.

Table	What it stores
profiles	User details and roles
customers	Customer information
products	Product details
product_variants	Product variants and pricing
plans	Subscription plan details
subscriptions	Customer subscription records
subscription_items	Products and quantities in subscriptions
quotation_templates	Reusable quotation templates
invoices	Invoice details and status
invoice_items	Individual invoice items
discounts	Discount rules and conditions
payments	Payment records
Project Structure

brightloop-subscription-manager/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   └── ui/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── plans/
│   │   ├── subscriptions/
│   │   ├── invoices/
│   │   ├── payments/
│   │   └── customers/
│   │
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── .env.example
├── .gitignore
└── README.md
Getting Started

Want to run the project locally? Follow these steps.

Prerequisites

Make sure you have the following installed:

Node.js
npm
Git
Visual Studio Code
A Supabase account
Clone the Repository
git clone https://github.com/YOUR-USERNAME/brightloop-subscription-manager.git

cd brightloop-subscription-manager
Install Dependencies
npm install
Set Up Environment Variables
Create a .env file in the root directory and add your Supabase credentials:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
Replace the placeholder values with the credentials from your Supabase project.

Note: Never share or upload your Supabase service-role secret. Keep your .env file out of GitHub.

Start the Development Server
npm run dev
Open the local URL shown in your terminal to view the application.

Team Collaboration

This project is being developed by a team of four members using Git and GitHub.

We use separate feature branches to work on different parts of the application. Each member maintains their own commits, and completed changes are reviewed and merged into the main branch.

This helps us work on different features at the same time while keeping the project organized.

Performance & Security

We aim to make the application reliable, secure, and easy to use.

Some of our main considerations include:

Validating user inputs.
Protecting pages and data based on user roles.
Using Row Level Security to protect customer information.
Preventing duplicate invoice generation.
Keeping subscription and payment records accurate.
Handling large numbers of subscriptions efficiently.
Targeting page response times under two seconds.
Project Status

Currently under development..

Built as part of Odoo x Make-A-Ton 9.0 – Kochi 2026.

License

This project is developed for educational and hackathon purposes as part of Odoo x Make-A-Ton 9.0.# odoo-makeaton-9.0-2026
