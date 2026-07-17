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
Object.assign(window, { HomeAnim, HomeAura, BarberAnim, TanAnim, WaxAnim });
