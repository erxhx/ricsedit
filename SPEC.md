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

### 5.6 Shared Resources (rooms)

Some services share a physical room, so they can't overlap even when different
staff perform them and nobody is double-booked. Waxing and lashes share the
treatment room.

- Configured in Admin → **Shared Resources** (admin-only): name a room, tick
  the service categories performed in it.
- Enforced server-side in `validateSlot`, so it covers online booking and
  client self-serve reschedule. `/api/booking/availability` also reports
  room-blocked ranges, so blocked slots never appear as bookable.
- A `blocked` appointment (lunch, an errand) takes that person off the books
  but does NOT hold the room — "Block all staff" is what closes the room.
  `cancelled` frees everything.
- **Admin manual booking deliberately still allows overrides.** The admin
  create/drag paths have never run conflict checks — staff can already
  double-book one person — so the room rule isn't enforced there either.

### 5.7 Client Profiles
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

Two access levels, set by the `admin` flag on each roster entry in
`lib/staff.ts`. **Admins** (Eric, Livi) have full access. **Restricted staff**
(Niamh, and anyone added later — the flag defaults to off) are scoped to
themselves: their own working schedule, and only the service menu and intake
forms for the categories they perform.

| Action | Admin | Restricted staff |
|--------|-------|------------------|
| View own calendar | ✅ | ✅ |
| View other's calendar | ✅ | ✅ |
| Book/edit own appointments | ✅ | ✅ |
| Book/edit other's appointments | ✅ | ✅ |
| View all client profiles | ✅ | ✅ |
| Admin-only notes | ✅ | ✅ |
| Edit own working schedule | ✅ | ✅ |
| Edit store hours / others' schedules | ✅ | ❌ |
| Edit services & pricing | all categories | own categories only |
| Edit intake forms | all categories | own categories only |
| System settings (payments, permissions) | ✅ | ❌ |
| See studio-wide revenue | ✅ | per-person toggle |
| Money shown as | studio gross | their own payout |

Every check resolves against the roster by staff id, never against the `role`
claim in the session JWT — sessions last 90 days, so a token can carry a claim
that predates a permission change. Hiding a control in the UI is a courtesy;
each API route applies the same check itself.

#### Payout vs. gross

The UI calls this **"money earned"**; `payout` is the internal name for the
same thing (`lib/payout.ts`, `commissionRate`).

An admin sees what the studio takes in. Anyone restricted sees what they are
paid: a percentage of the service plus **all** of their tips. Niamh is 50%.
The rate is a roster default (`StaffMember.commissionRate`) that the owner can
override per person in Settings, so a raise doesn't need a deploy; the API
rejects anything outside 0–1 rather than clamping, so sending `50` for 50%
fails loudly instead of quietly paying out the whole service price.

Every money figure a restricted viewer sees is their payout — day and week
totals, the Reports headline, by-day bars, per-staff and per-service rows — so
the page is internally consistent. Two things stay the client-facing price,
because whoever is at the counter needs to know what to charge: the **Price**
row on an appointment (which gains a separate *Your payout* row beside it) and
the client's past-visit history.

Conventions, chosen to match how gross revenue was already counted:
- **No-shows count**, and cancelled/blocked don't — the same set gross uses, so
  a payout is always `rate x (the gross that viewer would otherwise have seen)
  + tips`.
- **A refunded payment pays no tip** — the money went back.
- **Tips come from two sources**: the Square `tipCents` on an online payment,
  and tips logged by hand on the appointment (see below).

#### Logging cash and POS tips

An appointment's detail page has a **Tips received** section for money the
booking flow never saw — cash in hand, or a tip added on the Square terminal at
checkout. Each entry records the amount, whether it was cash or card, who
logged it, and when; entries are a list so a mis-entry is removed rather than
overwritten.

Who can log: the appointment's own staff member, plus admins
(`canLogTipFor`). This does mean a restricted staff member can enter tips that
feed their own "money earned" figure — deliberately, since they're the one who
was handed the cash. It is not a payroll control: every entry is attributed and
an admin sees the full list.

Stored in `appointments.manual_tips` (jsonb), an **optional column** like
`payment`. Until the migration is run the UI is present but every save returns
501 with an actionable message rather than a generic failure:

```sql
alter table appointments add column if not exists manual_tips jsonb;
```

Refunds don't touch hand-logged tips — a refunded service doesn't reach into
someone's pocket for cash they were handed.

Server-side, `redactRevenue` zeroes `price` *and* the payment amounts on other
people's appointments before they reach the browser — tips being part of a
payout makes someone else's `tipCents` as sensitive as their price. The
`prepaid`/`refunded` flags survive, since they carry no amount and the day grid
badges cards as paid.

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

---

## 12. Pre-Launch Checklist

Things that are deliberately not production-ready yet, or that were verified only
in dev/simulator. Last reviewed 2026-07-27.

### Blockers — must be done before taking real bookings

- [ ] **Run `sql/001_no_overlap.sql`.** Adds the database guard against the
      public funnel double-booking a staff member. Until it runs, the only
      protection is the application check, whose window spans a Square charge.
      Admin-made bookings set `overlap_ok` and are deliberately exempt, so
      staff can still book two people at once on purpose.

- [ ] **Square is in sandbox.** Admin → Settings shows "Square connected
      (sandbox)". Swap to production credentials and re-run an end-to-end
      payment before any real money moves.
- [ ] **Test records are mixed into the live client list.** The clients table
      (445 rows, imported from Acuity) contains obvious test entries. Purge
      before launch — they also skew Reports revenue and visit counts.
- [ ] **Confirm the security headers ship in production.** HSTS and the CSP's
      `upgrade-insecure-requests` are now gated on `NODE_ENV === 'production'`
      (they broke all device testing when sent from `next dev` over HTTP, and
      HSTS is cached per host for 2 years). Verify with
      `curl -sI https://<prod-host>/ | grep -i strict-transport` after deploy —
      it MUST be present in production.
- [ ] **Verify Web Push on the HTTPS deployment.** The admin currently reports
      "This browser doesn't support push notifications", which is correct over
      plain HTTP (push needs a secure context) but untested in production. iOS
      16.4+ supports push in installed PWAs, and a new-booking alert is probably
      the single highest-value feature for staff.

### Known UI issues — logged, not yet fixed

Admin PWA (reviewed on an iPhone 17 Pro Max simulator, installed to home screen):

- Bottom safe area renders **white** under the beige app. Neither `html` nor
  `body` has a background in `globals.css`; the colour lives on a wrapper div,
  so anything it doesn't cover falls through to the white canvas.
- The **+ New FAB and the tab bar overlap content**. Nothing is unreachable —
  scrolling moves controls out from under them — but the FAB is a persistent
  dead zone over the right side (it covers a permissions toggle on Settings and
  staff figures on Reports).
- **Day view's third staff column is clipped** at 440pt. Partly addressed: the
  signed-in person's column now sorts first, so your own day never needs a pan.
  Seeing anyone else's still does, and the last column is still cut off. A staff
  filter (one person full-width on a phone) remains the fuller fix.
- **Appointment cards don't show their time** — only client + service. The hour
  gutter is pinned far left and is often off-screen when panned.
- **Type scale skews small**: ~129 `fontSize` declarations at 10–11px, ~153 at
  12–13px.
- **Nav labels collide**: the tab bar's *Schedule* → `/admin?tab=calendar`, the
  drawer's *Schedule* → `/admin` (which is Today).
- **Tab-bar icons are abstract glyphs** (`⌘` for Clients is the Command symbol).
- **Manifest**: `background_color: #0d0c0a` against a light app gives a dark
  splash flash on launch; the single 512px icon is declared
  `"purpose": "any maskable"`, and maskable icons get cropped. No 192px size.
- Intake Forms reorder arrows are 34×26 and vertically adjacent — under the 44pt
  minimum, easy to mis-tap.

Public site:

- `--hero-bleed` is `screen.height - 100svh`, measured on one device class. The
  hero's artwork reaching the bottom of the screen should be re-checked on a
  non-Pro-Max iPhone and on iPad.
- The `tan` entry in `CHROME_TINT` (`#eec793`) is an **estimate** — that panel
  uses a radial gradient, so unlike the others it wasn't measured off a
  screenshot.
- On Barbering the lime announcement bar meets the beige status strip with a
  hard edge; the strip colour doesn't account for the announcement.
- The barbering home tile is a distant back-of-head shot; it reads poorly at
  thumbnail size even after the tighter crop. Wants a different photo.

### Dev workflow notes

- Device testing runs against `next dev` from the iOS Simulator over the Mac's
  LAN IP (`http://<lan-ip>:3002`). `localhost`/`127.0.0.1` may still be poisoned
  by cached HSTS from before the header fix — if Safari insists on HTTPS for a
  host, switch hosts rather than fighting it.
- `editstudio.space/*.jsx` is the source; `public/site/*.js` is generated by
  `node scripts/compile-site-jsx.mjs`. Editing the JSX alone does nothing, and
  comments are stripped during compilation.
