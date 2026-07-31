# DNS snapshot — editstudio.space

Captured **2026-07-31** from the authoritative SiteGround nameservers, before the
move to Vercel. Everything here is public DNS data — no secrets. DKIM public
keys are included in full because they are the records most likely to be
mistyped or dropped in a migration, and a truncated key fails silently.

Re-capture with `scripts/dns-snapshot.sh` and diff against this file after the
move. A record that vanishes in a DNS migration does not error — mail simply
starts failing authentication days later, somewhere you are not looking.

## Three services, one provider

SiteGround currently provides three independent things:

| service | evidence | replaced by Vercel? |
|---|---|---|
| **DNS hosting** | `NS` → `ns1/ns2.siteground.net` | optional — Vercel DNS, Cloudflare, or the registrar |
| **Web hosting** | `A` → `35.208.146.53` | **yes**, this is the migration |
| **Mail hosting** | `MX` → `mailspamprotection.com`, `default._domainkey` → `dnssmarthost.net`, root SPF `include:…dnssmarthost.net` | **NO — Vercel does not host email** |

**Cancelling SiteGround outright kills all mail to @editstudio.space**, including
`dmarc@` and any address clients have ever written to. Decide the mail story
before moving DNS, not after. Either keep a SiteGround plan for mail only (keep
the MX, SPF include, and `default._domainkey` exactly as below), or move mail to
Google Workspace / Fastmail / Zoho — in which case MX, the SPF include, and the
DKIM record all change together.

Transactional email is unaffected either way: Resend authenticates through its
own records (`resend._domainkey`, `send.editstudio.space`), which have nothing to
do with SiteGround and just need recreating wherever DNS ends up.

## Migration log

**2026-07-31 — nameservers moved to Cloudflare.** Site left on SiteGround; the
`A` record still holds `35.208.146.53`. Verified by diffing both live zones
against each other while SiteGround's nameservers were still answering:

```
./scripts/dns-snapshot.sh ns1.siteground.net          > /tmp/old.txt
./scripts/dns-snapshot.sh ainsley.ns.cloudflare.com   > /tmp/new.txt
diff <(tail -n +3 /tmp/old.txt) <(tail -n +3 /tmp/new.txt)
```

Only the `NS` records differed. All 18 records survived, including
`resend._domainkey` and `send`.

Two things the diff surfaced that are worth knowing for next time:

- Cloudflare's import missed the `default._domainkey` **CNAME** entirely — it
  reported zero CNAMEs. Added by hand. Its scan is good on A/MX/TXT and should
  not be trusted to be complete.
- `default._domainkey` appears to differ between the two zones, but does not.
  Querying an authoritative server directly returns only what that server is
  authoritative for, so Cloudflare returns the bare CNAME while SiteGround
  volunteered the resolved chain. A recursive resolver follows it to the same
  `v=DKIM1` key from either zone. **Diff authoritative answers, but confirm any
  CNAME difference through a recursive resolver before believing it.**

## Records

### Apex

```
NS    ns1.siteground.net.
NS    ns2.siteground.net.
A     35.208.146.53
MX    10 mx10.antispam.mailspamprotection.com.
MX    20 mx20.antispam.mailspamprotection.com.
MX    30 mx30.antispam.mailspamprotection.com.
TXT   "v=spf1 +a +mx include:editstudio.space.spf.auto.dnssmarthost.net ~all"
TXT   "apple-domain-verification=urmYTEElS98_Z5vqlJrOZ-SvI4jkyAFvfo4Dfij-egI"
TXT   "google-site-verification=scdrxYNl8qCewLMCPOyS4fMP-x3wnzvFIlCPzsHrimw"
```

No `AAAA`, no `CAA`.

### Subdomains

```
www                     A     35.208.146.53
mail                    A     35.208.146.53
ftp                     A     35.208.146.53
ssh                     A     35.208.146.53
autoconfig              A     35.208.146.53
autodiscover            A     35.208.146.53
_dmarc                  TXT   "v=DMARC1; p=none; rua=mailto:dmarc@editstudio.space; aspf=r; adkim=r"
send                    TXT   "v=spf1 include:amazonses.com ~all"
send                    MX    10 feedback-smtp.us-east-1.amazonses.com.
resend._domainkey       TXT   "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDSmCykqyOKN/RfARMnziUe/5IxBUBbrObq1EujVsfPDrKvuQBrpdbWjo0H5NTR22dYKS3JFPTTZjIktOAYscpPA0JGd7Dse8GG8Qwse1vAaUMiHpyieIymoGjh2D5rMT3j4ZiLiH5lQJp9fPG6n3D/1Q2k9gIGlLrKS0UuxYUHuwIDAQAB"
default._domainkey      CNAME editstudio.space.default.dkim.auto.dnssmarthost.net.
```

### What each record is for

| record | purpose | if lost |
|---|---|---|
| `resend._domainkey` | **Resend DKIM** | every booking email fails DKIM |
| `send` TXT + MX | **Resend Return-Path**, gives SPF alignment | booking email fails SPF alignment → DMARC fail |
| `_dmarc` | policy + reporting | reports stop; policy reverts to none |
| root SPF | authorises SiteGround mail | staff mail fails SPF |
| `default._domainkey` | SiteGround mail DKIM | staff mail fails DKIM |
| `apple-domain-verification` | **Apple Business Connect** | Branded Mail verification lost, must redo |
| `google-site-verification` | Search Console | console access lost |
| `mail` A | SiteGround webmail at `/webmail` | webmail unreachable |
| `ftp`, `ssh` A | SiteGround file/shell access | those tools stop resolving |
| `autoconfig`, `autodiscover` A | mail client auto-setup | clients cannot self-configure |

`ftp`, `ssh`, `mail`, `autoconfig` and `autodiscover` all die with SiteGround and
should be deleted once the account closes — but **never proxy them in the
meantime**. Cloudflare proxies HTTP/HTTPS only, so an orange-clouded `ssh` record
resolves to a Cloudflare address that does not answer on port 22, and the same
applies to FTP and any mail client pointed at `mail.`.

This list was itself incomplete when first written — it had only `www` and
`mail`, because `scripts/dns-snapshot.sh` probes names that were guessed rather
than discovered. Cloudflare's scanner found the other four during the 2026-07-31
import. The script is a diff tool for known records, not a discovery tool; trust
the registrar or the new provider's scan for completeness.

The first two are the ones to guard hardest. They are what makes booking
confirmations authenticate, they have nothing to do with the website, and they
are the easiest to forget precisely because nothing on the new host references
them.

## Leaving SiteGround entirely

Decided 2026-07-31. That makes this a three-part migration, not a hosting swap.
Taken in the wrong order it loses mail.

**The domain itself is safe.** It is registered with Automattic (WordPress.com),
created 2025-07-24, expiring 2027-07-24. SiteGround only holds the nameservers,
so closing the account cannot cost the domain.

### Where each service goes

| service | to | notes |
|---|---|---|
| web | **Vercel** | already running there |
| DNS | **Cloudflare** | free |
| mail | **Cloudflare Email Routing** — forwarding, not hosting | free |

**No mail host is needed.** Established 2026-07-31: the studio runs on Gmail
accounts, and Acuity always sent confirmations from `no-reply@acuityscheduling.com`,
so no @editstudio.space mailbox has ever been used by anyone — which is why
`bookings@` and `dmarc@` were both returning 550 with nobody noticing.

What is actually required is that mail *to* the domain reaches a human. Cloudflare
Email Routing does that for free and comes with the DNS move: forward `bookings@`
and any legacy published address to the Gmail account already in daily use. No
mailbox, no extra login, no bill.

Its one limit is that forwarding is receive-only — replies go out from the Gmail
address, not `bookings@editstudio.space`. Google Workspace (≈$7/user/mo) is the
upgrade if sending as the brand ever matters, and nothing here has to change to
adopt it later.

Note this makes `bookings@editstudio.space` client-facing for the first time.
Under Acuity's `no-reply@`, clients had no way to answer a confirmation at all;
the new system invites a reply, so the address has to work before launch rather
than after.

**Why Cloudflare and not Vercel DNS**, given the app is on Vercel: Vercel DNS
has no email forwarding, so `bookings@` would still need a third-party forwarder
or a paid mail host. Cloudflare provides it free in the same place. Secondarily,
it keeps DNS independent of whoever hosts the site — that coupling is what made
leaving SiteGround mean leaving three services at once, and a neutral DNS host
makes the next hosting change one record instead of a migration.

Vercel needs only an `A` record pointing at the IP it shows when the domain is
added; it supports external DNS and nothing about deploys or certificates
changes.

**Set that record to DNS-only — the grey cloud, not the orange one.** Proxying
Cloudflare in front of Vercel puts two CDNs in series and is a known source of
redirect loops and certificate failures. Vercel keeps handling CDN and TLS, as
it does today.

### Mail is the part that bites

`lib/notifications.ts` sends with no `Reply-To`, so every client reply to a
booking confirmation goes to **`bookings@editstudio.space`** — wherever the MX
points. Losing mail does not just lose staff email; it silently swallows clients
asking to move appointments.

Before cancelling anything, in SiteGround Site Tools → Email:

1. **List every mailbox, alias and forwarder.** Addresses printed on old cards
   or written on Google Business will still be receiving mail. Anything not
   recreated on the new host simply stops existing.
2. **Confirm `bookings@` and `dmarc@` are among them** — the first takes client
   replies, the second takes DMARC reports.
3. **Export mail history over IMAP** if it is worth keeping. Cancelling deletes
   it, and there is no undo.

Then: create the mailboxes on the new host *first*, switch MX, and leave the old
host running a couple of weeks to catch anything still routing there. Only
cancel once nothing has arrived at the old host for a fortnight.

### Order

Mail and DNS are separate cutovers. Do them separately, and never at the same
time as the DMARC flip.

**Move DNS first, while the site is still on SiteGround.** The nameserver move
and the hosting move are independent, and separating them means neither can be
blamed for the other's symptoms. It also front-loads all the risk into the step
where the website cannot break: the `A` record keeps its current SiteGround
value, so the same answer is simply served by different nameservers.

1. **Add the domain to Cloudflare** and let it auto-import the existing records.
2. **Diff the import against this file.** The step everything else depends on.
   Cloudflare's scanner is good but not exhaustive and misses TXT records at
   unusual names. Check by name for `resend._domainkey`, `send` (TXT *and* MX),
   `default._domainkey`, `apple-domain-verification`, `google-site-verification`
   and `_dmarc`. Add anything missing by hand.
3. **Set the `A` records to DNS-only** — grey cloud.
4. **Change the nameservers at the registrar** (WordPress.com/Automattic), not
   at SiteGround.
5. **Wait for propagation**, then `./scripts/dns-snapshot.sh` and diff again. It
   should match this file exactly — the `A` record has not moved yet.
6. **Turn on Email Routing**; forward `bookings@` and any legacy published
   address to the Gmail in daily use. This replaces the `MX` records, which is
   expected and costs nothing — no SiteGround mailbox has ever been used. Verify
   by emailing `bookings@` from outside. This also resolves the live
   client-replies-bounce issue without waiting for the Vercel move.
7. **Leave the SiteGround zone intact** until propagation is confirmed.
8. **Then** repoint the `A` record at Vercel — one edit, at a time of your
   choosing, with DNS already proven.
9. Two quiet weeks, then cancel SiteGround. Nothing needs exporting.
10. Only then flip DMARC to `p=quarantine`.

SiteGround renews the TLS certificate automatically. That normally uses HTTP
validation and is unaffected by a nameserver change — but if the certificate
ever fails to renew while the site is still there, this is the first thing to
suspect.

Step 3 is the one this document exists for: the new zone starts empty, and the
records nothing else references — `resend._domainkey`, `send`,
`apple-domain-verification` — are the ones that get left behind.

## Ordering

Do **not** migrate and enforce DMARC in the same change. Under `p=quarantine`, a
Resend record that didn't survive sends every booking confirmation to spam, and
the symptom appears a day later with no error anywhere.

1. Repoint the `A` record at Vercel.
2. Re-run the snapshot and **diff it against this file** — on the recommended
   path only `A` should differ. Anything else changing is a mistake.
3. Send a real booking confirmation and inspect its headers for
   `dkim=pass` and `spf=pass` with `header.from=editstudio.space`.
4. Confirm DMARC aggregate reports still arrive for a few days.
5. *Only then* flip `p=none` → `p=quarantine`.

## Consequence worth taking

Once Vercel serves `editstudio.space`, `public/assets/` is served from the same
origin as the app, so `logo-white.png` and `email-band.png` finally share a host.
Collapse `LOGO_SRC` and `BAND_SRC` in `lib/notifications.ts` to one constant then
— and re-verify both by content-type, per SPEC.md §12.
