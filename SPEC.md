# Edit Studio — Booking System Spec
**Version 1.0 — May 2026**
**Status: Living Document — update as decisions are made**

---

## 1. Project Overview

A fully custom booking system for Edit Studio, a collaborative salon in Oak Bay, Victoria BC. Replacing Acuity Scheduling ($87/month) with an owned, independent system costing ~$2/month to run.

The system consists of:
- A **public booking experience** integrated into the existing Edit Studio website
- An **admin PWA** (Progressive Web App) for staff to manage schedules from their iPhones
- An **automated notification system** for email and SMS confirmations/reminders

---

## 2. Business Details

| Detail | Info |
|--------|------|
| Business name | Edit Studio |
| Location | Oak Bay, Victoria BC |
| Website | editstudio.space |
| Services | Barber · Wax · Tan |

### Staff
| Name | Role | Services |
|------|------|----------|
| (Owner) | Barber | All barber services |
| Esthetician | Esthetician | Wax + Tan |

> Services map cleanly to staff — no overlap. When a client selects a service, the system automatically routes to the correct staff member's calendar. No staff selection step needed on the client side.

---

## 3. Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend + Backend | Next.js | Free |
| Hosting | Cloudflare Pages (or Vercel Pro) | Free / $20/month |
| Database | Supabase | Free tier |
| Email | Resend | Free tier |
| SMS | Twilio | ~$1–3/month |
| Domain | editstudio.space (existing) | Existing |
| Version Control | GitHub (private repo: ricsedit) | Free |

**Deployment strategy:** Booking system built as additional pages within the existing site codebase. Everything lives at `editstudio.space`. Single codebase, single deployment.

---

## 4. Database Structure

### Tables

**clients**
- id, name, email, phone, created_at
- waiver_wax_signed (boolean + date)
- waiver_tan_signed (boolean + date)
- admin_notes (staff only, never visible to client)

**appointments**
- id, client_id, staff_id, service_id
- date, start_time, end_time
- status (confirmed / cancelled / completed / blocked)
- group_id (for linking multiple bookings together)
- notes

**services**
- id, name, category (barber / wax / tan)
- duration_minutes, price
- requires_waiver (boolean)
- staff_id (who performs this service)

**staff**
- id, name, role
- password_hash
- working_hours (JSON)
- session_token, token_expiry

**waivers**
- id, client_id, type (wax / tan)
- signed_at, content_version

---

## 5. Features

### 5.1 Public Booking Flow
- Client selects service category (Barber / Wax / Tan)
- System automatically assigns correct staff member
- Client selects date and available time slot
- Client enters name, email, phone number
- If booking wax or tan: waiver/intake form presented and must be completed before confirming
- Ability to book multiple services / appointments at once (e.g. group haircuts, multiple wax services)
- Confirmation screen shown on completion
- Confirmation email + SMS sent automatically

### 5.2 Walk-in Widget
- Displayed prominently on the public website
- Shows the next available walk-in slot for each service category
- Quick book option: name + phone number only (minimal friction)
- Separate quick-book flow from full booking

### 5.3 Client Self-Management
- Confirmation email contains a unique link for the client to manage their booking
- Optional: client account on the website to view/manage all bookings
- Clients can reschedule or cancel up to a defined cutoff time

### 5.4 Notifications
- **Booking confirmation:** Email + SMS sent immediately on booking
- **Reminder:** Email or SMS sent 24 hours before appointment
- **Optional follow-up:** Post-appointment message (future feature)
- All messages fully branded to Edit Studio — custom copy, not generic templates

### 5.5 Waivers & Intake Forms
- Required for: Wax, Tan
- Not required for: Barber
- Waiver is triggered automatically based on service selected
- Signed waivers stored against client profile
- Returning clients who have signed don't need to re-sign (unless form version updates)

### 5.6 Client Profiles
- Name, email, phone
- Appointment history
- Waiver status (wax / tan)
- Admin-only notes (never visible to client)
- Ability to add notes per appointment

---

## 6. Admin PWA

### Access
- Installed via "Add to Home Screen" on iPhone for both staff members
- Lives at a protected route (e.g. `editstudio.space/admin`)
- **Authentication:** Simple password login — one password per staff member
- No username required, just a memorable passphrase
- **Persistent sessions:** Staff stay logged in across app exits (session token with configurable expiry e.g. 90 days)
- Both staff can view and edit each other's appointments

### Permissions
| Action | Owner | Esthetician |
|--------|-------|-------------|
| View own calendar | ✅ | ✅ |
| View other's calendar | ✅ | ✅ |
| Book/edit own appointments | ✅ | ✅ |
| Book/edit other's appointments | ✅ | ✅ |
| View all client profiles | ✅ | ✅ |
| Admin-only notes | ✅ | ✅ |
| System settings | ✅ | ❌ |

### Calendar Views
- Day view (default on mobile)
- Week view
- Month view
- Toggle between staff calendars or view both simultaneously

### Admin Booking Actions
- Tap an open slot to book a client or block off time
- Drag and drop to reschedule appointments
- Add/edit admin notes on any appointment
- Cancel or reschedule bookings
- Manually add walk-in clients

---

## 7. Service Categories

| Category | Staff | Waiver Required |
|----------|-------|----------------|
| Barber | Owner | No |
| Wax | Esthetician | Yes |
| Tan | Esthetician | Yes |

> Specific service names, durations, and prices to be added when confirmed.

---

## 8. Notifications Setup

| Service | Purpose | Provider |
|---------|---------|----------|
| Email | Confirmations + reminders | Resend |
| SMS | Confirmations + reminders | Twilio |

**Trigger logic:** Notifications fire automatically from the backend at the moment of booking (confirmation) and via a scheduled job (reminders). No manual action required from staff.

---

## 9. Hosting & Deployment

- **Primary option:** Cloudflare Pages (free, no commercial restrictions with OpenNext adapter)
- **Alternative:** Vercel Pro ($20/month, easier setup)
- Connected to private GitHub repo (`ricsedit`) for automatic deployments on push
- Environment variables (API keys) stored in hosting platform, never committed to repo
- `.env` file gitignored locally

---

## 10. Future Features (Parking Lot)

- Post-appointment follow-up messages
- Client loyalty / return booking incentives
- Online deposit or payment at booking
- Staff availability management (holidays, custom hours)
- Analytics dashboard (busiest times, popular services)
- Waitlist for fully booked days

---

## 11. Open Decisions

- [ ] Exact service names, durations, and prices
- [ ] Owner and esthetician working hours
- [ ] Waiver form content for wax and tan
- [ ] Email and SMS message copy/templates
- [ ] Cancellation policy cutoff window
- [ ] Final hosting choice: Cloudflare Pages vs Vercel Pro
- [ ] Client account system: link-only vs full account login

---

*This document should be kept up to date as decisions are made. Add it to the GitHub repo as `SPEC.md` and reference it at the start of every Claude Code session.*
