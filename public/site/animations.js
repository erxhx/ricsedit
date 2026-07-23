(() => {
  const { useEffect, useRef, useState, useMemo } = React;
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
  function HomeAnim({ progress = 0, speed = 1 }) {
    const t = useTime(speed);
    const rot = t / 1e3 * 6;
    const sway = Math.sin(t / 1400) * 4;
    const offset = progress * 220;
    const logoSrc = typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#15120e" ? "assets/logo-white.png" : "assets/logo-black.png";
    return /* @__PURE__ */ React.createElement("div", { className: "anim-canvas", "aria-hidden": true }, /* @__PURE__ */ React.createElement(
      "svg",
      {
        viewBox: "0 0 1000 1400",
        preserveAspectRatio: "xMidYMid slice",
        style: { width: "100%", height: "100%", display: "block" }
      },
      /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "homeGlow", cx: "50%", cy: "55%", r: "60%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#f7eddc", stopOpacity: "0.8" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#efeae0", stopOpacity: "0" }))),
      /* @__PURE__ */ React.createElement("rect", { width: "1000", height: "1400", fill: "url(#homeGlow)" }),
      [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const scale = 0.5 + i * 0.28;
        const op = 0.06 + (6 - i) * 0.018;
        const w = 600 * scale;
        const h = 600 * 673 / 1036 * scale;
        return /* @__PURE__ */ React.createElement("g", { key: i, transform: `translate(500 700) rotate(${rot * (i % 2 ? -1 : 1) * 0.3 + sway})` }, /* @__PURE__ */ React.createElement(
          "image",
          {
            href: logoSrc,
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            opacity: op,
            preserveAspectRatio: "xMidYMid meet"
          }
        ));
      })
    ));
  }
  function BarberAnim({ progress = 0, speed = 1 }) {
    const t = useTime(speed);
    const strands = useMemo(() => Array.from({ length: 70 }).map((_, i) => ({
      x: i * 137.5 % 1e3,
      delay: i * 53 % 4e3,
      dur: 3200 + i * 71 % 2400,
      len: 60 + i * 17 % 220,
      sway: 0.5 + i * 31 % 100 / 100,
      hue: 14 + i % 5 * 4
    })), []);
    const sweep = Math.abs(progress);
    return /* @__PURE__ */ React.createElement("div", { className: "anim-canvas", "aria-hidden": true, style: { background: "linear-gradient(180deg, #efeae0 0%, #e8dccb 100%)" } }, /* @__PURE__ */ React.createElement(
      "svg",
      {
        viewBox: "0 0 1000 1400",
        preserveAspectRatio: "xMidYMid slice",
        style: { width: "100%", height: "100%", display: "block" }
      },
      /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "floor", x1: "0", x2: "0", y1: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#e8dccb", stopOpacity: "0" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#5a2b1c", stopOpacity: "0.18" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "razor", x1: "0", x2: "1", y1: "0", y2: "0" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#141210", stopOpacity: "0" }), /* @__PURE__ */ React.createElement("stop", { offset: "50%", stopColor: "#141210", stopOpacity: "0.6" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#141210", stopOpacity: "0" }))),
      /* @__PURE__ */ React.createElement("rect", { y: "900", width: "1000", height: "500", fill: "url(#floor)" }),
      strands.map((s, i) => {
        const phase = (t + s.delay) % s.dur / s.dur;
        const y = -50 + phase * 1500;
        const x = s.x + Math.sin((t / 800 + i) * s.sway) * 18;
        const rot = Math.sin(t / 600 + i) * 35 + phase * 60;
        const op = phase < 0.85 ? 0.55 : (1 - phase) / 0.15 * 0.55;
        return /* @__PURE__ */ React.createElement("g", { key: i, transform: `translate(${x} ${y}) rotate(${rot})` }, /* @__PURE__ */ React.createElement(
          "path",
          {
            d: `M0 0 Q ${s.sway * 8} ${s.len / 2} ${s.sway * 4} ${s.len}`,
            stroke: `oklch(0.${s.hue} 0.06 30)`,
            strokeWidth: "1.4",
            fill: "none",
            opacity: op,
            strokeLinecap: "round"
          }
        ));
      }),
      /* @__PURE__ */ React.createElement("g", { transform: `translate(${-300 + sweep * 1600} 0)`, opacity: sweep * 0.9 }, /* @__PURE__ */ React.createElement("rect", { x: "0", y: "0", width: "280", height: "1400", fill: "url(#razor)" }), /* @__PURE__ */ React.createElement("rect", { x: "120", y: "0", width: "2", height: "1400", fill: "#141210", opacity: "0.5" }))
    ));
  }
  function TanAnim({ progress = 0, speed = 1 }) {
    const t = useTime(speed);
    const sun = Math.abs(progress);
    const orbs = useMemo(() => Array.from({ length: 36 }).map((_, i) => ({
      x: i * 263 % 1e3,
      y: i * 419 % 1400,
      r: 80 + i % 7 * 30,
      delay: i * 211 % 6e3,
      dur: 5e3 + i * 113 % 4e3
    })), []);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "anim-canvas",
        "aria-hidden": true,
        style: { background: "radial-gradient(ellipse at 70% 30%, #f7d9a9 0%, #e8c089 35%, #cf8b53 100%)" }
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          viewBox: "0 0 1000 1400",
          preserveAspectRatio: "xMidYMid slice",
          style: { width: "100%", height: "100%", display: "block" }
        },
        /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "sunCore", cx: "50%", cy: "50%", r: "50%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#fff5dc", stopOpacity: "0.95" }), /* @__PURE__ */ React.createElement("stop", { offset: "60%", stopColor: "#f3c179", stopOpacity: "0.5" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#f3c179", stopOpacity: "0" })), /* @__PURE__ */ React.createElement("radialGradient", { id: "orb", cx: "50%", cy: "50%", r: "50%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#fff", stopOpacity: "0.4" }), /* @__PURE__ */ React.createElement("stop", { offset: "60%", stopColor: "#f9d99b", stopOpacity: "0.18" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#f9d99b", stopOpacity: "0" })), /* @__PURE__ */ React.createElement("filter", { id: "grain" }, /* @__PURE__ */ React.createElement("feTurbulence", { type: "fractalNoise", baseFrequency: "0.9", numOctaves: "2", seed: "3" }), /* @__PURE__ */ React.createElement("feColorMatrix", { values: "0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.06 0" }))),
        /* @__PURE__ */ React.createElement("g", { transform: `translate(${720 + sun * 200} ${260 - sun * 180})` }, /* @__PURE__ */ React.createElement("circle", { r: 260, fill: "url(#sunCore)" }), /* @__PURE__ */ React.createElement("circle", { r: 120, fill: "#fff7e1", opacity: "0.65" })),
        [0, 1, 2, 3, 4].map((i) => /* @__PURE__ */ React.createElement(
          "ellipse",
          {
            key: i,
            cx: "500",
            cy: 1100 + i * 40,
            rx: 700 + i * 120,
            ry: 40 + i * 15,
            fill: "none",
            stroke: "#fff",
            strokeOpacity: 0.06 - i * 8e-3,
            strokeWidth: "1"
          }
        )),
        orbs.map((o, i) => {
          const phase = (t + o.delay) % o.dur / o.dur;
          const y = o.y - phase * 600;
          const x = o.x + Math.sin((t / 1200 + i) * 0.8) * 60;
          const op = Math.sin(phase * Math.PI) * 0.9;
          return /* @__PURE__ */ React.createElement("circle", { key: i, cx: x, cy: y, r: o.r, fill: "url(#orb)", opacity: op });
        }),
        /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "500",
            y: "780",
            textAnchor: "middle",
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: "300",
            fontSize: "180",
            fill: "#5a2b1c",
            opacity: "0.10",
            letterSpacing: "-4"
          },
          "golden hour"
        ),
        /* @__PURE__ */ React.createElement("rect", { width: "1000", height: "1400", filter: "url(#grain)", opacity: "0.6" })
      )
    );
  }
  function WaxAnim({ progress = 0, speed = 1 }) {
    const t = useTime(speed);
    const pull = Math.abs(progress);
    const ribbons = useMemo(() => Array.from({ length: 7 }).map((_, i) => ({
      base: 200 + i * 140,
      amp: 60 + i % 3 * 30,
      freq: 35e-4 + i % 4 * 8e-4,
      phase: i * 1.7,
      op: 0.5 - i * 0.05
    })), []);
    const buildPath = (r, time) => {
      const pts = [];
      for (let x = -50; x <= 1050; x += 30) {
        const y = r.base + Math.sin(x * r.freq + time / 1100 + r.phase) * r.amp + Math.sin(x * r.freq * 2.2 + time / 700) * (r.amp * 0.3);
        pts.push([x, y]);
      }
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        const cx = (x0 + x1) / 2;
        d += ` Q ${x0} ${y0} ${cx} ${(y0 + y1) / 2}`;
      }
      return d;
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "anim-canvas",
        "aria-hidden": true,
        style: { background: "linear-gradient(180deg, #f7e6df 0%, #f2d4ca 60%, #e8b6a8 100%)" }
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          viewBox: "0 0 1000 1400",
          preserveAspectRatio: "xMidYMid slice",
          style: { width: "100%", height: "100%", display: "block" }
        },
        /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "silk", x1: "0", x2: "1", y1: "0", y2: "0" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#fff", stopOpacity: "0.0" }), /* @__PURE__ */ React.createElement("stop", { offset: "50%", stopColor: "#fff", stopOpacity: "0.55" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#fff", stopOpacity: "0.0" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "silk2", x1: "0", x2: "0", y1: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#b46a55", stopOpacity: "0.0" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#7a3a2c", stopOpacity: "0.5" }))),
        /* @__PURE__ */ React.createElement("rect", { y: "900", width: "1000", height: "500", fill: "url(#silk2)" }),
        ribbons.map((r, i) => /* @__PURE__ */ React.createElement(
          "path",
          {
            key: i,
            d: buildPath(r, t),
            stroke: "#fff",
            strokeOpacity: r.op * 0.7,
            strokeWidth: 2.2,
            fill: "none"
          }
        )),
        /* @__PURE__ */ React.createElement(
          "g",
          {
            transform: `translate(${-200 + pull * 1200} 0) rotate(${-6 + pull * 8} 200 700)`,
            opacity: 0.4 + pull * 0.6
          },
          /* @__PURE__ */ React.createElement("rect", { x: "0", y: "500", width: "280", height: "180", fill: "url(#silk)" }),
          /* @__PURE__ */ React.createElement("rect", { x: "0", y: "540", width: "280", height: "100", fill: "#fff", opacity: "0.35" })
        ),
        /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "500",
            y: "1040",
            textAnchor: "middle",
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: "300",
            fontSize: "160",
            fill: "#5a2820",
            opacity: "0.10",
            letterSpacing: "-3"
          },
          "smooth"
        )
      )
    );
  }
  const LASH_MAPS = [
    { name: "WISPY", sub: "9\u201313 MM", zones: [10, 13, 9, 13, 10], clusters: 13, strands: [5, 6], spread: 11, curlK: 40, tipK: 0.14, wisp: true },
    { name: "OPEN EYE", sub: "9\u201314 MM", zones: [9, 12, 14, 12, 9], clusters: 11, strands: [4, 5], spread: 7, curlK: 20, tipK: 0.18 },
    { name: "CAT EYE", sub: "8\u201313 MM", zones: [8, 10, 11, 12, 13], clusters: 11, strands: [4, 5], spread: 8, curlK: 46, tipK: 0.16 },
    { name: "ANIME", sub: "12\u201316 MM", zones: [12, 15, 13, 16, 14], clusters: 9, strands: [3, 4], spread: 13, curlK: 26, tipK: 0.1, spike: true }
  ];
  function LashAnim({ progress = 0, speed = 1 }) {
    const t = useTime(speed);
    const A = [260, 600], B = [740, 600], C = [500, 410];
    const MM = 13;
    const FONT_MAP = "JetBrains Mono, ui-monospace, monospace";
    const qAt = (s2) => {
      const u = 1 - s2;
      const px = u * u * A[0] + 2 * u * s2 * C[0] + s2 * s2 * B[0];
      const py = u * u * A[1] + 2 * u * s2 * C[1] + s2 * s2 * B[1];
      const tx2 = 2 * u * (C[0] - A[0]) + 2 * s2 * (B[0] - C[0]);
      const ty2 = 2 * u * (C[1] - A[1]) + 2 * s2 * (B[1] - C[1]);
      const tl = Math.hypot(tx2, ty2);
      return { px, py, nx: ty2 / tl, ny: -tx2 / tl };
    };
    const maps = useMemo(() => LASH_MAPS.map((m) => {
      const nz = m.zones.length;
      const lashes = [];
      for (let k2 = 0; k2 < m.clusters; k2++) {
        const s2 = k2 / (m.clusters - 1);
        const zone = Math.min(nz - 1, Math.floor(s2 * nz));
        const root = qAt(s2);
        const baseLen = m.zones[zone] * MM + k2 * 37 % 9;
        const curl = (s2 - 0.42) * m.curlK;
        const strands = m.strands[k2 % m.strands.length];
        for (let j = 0; j < strands; j++) {
          const off = j - (strands - 1) / 2;
          const mid = Math.abs(off) < 0.6;
          let len = baseLen * (1 - Math.abs(off) * m.tipK);
          if (mid && m.spike) len *= 1.22;
          if (mid && m.wisp && k2 % 2 === 0) len *= 1.3;
          lashes.push({
            ...root,
            zone,
            curl,
            cluster: k2,
            spread: off * m.spread,
            len,
            mid,
            jig: (k2 * 97 + j * 31) % 60
          });
        }
      }
      const dividers = Array.from({ length: nz + 1 }).map((_, kk) => {
        var _a, _b;
        const q = qAt(kk / nz);
        const L = Math.max((_a = m.zones[kk - 1]) != null ? _a : 0, (_b = m.zones[kk]) != null ? _b : 0) * MM;
        return { ...q, reach: L + 46 };
      });
      const zoneLabels = m.zones.map((mm, z) => {
        const q = qAt((z + 0.5) / nz);
        return {
          mm,
          z,
          lx: q.px + q.nx * (mm * MM + 62),
          ly: Math.max(292, q.py + q.ny * (mm * MM + 62))
        };
      });
      return { ...m, lashes, dividers, zoneLabels };
    }), []);
    const sparks = useMemo(() => Array.from({ length: 16 }).map((_, i) => ({
      x: i * 173 % 1e3,
      y: i * 337 % 1300,
      tw: 1400 + i * 211 % 1800,
      ph: i * 727 % 1e3
    })), []);
    const N_ZONES = 5;
    const OPEN_DUR = 320, CLOSE_DUR = 320, ZONE_DUR = 780;
    const HILITE = N_ZONES * ZONE_DUR;
    const MAP_CYCLE = OPEN_DUR + HILITE + CLOSE_DUR;
    const cyc = Math.floor(t / MAP_CYCLE);
    const local = t - cyc * MAP_CYCLE;
    const M = maps[(cyc % maps.length + maps.length) % maps.length];
    let blinkClose = 0, zi = -1;
    if (local < OPEN_DUR) {
      blinkClose = 1 - local / OPEN_DUR;
    } else if (local < OPEN_DUR + HILITE) {
      zi = Math.min(N_ZONES - 1, Math.floor((local - OPEN_DUR) / ZONE_DUR));
    } else {
      blinkClose = (local - OPEN_DUR - HILITE) / CLOSE_DUR;
    }
    const closed = Math.min(1, Math.max(blinkClose, Math.abs(progress) * 1.4));
    const open = 1 - closed * 0.92;
    const sway = Math.sin(t / 2600) * 1.4;
    const glow = 0.42 + Math.sin(t / 1900) * 0.14;
    const W = typeof window !== "undefined" ? window.innerWidth : 1200;
    const H = typeof window !== "undefined" ? window.innerHeight : 800;
    const s = Math.max(W / 1e3, H / 1400);
    const visLeft = 500 - W / s / 2, visW = W / s;
    const visTop = 700 - H / s / 2, visH = H / s;
    const wide = W / H > 1.2;
    const tall = W / H < 0.8;
    const BX0 = 157, BX1 = 883, BY0 = 160, BY1 = 725, EYE_CX = 500;
    const bw = BX1 - BX0, bh = BY1 - BY0;
    const topLimit = visTop + 200 / s + 12;
    const botLimit = visTop + visH * (wide ? 0.6 : tall ? 0.58 : 0.5);
    const availH = Math.max(40, botLimit - topLimit);
    const availW = visW * (wide ? 0.52 : tall ? 0.98 : 0.94);
    const k = Math.max(0.14, Math.min(wide ? 0.5 : tall ? 0.66 : 0.5, availH / bh, availW / bw));
    const ty = topLimit + (availH - k * bh) / 2 - k * BY0;
    const tx = wide ? visLeft + visW * 0.97 - k * BX1 : visLeft + visW / 2 - k * EYE_CX;
    const fit = `translate(${tx} ${ty}) scale(${k})`;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "anim-canvas",
        "aria-hidden": true,
        style: { background: "linear-gradient(180deg, #efeae0 0%, #ece4ea 55%, #e3d8ec 100%)" }
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          viewBox: "0 0 1000 1400",
          preserveAspectRatio: "xMidYMid slice",
          style: { width: "100%", height: "100%", display: "block" }
        },
        /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "lashGlow", cx: "50%", cy: "50%", r: "50%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#c9b6e6", stopOpacity: "0.55" }), /* @__PURE__ */ React.createElement("stop", { offset: "55%", stopColor: "#b39ad8", stopOpacity: "0.25" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#b39ad8", stopOpacity: "0" }))),
        /* @__PURE__ */ React.createElement("g", { transform: fit }, /* @__PURE__ */ React.createElement("circle", { cx: "500", cy: "560", r: "430", fill: "url(#lashGlow)", opacity: glow * (1 - closed * 0.5) }), /* @__PURE__ */ React.createElement("g", { transform: `rotate(${sway} 500 600)` }, /* @__PURE__ */ React.createElement("g", { transform: `translate(500 604) scale(1 ${open}) translate(-500 -604)` }, /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M260 600 Q500 410 740 600",
            fill: "none",
            stroke: "#141210",
            strokeWidth: "5",
            strokeLinecap: "round",
            opacity: "0.85"
          }
        ), M.lashes.map((l, i) => {
          const flut = Math.sin(t / 560 + l.cluster * 0.9) * 1.3 + Math.sin(t / 1400 + l.jig) * 0.4;
          const tipX = l.px + l.nx * l.len;
          const tipY = l.py + l.ny * l.len;
          const active = l.zone === zi;
          return /* @__PURE__ */ React.createElement("g", { key: i, transform: `rotate(${flut + l.spread} ${l.px} ${l.py})` }, /* @__PURE__ */ React.createElement(
            "path",
            {
              d: `M${l.px} ${l.py} Q ${l.px + l.nx * l.len * 0.55} ${l.py + l.ny * l.len * 0.62} ${tipX + l.curl} ${tipY}`,
              fill: "none",
              stroke: "#141210",
              strokeWidth: l.mid ? active ? 3 : 2.4 : active ? 2 : 1.5,
              strokeLinecap: "round",
              opacity: l.mid ? active ? 0.92 : 0.55 : active ? 0.7 : 0.4
            }
          ));
        })), /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M260 600 Q500 685 740 600",
            fill: "none",
            stroke: "#141210",
            strokeWidth: "4",
            strokeLinecap: "round",
            opacity: closed * 0.9
          }
        ), /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M330 640 Q500 715 670 640",
            fill: "none",
            stroke: "#141210",
            strokeWidth: "1.6",
            opacity: 0.22 * (1 - closed)
          }
        )), /* @__PURE__ */ React.createElement("g", null, M.dividers.map((d, k2) => /* @__PURE__ */ React.createElement(
          "line",
          {
            key: k2,
            x1: d.px - d.nx * 14,
            y1: d.py - d.ny * 14,
            x2: d.px + d.nx * d.reach,
            y2: d.py + d.ny * d.reach,
            stroke: "#141210",
            strokeWidth: "1.2",
            strokeDasharray: "3 8",
            opacity: "0.3"
          }
        )), M.zoneLabels.map((zl) => /* @__PURE__ */ React.createElement(
          "text",
          {
            key: zl.z,
            x: zl.lx,
            y: zl.ly,
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "30",
            fill: "#141210",
            opacity: zl.z === zi ? 0.85 : 0.38
          },
          zl.mm
        )), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "500",
            y: "184",
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "20",
            letterSpacing: "7",
            fill: "#3a2c50",
            opacity: "0.5"
          },
          "LASH MAP"
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "500",
            y: "214",
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "15",
            letterSpacing: "5",
            fill: "#3a2c50",
            opacity: "0.42"
          },
          M.name,
          " \xB7 ",
          M.sub
        ), /* @__PURE__ */ React.createElement("line", { x1: "260", y1: "614", x2: "260", y2: "632", stroke: "#141210", strokeWidth: "1.2", opacity: "0.35" }), /* @__PURE__ */ React.createElement("line", { x1: "740", y1: "614", x2: "740", y2: "632", stroke: "#141210", strokeWidth: "1.2", opacity: "0.35" }), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "260",
            y: "662",
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "15",
            letterSpacing: "3",
            fill: "#141210",
            opacity: "0.4"
          },
          "INNER"
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "740",
            y: "662",
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "15",
            letterSpacing: "3",
            fill: "#141210",
            opacity: "0.4"
          },
          "OUTER"
        ))),
        sparks.map((s2, i) => {
          const tw = Math.max(0, Math.sin((t + s2.ph) / s2.tw * Math.PI * 2));
          const r = 2.2 + tw * 3.2;
          return /* @__PURE__ */ React.createElement("g", { key: i, transform: `translate(${s2.x} ${s2.y})`, opacity: tw * 0.55 }, /* @__PURE__ */ React.createElement("path", { d: `M0 ${-r} L${r * 0.32} 0 L0 ${r} L${-r * 0.32} 0 Z`, fill: "#7a5fae" }), /* @__PURE__ */ React.createElement("path", { d: `M${-r} 0 L0 ${r * 0.32} L${r} 0 L0 ${-r * 0.32} Z`, fill: "#7a5fae" }));
        }),
        /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "500",
            y: "1060",
            textAnchor: "middle",
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: "300",
            fontSize: "170",
            fill: "#3a2c50",
            opacity: "0.09",
            letterSpacing: "-3"
          },
          "flutter"
        )
      )
    );
  }
  const CUT_STYLES = [
    { name: "FLOW", cat: "MID", img: "assets/cut-flow.webp" },
    { name: "TEXTURED QUIFF", cat: "MID", img: "assets/cut-textured-quiff.webp" },
    { name: "TEXTURED CROP", cat: "TAPER", img: "assets/cut-textured-crop.webp" },
    { name: "BUZZ CUT", cat: "SKIN FADE", img: "assets/cut-buzz-skin-fade.webp" },
    { name: "CURLY CROP", cat: "CURLS", img: "assets/cut-curly-crop.webp" }
  ];
  function BarberCutAnim({ progress = 0, speed = 1 }) {
    const FONT_MAP = "JetBrains Mono, ui-monospace, monospace";
    const IW = 500, IH = 624, IX = 500 - IW / 2, IY = 236;
    const CY = IY + IH / 2;
    const dim = 1 - Math.min(1, Math.abs(progress)) * 0.6;
    const bobRef = useRef();
    const breatheRef = useRef();
    const auraRef = useRef();
    const subRef = useRef();
    const imgRefs = useRef([]);
    const shownRef = useRef(0);
    const progRef = useRef(progress);
    progRef.current = progress;
    useEffect(() => {
      const n = CUT_STYLES.length;
      const FADE_IN = 650, HOLD = 3800, FADE_OUT = 650, GAP = 220;
      const CYCLE = FADE_IN + HOLD + FADE_OUT + GAP;
      const ease = (x) => x * x * (3 - 2 * x);
      let raf, last = performance.now(), t = 0;
      const tick = (now) => {
        const dt = Math.min(48, now - last);
        last = now;
        if (Math.abs(progRef.current) >= 1) {
          raf = requestAnimationFrame(tick);
          return;
        }
        t += dt * speed;
        const tt = t + FADE_IN + 900;
        const cyc = Math.floor(tt / CYCLE);
        const local = tt - cyc * CYCLE;
        const idx = (cyc % n + n) % n;
        let alpha, breathe;
        if (local < FADE_IN) {
          const x = ease(local / FADE_IN);
          alpha = x;
          breathe = 0.965 + 0.035 * x;
        } else if (local < FADE_IN + HOLD) {
          alpha = 1;
          breathe = 1 + 0.02 * ((local - FADE_IN) / HOLD);
        } else if (local < FADE_IN + HOLD + FADE_OUT) {
          const x = ease((local - FADE_IN - HOLD) / FADE_OUT);
          alpha = 1 - x;
          breathe = 1.02 + 0.015 * x;
        } else {
          alpha = 0;
          breathe = 1;
        }
        const sway = Math.sin(t / 2800) * 1;
        const bob = Math.sin(t / 2100) * 5;
        const glow = 0.4 + Math.sin(t / 2e3) * 0.12;
        if (bobRef.current)
          bobRef.current.setAttribute(
            "transform",
            `translate(0 ${bob}) rotate(${sway} 500 ${CY})`
          );
        if (breatheRef.current) {
          breatheRef.current.setAttribute("opacity", alpha);
          breatheRef.current.setAttribute(
            "transform",
            `translate(500 ${CY}) scale(${breathe}) translate(-500 ${-CY})`
          );
        }
        if (auraRef.current) auraRef.current.setAttribute("opacity", glow);
        if (subRef.current) {
          subRef.current.setAttribute("opacity", 0.42 * (0.3 + 0.7 * alpha));
          if (idx !== shownRef.current)
            subRef.current.textContent = `${CUT_STYLES[idx].name} \xB7 ${CUT_STYLES[idx].cat}`;
        }
        if (idx !== shownRef.current) {
          imgRefs.current.forEach((im, i) => {
            if (im) im.setAttribute("opacity", i === idx ? 1 : 0);
          });
          shownRef.current = idx;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [speed]);
    const C0 = CUT_STYLES[0];
    const W = typeof window !== "undefined" ? window.innerWidth : 1200;
    const H = typeof window !== "undefined" ? window.innerHeight : 800;
    const s = Math.max(W / 1e3, H / 1400);
    const visLeft = 500 - W / s / 2, visW = W / s;
    const visTop = 700 - H / s / 2, visH = H / s;
    const wide = W / H > 1.2;
    const tall = W / H < 0.8;
    const BX0 = 260, BX1 = 740, BY0 = 160, BY1 = 880, CX = 500;
    const bw = BX1 - BX0, bh = BY1 - BY0;
    const topLimit = visTop + (tall ? 150 : 200) / s + 12;
    const botLimit = visTop + visH * (wide ? 0.74 : tall ? 0.7 : 0.64);
    const availH = Math.max(40, botLimit - topLimit);
    const availW = visW * (wide ? 0.62 : tall ? 0.98 : 0.94);
    const k = Math.max(0.14, Math.min(wide ? 0.72 : tall ? 0.92 : 0.72, availH / bh, availW / bw));
    const ty = topLimit + (availH - k * bh) / 2 - k * BY0;
    const tx = wide ? visLeft + visW * 0.97 - k * BX1 : visLeft + visW / 2 - k * CX;
    const fit = `translate(${tx} ${ty}) scale(${k})`;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "anim-canvas",
        "aria-hidden": true,
        style: { background: "linear-gradient(180deg, #efeae0 0%, #ece7dd 55%, #e8dccb 100%)" }
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          viewBox: "0 0 1000 1400",
          preserveAspectRatio: "xMidYMid slice",
          style: { width: "100%", height: "100%", display: "block" }
        },
        /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "cutGlow", cx: "50%", cy: "50%", r: "50%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#e2bd93", stopOpacity: "0.5" }), /* @__PURE__ */ React.createElement("stop", { offset: "55%", stopColor: "#cfa170", stopOpacity: "0.22" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#cfa170", stopOpacity: "0" }))),
        /* @__PURE__ */ React.createElement("g", { transform: fit, opacity: dim }, /* @__PURE__ */ React.createElement(
          "circle",
          {
            ref: auraRef,
            cx: "500",
            cy: "548",
            r: "430",
            fill: "url(#cutGlow)",
            opacity: "0.4"
          }
        ), /* @__PURE__ */ React.createElement("g", { ref: bobRef }, /* @__PURE__ */ React.createElement("g", { ref: breatheRef, opacity: "1" }, CUT_STYLES.map((cst, i) => /* @__PURE__ */ React.createElement(
          "image",
          {
            key: i,
            ref: (el) => {
              imgRefs.current[i] = el;
            },
            href: cst.img,
            x: IX,
            y: IY,
            width: IW,
            height: IH,
            preserveAspectRatio: "xMidYMid slice",
            opacity: i === 0 ? 1 : 0
          }
        )))), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: "500",
            y: "184",
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "20",
            letterSpacing: "7",
            fill: "#50352c",
            opacity: "0.5"
          },
          "CUT LAB"
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            ref: subRef,
            x: "500",
            y: "214",
            textAnchor: "middle",
            fontFamily: FONT_MAP,
            fontSize: "15",
            letterSpacing: "5",
            fill: "#50352c",
            opacity: "0.42"
          },
          C0.name,
          " \xB7 ",
          C0.cat
        ))
      )
    );
  }
  function HomeAura() {
    return /* @__PURE__ */ React.createElement("div", { className: "anim-canvas home-aura", "aria-hidden": true }, /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-a" }), /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-b" }), /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-c" }), /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-d" }));
  }
  Object.assign(window, { HomeAnim, HomeAura, BarberAnim, TanAnim, WaxAnim, LashAnim, BarberCutAnim });
})();
