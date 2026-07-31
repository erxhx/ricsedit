#!/usr/bin/env bash
# Dump every DNS record that matters for editstudio.space.
#
# Run before and after any DNS or hosting migration and diff the two:
#
#   ./scripts/dns-snapshot.sh > /tmp/after.txt
#   diff <(sed -n '/^## /,$p' docs/dns-snapshot.md) /tmp/after.txt
#
# A dropped record does not error. Mail simply starts failing authentication a
# day or two later, which is why this is a diff and not a spot check.
#
# Queries the authoritative nameservers by default so results are immediate
# rather than up to 24h stale. Pass a resolver to check propagation instead:
#
#   ./scripts/dns-snapshot.sh 8.8.8.8
set -euo pipefail

DOMAIN=${DOMAIN:-editstudio.space}

# Hardcoded, and therefore only ever as complete as this list. Cloudflare's own
# scanner found autoconfig/autodiscover/ftp/ssh in 2026-07 that an earlier
# version of this list did not, because it probes a far wider set of names.
# Treat this as a diff tool for known records, never as a discovery tool.
SUBS=(www mail send ftp ssh autoconfig autodiscover
      _dmarc resend._domainkey default._domainkey)

if [ $# -ge 1 ]; then
  RESOLVER="@$1"
else
  # Authoritative, so a just-changed record shows up without waiting for TTL.
  ns=$(dig +short @8.8.8.8 "$DOMAIN" NS | head -1)
  [ -n "$ns" ] || { echo "could not resolve NS for $DOMAIN" >&2; exit 1; }
  RESOLVER="@$ns"
fi

echo "# DNS snapshot — $DOMAIN"
echo "# $(date -u +%Y-%m-%dT%H:%MZ) via ${RESOLVER#@}"
echo

echo "## apex"
for t in NS A AAAA MX CAA TXT; do
  dig +short "$RESOLVER" "$DOMAIN" "$t" | sed "s/^/$t\t/"
done | sort
echo

for h in "${SUBS[@]}"; do
  echo "## $h"
  for t in A CNAME MX TXT; do
    dig +short "$RESOLVER" "$h.$DOMAIN" "$t" | sed "s/^/$t\t/"
  done | sort -u
  echo
done
