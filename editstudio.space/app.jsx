// app.jsx — main shell. Horizontal swipe = service. Vertical swipe = info.

const { useState, useEffect, useRef, useCallback } = React;

const SERVICES_DEF = {
  home: { id: 'home', label: 'Edit Studio', num: '00', accent: 'oklch(0.32 0.04 30)', hint: 'A salon, edited.' },
  barber: { id: 'barber', label: 'Barbering', num: '01', accent: 'oklch(0.42 0.12 25)', hint: 'Cuts · shaves · beard work' },
  tan: { id: 'tan', label: 'Sunless', num: '02', accent: 'oklch(0.68 0.14 65)', hint: 'Custom-blended spray tans' },
  wax: { id: 'wax', label: 'Waxing', num: '03', accent: 'oklch(0.62 0.12 18)', hint: 'Brow · body · ritual' },
  lashes: { id: 'lashes', label: 'Lashes', num: '04', accent: 'oklch(0.55 0.13 290)', hint: 'Lashes · lifts · brows' },
  visit: { id: 'visit', label: 'Visit', num: '05', accent: 'oklch(0.32 0.04 30)', hint: 'Hours · FAQ · the shelf' }
};

const ANIM_FOR = {
  home: 'HomeAura',
  barber: 'BarberAnim',
  tan: 'TanAnim',
  wax: 'WaxAnim',
  lashes: 'HomeAnim',
  visit: 'HomeAnim'
};

const HERO_FOR = {
  home: {
    h1: <>You<br />Found <em className="it">Us</em>.</>,
    sub: '',
    cta: 'Tap a service · pull down for details'
  },
  barber: {
    h1: <>Refined.<br />Intentional.<br /><em className="it">Crisp</em>.</>,
    sub: 'Precision cuts, down to every last detail. Late night availability.',
    cta: 'Pull down for menu'
  },
  tan: {
    h1: <>Golden hour, <em className="it">on demand</em>.</>,
    sub: "Skip the skin damage of UV tans and find out why luxury airbrush spray tans are everyone's new obsession.",
    cta: 'Pull down for menu'
  },
  wax: {
    h1: <>Smooth, <em className="it">sorted</em>.</>,
    sub: 'Specializing in Brazilians, brows and full body waxing with a gentle yet thorough technique.',
    cta: 'Pull down for menu'
  },
  lashes: {
    h1: <>Eyes, <em className="it">elevated</em>.</>,
    sub: 'Lash extensions, lifts and brow services — tailored to your eye shape with a careful, gentle hand.',
    cta: 'Pull down for menu'
  },
  visit: {
    h1: <>Come <em className="it">visit</em>.</>,
    sub: 'Oak Bay Avenue. We made the room we wanted to spend time in. Walk in if we have it; book ahead if you can.',
    cta: 'Pull down for hours · FAQ'
  }
};

function AnnouncementStrip({ message, targetLabel, dismissed, styleVariant, onJump, onDismiss }) {
  if (!message || dismissed) return null;
  return (
    <div className="announce" data-style={styleVariant || 'lime'} role="status" aria-live="polite">
      <button
        type="button"
        className="announce-body"
        onClick={onJump}
        aria-label={`${message} — jump to booking`}
      >
        <span className="announce-dot" aria-hidden="true" />
        <span className="announce-text">{message}</span>
        <span className="announce-arr" aria-hidden="true">↓</span>
      </button>
      <button
        type="button"
        className="announce-close"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
      >
        ×
      </button>
    </div>
  );
}

// Commit-on-blur text input — useful for tweak fields where rapid onChange
// floods the host's file rewriter. Fires onCommit only when the user blurs
// or presses Enter, so the disk write is a single event per edit.
function CommitText({ label, value, placeholder, onCommit }) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  const commit = () => { if (local !== value) onCommit(local); };
  return (
    <window.TweakRow label={label}>
      <input
        className="twk-field"
        type="text"
        value={local || ''}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    </window.TweakRow>
  );
}

function ChromeTop({ active, total, idx, logoSrc }) {
  return (
    <div className="chrome-top">
      <div className="lockup">
        <img src={logoSrc} alt="Edit Studio" className="lockup-logo" />
      </div>
      <div className="meta">
        <span>{active.label}</span>
        <a
          className="chrome-ig"
          href="https://www.instagram.com/editstudiospace/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Edit Studio on Instagram — @editstudiospace">
          <span className="chrome-ig-label">@editstudiospace</span>
          <span className="chrome-ig-arr" aria-hidden="true">{'↗︎'}</span>
        </a>
      </div>
    </div>);

}

// Sticky top pill nav — labelled, tappable chips so every page is one tap away
// and the current page is always clear. Only shown on the hero (hidden once the
// user scrolls into a service's content, mirroring the bottom chrome).
function ChromeNav({ services, idx, onSelect }) {
  return (
    <nav className="chrome-nav" aria-label="Services">
      <div className="chrome-nav-track">
        {services.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`navpill ${i === idx ? 'active' : ''}`}
            aria-current={i === idx ? 'page' : undefined}
            onClick={() => onSelect(i)}
          >
            {s.id === 'home' ? 'Home' : s.label}
          </button>
        ))}
      </div>
    </nav>);

}

// Studio hours, by JS day-of-week (0 = Sunday). null = closed.
// Mutated async from admin config — kept as const object so closures stay live.
const STUDIO_HOURS = {
  0: [10, 18], // Sun
  1: null,     // Mon — closed
  2: null,     // Tue — closed
  3: [10, 18], // Wed
  4: [10, 18], // Thu
  5: [10, 18], // Fri
  6: [10, 18]  // Sat
};

// Per-staff hours for NextAvailableBarber — starts as shared hours, updated async.
const ERIC_HOURS = { ...STUDIO_HOURS };

// Fetch current hours and update STUDIO_HOURS (Open/Closed) and ERIC_HOURS
// (NextAvailableBarber) in place so they reflect any admin changes after page load.
(function () {
  const endpoint = (window.__booking || {}).endpoint || '';
  const base = endpoint.replace(/\/api\/booking\/create$/, '') || window.location.origin;
  if (!base) return;
  fetch(base + '/api/booking/hours')
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if (!cfg) return;
      // Update store hours for Open/Closed indicator
      if (cfg.days) {
        for (let d = 0; d <= 6; d++) {
          const v = cfg.days[d] ?? cfg.days[String(d)];
          STUDIO_HOURS[d] = Array.isArray(v) ? v : null;
        }
      }
      // Update Eric's schedule for NextAvailableBarber
      const ericDays = cfg.staff?.eric?.days;
      if (ericDays) {
        for (let d = 0; d <= 6; d++) {
          const v = ericDays[d] ?? ericDays[String(d)];
          ERIC_HOURS[d] = Array.isArray(v) ? v : null;
        }
      }
    })
    .catch(() => {});
})();

function computeStudioStatus() {
  // Always evaluate in Pacific time — site is local-business, not visitor-local.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  const wmap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = wmap[get('weekday')];
  // formatToParts may return "24" for midnight under hour12:false — normalize.
  const hour = parseInt(get('hour'), 10) % 24;
  const minute = parseInt(get('minute'), 10);
  const mins = hour * 60 + minute;
  const today = STUDIO_HOURS[dow];
  if (today && mins >= today[0] * 60 && mins < today[1] * 60) {
    return { open: true, closes: today[1] };
  }
  // If today has hours but we're before opening time, say "opens today".
  if (today && mins < today[0] * 60) {
    return { open: false, opens: today[0], day: 'today' };
  }
  // Walk forward to next open day.
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let i = 1; i <= 7; i++) {
    const nd = (dow + i) % 7;
    const h = STUDIO_HOURS[nd];
    if (h) {
      return {
        open: false,
        opens: h[0],
        day: i === 1 ? 'tomorrow' : dayNames[nd]
      };
    }
  }
  return { open: false };
}

function formatStudioHour(h) {
  const period = h >= 12 ? 'pm' : 'am';
  const display = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${display}${period}`;
}

function OpenStatus() {
  const [status, setStatus] = useState(() => computeStudioStatus());
  useEffect(() => {
    // Re-check at the top of each minute so transitions feel live.
    const tick = () => setStatus(computeStudioStatus());
    const now = new Date();
    const msToNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    const startId = setTimeout(() => {
      tick();
      const intervalId = setInterval(tick, 60000);
      // stash on window so cleanup can clear it
      window.__studioStatusInterval = intervalId;
    }, msToNextMinute);
    return () => {
      clearTimeout(startId);
      if (window.__studioStatusInterval) {
        clearInterval(window.__studioStatusInterval);
        window.__studioStatusInterval = null;
      }
    };
  }, []);

  if (status.open) {
    return (
      <div className="open-status open" role="status" aria-label={`Open now, closes at ${formatStudioHour(status.closes)}`}>
        <span className="open-dot" aria-hidden="true" />
        <span className="open-label">Open Now</span>
        <span className="open-sep" aria-hidden="true">·</span>
        <span className="open-meta">Closes {formatStudioHour(status.closes)}</span>
      </div>);
  }
  return (
    <div className="open-status closed" role="status" aria-label={status.opens != null ? `Closed. Opens ${status.day} at ${formatStudioHour(status.opens)}` : 'Closed'}>
      <span className="open-dot" aria-hidden="true" />
      <span className="open-label">Closed</span>
      {status.opens != null &&
      <>
          <span className="open-sep" aria-hidden="true">·</span>
          <span className="open-meta">Opens {status.day} {formatStudioHour(status.opens)}</span>
        </>
      }
    </div>);

}

const PILL_COLORS = {
  home:   { background: '#1a1714', color: '#f5f0e8' },
  barber: { background: '#1a1714', color: '#f5f0e8' },
  tan:    { background: '#1a1714', color: '#f5f0e8' },
  wax:    { background: '#1a1714', color: '#f5f0e8' },
  lashes: { background: '#1a1714', color: '#f5f0e8' },
  visit:  { background: '#1a1714', color: '#f5f0e8' },
};

// ── Next available slot CTA (barber page only) ─────────────────
// Fetches today's (or nearest upcoming) open slot for Eric and renders
// a live pill: "● Next available · 2:45 pm →"
function NextAvailableBarber() {
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'none'
  const [slot,  setSlot]  = useState(null);

  useEffect(() => {
    const endpoint = window.__booking && window.__booking.endpoint;
    const bk = window.__bk;
    if (!endpoint || !bk) { setState('none'); return; }

    let cancelled = false;

    async function findNext() {
      // Current Pacific time in minutes-from-midnight
      const pacParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Vancouver', hour: 'numeric', minute: 'numeric', hour12: false
      }).formatToParts(new Date());
      const nowMins = (parseInt(pacParts.find(p => p.type === 'hour').value, 10) % 24) * 60
                    + parseInt(pacParts.find(p => p.type === 'minute').value, 10);

      const today = bk.todayPacific();

      for (let i = 0; i < 8; i++) {
        if (cancelled) return;
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        if (!ERIC_HOURS[d.getDay()]) continue; // Eric not working

        const dateStr = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        const url = endpoint.replace(/\/booking\/create$/, '') +
          '/booking/availability?date=' + dateStr + '&staff=eric';

        try {
          const res = await fetch(url);
          if (!res.ok) { setState('none'); return; }
          const data = await res.json();
          let slots = bk.availableSlots(d, 45, 'barber', data.bookedRanges || []);

          // For today, only show slots that haven't already started
          if (i === 0) slots = slots.filter(s => s.h * 60 + s.m > nowMins);

          if (slots.length > 0) {
            if (!cancelled) {
              setSlot({ dateStr, isToday: i === 0, isTomorrow: i === 1, dow: d.getDay(), ...slots[0] });
              setState('ready');
            }
            return;
          }
        } catch (_) {
          if (!cancelled) setState('none');
          return;
        }
      }
      if (!cancelled) setState('none');
    }

    findNext();
    return () => { cancelled = true; };
  }, []);

  if (state !== 'ready' || !slot) return null;

  const bk = window.__bk;
  const timeStr = bk.fmtTime(slot.h, slot.m);
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const when = slot.isToday   ? timeStr
              : slot.isTomorrow ? `Tomorrow · ${timeStr}`
              : `${DOW[slot.dow]} · ${timeStr}`;

  return (
    <button
      type="button"
      className="next-avail"
      onClick={() => window.dispatchEvent(new CustomEvent('edit-studio:goto-booking', {
        detail: { prefill: { dateStr: slot.dateStr, h: slot.h, m: slot.m } }
      }))}
      aria-label={`Next available barber slot: ${when} — jump to booking`}
    >
      <span className="avail-dot" aria-hidden="true" />
      <span className="next-avail-eyebrow">Next available</span>
      <span className="next-avail-time">{when}</span>
      <span className="next-avail-arr" aria-hidden="true">→</span>
    </button>
  );
}

// ── Home collage — the services as a fanned stack of photo cards ──────────
// Images are placeholders from the existing galleries; swap freely.
const HOME_CARDS = [
  { svc: 'barber', label: 'Barbering', num: '01', img: 'assets/mid-taper-textured-fringe.webp', alt: 'Mid taper haircut with textured fringe — barbering at Edit Studio' },
  { svc: 'tan',    label: 'Sunless',   num: '02', img: 'assets/sunless-tan-closeup-bikini.webp', alt: 'Custom sunless spray tan — golden, streak-free glow' },
  { svc: 'wax',    label: 'Waxing',    num: '03', img: 'assets/wax-brow-shaping-studio.webp',    alt: 'Brow shaping and waxing at Edit Studio' },
  { svc: 'lashes', label: 'Lashes',    num: '04', img: 'assets/livi-furtado-headshot.webp',      alt: 'Lash artistry at Edit Studio' }];


function HomeCollage() {
  // The app's panel-swipe handler listens on an ancestor via native events.
  // Stop touch/mouse bubbling here so scrolling the card strip (mobile) or
  // pressing a card never doubles as a panel swipe. Native listeners are
  // required — React's synthetic handlers fire too late to beat them.
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('touchmove', stop, { passive: true });
    el.addEventListener('mousedown', stop);
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('mousedown', stop);
    };
  }, []);
  return (
    <div className="aura-collage" aria-label="Our services" ref={ref}>
      {HOME_CARDS.map((c) =>
      <button
        key={c.svc}
        type="button"
        className={`aura-card aura-card-${c.svc}`}
        onClick={() => window.dispatchEvent(new CustomEvent('edit-studio:goto-service', { detail: { service: c.svc } }))}
        aria-label={`${c.label} — view services`}>
          <img src={c.img} alt={c.alt} loading="eager" decoding="async" />
          <span className="aura-card-label">
            <span className="aura-card-num">{c.num}</span>
            {c.label}
            <span className="aura-card-arr" aria-hidden="true">→</span>
          </span>
        </button>
      )}
    </div>);

}

function Hero({ data, animComp, progress, speed, service }) {
  const Anim = window[animComp] || (() => null);
  return (
    <div className="panel">
      <Anim progress={progress} speed={speed} />
      <div className="hero" data-service={service} style={{ padding: "0px 56px 110px 80px" }}>
        {service === 'home' &&
        <p className="hero-eyebrow">Barber · Sunless · Wax · Lash — Oak Bay, Victoria</p>
        }
        <h1 style={{ fontFamily: "sans-serif", margin: "0px" }}>{data.h1}</h1>
        {service === 'home' && <HomeCollage />}
        {data.sub && <p className="sub" style={{ margin: "22px 0px 14px 5px" }}>{data.sub}</p>}
        <div className="swipe-hint" style={{ margin: "28px 0px 0px 10px" }}>
          <span className="glyph"></span>
          <span>{data.cta}</span>
        </div>
        <a
          className="book"
          href="#book"
          style={{ cursor: 'pointer', marginTop: '20px', marginLeft: '10px', borderRadius: '999px', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', ...(PILL_COLORS[service] || PILL_COLORS.home) }}
          onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('edit-studio:goto-booking')); }}>
          Book now <span className="arr" style={{ fontStyle: 'normal', fontFamily: 'var(--mono)', fontSize: '12px' }}>↓</span>
        </a>
        {service === 'barber' && <NextAvailableBarber />}
        {service === 'home' &&
        <div className="hero-contact" aria-label="Contact the studio">
            <OpenStatus />
            <a className="hero-contact-link" href="tel:+17785353348">778 535 3348</a>
            <span className="hero-contact-sep" aria-hidden="true">·</span>
            <a className="hero-contact-link sms" href="sms:+17785353348">Send a text →</a>
          </div>
        }
      </div>
    </div>);

}

function ServiceColumn({ service, isActive, hProgress, animSpeed, density, headlines, onVIdxChange }) {
  const stripRef = useRef(null);
  const [vIdx, setVIdx] = useState(0);
  const dragRef = useRef({ y: 0, dy: 0, dragging: false, t: 0 });
  const data = SERVICES_DEF[service];
  const heroData = { ...HERO_FOR[service], num: data.num };
  if (headlines && headlines[service]) {
    heroData.h1 = headlines[service];
  }

  // Pick content for this service
  const ContentComp =
  service === 'barber' ? window.BarberingContent :
  service === 'tan' ? window.TanContent :
  service === 'wax' ? window.WaxContent :
  service === 'lashes' ? window.LashesContent :
  service === 'visit' ? window.VisitContent :
  null;

  const panels = [
  <Hero key="hero" data={heroData} animComp={ANIM_FOR[service]} progress={hProgress} speed={animSpeed} service={service} />];

  if (ContentComp) {
    panels.push(<div key="content" className="panel" style={{ background: 'var(--bg)' }}>
      <ContentComp headline={null} />
    </div>);
  } else if (service === 'home') {
    // home → push into Visit content (FAQ + hours + goods)
    panels.push(<div key="content" className="panel" style={{ background: 'var(--bg)' }}>
      <window.VisitContent />
    </div>);
  }

  // Vertical drag
  useEffect(() => {
    if (!isActive) return;
    const el = stripRef.current;
    if (!el) return;

    // Helper: get the cpanel scroller for the current vertical panel (if any).
    const getCpanel = () => {
      const activePanel = el.children[vIdx];
      return activePanel ? activePanel.querySelector('.cpanel') : null;
    };

    const start = (y) => {
      // Snapshot the inner-panel scroll position at the moment the gesture starts.
      // Used by move/end to distinguish "scroll inside content" from "switch panel".
      const scroller = getCpanel();
      dragRef.current = {
        y, dy: 0, dragging: true, t: performance.now(),
        startScrollTop: scroller ? scroller.scrollTop : 0,
      };
      el.classList.add('dragging');
    };
    const move = (y) => {
      if (!dragRef.current.dragging) return;
      const dy = y - dragRef.current.y;
      dragRef.current.dy = dy;
      // Swiping downward (dy > 0) while the content panel wasn't already at its
      // top means the user is scrolling inside the content, not switching panels.
      // Skip the strip translate so native scroll can work unobstructed.
      if (dy > 0 && vIdx > 0 && dragRef.current.startScrollTop > 2) return;
      const offset = -vIdx * el.clientHeight + dy;
      el.style.transform = `translateY(${offset}px)`;
    };
    const end = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      el.classList.remove('dragging');
      // Force a style recalculation so the browser commits the transition
      // re-enable BEFORE seeing the new transform value. Without this, both
      // changes land in the same batch and the transition doesn't fire.
      void el.offsetHeight;
      const dy = dragRef.current.dy;
      const dt = Math.max(50, performance.now() - dragRef.current.t);
      const v = dy / dt; // px/ms
      const threshold = el.clientHeight * 0.18;
      let next = vIdx;
      if ((dy < -threshold || v < -0.45) && vIdx < panels.length - 1) next = vIdx + 1;
      else if ((dy > threshold || v > 0.45) && vIdx > 0) {
        // Mirror the wheel-handler guard: only switch back to the hero if the
        // content was already at the top when the gesture began. A fast upward
        // scroll inside the content has high velocity but non-zero startScrollTop.
        if (dragRef.current.startScrollTop <= 2) next = vIdx - 1;
      }
      setVIdx(next);
      el.style.transform = `translateY(${-next * el.clientHeight}px)`;
    };

    const onTS = (e) => start(e.touches[0].clientY);
    const onTM = (e) => {
      // only intercept if mostly vertical
      move(e.touches[0].clientY);
    };
    const onTE = () => end();

    let mouseDown = false;
    const onMD = (e) => {mouseDown = true;start(e.clientY);};
    const onMM = (e) => {if (mouseDown) move(e.clientY);};
    const onMU = () => {mouseDown = false;end();};

    // wheel-to-vertical
    let wheelLock = 0;
    const onW = (e) => {
      if (Math.abs(e.deltaY) < 30) return;

      // Respect inner-panel scrolling: if the active panel has its own
      // scrollable content (the .cpanel on the content slide), only switch
      // panels when that scroller is already at the relevant edge.
      const activePanel = el.children[vIdx];
      const scroller = activePanel && activePanel.querySelector('.cpanel');
      if (scroller && scroller.scrollHeight - scroller.clientHeight > 2) {
        const atTop = scroller.scrollTop <= 0;
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
        if (e.deltaY < 0 && !atTop) return;   // still room to scroll up inside
        if (e.deltaY > 0 && !atBottom) return; // still room to scroll down inside
      }

      const now = performance.now();
      if (now < wheelLock) return;
      wheelLock = now + 700;
      let next = vIdx;
      if (e.deltaY > 0 && vIdx < panels.length - 1) next = vIdx + 1;else
      if (e.deltaY < 0 && vIdx > 0) next = vIdx - 1;
      if (next === vIdx) return;
      setVIdx(next);
      el.style.transform = `translateY(${-next * el.clientHeight}px)`;
      // After a panel switch, drop the inner scroller back to its top so the
      // user lands at the start of the new section, not mid-way.
      if (next === 0) {
        const incomingScroller = el.children[next] && el.children[next].querySelector('.cpanel');
        if (incomingScroller) incomingScroller.scrollTop = 0;
      }
    };

    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchmove', onTM, { passive: true });
    el.addEventListener('touchend', onTE);
    el.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    el.addEventListener('wheel', onW, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchmove', onTM);
      el.removeEventListener('touchend', onTE);
      el.removeEventListener('mousedown', onMD);
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onMU);
      el.removeEventListener('wheel', onW);
    };
  }, [isActive, vIdx, panels.length]);

  // reset transform when active changes
  useEffect(() => {
    if (stripRef.current) {
      stripRef.current.style.transform = `translateY(${-vIdx * stripRef.current.clientHeight}px)`;
    }
  }, [vIdx, isActive]);

  // Report active vIdx + panel count to App (for chrome state)
  useEffect(() => {
    if (isActive && onVIdxChange) onVIdxChange(vIdx, panels.length);
  }, [isActive, vIdx, panels.length, onVIdxChange]);

  // External jump to booking (FAB)
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      const targetIdx = panels.length > 1 ? 1 : 0;
      setVIdx(targetIdx);
      const el = stripRef.current;
      if (!el) return;
      el.style.transform = `translateY(${-targetIdx * el.clientHeight}px)`;
      // After the strip transition, scroll the cpanel down to the embed.
      setTimeout(() => {
        const embed = el.querySelector('.booking-embed');
        const scroller = embed && embed.closest('.cpanel');
        if (embed && scroller) {
          // Offset by the chrome-top's actual bottom so the embed lands
          // clear of the logo/header overlay, plus a small breathing gap.
          const chromeEl = document.querySelector('.chrome-top');
          const clearance = chromeEl ? chromeEl.getBoundingClientRect().bottom + 16 : 120;
          const top = embed.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - clearance;
          scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
      }, 720);
    };
    window.addEventListener('edit-studio:goto-booking', handler);
    return () => window.removeEventListener('edit-studio:goto-booking', handler);
  }, [isActive, panels.length]);

  return (
    <div className="strip" ref={stripRef} data-vidx={vIdx}>
      {panels}
    </div>);

}

function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "bone",
    "typeface": "fraunces-inter",
    "animSpeed": 1,
    "density": "regular",
    "serviceOrder": "home,barber,tan,wax,lashes",
    "homeHeadline": "You / Found Us.",
    "barberHeadline": "Refined. / Intentional. / Crisp.",
    "tanHeadline": "Golden hour, on demand.",
    "waxHeadline": "Smooth, sorted.",
    "announceText": "Late night bookings available until 9pm Thursdays",
    "announceTarget": "barber",
    "announceStyle": "lime"
  } /*EDITMODE-END*/;

  const [tRaw, setTweakRaw] = window.useTweaks(TWEAK_DEFAULTS);

  // Mirror tweak values to localStorage so they survive refresh even when the
  // host's EDITMODE-block file rewriter doesn't pick them up. On mount we
  // re-hydrate from storage and re-apply via setTweakRaw so the rest of the
  // app reads from a single source of truth.
  const TWEAK_LS_KEY = 'edit-studio:tweaks:v1';
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(TWEAK_LS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      const filtered = {};
      Object.keys(stored).forEach((k) => {
        if (k in TWEAK_DEFAULTS && stored[k] !== TWEAK_DEFAULTS[k]) filtered[k] = stored[k];
      });
      if (Object.keys(filtered).length) setTweakRaw(filtered);
    } catch (e) {}
  }, []);

  // Fetch live banner config from admin API and apply over defaults
  useEffect(() => {
    const endpoint = (window.__booking || {}).endpoint || '';
    const base = endpoint.replace(/\/api\/booking\/create$/, '') || window.location.origin;
    fetch(base + '/api/site-banner')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(cfg) {
        if (!cfg) return;
        setTweakRaw({
          announceText:   cfg.enabled ? (cfg.text   || '') : '',
          announceTarget: cfg.target  || 'barber',
          announceStyle:  cfg.style   || 'lime',
        });
      })
      .catch(function() {});
  }, []);

  const setTweak = useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setTweakRaw(edits);
    try {
      const prev = JSON.parse(localStorage.getItem(TWEAK_LS_KEY) || '{}');
      localStorage.setItem(TWEAK_LS_KEY, JSON.stringify({ ...prev, ...edits }));
    } catch (e) {}
  }, [setTweakRaw]);
  const t = tRaw;

  // ── URL routing ────────────────────────────────────────────────
  // Maps service id → URL slug and back. Keeps URLs clean for SEO
  // while preserving the swipe UX entirely.
  const SLUG_TO_SERVICE = { '': 'home', 'home': 'home', 'barbering': 'barber', 'sunless': 'tan', 'waxing': 'wax', 'lashes': 'lashes' };
  const SERVICE_TO_SLUG = { home: '', barber: 'barbering', tan: 'sunless', wax: 'waxing', lashes: 'lashes' };
  const SERVICE_META = {
    home:   { title: 'Edit Studio — Barber · Wax · Tan · Lashes', desc: 'Edit Studio is a barbering, sunless tanning, waxing and lash studio on Oak Bay Avenue in Victoria, BC.' },
    barber: { title: 'Barbering — Edit Studio Oak Bay', desc: 'Precision cuts, tapers and fades by barber Eric He. Book online or walk in.' },
    tan:    { title: 'Sunless Tanning — Edit Studio Oak Bay', desc: 'Custom airbrush spray tans using NUDA organic solutions. Natural, streak-free and orange-free golden glow in Victoria, BC.' },
    wax:    { title: 'Waxing — Edit Studio Oak Bay', desc: 'Brazilian, brow and full-body waxing by esthetician Livi Furtado. Gentle technique, quality products, Oak Bay Victoria.' },
    lashes: { title: 'Lash Extensions & Lifts — Edit Studio Oak Bay', desc: 'Classic, hybrid, volume and mega volume lash extensions, lash lifts and brow services by Niamh Frazer. Oak Bay, Victoria BC.' },
  };

  const getIdxFromPath = (svcs) => {
    const slug = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    const svc = SLUG_TO_SERVICE[slug] || 'home';
    const i = svcs.indexOf(svc);
    return i >= 0 ? i : 0;
  };

  const [idx, setIdx] = useState(() => {
    const svcs = (TWEAK_DEFAULTS.serviceOrder || 'home,barber,tan,wax,lashes').split(',').map(s => s.trim());
    return getIdxFromPath(svcs);
  });
  const [hOffset, setHOffset] = useState(0); // px during drag
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false); // true during the instant index/offset swap
  const [activeVIdx, setActiveVIdx] = useState(0);
  const [activeVCount, setActiveVCount] = useState(2);
  const appRef = useRef(null);
  const dragRef = useRef({ x: 0, dx: 0, dragging: false, t: 0, axis: null, y: 0 });
  const snapTimerRef = useRef(null);

  // Announcement dismissal — keyed by the message so editing it via Tweaks re-shows.
  const announceKey = 'edit-studio-announce:' + (t.announceText || '').slice(0, 96);
  const [announceDismissed, setAnnounceDismissed] = useState(() => {
    try { return sessionStorage.getItem(announceKey) === '1'; } catch (e) { return false; }
  });
  useEffect(() => {
    try { setAnnounceDismissed(sessionStorage.getItem(announceKey) === '1'); } catch (e) {}
  }, [announceKey]);

  // build service list from order tweak
  const services = (t.serviceOrder || 'home,barber,tan,wax,lashes').
  split(',').map((s) => s.trim()).filter((s) => SERVICES_DEF[s]);
  const total = services.length;
  const active = SERVICES_DEF[services[idx]];

  // Sync URL + page title whenever the active service changes
  useEffect(() => {
    const svc = services[idx];
    const slug = SERVICE_TO_SLUG[svc] ?? svc;
    const path = slug ? '/' + slug : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ svc, idx }, '', path);
    }
    const meta = SERVICE_META[svc] || SERVICE_META.home;
    document.title = meta.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.desc);
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) canonicalEl.setAttribute('href', 'https://www.editstudio.space' + path);
    if (typeof gtag === 'function') {
      gtag('config', 'G-PZ40K8QY0F', { page_path: path, page_title: meta.title });
    }
  }, [idx, services]);

  // Handle browser back / forward buttons
  useEffect(() => {
    const onPop = () => {
      const i = getIdxFromPath(services);
      setIdx(i);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [services]);

  // Home collage cards → jump to that service's panel
  useEffect(() => {
    const onGoto = (e) => {
      const i = services.indexOf(e?.detail?.service);
      if (i >= 0) setIdx(i);
    };
    window.addEventListener('edit-studio:goto-service', onGoto);
    return () => window.removeEventListener('edit-studio:goto-service', onGoto);
  }, [services]);

  // headlines from tweaks (fallback to defaults if blank)
  const headlines = {};
  ['home', 'barber', 'tan', 'wax', 'lashes'].forEach((k) => {
    const v = (t[k + 'Headline'] || '').trim();
    if (v) headlines[k] = parseHeadline(v);
  });

  function parseHeadline(text) {
    // Support " / " as an explicit line break so editors can write multi-line
    // headlines from the Tweaks panel without hand-coding JSX.
    const lines = text.split(' / ').map((s) => s.trim()).filter(Boolean);
    const italicizeLast = (line) => {
      const parts = line.split(' ');
      if (parts.length < 1 || !line) return line;
      const last = parts.pop();
      const punctMatch = last.match(/[.,!?]$/);
      const punct = punctMatch ? punctMatch[0] : '';
      const cleanLast = punct ? last.slice(0, -1) : last;
      const lead = parts.length ? parts.join(' ') + ' ' : '';
      return <>{lead}<em className="it">{cleanLast}</em>{punct}</>;
    };
    if (lines.length > 1) {
      return <>{lines.map((line, i) => (
        <React.Fragment key={i}>
          {i === lines.length - 1 ? italicizeLast(line) : line}
          {i < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}</>;
    }
    return italicizeLast(text);
  }

  // palette switch
  useEffect(() => {
    const root = document.documentElement;
    const palettes = {
      bone: { bg: '#efeae0', ink: '#141210', paper: '#f7f3eb' },
      ivory: { bg: '#f5f1ea', ink: '#1c1814', paper: '#fbf8f1' },
      noir: { bg: '#15120e', ink: '#ece4d4', paper: '#1f1b14' },
      mineral: { bg: '#dbd7cb', ink: '#1a1916', paper: '#e8e3d6' },
      blush: { bg: '#f3e6df', ink: '#2a1c18', paper: '#faeee7' }
    };
    const p = palettes[t.palette] || palettes.bone;
    root.style.setProperty('--bg', p.bg);
    root.style.setProperty('--ink', p.ink);
    root.style.setProperty('--paper', p.paper);
    root.style.setProperty('--ink-soft', p.ink === '#ece4d4' ? '#bdb39d' : '#4a4540');
  }, [t.palette]);

  // typeface
  useEffect(() => {
    const root = document.documentElement;
    const pairs = {
      'fraunces-inter': { display: '"Fraunces", serif', body: '"Inter Tight", sans-serif' },
      'fraunces-mono': { display: '"Fraunces", serif', body: '"JetBrains Mono", monospace' },
      'playfair-helvetica': { display: '"Playfair Display", serif', body: '"Helvetica Neue", Helvetica, sans-serif' },
      'instrument-grotesk': { display: '"Instrument Serif", serif', body: '"Space Grotesk", sans-serif' }
    };
    const p = pairs[t.typeface] || pairs['fraunces-inter'];
    root.style.setProperty('--display', p.display);
    root.style.setProperty('--body', p.body);
    document.body.style.fontFamily = p.body;
  }, [t.typeface]);

  // density
  useEffect(() => {
    const map = { compact: 0.85, regular: 1, comfy: 1.15 };
    document.documentElement.style.setProperty('--density', map[t.density] || 1);
  }, [t.density]);

  // horizontal swipe
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;

    const start = (x, y) => {
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
        setSnapping(false);
      }
      dragRef.current = { x, y, dx: 0, dragging: true, t: performance.now(), axis: null };
      setDragging(true);
    };
    const move = (x, y) => {
      if (!dragRef.current.dragging) return;
      const dx = x - dragRef.current.x;
      const dy = y - dragRef.current.y;
      // determine axis
      if (!dragRef.current.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        dragRef.current.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (dragRef.current.axis !== 'h') return;
      // infinite — no edge resistance
      dragRef.current.dx = dx;
      setHOffset(dx);
    };
    const end = () => {
      if (!dragRef.current.dragging) return;
      const wasH = dragRef.current.axis === 'h';
      dragRef.current.dragging = false;
      setDragging(false);
      if (!wasH) { setHOffset(0); return; }
      const dx = dragRef.current.dx;
      const dt = Math.max(50, performance.now() - dragRef.current.t);
      const v = dx / dt;
      const w = el.clientWidth;
      const threshold = w * 0.20;
      let next = idx;
      if (dx < -threshold || v < -0.5) next = (idx + 1) % total;
      else if (dx > threshold || v > 0.5) next = (idx - 1 + total) % total;
      if (next === idx) { setHOffset(0); return; }
      // Phase 1: animate the swiped panel the rest of the way off-screen.
      // The CSS transition is still active here (dragging = false), so this plays smoothly.
      const target = (dx < 0 || v < -0.5) ? -w : w;
      setHOffset(target);
      // Phase 2: once the animation lands, silently teleport to the new index with no transition.
      snapTimerRef.current = setTimeout(() => {
        snapTimerRef.current = null;
        setSnapping(true);   // disable transition
        setIdx(next);
        setHOffset(0);       // both updates batch into one render — instant, invisible
        requestAnimationFrame(() => requestAnimationFrame(() => setSnapping(false)));
      }, 360); // matches the 0.35s transition + small buffer
    };

    const onTS = (e) => start(e.touches[0].clientX, e.touches[0].clientY);
    const onTM = (e) => move(e.touches[0].clientX, e.touches[0].clientY);
    const onTE = () => end();

    let md = false;
    const onMD = (e) => {md = true;start(e.clientX, e.clientY);};
    const onMM = (e) => {if (md) move(e.clientX, e.clientY);};
    const onMU = () => {md = false;end();};

    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIdx((idx + 1) % total);else
      if (e.key === 'ArrowLeft') setIdx((idx - 1 + total) % total);
    };

    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchmove', onTM, { passive: true });
    el.addEventListener('touchend', onTE);
    el.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    window.addEventListener('keydown', onKey);

    return () => {
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchmove', onTM);
      el.removeEventListener('touchend', onTE);
      el.removeEventListener('mousedown', onMD);
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onMU);
      window.removeEventListener('keydown', onKey);
    };
  }, [idx, total]);

  // 3-column window: prev / active / next, infinitely repositioned
  const w = typeof window !== 'undefined' ? window.innerWidth : 800;
  const hProgress = -hOffset / w;
  const wrap = (n) => (n % total + total) % total;
  const visibleSlots = [
  { slotIdx: -1, service: services[wrap(idx - 1)] },
  { slotIdx: 0, service: services[idx] },
  { slotIdx: 1, service: services[wrap(idx + 1)] }];

  // container starts at -1 vw (slot -1), so active sits centered.
  const xOffsetPx = -w + hOffset;

  return (
    <div className="app" ref={appRef} data-screen-label={`Edit Studio — ${active.label}`} data-vidx={activeVIdx} data-announce={t.announceText && !announceDismissed && services[idx] === t.announceTarget ? 'true' : 'false'}>
      <AnnouncementStrip
        message={services[idx] === t.announceTarget ? t.announceText : ''}
        styleVariant={t.announceStyle || 'lime'}
        targetLabel={(SERVICES_DEF[t.announceTarget] || active).label}
        dismissed={announceDismissed}
        onJump={() => {
          // We're already on the target service — jump down to the booking widget.
          window.dispatchEvent(new CustomEvent('edit-studio:goto-booking'));
        }}
        onDismiss={() => {
          setAnnounceDismissed(true);
          try { sessionStorage.setItem(announceKey, '1'); } catch (e) {}
        }}
      />
      <ChromeTop active={active} total={total} idx={idx} logoSrc={t.palette === 'noir' ? 'assets/logo-white.png' : 'assets/logo-black.png'} />
      <ChromeNav services={services.map((s) => SERVICES_DEF[s])} idx={idx} onSelect={(i) => setIdx(i)} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'row',
        width: `300vw`,
        transform: `translateX(${xOffsetPx}px)`,
        transition: (dragging || snapping) ? 'none' : 'transform 0.35s cubic-bezier(0.65, 0, 0.35, 1)',
        willChange: 'transform'
      }}>
        {visibleSlots.map(({ slotIdx, service }) => {
          const localProgress = slotIdx + hProgress;
          return (
            <div key={service} style={{ flex: '0 0 100vw', position: 'relative', overflow: 'hidden' }}>
              <ServiceColumn
                service={service}
                isActive={slotIdx === 0}
                hProgress={localProgress}
                animSpeed={t.animSpeed}
                density={t.density}
                headlines={headlines}
                onVIdxChange={slotIdx === 0 ? (v, c) => { setActiveVIdx(v); setActiveVCount(c); } : undefined} />
              
            </div>);

        })}
      </div>

      <window.TweaksPanel title="Edit Studio · Tweaks">
        <window.TweakSection label="Palette" />
        <window.TweakRadio label="Theme" value={t.palette}
        options={['bone', 'ivory', 'blush', 'mineral', 'noir']}
        onChange={(v) => setTweak('palette', v)} />

        <window.TweakSection label="Type" />
        <window.TweakSelect label="Pairing" value={t.typeface}
        options={[
        ['fraunces-inter', 'Fraunces / Inter Tight'],
        ['fraunces-mono', 'Fraunces / JetBrains Mono'],
        ['playfair-helvetica', 'Playfair / Helvetica'],
        ['instrument-grotesk', 'Instrument / Space Grotesk']]
        }
        onChange={(v) => setTweak('typeface', v)} />

        <window.TweakSection label="Motion" />
        <window.TweakSlider label="Animation speed" value={t.animSpeed}
        min={0.25} max={2.5} step={0.05} unit="×"
        onChange={(v) => setTweak('animSpeed', v)} />

        <window.TweakSection label="Layout" />
        <window.TweakRadio label="Density" value={t.density}
        options={['compact', 'regular', 'comfy']}
        onChange={(v) => setTweak('density', v)} />
        <window.TweakText label="Service order" value={t.serviceOrder}
        onChange={(v) => setTweak('serviceOrder', v)} />

        <window.TweakSection label="Announcement strip" />
        <CommitText label="Message (blank to hide)" value={t.announceText}
        onCommit={(v) => setTweak('announceText', v)} />
        <window.TweakSelect label="Show on service" value={t.announceTarget}
        options={[
        ['barber', 'Barbering'],
        ['tan', 'Sunless'],
        ['wax', 'Waxing'],
        ['visit', 'Visit'],
        ['home', 'Home']]
        }
        onChange={(v) => setTweak('announceTarget', v)} />
        <window.TweakRadio label="Style" value={t.announceStyle}
        options={['parchment', 'lime', 'ink']}
        onChange={(v) => setTweak('announceStyle', v)} />

        <window.TweakSection label="Headlines" />
        <CommitText label="Home" value={t.homeHeadline}
        onCommit={(v) => setTweak('homeHeadline', v)} />
        <CommitText label="Barbering" value={t.barberHeadline}
        onCommit={(v) => setTweak('barberHeadline', v)} />
        <CommitText label="Sunless" value={t.tanHeadline}
        onCommit={(v) => setTweak('tanHeadline', v)} />
        <CommitText label="Waxing" value={t.waxHeadline}
        onCommit={(v) => setTweak('waxHeadline', v)} />
      </window.TweaksPanel>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);