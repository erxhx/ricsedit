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
in dev/simulator. Last reviewed 2026-07-31.

### Blockers — must be done before taking real bookings

- [x] **Run `sql/001_no_overlap.sql`.** Done — verified 2026-07-31 against the
      live database by behaviour, not by `pg_constraint` lookup. Four probe rows
      on 2099-01-01, all deleted afterwards and the date confirmed empty:

      | probe | expected | result |
      |---|---|---|
      | base row 14:00–15:00 | accepted | `201` |
      | overlapping 14:30–15:30, public | rejected | `400 23P01` |
      | overlapping 14:30–15:30, `overlap_ok=true` | accepted | `201` |
      | back-to-back 15:00–16:00 | accepted | `201` |

      So the funnel's race is closed, admins can still deliberately double-book,
      and half-open ranges let appointments butt up against each other.

      Note if re-testing: `appointments` has NOT NULL columns not obvious from
      `lib/db.ts` (`client_email`, `duration_minutes`). A malformed probe returns
      `400 23502`, which is easy to misread as the constraint firing — template
      probe rows off a real row instead of hand-building them.

- [ ] **Square is in sandbox.** Admin → Settings shows "Square connected
      (sandbox)". Swap to production credentials and re-run an end-to-end
      payment before any real money moves.
- [x] **Test records purged from the client list.** Done 2026-08-02. Four
      appointments deleted by explicit id after individual review; 1240 → 1236,
      verified. Two were `@probe.test` (a reserved domain, so provably nobody),
      two were staff testing the funnel in January.

      **Delete by id, never by pattern, on this table.** The two January rows
      were named `test test` but carried a real staff Gmail — the same address
      as a genuine confirmed booking on 2026-07-23. Any query matching that
      email would have taken a live appointment along with the tests. Confirm
      what an address belongs to before matching on it.

      Also note **PostgREST caps a response at 1000 rows regardless of `limit`**.
      The first pass of this audit silently surveyed 1000 of 1240 and reported
      "total: 1000". Page with the `Range` header; get the true count from
      `Prefer: count=exact`.

      **That first purge was incomplete.** Matching on names containing "test"
      missed `Etf Vvb` and `yo mama` — 16 further test bookings found on
      2026-08-02, all under the owner's own address `eriche876@gmail.com`, and
      all deleted. Two of them were `no_show`, which **counts toward payout**, so
      they had been inflating Niamh's and Eric's earnings.

      **Search by the tester's email, not by the name they typed.** Names are
      whatever someone felt like at the time; the account is constant.
- [ ] **Confirm the security headers ship in production.** HSTS and the CSP's
      `upgrade-insecure-requests` are now gated on `NODE_ENV === 'production'`
      (they broke all device testing when sent from `next dev` over HTTP, and
      HSTS is cached per host for 2 years). Verify with
      `curl -sI https://<prod-host>/ | grep -i strict-transport` after deploy —
      it MUST be present in production.
- [ ] **Consolidate onto one domain: `editstudio.space` serves everything**,
      hosted on Vercel, moving off SiteGround. **Read `docs/dns-snapshot.md`
      first** — it records every current DNS record, what each one does, and
      what breaks if it is lost.

      The headline: SiteGround provides DNS, web hosting *and mail* today, and
      **Vercel does not host email**. Cancelling SiteGround outright kills every
      @editstudio.space mailbox. Decide the mail story before moving DNS. Do not
      migrate DNS and enforce DMARC in the same change — under `p=quarantine`, a
      Resend record that didn't survive the move sends every booking
      confirmation to spam with no error anywhere.

      Today there are three origins and no canonical one:
      - `ricsedit.vercel.app` — this Next app (admin, API, manage pages).
      - `www.editstudio.space` and `editstudio.space` — a static nginx host with
        the marketing pages, the compiled customer SPA, and `/assets/`. Both
        hostnames answer independently and **neither redirects to the other**.

      Three consequences worth fixing deliberately rather than discovering:

      1. **Sessions don't cross hostnames.** The admin cookie is host-scoped and
         sessions run 90 days, so signing in on `www.` and later opening the bare
         domain silently logs staff out. Pick bare, 301 `www.` → bare.
      2. **The nginx host soft-404s** — it answers unknown paths with its index
         page under a `200`, not a 404. A missing asset therefore returns 16KB of
         HTML that an `<img>` or `background-image` renders as nothing, with no
         failing status anywhere. This already nearly shipped a broken email
         header. After the cutover, re-verify assets by **content-type**, not
         status: `curl -sI <url> | grep -i content-type`.
      3. **Hostnames are hardcoded in ~15 places**, mixing bare and `www.`
         inconsistently — `editstudio.space/index.html` declares a `www.`
         canonical next to a bare `og:url`. Sweep them together:
         `grep -rn "editstudio\.space\|vercel\.app" --include='*.ts*' --include='*.jsx' --include='*.html' .`
         The email images are already single-sourced as `LOGO_SRC` / `BAND_SRC`
         in `lib/notifications.ts`; collapse them to one constant once both files
         sit on the same origin. Also set `NEXT_PUBLIC_SITE_URL` in the Vercel
         env — `.env.local` still holds the placeholder
         `https://your-vercel-app.vercel.app`, and every manage link is built
         from it.

#### Post-cutover verification

      Run these against the new domain once DNS moves. Each one exists because
      the corresponding failure is silent — the page still loads, the email
      still sends, nothing logs an error.

      1. **Redirect is canonical, one hop.** Both must land on bare, 301:
         ```
         curl -sI https://www.editstudio.space/ | head -1
         curl -sI http://editstudio.space/     | head -1
         ```
      2. **Every email image is an image, not the soft-404 page.** Status is
         meaningless on this host; only content-type distinguishes them:
         ```
         for u in /assets/logo-white.png /assets/email-band.png /assets/og-image.jpg; do
           curl -sI "https://editstudio.space$u" | awk -v u="$u" '/^content-type/{print u, $2}'
         done
         ```
         Anything reporting `text/html` is missing and rendering as nothing.
      3. **Send one real email and open it in Gmail dark mode.** The header band
         is a background *image* precisely so Gmail's forced-dark transform can't
         repaint it; if the tile 404s, it falls back to the background colour and
         the white logo goes invisible again — which looks like a styling
         regression, not a missing file. `/api/admin/email-preview?type=confirmation&send=1`
         sends to `OWNER_EMAIL`.
      4. **Manage links point at the new host.** Build one and follow it:
         `NEXT_PUBLIC_SITE_URL` is read at build time, so a stale value survives
         a DNS change and keeps minting links to the old origin.
      5. **Sign in to the admin, then reopen it on the other hostname.** Confirms
         the redirect happens before the cookie is read, rather than stranding a
         session on a hostname staff can still reach.
      6. **Security headers still ship.** The host changed, so HSTS is being
         cached fresh for 2 years against the new name:
         `curl -sI https://editstudio.space/ | grep -i strict-transport`.

- [ ] **Verify Web Push on the HTTPS deployment.** The admin currently reports
      "This browser doesn't support push notifications", which is correct over
      plain HTTP (push needs a secure context) but untested in production. iOS
      16.4+ supports push in installed PWAs, and a new-booking alert is probably
      the single highest-value feature for staff.

### Hosting: why Vercel and not Cloudflare Workers

Asked twice, so recorded. Cloudflare Pages hosts static sites free, but this is a
Next.js server — API routes, SSR, cookie auth, a daily cron, Square webhooks. On
Cloudflare that means Workers via the OpenNext adapter, and two things block it:

1. **Three routes read from disk at runtime** — `app/route.ts`,
   `app/[...slug]/route.ts`, `app/privacy/route.ts` all `readFile` the marketing
   HTML from `process.cwd()` and rewrite asset paths per request. Workers have no
   filesystem. Roughly an hour to inline at build time; `scripts/compile-site-jsx.mjs`
   already runs at the right moment to do it.
2. **Four Node-runtime SDK imports.** `twilio` (notifications.ts) and `web-push`
   (push.ts) are the hard ones — heavy Node http and Node crypto respectively.
   Both are replaceable (Twilio's REST API is plain `fetch`; VAPID can use Web
   Crypto) but that is rewriting live SMS and push paths. `square` ×2 is likelier
   to survive `nodejs_compat`, but that is a find-out-by-trying.

Cron and webhooks are fine — Cloudflare Cron Triggers cover the daily reminder.

Estimate: a day or two with real uncertainty mid-way, plus a full re-verification
of payments, email, SMS and push, to save roughly $200–240/yr against Vercel Pro.
Not a trade worth making around a launch, and if ever done, it should be its own
project rather than a cost optimisation squeezed in beside one.

Cheaper later if Web Push turns out to be unused — that removes one of the two
hard blockers, and it is still unverified over HTTPS (see above).

### Email authentication & Apple Branded Mail

Not launch blockers — mail authenticates correctly today. This is about the
sender logo appearing in Apple Mail, and about gaining visibility we don't have.

**Verified state as of 2026-07-31** (all by `dig +short @8.8.8.8`):

| record | value | status |
|---|---|---|
| `resend._domainkey` | RSA key | ✅ Resend DKIM live |
| `send.editstudio.space` | `v=spf1 include:amazonses.com ~all` + SES MX | ✅ custom Return-Path, so SPF aligns |
| root SPF | `+a +mx include:…dnssmarthost.net ~all` | ✅ covers the web host |
| `default._domainkey` | host DKIM | ✅ |
| `_dmarc` | `v=DMARC1; p=none; aspf=r; adkim=r;` | ⚠️ no reporting, no enforcement |
| `apple-domain-verification` | present | ✅ Apple domain check already done |
| `default._bimi` | — | ❌ none |

DKIM and SPF both align under relaxed alignment, so DMARC should already be
passing. "Should" is doing work in that sentence — with no `rua=`, no aggregate
report has ever been collected, so this is inference from the records, not
evidence from real mail.

- [x] **Step 1 — turn on DMARC reporting.** Published 2026-07-31; collecting
      since 2026-08-02, once Cloudflare Email Routing gave `dmarc@` somewhere to
      land:
      ```
      v=DMARC1; p=none; rua=mailto:dmarc@editstudio.space; aspf=r; adkim=r
      ```
      Policy stays `none`, so delivery is unchanged — this only starts receivers
      sending daily XML summaries of who sends as editstudio.space.

      The report address is deliberately **on editstudio.space itself**. RFC 7489
      requires an off-domain `rua` destination to publish an authorization record
      (`editstudio.space._report._dmarc.<their-domain>`), and Google does not
      publish those for individual accounts — so pointing `rua` at a personal
      Gmail means strict reporters drop the reports silently, and the resulting
      silence is indistinguishable from "no problems found".

      That reasoning was right about the wrong risk. For nine days the record
      was correct and collecting nothing: `dmarc@editstudio.space` returned
      **550, no such mailbox**, so every report bounced. Choosing an on-domain
      address dodged the authorization requirement and then never checked the
      mailbox existed. Cloudflare Email Routing's catch-all now covers it.

      **Reports arrive as zipped XML, by choice.** A monitoring service
      (Postmark, dmarcian, URIports) would send readable weekly digests instead,
      and remains a one-tag edit if the XML gets old. Reading them raw is
      workable — one file per reporter per day, and the only question that
      matters is whether any source other than Resend and Cloudflare appears
      with `dkim=fail` or `spf=fail`. Volume is low at this size.

- [x] **`bookings@editstudio.space` — client replies were bouncing.** Fixed
      2026-07-31 with Cloudflare Email Routing: `bookings@` and a catch-all both
      forward to `editstudiospace@gmail.com`. The catch-all is deliberate — it
      covers every address ever printed on a card or listed on Google Business
      without anyone having to remember what they were, which is exactly how
      `bookings@` and `dmarc@` came to be silently dead.

      Verified from Outlook 2026-07-31, and from **Gmail** 2026-08-02 once
      propagation completed. The Gmail test is the one that counts: most clients
      are on Gmail, and it was the only sender still bouncing after the routing
      itself was correct.

      **Propagation window, now closed.** Google's resolver was the last major
      one still delegating to SiteGround, so for about two days mail *from Gmail*
      resolved the old MX and bounced `550` while every other resolver worked —
      a real bounce from a correct configuration. Confirmed 2026-08-02 that all
      four major resolvers return `route1/2/3.mx.cloudflare.net`. It expired on
      the registry NS TTL without needing the SiteGround MX sync.

- [ ] **Step 2 — enforce, after launch and after reading real reports.**
      ```
      v=DMARC1; p=quarantine; rua=mailto:<report-address>; aspf=r; adkim=r; fo=1
      ```
      Deliberately sequenced after the migration send. Enforcement is the gate
      for Apple Branded Mail, but flipping it while blind means any misaligned
      sender starts going to spam, and the first signal would be a client
      mentioning it — not a log. Wait for reports that show only known senders,
      then flip. `p=reject` later, once quarantine has been quiet.

- [ ] **Step 3 — Apple Branded Mail** (free; Apple Business Connect).
      Requires the business claimed and verified in Business Connect, the domain
      verified (the `apple-domain-verification` TXT above suggests this is done
      or started), DMARC at enforcement from step 2, and a square logo uploaded
      through Business Connect. `public/assets/favicon.png` is the right mark —
      the lime monogram, already square — but it is only 512×512 and Apple wants
      a larger square export; get a fresh one from the vector source rather than
      upscaling. Verify current requirements in Business Connect itself, since
      Apple has been iterating on this since launch.

**BIMI: deliberately not doing it.** Decided 2026-07-31. The DNS record and SVG
are free, but a logo only renders in Gmail and Apple Mail with a paid
certificate — a VMC (~$1,000–1,500/yr, and requires a *registered trademark*) or
a CMC (~$500–800/yr, requires 12+ months documented prior use). Without one,
only Yahoo, AOL and Fastmail show it. Apple Branded Mail covers the Apple side
for free, which leaves the annual fee buying the Gmail avatar alone. Revisit if
"Edit Studio" is ever trademarked. Note if it is revisited: BIMI needs SVG Tiny
P/S — square viewBox, `<title>` first child, no scripts, no external refs, and
**no embedded raster images**, so the PNG cannot simply be wrapped; it needs a
true vector source.

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
