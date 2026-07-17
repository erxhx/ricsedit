// animations.jsx — Full-page service animations
// Each animation reads `progress` (-1..0..1) where 0 = active and ±1 = exiting.
// Plus `time` (ms accumulator) for ambient motion. Built with SVG + CSS transforms.

const { useEffect, useRef, useState, useMemo } = React;

// ── Shared hook: animation frame time accumulator ──────────────
function useTime(speed = 1, paused = false) {
  const [t, setT] = useState(0);
  const last = useRef(performance.now());
  const raf = useRef();
  useEffect(() => {
    if (paused) return;
    last.current = performance.now();
    const tick = (now) => {
      const dt = Math.min(48, now - last.current);
      last.current = now;
      setT((prev) => prev + dt * speed);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [speed, paused]);
  return t;
}

// ────────────────────────────────────────────────────────────────
// 1) HOME — typographic kinetic sequence; concentric italic SALON
// ────────────────────────────────────────────────────────────────
function HomeAnim({ progress = 0, speed = 1 }) {
  const t = useTime(speed);
  const rot = (t / 1000) * 6;
  const sway = Math.sin(t / 1400) * 4;
  const offset = progress * 220;
  const logoSrc = (typeof document !== 'undefined' &&
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() === '#15120e')
    ? 'assets/logo-white.png'
    : 'assets/logo-black.png';
  return (
    <div className="anim-canvas" aria-hidden>
      <svg viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="homeGlow" cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor="#f7eddc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#efeae0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="1400" fill="url(#homeGlow)" />
        {/* concentric logo ghosts */}
        {[0,1,2,3,4,5,6].map(i => {
          const scale = 0.5 + i * 0.28;
          const op = 0.06 + (6-i) * 0.018;
          const w = 600 * scale;
          const h = (600 * 673 / 1036) * scale;
          return (
            <g key={i} transform={`translate(500 700) rotate(${rot * (i%2?-1:1) * 0.3 + sway})`}>
              <image
                href={logoSrc}
                x={-w/2} y={-h/2}
                width={w} height={h}
                opacity={op}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 2) BARBERING — falling hair strands; clipper sweep on transition
//    ARCHIVED: no page maps to this since the barber hero switched to
//    HomeAnim (see ANIM_FOR in app.jsx). Kept for easy restoration.
// ────────────────────────────────────────────────────────────────
function BarberAnim({ progress = 0, speed = 1 }) {
  const t = useTime(speed);
  // 70 strands with stable seeds
  const strands = useMemo(() => Array.from({length: 70}).map((_, i) => ({
    x: (i * 137.5) % 1000,
    delay: (i * 53) % 4000,
    dur: 3200 + (i * 71) % 2400,
    len: 60 + (i * 17) % 220,
    sway: 0.5 + ((i * 31) % 100) / 100,
    hue: 14 + (i % 5) * 4
  })), []);
  const sweep = Math.abs(progress); // 0 active → 1 exit

  return (
    <div className="anim-canvas" aria-hidden style={{ background: 'linear-gradient(180deg, #efeae0 0%, #e8dccb 100%)'}}>
      <svg viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e8dccb" stopOpacity="0" />
            <stop offset="100%" stopColor="#5a2b1c" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="razor" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#141210" stopOpacity="0" />
            <stop offset="50%" stopColor="#141210" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#141210" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect y="900" width="1000" height="500" fill="url(#floor)" />

        {/* falling strands */}
        {strands.map((s, i) => {
          const phase = ((t + s.delay) % s.dur) / s.dur;
          const y = -50 + phase * 1500;
          const x = s.x + Math.sin((t / 800 + i) * s.sway) * 18;
          const rot = Math.sin(t / 600 + i) * 35 + (phase * 60);
          const op = phase < 0.85 ? 0.55 : (1 - phase) / 0.15 * 0.55;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
              <path d={`M0 0 Q ${s.sway*8} ${s.len/2} ${s.sway*4} ${s.len}`}
                    stroke={`oklch(0.${s.hue} 0.06 30)`} strokeWidth="1.4"
                    fill="none" opacity={op} strokeLinecap="round" />
            </g>
          );
        })}

        {/* clipper sweep that activates on horizontal transition */}
        <g transform={`translate(${-300 + sweep * 1600} 0)`} opacity={sweep * 0.9}>
          <rect x="0" y="0" width="280" height="1400" fill="url(#razor)" />
          <rect x="120" y="0" width="2" height="1400" fill="#141210" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 3) SPRAY TAN — golden mist, drifting orbs, sun arc
// ────────────────────────────────────────────────────────────────
function TanAnim({ progress = 0, speed = 1 }) {
  const t = useTime(speed);
  const sun = Math.abs(progress);
  // mist particles
  const orbs = useMemo(() => Array.from({length: 36}).map((_, i) => ({
    x: ((i * 263) % 1000),
    y: ((i * 419) % 1400),
    r: 80 + (i % 7) * 30,
    delay: (i * 211) % 6000,
    dur: 5000 + (i * 113) % 4000
  })), []);

  return (
    <div className="anim-canvas" aria-hidden
         style={{ background: 'radial-gradient(ellipse at 70% 30%, #f7d9a9 0%, #e8c089 35%, #cf8b53 100%)'}}>
      <svg viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff5dc" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#f3c179" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f3c179" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#f9d99b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f9d99b" stopOpacity="0" />
          </radialGradient>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
            <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.06 0"/>
          </filter>
        </defs>

        {/* sun */}
        <g transform={`translate(${720 + sun*200} ${260 - sun*180})`}>
          <circle r={260} fill="url(#sunCore)" />
          <circle r={120} fill="#fff7e1" opacity="0.65" />
        </g>

        {/* concentric horizon arcs */}
        {[0,1,2,3,4].map(i => (
          <ellipse key={i} cx="500" cy={1100 + i*40} rx={700 + i*120} ry={40 + i*15}
                   fill="none" stroke="#fff" strokeOpacity={0.06 - i*0.008} strokeWidth="1" />
        ))}

        {/* drifting mist orbs */}
        {orbs.map((o, i) => {
          const phase = ((t + o.delay) % o.dur) / o.dur;
          const y = o.y - phase * 600;
          const x = o.x + Math.sin((t/1200 + i) * 0.8) * 60;
          const op = Math.sin(phase * Math.PI) * 0.9;
          return (
            <circle key={i} cx={x} cy={y} r={o.r} fill="url(#orb)" opacity={op} />
          );
        })}

        {/* italic word ghost */}
        <text x="500" y="780" textAnchor="middle"
              fontFamily="Fraunces, serif" fontStyle="italic" fontWeight="300"
              fontSize="180" fill="#5a2b1c" opacity="0.10" letterSpacing="-4">
          golden hour
        </text>

        <rect width="1000" height="1400" filter="url(#grain)" opacity="0.6" />
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 4) WAXING — silken ribbon, smooth-pull motion, blush palette
// ────────────────────────────────────────────────────────────────
function WaxAnim({ progress = 0, speed = 1 }) {
  const t = useTime(speed);
  const pull = Math.abs(progress);

  // ribbons: stacked smooth sine paths that shift over time
  const ribbons = useMemo(() => Array.from({length: 7}).map((_, i) => ({
    base: 200 + i * 140,
    amp: 60 + (i % 3) * 30,
    freq: 0.0035 + (i % 4) * 0.0008,
    phase: i * 1.7,
    op: 0.5 - i * 0.05
  })), []);

  // build a smooth path
  const buildPath = (r, time) => {
    const pts = [];
    for (let x = -50; x <= 1050; x += 30) {
      const y = r.base + Math.sin(x * r.freq + time / 1100 + r.phase) * r.amp
                       + Math.sin(x * r.freq * 2.2 + time / 700) * (r.amp * 0.3);
      pts.push([x, y]);
    }
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i-1]; const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` Q ${x0} ${y0} ${cx} ${(y0+y1)/2}`;
    }
    return d;
  };

  return (
    <div className="anim-canvas" aria-hidden
         style={{ background: 'linear-gradient(180deg, #f7e6df 0%, #f2d4ca 60%, #e8b6a8 100%)'}}>
      <svg viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="silk" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="silk2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b46a55" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#7a3a2c" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* deep wash bottom */}
        <rect y="900" width="1000" height="500" fill="url(#silk2)" />

        {/* ribbons */}
        {ribbons.map((r, i) => (
          <path key={i}
                d={buildPath(r, t)}
                stroke="#fff"
                strokeOpacity={r.op * 0.7}
                strokeWidth={2.2}
                fill="none" />
        ))}

        {/* one bright pulled strip */}
        <g transform={`translate(${-200 + pull * 1200} 0) rotate(${-6 + pull * 8} 200 700)`}
           opacity={0.4 + pull * 0.6}>
          <rect x="0" y="500" width="280" height="180" fill="url(#silk)" />
          <rect x="0" y="540" width="280" height="100" fill="#fff" opacity="0.35" />
        </g>

        {/* italic word ghost */}
        <text x="500" y="1040" textAnchor="middle"
              fontFamily="Fraunces, serif" fontStyle="italic" fontWeight="300"
              fontSize="160" fill="#5a2820" opacity="0.10" letterSpacing="-3">
          smooth
        </text>
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 5) LASHES — ink lash-fan eye on paper with a soft lilac wash; ambient
//    flutter, periodic blink and sparkles. The eye closes on
//    horizontal transition.
// ────────────────────────────────────────────────────────────────
function LashAnim({ progress = 0, speed = 1 }) {
  const t = useTime(speed);

  // Upper-lid arc: quadratic A(140,600) → B(860,600), control C(500,380).
  const A = [140, 600], B = [860, 600], C = [500, 380];
  const LASH_N = 27;

  // Static geometry: root point, outward normal and length per lash.
  const lashes = useMemo(() => Array.from({ length: LASH_N }).map((_, i) => {
    const s = i / (LASH_N - 1);
    const u = 1 - s;
    const px = u*u*A[0] + 2*u*s*C[0] + s*s*B[0];
    const py = u*u*A[1] + 2*u*s*C[1] + s*s*B[1];
    const tx = 2*u*(C[0]-A[0]) + 2*s*(B[0]-C[0]);
    const ty = 2*u*(C[1]-A[1]) + 2*s*(B[1]-C[1]);
    const tl = Math.hypot(tx, ty);
    const nx = ty / tl, ny = -tx / tl;          // normal, pointing up/out
    // cat-eye profile: longest toward the outer (right) corner
    const len = 70 + s * 95 + ((i * 37) % 23);
    const curl = (s - 0.42) * 60;               // curl away from centre
    return { px, py, nx, ny, len, curl, jig: (i * 97) % 60 };
  }), []);

  // Sparkles, stable seeds.
  const sparks = useMemo(() => Array.from({ length: 16 }).map((_, i) => ({
    x: (i * 173) % 1000, y: (i * 337) % 1300,
    tw: 1400 + (i * 211) % 1800, ph: (i * 727) % 1000
  })), []);

  // Blink: quick shut/open near the end of each cycle; transitions close
  // the eye fully.
  const CYCLE = 4600;
  const cp = (t % CYCLE) / CYCLE;
  const blink = cp > 0.9 ? Math.sin(((cp - 0.9) / 0.1) * Math.PI) : 0;
  const closed = Math.min(1, Math.max(blink, Math.abs(progress) * 1.4));
  const open = 1 - closed * 0.92;
  const sway = Math.sin(t / 2600) * 1.4;
  const glow = 0.42 + Math.sin(t / 1900) * 0.14;

  return (
    <div className="anim-canvas" aria-hidden
         style={{ background: 'linear-gradient(180deg, #efeae0 0%, #ece4ea 55%, #e3d8ec 100%)' }}>
      <svg viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="lashGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c9b6e6" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#b39ad8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b39ad8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* violet aura breathing behind the eye */}
        <circle cx="500" cy="560" r="430" fill="url(#lashGlow)" opacity={glow * (1 - closed * 0.5)} />

        <g transform={`rotate(${sway} 500 600)`}>
          {/* lash fan — squashes toward the lid line when blinking */}
          <g transform={`translate(500 604) scale(1 ${open}) translate(-500 -604)`}>
            {/* the lid itself */}
            <path d="M140 600 Q500 380 860 600" fill="none"
                  stroke="#141210" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
            {lashes.map((l, i) => {
              const flut = Math.sin(t / 480 + i * 0.45) * 2.2
                         + Math.sin(t / 1300 + l.jig) * 1.2;
              const tipX = l.px + l.nx * l.len;
              const tipY = l.py + l.ny * l.len;
              return (
                <g key={i} transform={`rotate(${flut} ${l.px} ${l.py})`}>
                  <path d={`M${l.px} ${l.py} Q ${l.px + l.nx * l.len * 0.55} ${l.py + l.ny * l.len * 0.62} ${tipX + l.curl} ${tipY}`}
                        fill="none" stroke="#141210" strokeWidth="2.6"
                        strokeLinecap="round" opacity="0.75" />
                </g>
              );
            })}
          </g>

          {/* closed-lid curve — fades in as the eye shuts */}
          <path d="M140 600 Q500 700 860 600" fill="none"
                stroke="#141210" strokeWidth="4" strokeLinecap="round"
                opacity={closed * 0.9} />

          {/* lower-lid hint */}
          <path d="M240 640 Q500 730 760 640" fill="none"
                stroke="#141210" strokeWidth="1.6" opacity={0.22 * (1 - closed)} />
        </g>

        {/* sparkles */}
        {sparks.map((s, i) => {
          const tw = Math.max(0, Math.sin((t + s.ph) / s.tw * Math.PI * 2));
          const r = 2.2 + tw * 3.2;
          return (
            <g key={i} transform={`translate(${s.x} ${s.y})`} opacity={tw * 0.55}>
              <path d={`M0 ${-r} L${r * 0.32} 0 L0 ${r} L${-r * 0.32} 0 Z`} fill="#7a5fae" />
              <path d={`M${-r} 0 L0 ${r * 0.32} L${r} 0 L0 ${-r * 0.32} Z`} fill="#7a5fae" />
            </g>
          );
        })}

        {/* italic word ghost */}
        <text x="500" y="1060" textAnchor="middle"
              fontFamily="Fraunces, serif" fontStyle="italic" fontWeight="300"
              fontSize="170" fill="#3a2c50" opacity="0.09" letterSpacing="-3">
          flutter
        </text>
      </svg>
    </div>
  );
}

// ── Home aura — milky drifting colour fields (Rhode-soft, CSS-driven) ──────
// Replaces the logo-ghost canvas on the home hero. All motion lives in CSS
// keyframes (styles.css) so it's GPU-cheap and respects reduced-motion.
function HomeAura() {
  return (
    <div className="anim-canvas home-aura" aria-hidden>
      <span className="aura-blob aura-a" />
      <span className="aura-blob aura-b" />
      <span className="aura-blob aura-c" />
      <span className="aura-blob aura-d" />
    </div>
  );
}

// Export to window for the main app
Object.assign(window, { HomeAnim, HomeAura, BarberAnim, TanAnim, WaxAnim, LashAnim });
