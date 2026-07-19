# Pomelo — Product Blueprint

*A handoff document for future development sessions. Written July 2026 after ~2 months of
building Edit Studio's booking system (this repo), which becomes Pomelo's reference
implementation and first tenant. Read this whole file before writing code.*

---

## 1. What Pomelo is

**Pomelo** is the Edit Studio booking system, productized: a bookings + payments platform
for independent service studios (barbers, lash artists, estheticians, spray tan, small
multi-service salons), sold as a subscription. Two halves:

- **A native admin app** (the owner/staff side) — schedule, appointments, clients,
  payments, policies, push notifications. This is the product people pay for.
- **A hosted client booking funnel** (the customer side) — each tenant gets a booking
  page (subdomain or custom domain) with services, slots, deposits/prepay/tips,
  card-on-file, Apple Pay.

The pitch: "Square Appointments, but beautiful, opinionated, and built by a barber."
Differentiators proven in production at Edit Studio: taxed-total tipping that matches
the POS receipt, deposits with collect-at-studio balance math, card-on-file no-show
fees with automatic client receipts, production-catalog price sync, and a booking
funnel clients actually compliment.

---

## 2. What already exists (this repo = reference implementation)

Everything below is **live in production** at editstudio.space / ricsedit.vercel.app.

### Client booking funnel
- Service menu → staff → date/time slots → client details → payment → confirmation.
  Funnel lives in `editstudio.space/booking.jsx` (compiled to `public/site/booking.js`).
- Payment modes per service/policy: none, **card-on-file** (Square verified store, no
  charge), **deposit** (fixed amount, untaxed), **full prepay** (taxed), **optional
  prepay** (`allowPrepay` — client chooses pay-now vs pay-in-store).
- **Tip screen** on prepay: 18/20/25/Custom/No tip, computed on the TAXED total to match
  the POS receipt exactly ($40 haircut + 5% GST = $42.00 → 18% = $7.56 → $49.56).
- **BC tax model** (`lib/tax.ts`): 5% GST on everything, +7% PST on products only
  (e.g. disposable undies), applied on full prepay only; deposits are untaxed.
- **Apple Pay** (sandbox-verified): native `-apple-pay-button`, domain-association file
  served from `/.well-known/`. Rule learned: Apple Pay tokens CANNOT be stored on file
  with Square → the Apple Pay button is hidden when the policy requires card storage
  (`mustStore`).
- Square Web Payments SDK iframe tokenization → server charges. PCI scope stays minimal:
  the server only ever sees card brand + last 4.
- Booking rate limits: 10/IP/10min, 5/email/hour.
- Self-serve manage links (`/booking/manage/<token>`): cancel/reschedule up to 3h before.

### Payments backend (`lib/square.ts`)
- Sandbox + production Square clients, env-selected.
- `chargeDeposit`, card-on-file storage (customer + card records), no-show fee charging
  with client email receipt (card networks require notifying merchant-initiated charges).
- **Itemized Orders**: `createItemizedOrder()` builds a real Square Order per online
  charge — GST as ORDER-scope tax, PST as LINE_ITEM-scope tax attached to product lines.
  The payment then references `orderId` and must charge exactly the order total.
- PaymentRecord fields: `amountCents, gstCents, pstCents, tipCents, prepaid, refunded,
  balanceDueCents` (precomputed "collect at studio" number for deposit bookings — Square
  POS cannot natively settle partial API orders; Square Invoices API is the future
  native path).

### Square ops integration
- **Production catalog = pricing source of truth**: `lib/square-catalog.ts` syncs site
  service prices from the Square production catalog. Name matcher: exact raw-normalized
  match first (keeps "Brow Wax and Tint" ≠ "Brow Tint"), then stripped-word + Jaccard
  ≥ 0.6 with an APPOINTMENTS_SERVICE tie-break, plus a `SYNONYMS` map for naming drift.
  45/45 services matched at last sync.
- **Webhook receiver** (`app/api/square/webhook/route.ts`): HMAC-SHA256 over
  (notification_url + raw body) with `timingSafeEqual`; catalog.version.updated →
  debounced re-sync (20s cooldown — Square fires bursts) + push notify on price changes;
  payment/refund events → ring buffer (`square_pos_events`, max 200); dispute.* →
  immediate owner push. **Replay dedupe** by `event_id` against the persisted buffer.

### Admin panel (`app/admin`, `components/admin/*`)
- Day schedule + appointment list with green **PAID** indicators (list chip + inline
  name-row tag on the timeline — 20-min blocks are only 40px tall, so absolute
  positioning failed; inline flex span was the fix).
- Appointment detail: payment breakdown ("incl. $X tax + $Y tip"), "Collect at studio
  $X incl. tax" for deposit bookings, refund, cancel-with-note, no-show marking with
  optional fee charge (guarded).
- Policies config (per-service payment requirements, deposit amounts, `allowPrepay`),
  hours config (per-staff), announcement strip, service/price management (synced from
  Square), email design preview endpoint (`/api/admin/email-preview`, auth-gated,
  `?type=confirmation|owner|noshow-fee&send=1&name=` for escaping tests).
- Auth: `ADMIN_PASSWORD_ERIC` → signed session cookie (`es-admin-session`, jose),
  8-fail/15min lockout with constant-time delay.
- Web push notifications to staff (`lib/push.ts`) — new bookings, disputes, price syncs.

### Notifications (`lib/notifications.ts`)
- Email via Resend, SMS via Twilio. All fire-and-forget safe (never break a booking).
- A real email design system: mono uppercase eyebrows with lime dot, Georgia-italic
  serif headlines, hairline-ruled detail tables (first/last row ink borders), pill CTA,
  stacked footer, `es-*` classes with dark-mode `@media` overrides.
- **Every client-typed string is HTML-escaped** (`esc()`) — booking names/notes are
  attacker-controlled and land in the OWNER's email.
- Templates: confirmation, owner alert, cancellation (client vs admin tone), no-show,
  no-show fee receipt, reschedule, reminder (cron), migration.
- Reminders via `/api/cron/reminders` (Vercel cron, day-before).

### Data layer
- Supabase Postgres via `lib/supabase.ts`. Much config lives in a `settings` key/value
  JSONB table: `payment_settings`, `services`, `square_sync_report`, `square_pos_events`,
  hours, announcements. Appointments + payment records in proper tables.
- **supabase-js returns `.error`, it does not throw.** Check it every time.

---

## 3. Hard-won gotchas (read before touching these areas)

**Square SDK (v43, `square` npm package)**
- Request bodies are **camelCase** — EXCEPT `customers.search` filters, which are
  snake_case. Mixed within one SDK.
- Money amounts are **BigInt** (`amount: 6500n`). JSON.stringify chokes on BigInt —
  serialize carefully in logs.
- `CatalogObject` is a discriminated union — you must narrow (`o.type === 'ITEM'`,
  `v.type === 'ITEM_VARIATION'`) before touching `.itemData`/`.itemVariationData`.
- `catalog.list` paginates via `page.hasNextPage()` / `page.getNextPage()`.
- Order `appliedTaxes` entries **require a `uid`** (`{ uid: 'at-0', taxUid: 'pst' }`) —
  omitting it silently drops the tax and the payment/order totals stop matching.
- Payment `amountMoney` must equal the referenced order's computed total exactly —
  always charge what Square computed, don't recompute client-side.
- Sandbox test nonce: `cnon:card-nonce-ok`. Sandbox and production locations differ
  (`SQUARE_LOCATION_ID` sandbox vs `LMPFJC1FFTH4V` "edit studio." production).
- Missing `SQUARE_LOCATION_ID` on the deploy target = payment form hangs on "loading
  secure payment form" with no error. Check env first when the form hangs.
- Apple Pay: domain verification file must be served at
  `/.well-known/apple-developer-merchantid-domain-association`; re-register the domain
  when moving sandbox → production. Apple Pay cannot create stored cards.

**Email (the Gmail wars)**
- Gmail iOS dark mode **fully inverts CSS backgrounds** (ink→cream) but **never
  recolors image pixels**, and ignores `@media (prefers-color-scheme)`. Apple Mail
  honors the media query. A baked-image header is the only bulletproof dark-mode fix,
  but remote image fetch can fail (broken-image box — worse). Current choice: CSS ink
  band + white logo, trade-off documented in the template comment.
- Email-safe font stacks only: Georgia italic (display), 'SF Mono'/'Courier New'
  (mono), Inter Tight → Helvetica (body).
- Gmail auto-links addresses/phones in default blue — wrap them in styled anchors
  (maps link for the address) to keep the design.
- Test emails: `/api/admin/email-preview?type=X&send=1` sends to OWNER_EMAIL.

**Webhooks**
- Verify HMAC over notification **URL + raw body** (not just body).
- Square sends event bursts — debounce catalog syncs (20s cooldown).
- Dedupe replays by `event_id`; on storage failure, prefer processing over dropping.

**This repo's build quirks**
- Node 20 via NVM required: `source ~/.nvm/nvm.sh && nvm use 20`.
- The customer site is JSX compiled by `scripts/compile-site-jsx.mjs` →
  `public/site/*.js` (runs inside `npm run build`). Editing `editstudio.space/*.jsx`
  does nothing until compiled. Static assets must exist in BOTH
  `editstudio.space/assets/` and `public/assets/`.
- Test harness: prod build on :3001; admin cookie cached via login curl; Playwright
  WebKit scripts in repo root; PostgREST curl for DB asserts. Always delete test
  appointments and reset policies after E2E runs.
- Payments testing ONLY in Square sandbox. Never real money.

---

## 4. Target architecture

### Recommendation: keep it boring and shippable
- **Backend**: evolve this codebase — Next.js App Router API routes + Supabase — into a
  multi-tenant API. Don't rewrite. Extract `lib/` (square, tax, notifications, push)
  into tenant-aware modules first.
- **Native admin app**: **React Native + Expo** (EAS builds, OTA updates, push via Expo
  Notifications). Rationale: the whole stack is already React/TS; the admin components
  translate; one codebase for iOS + Android; App Store presence matters for "sell and
  ship". Swift-only would double the work for marginal gain at this stage.
- **Client booking funnel**: stays **web** (per-tenant subdomain `{slug}.pomelo.app` +
  custom domains). Clients won't install an app to book a haircut. The funnel is already
  excellent — port it to a tenant-themed template.
- **Payments**: **Square OAuth** (each tenant connects their own Square account;
  Pomelo acts as a platform app). This preserves every integration already built
  (catalog sync, orders, card-on-file, POS webhooks) — they all work per-merchant with
  OAuth tokens instead of env-var tokens. Stripe can come later for non-Square shops;
  don't build dual-rail v1.

### Multi-tenancy model
- `tenants` table: id, slug, name, branding (logo, colors, fonts), custom domain,
  timezone, tax profile (region rules — BC GST/PST is one profile; make tax pluggable
  per province/state), Square OAuth tokens (encrypted), subscription status.
- Every existing table gains `tenant_id` + RLS policies (Supabase row-level security —
  actually use it this time; single-tenant ricsedit didn't need it).
- The `settings` JSONB pattern scales fine per-tenant: key → (tenant_id, key).
- Staff accounts become real users (Supabase Auth) with roles: owner, staff. Replaces
  the single shared admin password.

### Services map (target)
```
apps/
  admin-native/     Expo app (the product)
  booking-web/      per-tenant client funnel (Next.js, themed)
  api/              Next.js API routes (or keep colocated with booking-web)
  marketing/        pomelo.app site + signup + billing
packages/
  core/             domain types, tax engine, policy engine
  square/           tenant-aware Square client (OAuth), orders, catalog sync
  notifications/    email/SMS templates with per-tenant branding
```

---

## 5. Native admin app — screen outline (v1)

Priorities from real usage at Edit Studio (what Eric actually opens daily):

1. **Today** (home): day schedule timeline, PAID/deposit indicators, next client card,
   walk-in gap finder, open/closed status. Pull to refresh.
2. **Appointment detail**: client info (tap to call/text), payment breakdown incl. tax
   + tip, collect-at-studio balance, actions: reschedule, cancel (+note → client email),
   mark no-show (+optional fee charge with confirmation), refund.
3. **Calendar**: week/month, per-staff filter, block-off time, edit hours.
4. **New booking** (manual entry for phone/walk-in bookings) with the same policy engine.
5. **Clients**: history, cards on file (brand/last4 only), notes, no-show count.
6. **Notifications**: push on new booking / cancellation / dispute / price sync — this
   already exists as web push; Expo push replaces it.
7. **Money** (v1.1): day/week takings from the POS event stream + online payments,
   simple reconciliation view.
8. **Settings**: services & prices (+ "sync from Square" button), policies (deposit /
   card-on-file / prepay / tips), hours, staff, announcement strip, email preview.

Design language: port the site's editorial ink-on-paper system (mono uppercase labels,
serif italic headlines, hairline rules, lime accent) — it's distinctive and already
proven; don't ship a generic template UI.

## 5b. Distribution — how salons get the funnel (decided July 2026)

**Hosted page first; embed is a veneer; never an inline iframe checkout.**

1. **Hosted booking page** (default): `{slug}.pomelo.app` + custom domain via CNAME
   (`book.salon.com`). This is where payments, Apple Pay, and email deep links
   (confirmation / reminder / manage) actually work. It's also what the two real
   booking front doors want: the Instagram bio link and the Google Business Profile
   "Book" button — both take a URL, not an embed.
2. **"Book Now" snippet** for salons' existing sites: one line of HTML rendering a
   styled button that opens the hosted funnel (overlay on desktop, new tab on mobile —
   Calendly's pattern). Feels embedded, is actually our domain.
3. **Premium tier — Pomelo hosts the whole site**: the Edit Studio model, templated
   (hero system, menus, galleries + booking woven in). Competitors' hosted pages are
   ugly; a beautiful full site is the upsell, with editstudio.space as the live demo.

Why NOT inline iframes (learned the hard way in this repo): Apple Pay domain
verification is per top-level domain (impossible to manage across salons' Wix/
Squarespace sites); the Square card form is itself an iframe → nested-iframe Safari
storage-partitioning and 3DS-popup breakage per host platform; the funnel is
full-screen mobile-first and dies inside a fixed-height frame under someone's sticky
header; and email links need a canonical URL anyway, so the hosted page must exist
regardless. Later distribution: Reserve with Google, Instagram action buttons,
front-counter QR codes.

## 6. Build phases

**Phase 0 — extract & de-hardcode (in this repo)**
Make `lib/` tenant-shaped: pass a tenant/config object instead of reading env vars
inside functions. Keep ricsedit working identically (tenant = "edit-studio" from env).
Acceptance: existing E2E harness still passes.

**Phase 1 — multi-tenant backend + Square OAuth**
Tenants table, RLS, Supabase Auth for staff, Square OAuth connect flow (+ webhook
subscriptions created per-merchant via API), per-tenant settings. Edit Studio migrates
to tenant zero. Acceptance: two tenants booking simultaneously in sandbox without data
bleed.

**Phase 2 — Expo admin app MVP**
Screens 1–3 + 6 above against the tenant API. Auth via Supabase. TestFlight to Eric +
the Edit Studio practitioners as pilot users (barber, lash, esthetics = three personas
in one building).

**Phase 3 — tenant booking web + onboarding**
Themed funnel per tenant, self-serve signup: connect Square → import catalog (the
matcher already exists) → set policies/hours → live subdomain. Acceptance: a stranger
can go signup → bookable page in under 30 minutes.

**Phase 4 — billing + polish**
Subscription billing (Stripe Billing is fine for SaaS billing even while merchant
payments stay Square), plan gating, marketing site, App Store listing, remaining admin
screens (4, 5, 7, 8).

## 7. Open decisions for Eric
- **Pricing**: flat monthly (e.g. $29–49/mo) vs cheaper base + per-booking fee.
- **Which platform first**: iOS-first via TestFlight is the natural pilot path.
- **Scope of v1 tax engine**: BC profile only at launch (honest constraint) vs building
  the pluggable province/state profiles up front.
- **Brand**: Pomelo name is set; needs logo/wordmark, and decide whether tenant emails
  send from `bookings@{tenant}.pomelo.app` or tenant custom domains (deliverability
  setup per domain).
- **SMS costs**: Twilio per-tenant pass-through or bundled into plan.

## 8. Working in this repo (quick reference)
- Dev: `npm run dev` (port 3000). Prod test: `npm run build && PORT=3001 npm start`.
- Site JSX: edit `editstudio.space/*.jsx` → `node scripts/compile-site-jsx.mjs`.
- Env var names (values in `.env.local` / Vercel, never commit): `SQUARE_ACCESS_TOKEN`
  (sandbox), `SQUARE_PROD_ACCESS_TOKEN` (prod, read/catalog+webhooks by policy),
  `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`,
  `SQUARE_WEBHOOK_URL`, `ADMIN_PASSWORD_ERIC`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
  `TWILIO_*`, `OWNER_EMAIL`, `OWNER_PHONE`, `NEXT_PUBLIC_SITE_URL`, Supabase keys.
- Conventions: commit + push after each working change; commit trailer
  `Co-Authored-By:` the assisting model; sandbox-only payment tests; never print
  secrets into chat or logs.
