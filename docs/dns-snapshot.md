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
| DNS | **Cloudflare** (recommended) or Vercel DNS | free either way |
| mail | **an actual mail host** | Google Workspace ≈$7/user/mo, Fastmail ≈$5/mo, iCloud+ Custom Email Domain if already subscribed |

DNS is worth putting somewhere neutral rather than at either the host or the
registrar. Everything awkward in this document traces back to DNS, web and mail
being one provider; a dedicated DNS host means the next hosting change is one
record again instead of a migration.

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

1. Repoint the `A` record at Vercel — DNS still at SiteGround. Verify the site.
2. Stand up the new mail host, recreate every address, switch MX. Verify by
   sending to `bookings@` and `dmarc@` from outside.
3. Move the nameservers, recreating every record in this file. Diff the snapshot.
4. Two quiet weeks, then cancel SiteGround.
5. Only then flip DMARC to `p=quarantine`.

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
