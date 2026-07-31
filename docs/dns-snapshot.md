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

## Ordering

Do **not** migrate DNS and enforce DMARC in the same change. Under
`p=quarantine`, a Resend record that didn't survive the move sends every booking
confirmation to spam, and the symptom appears a day later with no error anywhere.

1. Move web hosting to Vercel; recreate every record above in the new DNS.
2. Re-run the snapshot and **diff it against this file** — expect only `A`/`NS`
   to differ.
3. Send a real booking confirmation and inspect its headers for
   `dkim=pass` and `spf=pass` with `header.from=editstudio.space`.
4. Confirm DMARC aggregate reports still arrive for a few days.
5. *Only then* flip `p=none` → `p=quarantine`.

## Consequence worth taking

Once Vercel serves `editstudio.space`, `public/assets/` is served from the same
origin as the app, so `logo-white.png` and `email-band.png` finally share a host.
Collapse `LOGO_SRC` and `BAND_SRC` in `lib/notifications.ts` to one constant then
— and re-verify both by content-type, per SPEC.md §12.
