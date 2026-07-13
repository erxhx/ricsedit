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
  function HomeAura() {
    return /* @__PURE__ */ React.createElement("div", { className: "anim-canvas home-aura", "aria-hidden": true }, /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-a" }), /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-b" }), /* @__PURE__ */ React.createElement("span", { className: "aura-blob aura-c" }));
  }
  Object.assign(window, { HomeAnim, HomeAura, BarberAnim, TanAnim, WaxAnim });
})();
