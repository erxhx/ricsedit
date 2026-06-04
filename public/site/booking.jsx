// booking.jsx — Edit Studio custom booking flow
// Replaces the Acuity embedded scheduler.
// Loaded by index.html between content.jsx and app.jsx.
// Export: window.BookingEmbed

(function () {

  // ── Service data ───────────────────────────────────────────────────────────

  var BK_BARBER = [
    { id: 'haircut',          name: 'Haircut',               desc: 'Signature cut and style.',                              price: 40, duration: 45 },
    { id: 'beard',            name: 'Beard Trim',            desc: 'Trim, shape, line, oil.',                               price: 25, duration: 30 },
    { id: 'haircut-beard',    name: 'Haircut + Beard',        desc: 'The whole package.',                                    price: 60, duration: 60 },
    { id: 'freshen-haircut',  name: 'Freshen Up — Cut',       desc: 'Must be within 2 weeks of last service.',              price: 25, duration: 45 },
    { id: 'freshen-both',     name: 'Freshen Up — Cut + Beard', desc: 'Must be within 2 weeks of last service.',            price: 40, duration: 60 },
    { id: 'kids',             name: 'Kids Cut',               desc: 'Ages 10 and under.',                                   price: 30, duration: 45 },
    { id: 'senior',           name: 'Senior Cut',             desc: 'Ages 65+.',                                            price: 30, duration: 30 },
  ];

  var BK_TAN = [
    { id: 'classic', name: 'Classic Full Body', desc: 'Personalized colour analysis, skin/hair/nail barriers, shimmering finish. Develops in 8–12 hours.', price: 60, duration: 45 },
    { id: 'rapid',   name: 'Rapid Full Body',   desc: 'Develops in 1–5 hours — perfect on the go.',                                                         price: 70, duration: 45 },
    { id: 'face',    name: 'Face Tan',           desc: 'Face and neck. Skincare-grade glow.',                                                                price: 15, duration: 20 },
  ];

  var BK_TAN_ADDONS = [
    { id: 'bra',       name: 'Disposable Bra',    desc: 'Bandeau style.',                                                        price: 5,  duration: 0  },
    { id: 'undies',    name: 'Disposable Undies',  desc: '',                                                                     price: 5,  duration: 0  },
    { id: 'prep-lock', name: 'Prep + Lock',        desc: 'Two-step longevity treatment — pH-balance prep + post-tan barrier lock. Extends your glow.', price: 20, duration: 20 },
  ];

  var BK_WAX_GROUPS = [
    {
      label: 'Brows + Face',
      items: [
        { id: 'brow-wax',  name: 'Brow Wax & Shape', desc: 'Map, wax, tweeze, finish.',                                         price: 25, duration: 30 },
        { id: 'brow-tint', name: 'Brow Tint',         desc: 'Define and deepen.',                                               price: 15, duration: 20 },
        { id: 'lash-tint', name: 'Lash Tint',         desc: 'No mascara required.',                                             price: 25, duration: 30 },
        { id: 'upper-lip', name: 'Upper Lip',          desc: '',                                                                price: 10, duration: 15 },
        { id: 'chin',      name: 'Chin',               desc: '',                                                                price: 15, duration: 15 },
        { id: 'cheek',     name: 'Cheek',              desc: 'An ultra-smooth base for makeup + skincare absorption.',          price: 15, duration: 20 },
      ]
    },
    {
      label: 'Body',
      items: [
        { id: 'underarm',  name: 'Underarm',   desc: 'Five minutes. Two weeks smooth.',  price: 20, duration: 15 },
        { id: 'half-arm',  name: 'Half Arm',   desc: 'Upper or lower.',                  price: 25, duration: 25 },
        { id: 'full-arm',  name: 'Full Arm',   desc: '',                                 price: 45, duration: 40 },
        { id: 'stomach',   name: 'Stomach',    desc: '',                                 price: 25, duration: 25 },
        { id: 'chest',     name: 'Chest',      desc: '',                                 price: 35, duration: 30 },
        { id: 'shoulder',  name: 'Shoulder',   desc: '',                                 price: 25, duration: 25 },
        { id: 'half-back', name: 'Half Back',  desc: 'Upper or lower.',                  price: 30, duration: 25 },
        { id: 'full-back', name: 'Full Back',  desc: '',                                 price: 50, duration: 45 },
        { id: 'half-leg',  name: 'Half Leg',   desc: 'Upper or lower.',                  price: 35, duration: 30 },
        { id: 'full-leg',  name: 'Full Leg',   desc: '',                                 price: 70, duration: 55 },
      ]
    },
    {
      label: 'Bikini',
      note: 'female genitalia services only (V)',
      items: [
        { id: 'bikini',     name: 'Bikini',      desc: 'Removes hair visible outside of underwear or bikini area.',                                    price: 35, duration: 30 },
        { id: 'french',     name: 'French',      desc: 'In between a Brazilian and a Bikini. Includes bikini area and between the cheeks.',             price: 45, duration: 35 },
        { id: 'brazilian',  name: 'Brazilian',   desc: 'All hair removed, including between the cheeks.',                                              price: 50, duration: 40 },
        { id: 'bum-cheeks', name: 'Bum Cheeks',  desc: 'Does not include between the cheeks.',                                                         price: 30, duration: 25 },
      ]
    },
  ];

  // ── Service data — fetched from admin on init so price/name edits propagate ──

  // Maps a Next.js Service object → booking.jsx format
  function mapSvc(s) {
    return { id: s.id, name: s.name, desc: s.description || '', price: s.price, duration: s.durationMinutes };
  }

  // Fetch current services from the admin app and update the BK_ arrays in place.
  (function () {
    var endpoint = (window.__booking || {}).endpoint || '';
    var base = endpoint.replace(/\/api\/booking\/create$/, '') || window.location.origin;
    if (!base) return;
    fetch(base + '/api/booking/services')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        if (Array.isArray(d.barberServices) && d.barberServices.length) {
          BK_BARBER = d.barberServices.map(mapSvc);
        }
        if (Array.isArray(d.tanServices) && d.tanServices.length) {
          BK_TAN = d.tanServices.map(mapSvc);
        }
        if (Array.isArray(d.tanAddons) && d.tanAddons.length) {
          BK_TAN_ADDONS = d.tanAddons.map(mapSvc);
        }
        if (Array.isArray(d.waxGroups) && d.waxGroups.length) {
          BK_WAX_GROUPS = d.waxGroups.map(function (g) {
            return { label: g.name, note: g.note || '', items: (g.services || []).map(mapSvc) };
          });
        }
      })
      .catch(function () {});
  })();

  // Studio hours (Pacific time). null = closed.
  // Mutable vars — updated async from admin config so the calendar stays in sync.
  var BK_HOURS = { 0: [10, 18], 1: null, 2: null, 3: [10, 18], 4: [10, 18], 5: [10, 18], 6: [10, 18] };
  var BK_BARBER_THU_CLOSE = 21;
  // Per-staff hours — keyed by staff id ('eric'|'livi'). Falls back to BK_HOURS if not set.
  var BK_STAFF_HOURS = { eric: null, livi: null };

  // Maps booking category → staff id (matches the admin assignment)
  function bkCategoryStaff(category) {
    return category === 'barber' ? 'eric' : 'livi';
  }

  // Returns the hours object for a given category (staff-specific if available)
  function bkHoursForCategory(category) {
    var staffId = bkCategoryStaff(category);
    return BK_STAFF_HOURS[staffId] || BK_HOURS;
  }

  // Fetch current hours from the admin app and update in place.
  (function () {
    var endpoint = (window.__booking || {}).endpoint || '';
    var base = endpoint.replace(/\/api\/booking\/create$/, '') || window.location.origin;
    if (!base) return;
    fetch(base + '/api/booking/hours')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg) return;
        // Update shared store hours
        if (cfg.days) {
          var h = {};
          Object.keys(cfg.days).forEach(function (k) {
            var v = cfg.days[k];
            h[Number(k)] = Array.isArray(v) ? v : null;
          });
          BK_HOURS = h;
        }
        if (typeof cfg.barberThuClose === 'number') {
          BK_BARBER_THU_CLOSE = cfg.barberThuClose;
        }
        // Update per-staff hours
        if (cfg.staff) {
          ['eric', 'livi'].forEach(function (id) {
            var sd = cfg.staff[id] && cfg.staff[id].days;
            if (sd) {
              var sh = {};
              Object.keys(sd).forEach(function (k) {
                var v = sd[k];
                sh[Number(k)] = Array.isArray(v) ? v : null;
              });
              BK_STAFF_HOURS[id] = sh;
            }
          });
        }
      })
      .catch(function () {});
  })();

  // ── Helpers ────────────────────────────────────────────────────────────────

  function bkFmtPrice(n)       { return '$' + n; }
  function bkFmtTime(h, m)     {
    m = m || 0;
    var period = h >= 12 ? 'pm' : 'am';
    var disp   = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return disp + (m > 0 ? ':' + String(m).padStart(2, '0') : '') + period;
  }
  function bkFmtDate(d) {
    return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function bkTotalDuration(svcs) { return svcs.reduce(function(s, x) { return s + (x.duration || 0); }, 0); }
  function bkTotalPrice(svcs)    { return svcs.reduce(function(s, x) { return s + (x.price    || 0); }, 0); }

  // Get current date in Pacific time (ignores visitor TZ — studio is local business)
  function bkTodayPacific() {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    var parts = fmt.formatToParts(new Date());
    var get = function(t) { return parseInt(parts.find(function(p) { return p.type === t; }).value, 10); };
    return new Date(get('year'), get('month') - 1, get('day'));
  }

  // Available start times for a given date, service duration, category, and already-booked ranges.
  //
  // Barber  — 45-min steps through free time (maximises haircut slots); allows slots that end
  //           up to 15 min past close so e.g. a 5:30 pm haircut ending at 6:15 pm is offered.
  // Livi    — 15-min steps through free time, no end-of-day flex.
  //
  // When a booking ends at an off-cadence time the cursor jumps to that exact end time and
  // continues stepping from there — appointments always chain off real end times.
  function bkAvailableSlots(date, durationMins, category, bookedRanges) {
    var dow = date.getDay();
    var hrs = bkHoursForCategory(category)[dow];
    if (!hrs) return [];
    var open  = hrs[0] * 60;
    var close = hrs[1] * 60;
    if (category === 'barber' && dow === 4) close = BK_BARBER_THU_CLOSE * 60;

    var isBarber = category === 'barber';
    var step     = isBarber ? 45 : 15;
    var deadline = close + (isBarber ? 15 : 0); // latest minute a slot may end

    var sorted = (bookedRanges || []).slice().sort(function(a, b) { return a.startMinutes - b.startMinutes; });
    var slots  = [];
    var cursor = open;

    while (cursor + durationMins <= deadline) {
      // If cursor lands inside a booked range, jump to its end
      var jumped = false;
      for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        if (cursor >= r.startMinutes && cursor < r.startMinutes + r.durationMinutes) {
          cursor = r.startMinutes + r.durationMinutes;
          jumped = true;
          break;
        }
      }
      if (jumped) continue;

      // Check if the proposed slot overlaps any booked range
      var overlapEnd = -1;
      for (var j = 0; j < sorted.length; j++) {
        var r2 = sorted[j];
        if (cursor < r2.startMinutes + r2.durationMinutes && cursor + durationMins > r2.startMinutes) {
          overlapEnd = r2.startMinutes + r2.durationMinutes;
          break;
        }
      }

      if (overlapEnd >= 0) {
        cursor = overlapEnd; // jump past blocking range
      } else {
        slots.push({ h: Math.floor(cursor / 60), m: cursor % 60 });
        cursor += step;
      }
    }

    return slots;
  }

  // Next `n` dates starting today
  function bkDates(n) {
    var today  = bkTodayPacific();
    var result = [];
    for (var i = 0; i < n; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }


  // ── Waiver config — fetched from admin so text can be updated without code changes ──

  var BK_WAIVERS = {
    tan: { enabled: true, text: 'I confirm I have no known allergies to the ingredients in NUDA spray tan solutions, and that I have followed the preparation guidelines — including exfoliating 24–48 hours prior and avoiding oils, lotions, and deodorant on the day of. I understand that results vary by skin type and preparation, and that Edit Studio is not liable for reactions resulting from undisclosed allergies or failure to follow prep guidelines.', checkboxLabel: 'I have read and agree to the above.' },
    wax: { enabled: true, text: 'I confirm I have not applied retinol, AHA/BHA exfoliants, or received direct sun exposure on the areas to be waxed within 24 hours prior to my appointment. I understand that waxing results vary by skin type and hair growth cycle, and that Edit Studio is not liable for reactions resulting from undisclosed skin conditions or failure to follow aftercare instructions.', checkboxLabel: 'I have read and agree to the above.' },
  };

  (function() {
    var endpoint = (window.__booking || {}).endpoint || '';
    var base = endpoint.replace(/\/api\/booking\/create$/, '') || window.location.origin;
    if (!base) return;
    fetch(base + '/api/booking/waivers')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d) return;
        if (d.tan) BK_WAIVERS.tan = d.tan;
        if (d.wax) BK_WAIVERS.wax = d.wax;
      })
      .catch(function() {});
  })();

  // ── Saved contacts (localStorage) ─────────────────────────────────────────

  var BK_CONTACTS_KEY = 'es-contacts';

  function bkLoadContacts() {
    try { return JSON.parse(localStorage.getItem(BK_CONTACTS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  var BK_WAIVERS_KEY = 'es-waivers-v1';

  function bkHasSignedWaiver(phone, category) {
    try {
      var digits = phone.replace(/\D/g, '');
      if (!digits) return false;
      var signed = JSON.parse(localStorage.getItem(BK_WAIVERS_KEY) || '[]');
      var cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1); // valid for 1 year
      return signed.some(function(w) {
        return w.phone === digits && w.category === category && new Date(w.signedAt) > cutoff;
      });
    } catch(e) { return false; }
  }

  function bkSaveWaiverSigning(phone, category) {
    try {
      var digits = phone.replace(/\D/g, '');
      if (!digits) return;
      var signed = JSON.parse(localStorage.getItem(BK_WAIVERS_KEY) || '[]');
      signed = signed.filter(function(w) { return !(w.phone === digits && w.category === category); });
      signed.push({ phone: digits, category: category, signedAt: new Date().toISOString() });
      localStorage.setItem(BK_WAIVERS_KEY, JSON.stringify(signed.slice(-50)));
    } catch(e) {}
  }

  function bkSaveContact(form) {
    try {
      var contacts = bkLoadContacts();
      // Dedup key: normalised full name + digits-only phone
      var key = (form.firstName + ' ' + form.lastName).toLowerCase().trim() + '|' + form.phone.replace(/\D/g, '');
      contacts = contacts.filter(function(c) {
        return ((c.firstName + ' ' + c.lastName).toLowerCase().trim() + '|' + c.phone.replace(/\D/g, '')) !== key;
      });
      contacts.unshift({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone });
      localStorage.setItem(BK_CONTACTS_KEY, JSON.stringify(contacts.slice(0, 8)));
    } catch (e) {}
  }

  // ── Shared micro-components ────────────────────────────────────────────────

  function BkEyebrow(props) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 18 }}>
        <span>{props.left}</span>
        {props.right && <span>{props.right}</span>}
      </div>
    );
  }

  function BkBack(props) {
    if (!props.onClick) return null;
    return (
      <button onClick={props.onClick} style={{ appearance: 'none', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        ← Back
      </button>
    );
  }

  function BkBtn(props) {
    var { useState } = React;
    var [hover, setHover] = useState(false);
    var disabled  = props.disabled;
    var secondary = props.secondary;
    return (
      <button
        onClick={props.onClick}
        disabled={disabled}
        onMouseEnter={function() { setHover(true);  }}
        onMouseLeave={function() { setHover(false); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
          gap: hover && !disabled ? 18 : 12,
          padding: '18px 22px', width: '100%',
          background: secondary ? 'transparent' : (disabled ? 'color-mix(in srgb,var(--rule) 60%,transparent)' : 'var(--ink)'),
          color:      secondary ? 'var(--ink-soft)' : (disabled ? 'var(--ink-faint)' : 'var(--bg)'),
          border: secondary ? '1px solid var(--rule)' : 'none',
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          borderRadius: 1, cursor: disabled ? 'default' : 'pointer',
          transition: 'gap 0.4s cubic-bezier(0.34,1.2,0.64,1), background 0.3s ease',
        }}
      >
        <span>{props.children}</span>
        <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 16, lineHeight: 1 }}>→</span>
      </button>
    );
  }

  // Reusable service-row button (barber / tan main / wax items)
  function BkServiceRow(props) {
    var s      = props.service;
    var active = props.active;
    var prefix = props.prefix || '';
    return (
      <button
        onClick={props.onClick}
        style={{
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '15px 0 15px ' + (active ? '10px' : '0'),
          background: active ? 'var(--paper)' : 'var(--bg)',
          color: 'var(--ink)',
          border: 'none', borderLeft: active ? '2px solid var(--ink)' : '2px solid transparent',
          cursor: 'pointer', textAlign: 'left', alignItems: 'baseline', width: '100%',
          transition: 'background 0.15s ease',
        }}
      >
        <span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 400, display: 'block', lineHeight: 1.15 }}>{s.name}</span>
          {s.desc && <span style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--ink-faint)', marginTop: 3, display: 'block', lineHeight: 1.4 }}>{s.desc}</span>}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{prefix}{bkFmtPrice(s.price)}</span>
      </button>
    );
  }

  // ── Step: Category ─────────────────────────────────────────────────────────

  function StepCategory(props) {
    var cats = [
      { id: 'barber', num: '01', label: 'Barbering', hint: 'Crafted haircuts and beards' },
      { id: 'tan',    num: '02', label: 'Sunless',   hint: 'Custom-blended spray tans'  },
      { id: 'wax',    num: '03', label: 'Waxing',    hint: 'Brow · body · bikini'       },
    ];
    return (
      <div>
        <BkEyebrow left="Book a service" />
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(26px,5vw,44px)', margin: '0 0 24px', letterSpacing: '-0.02em', lineHeight: 1 }}>
          What are you booking?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)' }}>
          {cats.map(function(cat) {
            return (
              <button key={cat.id} onClick={function() { props.onSelect(cat.id); }}
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 14, padding: '18px 4px 18px 0', background: 'var(--bg)', color: 'var(--ink)', border: 'none', cursor: 'pointer', textAlign: 'left', alignItems: 'center', transition: 'background 0.15s ease' }}
                onMouseEnter={function(e) { e.currentTarget.style.background = 'var(--paper)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = 'var(--bg)'; }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{cat.num}</span>
                <span>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 400, display: 'block', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{cat.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-faint)', textTransform: 'uppercase', marginTop: 4, display: 'block' }}>{cat.hint}</span>
                </span>
                <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-soft)', paddingRight: 4 }}>→</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step: Service ──────────────────────────────────────────────────────────

  function StepService(props) {
    var { useState, useRef, useEffect } = React;
    var category = props.category;
    var [selected, setSelected]     = useState([]);
    var [addons,   setAddons]       = useState([]);
    var ctaRef = useRef(null); // kept for wax scroll-to behaviour

    // When this panel selects a service, tell all other panels to clear theirs
    // so only one CTA ever renders into #bk-cta-slot at a time.
    useEffect(function() {
      if (selected.length > 0) {
        window.dispatchEvent(new CustomEvent('bk:claim-cta', { detail: { category: category } }));
      }
    }, [selected.length]);

    useEffect(function() {
      function onClaim(e) {
        if (e.detail.category !== category) {
          setSelected([]);
          setAddons([]);
        }
      }
      window.addEventListener('bk:claim-cta', onClaim);
      return function() { window.removeEventListener('bk:claim-cta', onClaim); };
    }, [category]);

    // Clear selection when the user swipes away from this service panel
    useEffect(function() {
      function onDeactivated(e) {
        if (e.detail.service === category) {
          setSelected([]);
          setAddons([]);
        }
      }
      window.addEventListener('bk:panel-deactivated', onDeactivated);
      return function() { window.removeEventListener('bk:panel-deactivated', onDeactivated); };
    }, [category]);

    var isMulti = category === 'wax';

    function toggleMain(item) {
      if (isMulti) {
        setSelected(function(prev) {
          return prev.find(function(s) { return s.id === item.id; })
            ? prev.filter(function(s) { return s.id !== item.id; })
            : prev.concat([item]);
        });
      } else {
        setSelected(function(prev) {
          return prev.find(function(s) { return s.id === item.id; }) ? [] : [item];
        });
      }
    }

    function toggleAddon(item) {
      setAddons(function(prev) {
        return prev.find(function(s) { return s.id === item.id; })
          ? prev.filter(function(s) { return s.id !== item.id; })
          : prev.concat([item]);
      });
    }

    var all   = selected.concat(addons);
    var total = bkTotalPrice(all);
    var dur   = bkTotalDuration(all);

    var catLabel = category === 'barber' ? '01 / Barbering' : category === 'tan' ? '02 / Sunless' : '03 / Waxing';

    // Portal CTA — computed before return so Babel doesn't have to parse it inside JSX
    var ctaPortal = null;
    var ctaSlot = document.getElementById('bk-cta-slot');
    if (selected.length > 0 && ctaSlot) {
      ctaPortal = ReactDOM.createPortal(
        <div style={{ pointerEvents: 'auto', background: 'var(--bg)', borderTop: '1px solid var(--rule)', padding: '8px 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0 10px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              {all.length} service{all.length !== 1 ? 's' : ''} · {dur} min
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 15 }}>{bkFmtPrice(total)}</span>
          </div>
          <BkBtn onClick={function() { props.onNext(selected, addons); }}>Continue to date & time</BkBtn>
        </div>,
        ctaSlot
      );
    }

    // Pre-selected slot (from "Next available" CTA)
    var prefill = props.prefillSlot;

    return (
      <div>
        <BkBack onClick={props.onBack} />
        <BkEyebrow left={catLabel} right={isMulti ? 'Select all that apply' : 'Select a service'} />

        {/* Pre-selected time chip */}
        {prefill && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--rule)', borderRadius: 999,
            padding: '7px 14px', marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'oklch(0.58 0.13 150)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
              {bkFmtDate(prefill.date)}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>·</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink)' }}>
              {bkFmtTime(prefill.time.h, prefill.time.m)}
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--rule)', flexShrink: 0, marginLeft: 2 }} />
            <button
              onClick={props.onClearPrefill}
              style={{
                appearance: 'none', border: 'none', background: 'none', padding: 0,
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--ink-faint)',
                cursor: 'pointer', lineHeight: 1,
              }}
            >
              Change
            </button>
          </div>
        )}

        {/* Barber */}
        {category === 'barber' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)' }}>
            {BK_BARBER.map(function(s) {
              return <BkServiceRow key={s.id} service={s} active={!!selected.find(function(x) { return x.id === s.id; })} onClick={function() { toggleMain(s); }} />;
            })}
          </div>
        )}

        {/* Tan */}
        {category === 'tan' && (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', marginBottom: 24 }}>
            {BK_TAN.map(function(s) {
              return <BkServiceRow key={s.id} service={s} active={!!selected.find(function(x) { return x.id === s.id; })} onClick={function() { toggleMain(s); }} />;
            })}
          </div>
          {selected.length > 0 && (<>
            <BkEyebrow left="Add-ons" right="Optional" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)' }}>
              {BK_TAN_ADDONS.map(function(s) {
                return <BkServiceRow key={s.id} service={s} active={!!addons.find(function(x) { return x.id === s.id; })} onClick={function() { toggleAddon(s); }} prefix="+" />;
              })}
            </div>
          </>)}
        </>)}

        {/* Wax */}
        {category === 'wax' && BK_WAX_GROUPS.map(function(group) {
          return (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '10px 0 4px', borderTop: '1px solid var(--rule)' }}>
                {group.label}
                {group.note && <span style={{ opacity: 0.55, fontStyle: 'italic', textTransform: 'none', letterSpacing: '0.09em', marginLeft: 8 }}>· {group.note}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)' }}>
                {group.items.map(function(s) {
                  return <BkServiceRow key={s.id} service={s} active={!!selected.find(function(x) { return x.id === s.id; })} onClick={function() { toggleMain(s); }} />;
                })}
              </div>
            </div>
          );
        })}

        {ctaPortal}
      </div>
    );
  }

  // ── Step: Date & time ──────────────────────────────────────────────────────

  function StepDatetime(props) {
    var { useState, useRef, useEffect } = React;
    var category = props.category;
    var duration = bkTotalDuration(props.services);
    var today    = bkTodayPacific();

    // First available day: today if open, otherwise the next open day
    function firstAvailable() {
      var hrs = bkHoursForCategory(category);
      for (var i = 0; i <= 60; i++) {
        var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        if (hrs[d.getDay()]) return d;
      }
      return today;
    }

    var defDate = firstAvailable();
    var [selectedDate,  setSelectedDate]  = useState(defDate);
    var [selectedTime,  setSelectedTime]  = useState(null);
    var [viewMonth,     setViewMonth]     = useState(defDate.getMonth());
    var [viewYear,      setViewYear]      = useState(defDate.getFullYear());
    var [bookedRanges,  setBookedRanges]  = useState([]);
    var [loadingSlots,  setLoadingSlots]  = useState(true);

    // Fetch real availability whenever the selected date or category changes
    useEffect(function() {
      var staff    = category === 'barber' ? 'eric' : 'livi';
      var endpoint = window.__booking && window.__booking.endpoint;
      if (!endpoint) { setLoadingSlots(false); return; } // dev — show all slots open

      var dateStr = selectedDate.getFullYear() + '-' +
                    String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(selectedDate.getDate()).padStart(2, '0');

      var url = endpoint.replace(/\/booking\/create$/, '') +
                '/booking/availability?date=' + dateStr + '&staff=' + staff;

      var cancelled = false;
      setLoadingSlots(true);
      setBookedRanges([]);
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) { if (!cancelled) setBookedRanges(data.bookedRanges || []); })
        .catch(function()    { if (!cancelled) setBookedRanges([]); })
        .finally(function()  { if (!cancelled) setLoadingSlots(false); });
      return function() { cancelled = true; };
    }, [selectedDate.toDateString(), category]);

    var slots   = loadingSlots ? [] : bkAvailableSlots(selectedDate, duration, category, bookedRanges);
    var todayMs = today.getTime();

    // Filter out past time slots when viewing today (Pacific time)
    if (selectedDate.toDateString() === today.toDateString()) {
      var pacParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Vancouver', hour: 'numeric', minute: 'numeric', hour12: false
      }).formatToParts(new Date());
      var nowMins = (parseInt(pacParts.find(function(p) { return p.type === 'hour'; }).value, 10) % 24) * 60
                 + parseInt(pacParts.find(function(p) { return p.type === 'minute'; }).value, 10);
      slots = slots.filter(function(s) { return s.h * 60 + s.m > nowMins; });
    }

    // Limit bookable window to 60 days out
    var maxMs   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60).getTime();

    // Scroll CTA into view when a time is selected
    var ctaRef  = useRef(null);
    var timeKey = selectedTime ? selectedTime.h * 100 + selectedTime.m : null;
    useEffect(function() {
      if (!timeKey || !ctaRef.current) return;
      var embed = ctaRef.current.closest('.booking-embed');
      var scroller = embed && embed.closest('.cpanel');
      setTimeout(function() {
        if (embed && scroller) {
          var chromeEl  = document.querySelector('.chrome-top');
          var clearance = chromeEl ? chromeEl.getBoundingClientRect().bottom + 16 : 120;
          var top = embed.getBoundingClientRect().top
                    - scroller.getBoundingClientRect().top
                    + scroller.scrollTop
                    - clearance;
          scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
      }, 60);
    }, [timeKey]);

    var DAY_HDRS    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

    function pickDate(d) { setSelectedDate(d); setSelectedTime(null); setBookedRanges([]); }

    function goPrev() {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
      else setViewMonth(viewMonth - 1);
    }
    function goNext() {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
      else setViewMonth(viewMonth + 1);
    }

    // Build 7-column grid: leading nulls, Date objects, trailing nulls to fill last row
    function buildGrid() {
      var firstDow    = new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var cells = [];
      for (var p = 0; p < firstDow; p++) cells.push(null);
      for (var n = 1; n <= daysInMonth; n++) cells.push(new Date(viewYear, viewMonth, n));
      while (cells.length % 7 !== 0) cells.push(null);
      return cells;
    }

    var cells   = buildGrid();
    var canPrev = viewYear > today.getFullYear() ||
                  (viewYear === today.getFullYear() && viewMonth > today.getMonth());

    var navBtn = {
      appearance: 'none', border: 'none', background: 'none',
      padding: '4px 10px', lineHeight: 1, cursor: 'pointer',
      fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 20,
      color: 'var(--ink-soft)',
    };

    return (
      <div>
        <BkBack onClick={props.onBack} />
        <BkEyebrow left="Choose a date" />

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={goPrev} disabled={!canPrev}
            style={Object.assign({}, navBtn, { opacity: canPrev ? 1 : 0.2, cursor: canPrev ? 'pointer' : 'default' })}>
            ←
          </button>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 20, letterSpacing: '-0.01em' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={goNext} style={navBtn}>→</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DAY_HDRS.map(function(h) {
            return (
              <span key={h} style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '2px 0 6px' }}>
                {h}
              </span>
            );
          })}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 28 }}>
          {cells.map(function(d, i) {
            if (!d) return <span key={i} />;
            var dMs      = d.getTime();
            var isPast   = dMs < todayMs;
            var isFar    = dMs > maxMs;
            var isClosed = !bkHoursForCategory(category)[d.getDay()];
            var isOff    = isPast || isFar || isClosed;
            var isSel    = selectedDate && d.toDateString() === selectedDate.toDateString();
            var isToday  = d.toDateString() === today.toDateString();
            return (
              <button key={i}
                onClick={function() { if (!isOff) pickDate(d); }}
                disabled={isOff}
                style={{
                  padding: '10px 2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSel ? 'var(--ink)' : 'transparent',
                  color: isSel ? 'var(--bg)' : isOff ? 'var(--ink-faint)' : 'var(--ink)',
                  border: isToday && !isSel ? '1px solid var(--ink-soft)' : '1px solid transparent',
                  borderRadius: 2,
                  opacity: isOff ? 0.28 : 1,
                  cursor: isOff ? 'default' : 'pointer',
                  fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, lineHeight: 1,
                  transition: 'background 0.15s ease',
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        <BkEyebrow
          left={'Available · ' + bkFmtDate(selectedDate)}
          right={loadingSlots ? 'Checking…' : null}
        />
        {loadingSlots
          ? <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Checking availability…</p>
          : slots.length === 0
            ? <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>No slots available.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 28 }}>
                {slots.map(function(slot, i) {
                  var isSel = selectedTime && selectedTime.h === slot.h && selectedTime.m === slot.m;
                  return (
                    <button key={i}
                      onClick={function() { setSelectedTime(slot); }}
                      style={{
                        padding: '11px 4px',
                        background: isSel ? 'var(--ink)' : 'var(--bg)',
                        color:      isSel ? 'var(--bg)' : 'var(--ink)',
                        border:     isSel ? '1px solid transparent' : '1px solid var(--rule)',
                        borderRadius: 2, cursor: 'pointer',
                        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.04em',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {bkFmtTime(slot.h, slot.m)}
                    </button>
                  );
                })}
              </div>
            )
        }

        {selectedTime && (
          <div ref={ctaRef}>
            <BkBtn onClick={function() { props.onNext(selectedDate, selectedTime); }}>
              Continue to your info
            </BkBtn>
          </div>
        )}
      </div>
    );
  }

  // ── Step: Client info ──────────────────────────────────────────────────────

  function StepClient(props) {
    var { useState } = React;
    var saved    = props.savedContacts || [];
    var hasSaved = saved.length > 0;

    var [showPicker, setShowPicker] = useState(hasSaved);
    var [form,       setForm]       = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
    var [errors,     setErrors]     = useState({});

    function pickSaved(c) {
      setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, notes: '' });
      setErrors({});
      setShowPicker(false);
    }

    function pickNew() {
      setForm({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
      setErrors({});
      setShowPicker(false);
    }

    function update(k, v) {
      setForm(function(f) { var n = Object.assign({}, f); n[k] = v; return n; });
      if (errors[k]) setErrors(function(e) { var n = Object.assign({}, e); n[k] = null; return n; });
    }

    function validate() {
      var e = {};
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim())  e.lastName  = 'Required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
      if (!form.phone.trim())     e.phone     = 'Required';
      setErrors(e);
      return Object.keys(e).length === 0;
    }

    var labelSt = { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', display: 'block', marginBottom: 6 };
    var fieldSt = function(k) { return {
      width: '100%', padding: '12px 0', background: 'transparent',
      border: 'none', borderBottom: '1px solid ' + (errors[k] ? 'var(--accent)' : 'var(--rule)'),
      fontFamily: 'var(--body)', fontSize: 16, color: 'var(--ink)', outline: 'none',
    }; };
    var errSt = { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', display: 'block', marginTop: 4 };

    return (
      <div>
        <BkBack onClick={props.onBack} />
        <BkEyebrow left="Your details" />

        {/* ── Contact picker ─────────────────────────────────────────────── */}
        {showPicker ? (
          <div>
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(24px,4vw,34px)', margin: '0 0 22px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              Who's booking?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', marginBottom: 20 }}>
              {saved.map(function(c) {
                return (
                  <button
                    key={c.firstName + c.lastName + c.phone}
                    onClick={function() { pickSaved(c); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 4px', background: 'var(--bg)', border: 'none',
                      borderLeft: '2px solid transparent', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={function(e) { e.currentTarget.style.background = 'var(--paper)'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = 'var(--bg)'; }}
                  >
                    <span>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 400, display: 'block', lineHeight: 1.2 }}>
                        {c.firstName} {c.lastName}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-faint)', display: 'block', marginTop: 3 }}>
                        {c.phone}{c.email ? '  ·  ' + c.email : ''}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-soft)', paddingRight: 4 }}>→</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={pickNew}
              style={{
                width: '100%', padding: '14px', background: 'transparent',
                border: '1px dashed var(--rule)', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--ink-faint)',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={function(e) { e.currentTarget.style.borderColor = 'var(--ink-soft)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
              onMouseLeave={function(e) { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink-faint)'; }}
            >
              + Book for someone new
            </button>
          </div>
        ) : (
          /* ── Contact form ──────────────────────────────────────────────── */
          <div>
            {hasSaved && (
              <button
                onClick={function() { setShowPicker(true); }}
                style={{ appearance: 'none', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22 }}
              >
                ← Change
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={{ marginBottom: 22 }}>
                <label style={labelSt}>First name</label>
                <input className="bk-input" style={fieldSt('firstName')} value={form.firstName} onChange={function(e) { update('firstName', e.target.value); }} placeholder="First" />
                {errors.firstName && <span style={errSt}>{errors.firstName}</span>}
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={labelSt}>Last name</label>
                <input className="bk-input" style={fieldSt('lastName')} value={form.lastName} onChange={function(e) { update('lastName', e.target.value); }} placeholder="Last" />
                {errors.lastName && <span style={errSt}>{errors.lastName}</span>}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={labelSt}>Email</label>
              <input className="bk-input" style={fieldSt('email')} type="email" value={form.email} onChange={function(e) { update('email', e.target.value); }} placeholder="you@example.com" />
              {errors.email && <span style={errSt}>{errors.email}</span>}
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={labelSt}>Phone</label>
              <input className="bk-input" style={fieldSt('phone')} type="tel" value={form.phone} onChange={function(e) { update('phone', e.target.value); }} placeholder="250 555 0100" />
              {errors.phone && <span style={errSt}>{errors.phone}</span>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Notes <span style={{ opacity: 0.5, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
              <textarea className="bk-input" style={Object.assign({}, fieldSt('notes'), { resize: 'none', height: 68, lineHeight: 1.5 })} value={form.notes} onChange={function(e) { update('notes', e.target.value); }} placeholder="Anything we should know before your appointment?" />
            </div>

            {/* Sticky CTA — floats at the bottom of the scroll container */}
            <div style={{ position: 'sticky', bottom: 52, background: 'var(--bg)', marginTop: 4 }}>
              <BkBtn onClick={function() { if (validate()) props.onNext(form); }}>Continue</BkBtn>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step: Waiver ───────────────────────────────────────────────────────────

  function StepWaiver(props) {
    var { useState } = React;
    var [agreed, setAgreed] = useState(false);
    var category = props.category;

    var waiver = category === 'tan' ? BK_WAIVERS.tan : BK_WAIVERS.wax;
    var text = waiver.text;
    var checkboxLabel = waiver.checkboxLabel;

    return (
      <div>
        <BkBack onClick={props.onBack} />
        <BkEyebrow left="Service waiver" right="Read carefully" />
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(24px,4vw,32px)', margin: '0 0 18px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          Before we confirm.
        </h3>
        <p style={{ fontFamily: 'var(--body)', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-soft)', marginBottom: 28, maxWidth: '56ch' }}>{text}</p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', marginBottom: 28 }}
          onClick={function() { setAgreed(function(a) { return !a; }); }}>
          <span style={{
            flex: '0 0 auto', width: 20, height: 20, borderRadius: 2, marginTop: 1,
            border: '1px solid ' + (agreed ? 'var(--ink)' : 'var(--rule)'),
            background: agreed ? 'var(--ink)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}>
            {agreed && <span style={{ color: 'var(--bg)', fontSize: 12, lineHeight: 1, fontWeight: 700 }}>✓</span>}
          </span>
          <span style={{ fontFamily: 'var(--body)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)', userSelect: 'none' }}>
            {checkboxLabel}
          </span>
        </label>

        <BkBtn onClick={function() {
          if (agreed) {
            if (props.client && props.client.phone) {
              bkSaveWaiverSigning(props.client.phone, category);
            }
            props.onNext();
          }
        }} disabled={!agreed}>
          Review booking
        </BkBtn>
      </div>
    );
  }

  // ── Step: Confirm ──────────────────────────────────────────────────────────

  function StepConfirm(props) {
    var all   = props.services.concat(props.addons);
    var total = bkTotalPrice(all);
    var dur   = bkTotalDuration(all);

    var ROW = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid var(--rule)' };

    return (
      <div>
        <BkBack onClick={props.onBack} />
        <BkEyebrow left="Review your booking" />
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(24px,4vw,32px)', margin: '0 0 22px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          Looks good?
        </h3>

        {/* Summary card */}
        <div style={{ border: '1px solid var(--rule)', padding: '0 20px', marginBottom: 20 }}>
          <div style={ROW}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Date + time</span>
            <span style={{ fontFamily: 'var(--body)', fontSize: 14 }}>{bkFmtDate(props.date)} · {bkFmtTime(props.time.h, props.time.m)}</span>
          </div>
          {all.map(function(s) {
            return (
              <div key={s.id} style={ROW}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 17, letterSpacing: '-0.005em' }}>{s.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.04em' }}>{bkFmtPrice(s.price)}</span>
              </div>
            );
          })}
          <div style={Object.assign({}, ROW, { borderBottom: 'none', paddingTop: 14 })}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{dur} min total</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16 }}>{bkFmtPrice(total)}</span>
          </div>
        </div>

        {/* Client info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', marginBottom: 24, padding: '16px 0', borderTop: '1px solid var(--rule)' }}>
          {[['Name', props.client.firstName + ' ' + props.client.lastName, true], ['Email', props.client.email, false], ['Phone', props.client.phone, false]].map(function(row) {
            return (
              <div key={row[0]} style={{ gridColumn: row[2] ? 'span 2' : undefined }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>{row[0]}</div>
                <div style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink)' }}>{row[1]}</div>
              </div>
            );
          })}
        </div>

        {props.error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 14, lineHeight: 1.5 }}>{props.error}</p>
        )}

        <BkBtn onClick={props.onConfirm} disabled={props.submitting}>
          {props.submitting ? 'Sending…' : 'Confirm booking'}
        </BkBtn>

        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-faint)', textAlign: 'center', marginTop: 14, lineHeight: 1.65, textTransform: 'uppercase' }}>
          No payment required today. We'll confirm by email.
        </p>
      </div>
    );
  }

  // ── Step: Done ─────────────────────────────────────────────────────────────

  function StepDone(props) {
    var total    = bkTotalPrice(props.services);
    var dur      = bkTotalDuration(props.services);
    var ROW      = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0', borderBottom: '1px solid var(--rule)' };

    // Derive manage URL from the booking endpoint base
    var manageUrl = null;
    if (props.manageToken) {
      var endpoint = window.__booking && window.__booking.endpoint;
      var base = endpoint ? endpoint.replace(/\/api\/booking\/create$/, '') : '';
      manageUrl = base + '/booking/manage/' + props.manageToken;
    }

    // .ics data URL — works with Apple Calendar, Google Calendar, Outlook, and all others
    function calICS() {
      var d = props.date;
      function pad2(n) { return String(n).padStart(2, '0'); }
      var ymd    = d.getFullYear() + '' + pad2(d.getMonth() + 1) + '' + pad2(d.getDate());
      var hStart = pad2(props.time.h) + pad2(props.time.m) + '00';
      var endMin = props.time.h * 60 + props.time.m + (dur || 60);
      var hEnd   = pad2(Math.floor(endMin / 60)) + pad2(endMin % 60) + '00';
      var stamp  = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
      var uid    = 'booking-' + Date.now() + '@editstudio.space';
      var svcNames = props.services.map(function(s) { return s.name; }).join(', ');
      var desc   = manageUrl ? 'Manage your booking: ' + manageUrl : 'editstudio.space';
      var ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Edit Studio//Booking//EN',
        'BEGIN:VEVENT',
        'UID:' + uid,
        'DTSTAMP:' + stamp,
        'DTSTART:' + ymd + 'T' + hStart,
        'DTEND:' + ymd + 'T' + hEnd,
        'SUMMARY:Edit Studio — ' + svcNames,
        'LOCATION:1846 Oak Bay Avenue\\, Victoria BC',
        'DESCRIPTION:' + desc,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    }

    var linkSt = {
      display: 'block', width: '100%', padding: '14px 20px',
      boxSizing: 'border-box',
      border: '1px solid var(--rule)', background: 'transparent',
      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'var(--ink-soft)',
      textDecoration: 'none', textAlign: 'center', cursor: 'pointer',
    };

    return (
      <div style={{ paddingBottom: 24 }}>
        {/* Header */}
        <div style={{ paddingTop: 32, paddingBottom: 24, borderBottom: '1px solid var(--rule)', marginBottom: 24 }}>
          {/* Large confirmation mark */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'oklch(0.58 0.13 150)', marginBottom: 22 }}>
            <span style={{ color: '#fff', fontSize: 28, lineHeight: 1, fontWeight: 300 }}>✓</span>
          </div>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(32px,6vw,52px)', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1 }}>
            You're booked.
          </h3>
          <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 6px', lineHeight: 1.5 }}>
            Confirmation sent to <strong style={{ color: 'var(--ink)' }}>{props.client.email}</strong>
          </p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'oklch(0.58 0.13 150)', margin: 0 }}>
            Booking confirmed
          </p>
        </div>

        {/* Booking summary */}
        <div style={{ marginBottom: 24 }}>
          <div style={ROW}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Date + time</span>
            <span style={{ fontFamily: 'var(--body)', fontSize: 14 }}>{bkFmtDate(props.date)} · {bkFmtTime(props.time.h, props.time.m)}</span>
          </div>
          {props.services.map(function(s) {
            return (
              <div key={s.id} style={ROW}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 17, letterSpacing: '-0.005em' }}>{s.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.04em' }}>{bkFmtPrice(s.price)}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{dur} min total</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 15 }}>{bkFmtPrice(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {manageUrl && (
            <a href={manageUrl} style={linkSt}>
              Manage or cancel booking →
            </a>
          )}
          <a href={calICS()} download="edit-studio-booking.ics" style={linkSt}>
            Add to calendar →
          </a>
        </div>

        <button onClick={props.onReset}
          style={{ appearance: 'none', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', borderBottom: '1px solid var(--rule)', paddingBottom: 2 }}>
          Book another appointment
        </button>
      </div>
    );
  }

  // ── Main component ─────────────────────────────────────────────────────────

  function BookingEmbed(props) {
    var { useState, useRef, useEffect } = React;
    var categoryProp = props.category || null;

    var [step,         setStep]         = useState(categoryProp ? 'service' : 'category');
    var [category,     setCategory]     = useState(categoryProp);
    var [services,     setServices]     = useState([]);
    var [addons,       setAddons]       = useState([]);
    var [date,         setDate]         = useState(null);
    var [time,         setTime]         = useState(null);
    var [client,       setClient]       = useState(null);
    var [submitting,   setSubmitting]   = useState(false);
    var [error,        setError]        = useState(null);
    var [manageToken,  setManageToken]  = useState(null);
    // prefillActive: true when a "Next available" CTA pre-selected the date+time
    var [prefillActive, setPrefillActive] = useState(false);
    // Saved contacts from localStorage — loaded once on mount
    var [savedContacts, setSavedContacts] = useState(function() { return bkLoadContacts(); });

    // Approximate progress for the thin bar
    var PROGRESS = { category: 0, service: 0.15, datetime: 0.38, client: 0.58, waiver: 0.75, confirm: 0.88, done: 1 };
    var progress = PROGRESS[step] || 0;

    var catLabel = category === 'barber' ? 'Barbering' : category === 'tan' ? 'Sunless' : category === 'wax' ? 'Waxing' : 'Book now';

    function needsWaiver(cat, clientInfo) {
      if (cat !== 'tan' && cat !== 'wax') return false;
      var cfg = cat === 'tan' ? BK_WAIVERS.tan : BK_WAIVERS.wax;
      if (!cfg.enabled) return false;
      // Skip if client already signed within the last year
      if (clientInfo && clientInfo.phone && bkHasSignedWaiver(clientInfo.phone, cat)) return false;
      return true;
    }

    async function handleConfirm() {
      setSubmitting(true);
      setError(null);
      try {
        var endpoint = window.__booking && window.__booking.endpoint;
        if (endpoint) {
          var res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category, services: services, addons: addons, date: date.toISOString(), time: time, client: client }),
          });
          if (!res.ok) throw new Error('Booking failed. Please try again or call us at 778 535 3348.');
          var data = await res.json();
          if (data.manageToken) setManageToken(data.manageToken);
        } else {
          // No endpoint yet — simulate delay then show done
          await new Promise(function(r) { setTimeout(r, 1100); });
        }
        // Save contact to localStorage so they're pre-filled next time
        bkSaveContact(client);
        setSavedContacts(bkLoadContacts());
        setStep('done');
      } catch (e) {
        setError(e.message || 'Something went wrong. Please call 778 535 3348.');
      } finally {
        setSubmitting(false);
      }
    }

    function reset() {
      setStep(categoryProp ? 'service' : 'category');
      setCategory(categoryProp);
      setServices([]); setAddons([]);
      setDate(null); setTime(null); setClient(null);
      setError(null); setPrefillActive(false); setManageToken(null);
    }

    var embedRef   = useRef(null);
    var mountedRef = useRef(false);

    // Listen for goto-booking events with prefill data from the "Next available" CTA.
    // Sets date + time in state and jumps to service selection, skipping the date picker.
    useEffect(function() {
      function onGoto(e) {
        var p = e && e.detail && e.detail.prefill;
        if (!p || !p.dateStr || p.h == null) return;
        // Only apply to barber embeds (the CTA is barber-only)
        if (categoryProp && categoryProp !== 'barber') return;
        var parts = p.dateStr.split('-').map(Number);
        var d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!categoryProp) setCategory('barber');
        setDate(d);
        setTime({ h: p.h, m: p.m || 0 });
        setPrefillActive(true);
        setStep('service');
      }
      window.addEventListener('edit-studio:goto-booking', onGoto);
      return function() { window.removeEventListener('edit-studio:goto-booking', onGoto); };
    }, [categoryProp]);

    // Scroll the embed's top into view when the step changes (not on initial mount).
    // Scroll the embed into view when the step changes, clearing the chrome-top header.
    // scrollIntoView({ block:'start' }) would land the embed directly under the logo —
    // instead we manually offset by the chrome-top's actual rendered height.
    useEffect(function() {
      if (!mountedRef.current) { mountedRef.current = true; return; }
      var el = embedRef.current;
      if (!el) return;
      setTimeout(function() {
        if (!el) return;
        var scroller = el.closest('.cpanel');
        var chromeEl  = document.querySelector('.chrome-top');
        var clearance = chromeEl ? chromeEl.getBoundingClientRect().bottom + 16 : 120;
        if (scroller) {
          var top = el.getBoundingClientRect().top
                    - scroller.getBoundingClientRect().top
                    + scroller.scrollTop
                    - clearance;
          scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
    }, [step]);

    return (
      <div ref={embedRef} className="booking-embed">
        {/* Header bar — shown on all steps except initial category selection and done */}
        {step !== 'category' && step !== 'done' && (
          <div className="booking-head">
            <span className="booking-eyebrow">{catLabel}</span>
            <div className="booking-progress">
              <div className="booking-progress-fill" style={{ width: (progress * 100) + '%' }} />
            </div>
          </div>
        )}

        <div className="booking-body">
          {step === 'category' && (
            <StepCategory onSelect={function(cat) { setCategory(cat); setStep('service'); }} />
          )}
          {step === 'service' && (
            <StepService
              category={category}
              prefillSlot={prefillActive && date && time ? { date: date, time: time } : null}
              onClearPrefill={function() { setPrefillActive(false); setDate(null); setTime(null); }}
              onNext={function(svcs, adds) {
                setServices(svcs); setAddons(adds);
                // Skip date/time picker when a slot was pre-selected via the CTA
                setStep(prefillActive ? 'client' : 'datetime');
              }}
              onBack={categoryProp ? null : function() { setStep('category'); }}
            />
          )}
          {step === 'datetime' && (
            <StepDatetime
              category={category}
              services={services.concat(addons)}
              onNext={function(d, t) { setDate(d); setTime(t); setStep('client'); }}
              onBack={function() { setStep('service'); }}
            />
          )}
          {step === 'client' && (
            <StepClient
              savedContacts={savedContacts}
              onNext={function(info) { setClient(info); setStep(needsWaiver(category, info) ? 'waiver' : 'confirm'); }}
              onBack={function() { setStep(prefillActive ? 'service' : 'datetime'); }}
            />
          )}
          {step === 'waiver' && (
            <StepWaiver
              category={category}
              client={client}
              onNext={function() { setStep('confirm'); }}
              onBack={function() { setStep('client'); }}
            />
          )}
          {step === 'confirm' && (
            <StepConfirm
              category={category}
              services={services}
              addons={addons}
              date={date}
              time={time}
              client={client}
              onConfirm={handleConfirm}
              onBack={function() { setStep(needsWaiver(category, client) ? 'waiver' : 'client'); }}
              submitting={submitting}
              error={error}
            />
          )}
          {step === 'done' && (
            <StepDone
              client={client}
              date={date}
              time={time}
              services={services.concat(addons)}
              manageToken={manageToken}
              onReset={reset}
            />
          )}
        </div>
      </div>
    );
  }

  // Shared helpers used by app.jsx for the "Next available" barber CTA.
  // bkAvailableSlots already closes over BK_HOURS and BK_BARBER_THU_CLOSE.
  window.__bk = {
    availableSlots: bkAvailableSlots,
    fmtTime: bkFmtTime,
    todayPacific: bkTodayPacific,
  };

  window.BookingEmbed = BookingEmbed;

})();
