# TomIT Solution — Product Requirements Document

## Original Problem Statement
Professional, mobile-friendly website for a company (TomIT Solution, domain tomitsolution.in) that buys used laptops, computers, servers, networking equipment, printers and other IT assets from businesses, government, schools, colleges, banks and individuals across India. NOT a scrap dealer — fair market value for working/reusable equipment. Highlight trust, transparent pricing, quick evaluation, doorstep pickup, secure data handling, fast payment, nationwide service. Pages: Home, About Us, Services, Sell Your Equipment, Get a Quote, Contact Us. Online quotation form with equipment details + photo uploads. SEO-friendly, fast, lead-generation focused.

## Architecture
- **Frontend**: React (CRA + craco), Tailwind, Shadcn UI, react-router. Single `App.js` with page views + Auth context. Fonts: Sora (heading) / Manrope (body). Colors: navy #0B1B3D + emerald #10B981.
- **Backend**: FastAPI (`server.py`), MongoDB (motor), JWT auth (cookie + bearer), bcrypt.
- **Storage**: Emergent Object Storage for equipment photos/files (`EMERGENT_LLM_KEY`).

## User Personas
- Corporate/IT manager liquidating fleets
- Government/institutional procurement officer
- Bank/school admin disposing assets
- Individual seller
- Internal admin (reviews leads, valuations, uploaded photos, contact inquiries)

## Core Requirements (static)
- 6 marketing pages, strong CTAs ("Get Free Valuation", "Sell Your IT Equipment Today")
- Interactive valuation calculator with live estimate
- Lead capture quote form with real photo/file uploads
- Admin dashboard: leads, stats, status updates, uploaded file viewer, contact inquiries
- SEO meta tags, mobile responsive

## Implemented (2026-06-21)
- Rebranded entire site to **TomIT Solution** (logo, footer, emails info@tomitsolution.in, address)
- All 6 pages + interactive quote calculator with live ₹ estimate range
- **Real file uploads** via Emergent Object Storage (`POST /api/uploads`), 10MB limit, type validation (images/PDF/Excel/Word)
- Admin-protected file download/preview (`GET /api/files/{id}`); admin panel shows image thumbnails + file links per lead
- **Contact form persists** to DB (`POST /api/contact`), shown in admin "Contact Inquiries" table
- JWT auth (cookie secure=True), admin seeding (admin@tomitsolution.in)
- Admin: leads table, stats widgets, status workflow (Pending/Approved/Completed)
- SEO: per-page title/description hook, og tags, keywords, fonts (Sora/Manrope)

## Backlog
- P1: Email notifications to admin on new quote/contact (Resend/SendGrid)
- P1: Replace placeholder phone/address with real TomIT Solution details
- P2: Image gallery/lightbox for uploaded photos in admin
- P2: Quote PDF export / sitemap.xml + robots.txt for deeper SEO
- P2: Real customer testimonials / trust logos

## Next Tasks
- Deploy to production + connect custom domain tomitsolution.in
- Gather real contact details & replace placeholders
- Optional: admin email alerts on new leads
