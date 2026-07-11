(() => {
  (function() {
    var BK_BARBER = [
      { id: "haircut", name: "Haircut", desc: "Signature cut and style.", price: 40, duration: 45 },
      { id: "beard", name: "Beard Trim", desc: "Trim, shape, line, oil.", price: 25, duration: 30 },
      { id: "haircut-beard", name: "Haircut + Beard", desc: "The whole package.", price: 60, duration: 60 },
      { id: "freshen-haircut", name: "Freshen Up \u2014 Cut", desc: "Must be within 2 weeks of last service.", price: 25, duration: 45 },
      { id: "freshen-both", name: "Freshen Up \u2014 Cut + Beard", desc: "Must be within 2 weeks of last service.", price: 40, duration: 60 },
      { id: "kids", name: "Kids Cut", desc: "Ages 10 and under.", price: 30, duration: 45 },
      { id: "senior", name: "Senior Cut", desc: "Ages 65+.", price: 30, duration: 30 }
    ];
    var BK_TAN = [
      { id: "classic", name: "Classic Full Body", desc: "Personalized colour analysis, skin/hair/nail barriers, shimmering finish. Develops in 8\u201312 hours.", price: 60, duration: 45 },
      { id: "rapid", name: "Rapid Full Body", desc: "Develops in 1\u20135 hours \u2014 perfect on the go.", price: 70, duration: 45 },
      { id: "face", name: "Face Tan", desc: "Face and neck. Skincare-grade glow.", price: 15, duration: 20 }
    ];
    var BK_TAN_ADDONS = [
      { id: "bra", name: "Disposable Bra", desc: "Bandeau style.", price: 5, duration: 0 },
      { id: "undies", name: "Disposable Undies", desc: "", price: 5, duration: 0 },
      { id: "prep-lock", name: "Prep + Lock", desc: "Two-step longevity treatment \u2014 pH-balance prep + post-tan barrier lock. Extends your glow.", price: 20, duration: 20 }
    ];
    var BK_WAX_GROUPS = [
      {
        label: "Brows + Face",
        items: [
          { id: "brow-wax", name: "Brow Wax & Shape", desc: "Map, wax, tweeze, finish.", price: 25, duration: 30 },
          { id: "brow-tint", name: "Brow Tint", desc: "Define and deepen.", price: 15, duration: 20 },
          { id: "lash-tint", name: "Lash Tint", desc: "No mascara required.", price: 25, duration: 30 },
          { id: "upper-lip", name: "Upper Lip", desc: "", price: 10, duration: 15 },
          { id: "chin", name: "Chin", desc: "", price: 15, duration: 15 },
          { id: "cheek", name: "Cheek", desc: "An ultra-smooth base for makeup + skincare absorption.", price: 15, duration: 20 }
        ]
      },
      {
        label: "Body",
        items: [
          { id: "underarm", name: "Underarm", desc: "Five minutes. Two weeks smooth.", price: 20, duration: 15 },
          { id: "half-arm", name: "Half Arm", desc: "Upper or lower.", price: 25, duration: 25 },
          { id: "full-arm", name: "Full Arm", desc: "", price: 45, duration: 40 },
          { id: "stomach", name: "Stomach", desc: "", price: 25, duration: 25 },
          { id: "chest", name: "Chest", desc: "", price: 35, duration: 30 },
          { id: "shoulder", name: "Shoulder", desc: "", price: 25, duration: 25 },
          { id: "half-back", name: "Half Back", desc: "Upper or lower.", price: 30, duration: 25 },
          { id: "full-back", name: "Full Back", desc: "", price: 50, duration: 45 },
          { id: "half-leg", name: "Half Leg", desc: "Upper or lower.", price: 35, duration: 30 },
          { id: "full-leg", name: "Full Leg", desc: "", price: 70, duration: 55 }
        ]
      },
      {
        label: "Bikini",
        note: "female genitalia services only (V)",
        items: [
          { id: "bikini", name: "Bikini", desc: "Removes hair visible outside of underwear or bikini area.", price: 35, duration: 30 },
          { id: "french", name: "French", desc: "In between a Brazilian and a Bikini. Includes bikini area and between the cheeks.", price: 45, duration: 35 },
          { id: "brazilian", name: "Brazilian", desc: "All hair removed, including between the cheeks.", price: 50, duration: 40 },
          { id: "bum-cheeks", name: "Bum Cheeks", desc: "Does not include between the cheeks.", price: 30, duration: 25 }
        ]
      }
    ];
    var BK_LASHES = [
      { id: "lash-classic-set", name: "Classic Full Set", desc: "One extension per natural lash \u2014 a natural, mascara-like finish.", price: 150, duration: 120 },
      { id: "lash-classic-fill", name: "Classic Fill", desc: "Must have minimum 50% retention.", price: 80, duration: 60 },
      { id: "lash-hybrid-set", name: "Hybrid Full Set", desc: "A mix of classic and volume for texture and fullness.", price: 180, duration: 135 },
      { id: "lash-hybrid-fill", name: "Hybrid Fill", desc: "Must have minimum 50% retention.", price: 95, duration: 75 },
      { id: "lash-volume-set", name: "Volume Full Set", desc: "Multiple lightweight extensions per lash for a fuller look.", price: 220, duration: 150 },
      { id: "lash-volume-fill", name: "Volume Fill", desc: "Must have minimum 50% retention.", price: 110, duration: 80 },
      { id: "lash-mega-set", name: "Mega Volume Set", desc: "Maximum density for a dramatic, full finish.", price: 245, duration: 165 },
      { id: "lash-mega-fill", name: "Mega Volume Fill", desc: "Must have minimum 50% retention.", price: 125, duration: 90 },
      { id: "lash-removal", name: "Lash Removal", desc: "Safe, gentle removal of existing extensions.", price: 30, duration: 15 },
      { id: "lash-lift-tint", name: "Lash Lift and Tint", desc: "Lifts and tints your natural lashes \u2014 no extensions.", price: 100, duration: 60 },
      { id: "lash-lift", name: "Lash Lift", desc: "Lifts and curls your natural lashes.", price: 90, duration: 30 },
      { id: "lash-brow-lam-tint", name: "Brow Lamination and Tint", desc: "Smooths, sets and tints brows for a fuller shape.", price: 120, duration: 60 },
      { id: "lash-brow-tint", name: "Brow Tint", desc: "Define and deepen the brows.", price: 75, duration: 30 },
      { id: "lash-bundle-brow-lash", name: "Bundle \u2014 Brow Lamination and Tint + Lash Lift and Tint", desc: "Brow lamination & tint paired with a lash lift & tint.", price: 210, duration: 105 }
    ];
    function mapSvc(s) {
      return { id: s.id, name: s.name, desc: s.description || "", price: s.price, duration: s.durationMinutes };
    }
    (function() {
      var endpoint = (window.__booking || {}).endpoint || "";
      var base = endpoint.replace(/\/api\/booking\/create$/, "") || window.location.origin;
      if (!base) return;
      fetch(base + "/api/booking/services").then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(d) {
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
          BK_WAX_GROUPS = d.waxGroups.map(function(g) {
            return { label: g.name, note: g.note || "", items: (g.services || []).map(mapSvc) };
          });
        }
        if (Array.isArray(d.lashServices) && d.lashServices.length) {
          BK_LASHES = d.lashServices.map(mapSvc);
        }
      }).catch(function() {
      });
    })();
    var BK_HOURS = { 0: [10, 18], 1: null, 2: null, 3: [10, 18], 4: [10, 18], 5: [10, 18], 6: [10, 18] };
    var BK_BARBER_THU_CLOSE = 21;
    var BK_STAFF_HOURS = { eric: null, livi: null, niamh: null };
    function bkCategoryStaff(category) {
      if (category === "barber") return "eric";
      if (category === "lashes") return "niamh";
      return "livi";
    }
    function bkHoursForCategory(category) {
      var staffId = bkCategoryStaff(category);
      return BK_STAFF_HOURS[staffId] || BK_HOURS;
    }
    (function() {
      var endpoint = (window.__booking || {}).endpoint || "";
      var base = endpoint.replace(/\/api\/booking\/create$/, "") || window.location.origin;
      if (!base) return;
      fetch(base + "/api/booking/hours").then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(cfg) {
        if (!cfg) return;
        if (cfg.days) {
          var h = {};
          Object.keys(cfg.days).forEach(function(k) {
            var v = cfg.days[k];
            h[Number(k)] = Array.isArray(v) ? v : null;
          });
          BK_HOURS = h;
        }
        if (typeof cfg.barberThuClose === "number") {
          BK_BARBER_THU_CLOSE = cfg.barberThuClose;
        }
        if (cfg.staff) {
          ["eric", "livi", "niamh"].forEach(function(id) {
            var sd = cfg.staff[id] && cfg.staff[id].days;
            if (sd) {
              var sh = {};
              Object.keys(sd).forEach(function(k) {
                var v = sd[k];
                sh[Number(k)] = Array.isArray(v) ? v : null;
              });
              BK_STAFF_HOURS[id] = sh;
            }
          });
        }
      }).catch(function() {
      });
    })();
    function bkFmtPrice(n) {
      return "$" + n;
    }
    function bkFmtTime(h, m) {
      m = m || 0;
      var period = h >= 12 ? "pm" : "am";
      var disp = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return disp + (m > 0 ? ":" + String(m).padStart(2, "0") : "") + period;
    }
    function bkFmtDate(d) {
      return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
    }
    function bkTotalDuration(svcs) {
      return svcs.reduce(function(s, x) {
        return s + (x.duration || 0);
      }, 0);
    }
    function bkTotalPrice(svcs) {
      return svcs.reduce(function(s, x) {
        return s + (x.price || 0);
      }, 0);
    }
    function bkTodayPacific() {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Vancouver",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      var parts = fmt.formatToParts(/* @__PURE__ */ new Date());
      var get = function(t) {
        return parseInt(parts.find(function(p) {
          return p.type === t;
        }).value, 10);
      };
      return new Date(get("year"), get("month") - 1, get("day"));
    }
    function bkAvailableSlots(date, durationMins, category, bookedRanges) {
      var dow = date.getDay();
      var hrs = bkHoursForCategory(category)[dow];
      if (!hrs) return [];
      var open = hrs[0] * 60;
      var close = hrs[1] * 60;
      if (category === "barber" && dow === 4) close = BK_BARBER_THU_CLOSE * 60;
      var isBarber = category === "barber";
      var step = isBarber ? 45 : 15;
      var deadline = close + (isBarber ? 15 : 0);
      var sorted = (bookedRanges || []).slice().sort(function(a, b) {
        return a.startMinutes - b.startMinutes;
      });
      var slots = [];
      var cursor = open;
      while (cursor + durationMins <= deadline) {
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
        var overlapEnd = -1;
        for (var j = 0; j < sorted.length; j++) {
          var r2 = sorted[j];
          if (cursor < r2.startMinutes + r2.durationMinutes && cursor + durationMins > r2.startMinutes) {
            overlapEnd = r2.startMinutes + r2.durationMinutes;
            break;
          }
        }
        if (overlapEnd >= 0) {
          cursor = overlapEnd;
        } else {
          slots.push({ h: Math.floor(cursor / 60), m: cursor % 60 });
          cursor += step;
        }
      }
      return slots;
    }
    function bkDates(n) {
      var today = bkTodayPacific();
      var result = [];
      for (var i = 0; i < n; i++) {
        var d = new Date(today);
        d.setDate(today.getDate() + i);
        result.push(d);
      }
      return result;
    }
    var BK_INTAKE_FORMS = { tan: null, wax: null, lashes: null };
    (function() {
      var endpoint = (window.__booking || {}).endpoint || "";
      var base = endpoint.replace(/\/api\/booking\/create$/, "") || window.location.origin;
      ["tan", "wax", "lashes"].forEach(function(cat) {
        fetch(base + "/api/booking/intake-form?category=" + cat).then(function(r) {
          return r.ok ? r.json() : null;
        }).then(function(d) {
          if (d) BK_INTAKE_FORMS[cat] = d;
        }).catch(function() {
        });
      });
    })();
    var BK_SQUARE_SDK_PROMISE = null;
    function bkLoadSquareSdk(env) {
      if (window.Square) return Promise.resolve();
      if (BK_SQUARE_SDK_PROMISE) return BK_SQUARE_SDK_PROMISE;
      BK_SQUARE_SDK_PROMISE = new Promise(function(resolve, reject) {
        var s = document.createElement("script");
        s.src = env === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
        s.onload = resolve;
        s.onerror = function() {
          BK_SQUARE_SDK_PROMISE = null;
          reject(new Error("Payment form failed to load."));
        };
        document.head.appendChild(s);
      });
      return BK_SQUARE_SDK_PROMISE;
    }
    function bkUuid() {
      return window.crypto && crypto.randomUUID ? crypto.randomUUID() : "xxxx-4xxx-yxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        return (c === "x" ? r : r & 3 | 8).toString(16);
      }) + "-" + Date.now();
    }
    var BK_CONTACTS_KEY = "es-contacts";
    function bkLoadContacts() {
      try {
        return JSON.parse(localStorage.getItem(BK_CONTACTS_KEY) || "[]");
      } catch (e) {
        return [];
      }
    }
    function bkSaveContact(form) {
      try {
        var contacts = bkLoadContacts();
        var key = (form.firstName + " " + form.lastName).toLowerCase().trim() + "|" + form.phone.replace(/\D/g, "");
        contacts = contacts.filter(function(c) {
          return (c.firstName + " " + c.lastName).toLowerCase().trim() + "|" + c.phone.replace(/\D/g, "") !== key;
        });
        contacts.unshift({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone });
        localStorage.setItem(BK_CONTACTS_KEY, JSON.stringify(contacts.slice(0, 8)));
      } catch (e) {
      }
    }
    function BkEyebrow(props) {
      return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("span", null, props.left), props.right && /* @__PURE__ */ React.createElement("span", null, props.right));
    }
    function BkBack(props) {
      if (!props.onClick) return null;
      return /* @__PURE__ */ React.createElement("button", { onClick: props.onClick, style: { appearance: "none", border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 } }, "\u2190 Back");
    }
    function BkBtn(props) {
      var { useState } = React;
      var [hover, setHover] = useState(false);
      var disabled = props.disabled;
      var secondary = props.secondary;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: props.onClick,
          disabled,
          onMouseEnter: function() {
            setHover(true);
          },
          onMouseLeave: function() {
            setHover(false);
          },
          style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: hover && !disabled ? 18 : 12,
            padding: "18px 22px",
            width: "100%",
            background: secondary ? "transparent" : disabled ? "color-mix(in srgb,var(--rule) 60%,transparent)" : "var(--ink)",
            color: secondary ? "var(--ink-soft)" : disabled ? "var(--ink-faint)" : "var(--bg)",
            border: secondary ? "1px solid var(--rule)" : "none",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: 1,
            cursor: disabled ? "default" : "pointer",
            transition: "gap 0.4s cubic-bezier(0.34,1.2,0.64,1), background 0.3s ease"
          }
        },
        /* @__PURE__ */ React.createElement("span", null, props.children),
        /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontStyle: "italic", fontSize: 16, lineHeight: 1 } }, "\u2192")
      );
    }
    function BkServiceRow(props) {
      var s = props.service;
      var active = props.active;
      var prefix = props.prefix || "";
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: props.onClick,
          style: {
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            padding: "15px 0 15px " + (active ? "10px" : "0"),
            background: active ? "var(--paper)" : "var(--bg)",
            color: "var(--ink)",
            border: "none",
            borderLeft: active ? "2px solid var(--ink)" : "2px solid transparent",
            cursor: "pointer",
            textAlign: "left",
            alignItems: "baseline",
            width: "100%",
            transition: "background 0.15s ease"
          }
        },
        /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 20, fontWeight: 400, display: "block", lineHeight: 1.15 } }, s.name), s.desc && /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)", marginTop: 3, display: "block", lineHeight: 1.4 } }, s.desc)),
        /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.04em", whiteSpace: "nowrap" } }, prefix, bkFmtPrice(s.price))
      );
    }
    function StepCategory(props) {
      var cats = [
        { id: "barber", num: "01", label: "Barbering", hint: "Crafted haircuts and beards" },
        { id: "tan", num: "02", label: "Sunless", hint: "Custom-blended spray tans" },
        { id: "wax", num: "03", label: "Waxing", hint: "Brow \xB7 body \xB7 bikini" },
        { id: "lashes", num: "04", label: "Lashes", hint: "Lashes \xB7 lifts \xB7 brows" }
      ];
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(BkEyebrow, { left: "Book a service" }), /* @__PURE__ */ React.createElement("h3", { style: { fontFamily: "var(--display)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(26px,5vw,44px)", margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1 } }, "What are you booking?"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)" } }, cats.map(function(cat) {
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: cat.id,
            onClick: function() {
              props.onSelect(cat.id);
            },
            style: { display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 14, padding: "18px 4px 18px 0", background: "var(--bg)", color: "var(--ink)", border: "none", cursor: "pointer", textAlign: "left", alignItems: "center", transition: "background 0.15s ease" },
            onMouseEnter: function(e) {
              e.currentTarget.style.background = "var(--paper)";
            },
            onMouseLeave: function(e) {
              e.currentTarget.style.background = "var(--bg)";
            }
          },
          /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-faint)", textTransform: "uppercase" } }, cat.num),
          /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 26, fontWeight: 400, display: "block", lineHeight: 1.1, letterSpacing: "-0.01em" } }, cat.label), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-faint)", textTransform: "uppercase", marginTop: 4, display: "block" } }, cat.hint)),
          /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontStyle: "italic", fontSize: 20, color: "var(--ink-soft)", paddingRight: 4 } }, "\u2192")
        );
      })));
    }
    function StepService(props) {
      var { useState, useRef, useEffect } = React;
      var category = props.category;
      var [selected, setSelected] = useState([]);
      var [addons, setAddons] = useState([]);
      var ctaRef = useRef(null);
      useEffect(function() {
        if (category === "wax") return;
        if (selected.length > 0 && ctaRef.current) {
          var embed = ctaRef.current.closest(".booking-embed");
          var scroller = embed && embed.closest(".cpanel");
          setTimeout(function() {
            if (embed && scroller) {
              var chromeEl = document.querySelector(".chrome-top");
              var clearance = chromeEl ? chromeEl.getBoundingClientRect().bottom + 16 : 120;
              var top = embed.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - clearance;
              scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
            }
          }, 60);
        }
      }, [selected.length]);
      var isMulti = category === "wax";
      function toggleMain(item) {
        if (isMulti) {
          setSelected(function(prev) {
            return prev.find(function(s) {
              return s.id === item.id;
            }) ? prev.filter(function(s) {
              return s.id !== item.id;
            }) : prev.concat([item]);
          });
        } else {
          setSelected([item]);
        }
      }
      function toggleAddon(item) {
        setAddons(function(prev) {
          return prev.find(function(s) {
            return s.id === item.id;
          }) ? prev.filter(function(s) {
            return s.id !== item.id;
          }) : prev.concat([item]);
        });
      }
      var all = selected.concat(addons);
      var total = bkTotalPrice(all);
      var dur = bkTotalDuration(all);
      var catLabel = category === "barber" ? "01 / Barbering" : category === "tan" ? "02 / Sunless" : category === "lashes" ? "04 / Lashes" : "03 / Waxing";
      var prefill = props.prefillSlot;
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(BkBack, { onClick: props.onBack }), /* @__PURE__ */ React.createElement(BkEyebrow, { left: catLabel, right: isMulti ? "Select all that apply" : "Select a service" }), prefill && /* @__PURE__ */ React.createElement("div", { style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid var(--rule)",
        borderRadius: 999,
        padding: "7px 14px",
        marginBottom: 20
      } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "oklch(0.58 0.13 150)", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)" } }, bkFmtDate(prefill.date)), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)" } }, "\xB7"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--ink)" } }, bkFmtTime(prefill.time.h, prefill.time.m)), /* @__PURE__ */ React.createElement("span", { style: { width: 1, height: 12, background: "var(--rule)", flexShrink: 0, marginLeft: 2 } }), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: props.onClearPrefill,
          style: {
            appearance: "none",
            border: "none",
            background: "none",
            padding: 0,
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            cursor: "pointer",
            lineHeight: 1
          }
        },
        "Change"
      )), category === "barber" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)" } }, BK_BARBER.map(function(s) {
        return /* @__PURE__ */ React.createElement(BkServiceRow, { key: s.id, service: s, active: !!selected.find(function(x) {
          return x.id === s.id;
        }), onClick: function() {
          toggleMain(s);
        } });
      })), category === "tan" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)", marginBottom: 24 } }, BK_TAN.map(function(s) {
        return /* @__PURE__ */ React.createElement(BkServiceRow, { key: s.id, service: s, active: !!selected.find(function(x) {
          return x.id === s.id;
        }), onClick: function() {
          toggleMain(s);
        } });
      })), selected.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(BkEyebrow, { left: "Add-ons", right: "Optional" }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)" } }, BK_TAN_ADDONS.map(function(s) {
        return /* @__PURE__ */ React.createElement(BkServiceRow, { key: s.id, service: s, active: !!addons.find(function(x) {
          return x.id === s.id;
        }), onClick: function() {
          toggleAddon(s);
        }, prefix: "+" });
      })))), category === "lashes" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)" } }, BK_LASHES.map(function(s) {
        return /* @__PURE__ */ React.createElement(BkServiceRow, { key: s.id, service: s, active: !!selected.find(function(x) {
          return x.id === s.id;
        }), onClick: function() {
          toggleMain(s);
        } });
      })), category === "wax" && BK_WAX_GROUPS.map(function(group) {
        return /* @__PURE__ */ React.createElement("div", { key: group.label, style: { marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", padding: "10px 0 4px", borderTop: "1px solid var(--rule)" } }, group.label, group.note && /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.55, fontStyle: "italic", textTransform: "none", letterSpacing: "0.09em", marginLeft: 8 } }, "\xB7 ", group.note)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)" } }, group.items.map(function(s) {
          return /* @__PURE__ */ React.createElement(BkServiceRow, { key: s.id, service: s, active: !!selected.find(function(x) {
            return x.id === s.id;
          }), onClick: function() {
            toggleMain(s);
          } });
        })));
      }), selected.length > 0 && /* @__PURE__ */ React.createElement("div", { ref: ctaRef, style: { marginTop: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", borderTop: "1px solid var(--rule)", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" } }, all.length, " service", all.length !== 1 ? "s" : "", " \xB7 ", dur, " min"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 15 } }, bkFmtPrice(total))), /* @__PURE__ */ React.createElement(BkBtn, { onClick: function() {
        props.onNext(selected, addons);
      } }, "Continue to date & time")));
    }
    function StepDatetime(props) {
      var { useState, useRef, useEffect } = React;
      var category = props.category;
      var duration = bkTotalDuration(props.services);
      var today = bkTodayPacific();
      function firstAvailable() {
        var hrs = bkHoursForCategory(category);
        for (var i = 0; i <= 60; i++) {
          var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
          if (hrs[d.getDay()]) return d;
        }
        return today;
      }
      var defDate = firstAvailable();
      var [selectedDate, setSelectedDate] = useState(defDate);
      var [selectedTime, setSelectedTime] = useState(null);
      var [viewMonth, setViewMonth] = useState(defDate.getMonth());
      var [viewYear, setViewYear] = useState(defDate.getFullYear());
      var [bookedRanges, setBookedRanges] = useState([]);
      var [loadingSlots, setLoadingSlots] = useState(true);
      useEffect(function() {
        var staff = bkCategoryStaff(category);
        var endpoint = window.__booking && window.__booking.endpoint;
        if (!endpoint) {
          setLoadingSlots(false);
          return;
        }
        var dateStr = selectedDate.getFullYear() + "-" + String(selectedDate.getMonth() + 1).padStart(2, "0") + "-" + String(selectedDate.getDate()).padStart(2, "0");
        var url = endpoint.replace(/\/booking\/create$/, "") + "/booking/availability?date=" + dateStr + "&staff=" + staff;
        var cancelled = false;
        setLoadingSlots(true);
        setBookedRanges([]);
        fetch(url).then(function(r) {
          return r.json();
        }).then(function(data) {
          if (!cancelled) setBookedRanges(data.bookedRanges || []);
        }).catch(function() {
          if (!cancelled) setBookedRanges([]);
        }).finally(function() {
          if (!cancelled) setLoadingSlots(false);
        });
        return function() {
          cancelled = true;
        };
      }, [selectedDate.toDateString(), category]);
      var slots = loadingSlots ? [] : bkAvailableSlots(selectedDate, duration, category, bookedRanges);
      var todayMs = today.getTime();
      if (selectedDate.toDateString() === today.toDateString()) {
        var pacParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Vancouver",
          hour: "numeric",
          minute: "numeric",
          hour12: false
        }).formatToParts(/* @__PURE__ */ new Date());
        var nowMins = parseInt(pacParts.find(function(p) {
          return p.type === "hour";
        }).value, 10) % 24 * 60 + parseInt(pacParts.find(function(p) {
          return p.type === "minute";
        }).value, 10);
        slots = slots.filter(function(s) {
          return s.h * 60 + s.m > nowMins;
        });
      }
      var maxMs = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60).getTime();
      var ctaRef = useRef(null);
      var timeKey = selectedTime ? selectedTime.h * 100 + selectedTime.m : null;
      useEffect(function() {
        if (!timeKey || !ctaRef.current) return;
        var embed = ctaRef.current.closest(".booking-embed");
        var scroller = embed && embed.closest(".cpanel");
        setTimeout(function() {
          if (embed && scroller) {
            var chromeEl = document.querySelector(".chrome-top");
            var clearance = chromeEl ? chromeEl.getBoundingClientRect().bottom + 16 : 120;
            var top = embed.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - clearance;
            scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          }
        }, 60);
      }, [timeKey]);
      var DAY_HDRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var MONTH_NAMES = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      function pickDate(d) {
        setSelectedDate(d);
        setSelectedTime(null);
        setBookedRanges([]);
      }
      function goPrev() {
        if (viewMonth === 0) {
          setViewMonth(11);
          setViewYear(viewYear - 1);
        } else setViewMonth(viewMonth - 1);
      }
      function goNext() {
        if (viewMonth === 11) {
          setViewMonth(0);
          setViewYear(viewYear + 1);
        } else setViewMonth(viewMonth + 1);
      }
      function buildGrid() {
        var firstDow = new Date(viewYear, viewMonth, 1).getDay();
        var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        var cells2 = [];
        for (var p = 0; p < firstDow; p++) cells2.push(null);
        for (var n = 1; n <= daysInMonth; n++) cells2.push(new Date(viewYear, viewMonth, n));
        while (cells2.length % 7 !== 0) cells2.push(null);
        return cells2;
      }
      var cells = buildGrid();
      var canPrev = viewYear > today.getFullYear() || viewYear === today.getFullYear() && viewMonth > today.getMonth();
      var navBtn = {
        appearance: "none",
        border: "none",
        background: "none",
        padding: "4px 10px",
        lineHeight: 1,
        cursor: "pointer",
        fontFamily: "var(--display)",
        fontStyle: "italic",
        fontSize: 20,
        color: "var(--ink-soft)"
      };
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(BkBack, { onClick: props.onBack }), /* @__PURE__ */ React.createElement(BkEyebrow, { left: "Choose a date" }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: goPrev,
          disabled: !canPrev,
          style: Object.assign({}, navBtn, { opacity: canPrev ? 1 : 0.2, cursor: canPrev ? "pointer" : "default" })
        },
        "\u2190"
      ), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontWeight: 400, fontSize: 20, letterSpacing: "-0.01em" } }, MONTH_NAMES[viewMonth], " ", viewYear), /* @__PURE__ */ React.createElement("button", { onClick: goNext, style: navBtn }, "\u2192")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 } }, DAY_HDRS.map(function(h) {
        return /* @__PURE__ */ React.createElement("span", { key: h, style: { textAlign: "center", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", padding: "2px 0 6px" } }, h);
      })), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 28 } }, cells.map(function(d, i) {
        if (!d) return /* @__PURE__ */ React.createElement("span", { key: i });
        var dMs = d.getTime();
        var isPast = dMs < todayMs;
        var isFar = dMs > maxMs;
        var isClosed = !bkHoursForCategory(category)[d.getDay()];
        var isOff = isPast || isFar || isClosed;
        var isSel = selectedDate && d.toDateString() === selectedDate.toDateString();
        var isToday = d.toDateString() === today.toDateString();
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: i,
            onClick: function() {
              if (!isOff) pickDate(d);
            },
            disabled: isOff,
            style: {
              padding: "10px 2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isSel ? "var(--ink)" : "transparent",
              color: isSel ? "var(--bg)" : isOff ? "var(--ink-faint)" : "var(--ink)",
              border: isToday && !isSel ? "1px solid var(--ink-soft)" : "1px solid transparent",
              borderRadius: 2,
              opacity: isOff ? 0.28 : 1,
              cursor: isOff ? "default" : "pointer",
              fontFamily: "var(--display)",
              fontSize: 18,
              fontWeight: 400,
              lineHeight: 1,
              transition: "background 0.15s ease"
            }
          },
          d.getDate()
        );
      })), /* @__PURE__ */ React.createElement(
        BkEyebrow,
        {
          left: "Available \xB7 " + bkFmtDate(selectedDate),
          right: loadingSlots ? "Checking\u2026" : null
        }
      ), loadingSlots ? /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 } }, "Checking availability\u2026") : slots.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 } }, "No slots available.") : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 28 } }, slots.map(function(slot, i) {
        var isSel = selectedTime && selectedTime.h === slot.h && selectedTime.m === slot.m;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: i,
            onClick: function() {
              setSelectedTime(slot);
            },
            style: {
              padding: "11px 4px",
              background: isSel ? "var(--ink)" : "var(--bg)",
              color: isSel ? "var(--bg)" : "var(--ink)",
              border: isSel ? "1px solid transparent" : "1px solid var(--rule)",
              borderRadius: 2,
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.04em",
              transition: "background 0.15s ease"
            }
          },
          bkFmtTime(slot.h, slot.m)
        );
      })), selectedTime && /* @__PURE__ */ React.createElement("div", { ref: ctaRef }, /* @__PURE__ */ React.createElement(BkBtn, { onClick: function() {
        props.onNext(selectedDate, selectedTime);
      } }, "Continue to your info")));
    }
    function StepClient(props) {
      var { useState } = React;
      var saved = props.savedContacts || [];
      var hasSaved = saved.length > 0;
      var [showPicker, setShowPicker] = useState(hasSaved);
      var [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
      var [errors, setErrors] = useState({});
      function pickSaved(c) {
        setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, notes: "" });
        setErrors({});
        setShowPicker(false);
      }
      function pickNew() {
        setForm({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
        setErrors({});
        setShowPicker(false);
      }
      function update(k, v) {
        setForm(function(f) {
          var n = Object.assign({}, f);
          n[k] = v;
          return n;
        });
        if (errors[k]) setErrors(function(e) {
          var n = Object.assign({}, e);
          n[k] = null;
          return n;
        });
      }
      function validate() {
        var e = {};
        if (!form.firstName.trim()) e.firstName = "Required";
        if (!form.lastName.trim()) e.lastName = "Required";
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
        if (!form.phone.trim()) e.phone = "Required";
        setErrors(e);
        return Object.keys(e).length === 0;
      }
      var labelSt = { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", display: "block", marginBottom: 6 };
      var fieldSt = function(k) {
        return {
          width: "100%",
          padding: "12px 0",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid " + (errors[k] ? "var(--accent)" : "var(--rule)"),
          fontFamily: "var(--body)",
          fontSize: 16,
          color: "var(--ink)",
          outline: "none"
        };
      };
      var errSt = { fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", display: "block", marginTop: 4 };
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(BkBack, { onClick: props.onBack }), /* @__PURE__ */ React.createElement(BkEyebrow, { left: "Your details" }), showPicker ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { style: { fontFamily: "var(--display)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(24px,4vw,34px)", margin: "0 0 22px", letterSpacing: "-0.01em", lineHeight: 1.1 } }, "Who's booking?"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)", marginBottom: 20 } }, saved.map(function(c) {
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: c.firstName + c.lastName + c.phone,
            onClick: function() {
              pickSaved(c);
            },
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 4px",
              background: "var(--bg)",
              border: "none",
              borderLeft: "2px solid transparent",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease"
            },
            onMouseEnter: function(e) {
              e.currentTarget.style.background = "var(--paper)";
            },
            onMouseLeave: function(e) {
              e.currentTarget.style.background = "var(--bg)";
            }
          },
          /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 20, fontWeight: 400, display: "block", lineHeight: 1.2 } }, c.firstName, " ", c.lastName), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-faint)", display: "block", marginTop: 3 } }, c.phone, c.email ? "  \xB7  " + c.email : "")),
          /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontStyle: "italic", fontSize: 18, color: "var(--ink-soft)", paddingRight: 4 } }, "\u2192")
        );
      })), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: pickNew,
          style: {
            width: "100%",
            padding: "14px",
            background: "transparent",
            border: "1px dashed var(--rule)",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            transition: "border-color 0.15s, color 0.15s"
          },
          onMouseEnter: function(e) {
            e.currentTarget.style.borderColor = "var(--ink-soft)";
            e.currentTarget.style.color = "var(--ink-soft)";
          },
          onMouseLeave: function(e) {
            e.currentTarget.style.borderColor = "var(--rule)";
            e.currentTarget.style.color = "var(--ink-faint)";
          }
        },
        "+ Book for someone new"
      )) : (
        /* ── Contact form ──────────────────────────────────────────────── */
        /* @__PURE__ */ React.createElement("div", null, hasSaved && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: function() {
              setShowPicker(true);
            },
            style: { appearance: "none", border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 22 }
          },
          "\u2190 Change"
        ), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 22 } }, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "First name"), /* @__PURE__ */ React.createElement("input", { id: "bk-hp", name: "website", autoComplete: "off", tabIndex: -1, "aria-hidden": "true", style: { position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }, defaultValue: "" }), /* @__PURE__ */ React.createElement("input", { className: "bk-input", style: fieldSt("firstName"), value: form.firstName, onChange: function(e) {
          update("firstName", e.target.value);
        }, placeholder: "First" }), errors.firstName && /* @__PURE__ */ React.createElement("span", { style: errSt }, errors.firstName)), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 22 } }, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "Last name"), /* @__PURE__ */ React.createElement("input", { className: "bk-input", style: fieldSt("lastName"), value: form.lastName, onChange: function(e) {
          update("lastName", e.target.value);
        }, placeholder: "Last" }), errors.lastName && /* @__PURE__ */ React.createElement("span", { style: errSt }, errors.lastName))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 22 } }, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "Email"), /* @__PURE__ */ React.createElement("input", { className: "bk-input", style: fieldSt("email"), type: "email", value: form.email, onChange: function(e) {
          update("email", e.target.value);
        }, placeholder: "you@example.com" }), errors.email && /* @__PURE__ */ React.createElement("span", { style: errSt }, errors.email)), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 22 } }, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "Phone"), /* @__PURE__ */ React.createElement("input", { className: "bk-input", style: fieldSt("phone"), type: "tel", value: form.phone, onChange: function(e) {
          update("phone", e.target.value);
        }, placeholder: "250 555 0100" }), errors.phone && /* @__PURE__ */ React.createElement("span", { style: errSt }, errors.phone)), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "Notes ", /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.5, fontStyle: "italic", textTransform: "none", letterSpacing: 0 } }, "\u2014 optional")), /* @__PURE__ */ React.createElement("textarea", { className: "bk-input", style: Object.assign({}, fieldSt("notes"), { resize: "none", height: 68, lineHeight: 1.5 }), value: form.notes, onChange: function(e) {
          update("notes", e.target.value);
        }, placeholder: "Anything we should know before your appointment?" })), /* @__PURE__ */ React.createElement(BkBtn, { onClick: function() {
          if (validate()) props.onNext(form);
        } }, "Continue"))
      ));
    }
    function StepIntakeForm(props) {
      var { useState } = React;
      var form = props.form;
      var [responses, setResponses] = useState({});
      var [showErrors, setShowErrors] = useState(false);
      function setResp(id, value) {
        setResponses(function(r) {
          return Object.assign({}, r, { [id]: value });
        });
      }
      function toggleCheck(id, opt) {
        var cur = responses[id] || [];
        var next = cur.indexOf(opt) >= 0 ? cur.filter(function(o) {
          return o !== opt;
        }) : cur.concat([opt]);
        setResp(id, next);
      }
      function isValid() {
        return (form.fields || []).every(function(f) {
          if (!f.required) return true;
          var v = responses[f.id];
          if (!v) return false;
          if (Array.isArray(v)) {
            if (v.length === 0) return false;
            if (f.requireAll && f.options) return v.length === f.options.length;
            return true;
          }
          return v.toString().trim() !== "";
        });
      }
      function missing(id) {
        if (!showErrors) return false;
        var f = (form.fields || []).find(function(x) {
          return x.id === id;
        });
        if (!f || !f.required) return false;
        var v = responses[id];
        if (!v) return true;
        if (Array.isArray(v)) {
          if (v.length === 0) return true;
          if (f.requireAll && f.options) return v.length < f.options.length;
          return false;
        }
        return v.toString().trim() === "";
      }
      var INP = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--rule)", background: "var(--paper)", fontFamily: "var(--body)", fontSize: 16, color: "var(--ink)", outline: "none", marginTop: 6 };
      function renderField(f) {
        var err = missing(f.id);
        var errBorder = err ? { borderColor: "#c0392b" } : {};
        var label = React.createElement(
          "div",
          { style: { fontFamily: "var(--body)", fontSize: 13, color: err ? "#c0392b" : "var(--ink)", marginBottom: 0 } },
          f.label,
          f.required && React.createElement("span", { style: { color: "#c0392b", marginLeft: 2 } }, "*")
        );
        if (f.type === "yes_no") {
          var val = responses[f.id];
          return React.createElement(
            "div",
            { key: f.id, style: { marginBottom: 20 } },
            label,
            React.createElement(
              "div",
              { style: { display: "flex", gap: 8, marginTop: 8 } },
              ["Yes", "No"].map(function(opt) {
                var sel = val === opt.toLowerCase();
                return React.createElement("button", {
                  key: opt,
                  type: "button",
                  onClick: function() {
                    setResp(f.id, opt.toLowerCase());
                  },
                  style: { flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid " + (sel ? "var(--ink)" : err ? "#c0392b" : "var(--rule)"), background: sel ? "var(--ink)" : "transparent", color: sel ? "var(--bg)" : "var(--ink)", fontFamily: "var(--body)", fontSize: 14, cursor: "pointer", transition: "all 0.12s" }
                }, opt);
              })
            )
          );
        }
        if (f.type === "checkbox_group") {
          var allChecked = f.requireAll && f.options && (responses[f.id] || []).length === f.options.length;
          return React.createElement(
            "div",
            { key: f.id, style: { marginBottom: 20 } },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 0 } },
              label,
              f.requireAll && React.createElement("button", { type: "button", onClick: function() {
                setResp(f.id, allChecked ? [] : f.options.slice());
              }, style: { fontFamily: "var(--body)", fontSize: 11, color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", flexShrink: 0, marginLeft: 8 } }, allChecked ? "Deselect all" : "Select all")
            ),
            React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 10 } },
              (f.options || []).map(function(opt) {
                var sel = (responses[f.id] || []).indexOf(opt) >= 0;
                return React.createElement(
                  "label",
                  { key: opt, style: { display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-soft)", userSelect: "none" } },
                  React.createElement(
                    "span",
                    { onClick: function() {
                      toggleCheck(f.id, opt);
                    }, style: { flex: "0 0 auto", width: 18, height: 18, marginTop: 1, borderRadius: 3, border: "1px solid " + (sel ? "var(--ink)" : err ? "#c0392b" : "var(--rule)"), background: sel ? "var(--ink)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.12s" } },
                    sel && React.createElement("span", { style: { color: "var(--bg)", fontSize: 11, fontWeight: 700 } }, "\u2713")
                  ),
                  React.createElement("span", { onClick: function() {
                    toggleCheck(f.id, opt);
                  }, style: { lineHeight: 1.4 } }, opt)
                );
              })
            )
          );
        }
        if (f.type === "signature") {
          return React.createElement(
            "div",
            { key: f.id, style: { marginBottom: 20 } },
            label,
            React.createElement("input", { type: "text", placeholder: "Type your full name", value: responses[f.id] || "", onChange: function(e) {
              setResp(f.id, e.target.value);
            }, style: Object.assign({}, INP, errBorder, { fontStyle: "italic", fontSize: 16 }) })
          );
        }
        if (f.type === "textarea") {
          return React.createElement(
            "div",
            { key: f.id, style: { marginBottom: 20 } },
            label,
            React.createElement("textarea", { value: responses[f.id] || "", onChange: function(e) {
              setResp(f.id, e.target.value);
            }, rows: 3, style: Object.assign({}, INP, errBorder, { resize: "vertical", lineHeight: 1.5 }) })
          );
        }
        var inputType = f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "date" ? "date" : "text";
        return React.createElement(
          "div",
          { key: f.id, style: { marginBottom: 20 } },
          label,
          React.createElement("input", { type: inputType, value: responses[f.id] || "", onChange: function(e) {
            setResp(f.id, e.target.value);
          }, style: Object.assign({}, INP, errBorder) })
        );
      }
      if (!form) {
        return React.createElement("div", { style: { padding: "40px 0", textAlign: "center", color: "var(--ink-soft)", fontFamily: "var(--body)", fontSize: 13 } }, "Loading form\u2026");
      }
      return React.createElement(
        "div",
        null,
        React.createElement(BkBack, { onClick: props.onBack }),
        React.createElement(BkEyebrow, { left: "Intake form", right: "Required before your appointment" }),
        React.createElement("h3", { style: { fontFamily: "var(--display)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(24px,4vw,32px)", margin: "0 0 8px", letterSpacing: "-0.01em", lineHeight: 1.1 } }, form.title),
        form.description && React.createElement("p", { style: { fontFamily: "var(--body)", fontSize: 13, lineHeight: 1.65, color: "var(--ink-soft)", marginBottom: 24, maxWidth: "56ch" } }, form.description),
        React.createElement(
          "div",
          { style: { marginBottom: 8 } },
          (form.fields || []).map(function(f) {
            return renderField(f);
          })
        ),
        showErrors && !isValid() && React.createElement("p", { style: { fontFamily: "var(--body)", fontSize: 12, color: "#c0392b", marginBottom: 16 } }, "Please fill in all required fields (marked with *)."),
        React.createElement(BkBtn, {
          onClick: function() {
            if (!isValid()) {
              setShowErrors(true);
              return;
            }
            props.onNext(responses);
          }
        }, "Review booking")
      );
    }
    function StepConfirm(props) {
      var { useState, useEffect, useRef } = React;
      var all = props.services.concat(props.addons);
      var total = bkTotalPrice(all);
      var dur = bkTotalDuration(all);
      var [payCfg, setPayCfg] = useState(null);
      var [payReady, setPayReady] = useState(false);
      var [applePayOk, setApplePayOk] = useState(false);
      var [payError, setPayError] = useState("");
      var paymentsRef = useRef(null);
      var cardRef = useRef(null);
      var applePayRef = useRef(null);
      useEffect(function() {
        var cancelled = false;
        var endpoint = (window.__booking || {}).endpoint || "";
        var base = endpoint.replace(/\/api\/booking\/create$/, "") || window.location.origin;
        fetch(base + "/api/booking/payment-config?category=" + props.category + "&total=" + total).then(function(r) {
          return r.ok ? r.json() : { required: false };
        }).then(async function(cfg) {
          if (cancelled) return;
          setPayCfg(cfg);
          if (!cfg.required || !cfg.applicationId || !cfg.locationId) return;
          await bkLoadSquareSdk(cfg.env);
          if (cancelled) return;
          var payments = window.Square.payments(cfg.applicationId, cfg.locationId);
          paymentsRef.current = payments;
          var card = await payments.card();
          await card.attach("#bk-card-container");
          if (cancelled) {
            card.destroy();
            return;
          }
          cardRef.current = card;
          setPayReady(true);
          try {
            var due = ((cfg.amountDueCents || 0) / 100).toFixed(2);
            var req = payments.paymentRequest({
              countryCode: "CA",
              currencyCode: "CAD",
              total: { amount: due === "0.00" ? "0.01" : due, label: "Edit Studio" }
            });
            applePayRef.current = await payments.applePay(req);
            if (!cancelled) setApplePayOk(true);
          } catch (e) {
          }
        }).catch(function() {
          if (!cancelled) setPayCfg({ required: false });
        });
        return function() {
          cancelled = true;
        };
      }, []);
      async function tokenizeWith(method) {
        var result = await method.tokenize();
        if (result.status !== "OK") {
          var msg = result.errors && result.errors[0] && result.errors[0].message;
          throw new Error(msg || "Your card details look incomplete \u2014 please check them.");
        }
        var verificationToken;
        try {
          var intent = payCfg.mode !== "off" ? payCfg.cardOnFile ? "CHARGE_AND_STORE" : "CHARGE" : "STORE";
          var v = await paymentsRef.current.verifyBuyer(result.token, {
            amount: ((payCfg.amountDueCents || 0) / 100).toFixed(2),
            currencyCode: "CAD",
            intent,
            billingContact: {
              givenName: props.client.firstName,
              familyName: props.client.lastName,
              email: props.client.email
            }
          });
          verificationToken = v && v.token;
        } catch (e) {
        }
        return { token: result.token, verificationToken, idempotencyKey: bkUuid() };
      }
      async function confirm(viaApplePay) {
        if (!payCfg || !payCfg.required) {
          props.onConfirm(null);
          return;
        }
        setPayError("");
        try {
          var method = viaApplePay ? applePayRef.current : cardRef.current;
          if (!method) throw new Error("The payment form isn\u2019t ready yet.");
          var payment = await tokenizeWith(method);
          props.onConfirm(payment);
        } catch (e) {
          setPayError(e.message || "Payment failed \u2014 please try again.");
        }
      }
      var needsPay = payCfg && payCfg.required;
      var dueDollars = needsPay ? (payCfg.amountDueCents || 0) / 100 : 0;
      var payLabel = !needsPay ? null : payCfg.mode === "full" ? "Due now: " + bkFmtPrice(dueDollars) : payCfg.mode === "deposit" ? "Deposit due now: " + bkFmtPrice(dueDollars) : "No charge today";
      var ROW = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", borderBottom: "1px solid var(--rule)" };
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(BkBack, { onClick: props.onBack }), /* @__PURE__ */ React.createElement(BkEyebrow, { left: "Review your booking" }), /* @__PURE__ */ React.createElement("h3", { style: { fontFamily: "var(--display)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(24px,4vw,32px)", margin: "0 0 22px", letterSpacing: "-0.01em", lineHeight: 1.1 } }, "Looks good?"), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid var(--rule)", padding: "0 20px", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: ROW }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)" } }, "Date + time"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--body)", fontSize: 14 } }, bkFmtDate(props.date), " \xB7 ", bkFmtTime(props.time.h, props.time.m))), all.map(function(s) {
        return /* @__PURE__ */ React.createElement("div", { key: s.id, style: ROW }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 17, letterSpacing: "-0.005em" } }, s.name), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em" } }, bkFmtPrice(s.price)));
      }), /* @__PURE__ */ React.createElement("div", { style: Object.assign({}, ROW, { borderBottom: "none", paddingTop: 14 }) }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)" } }, dur, " min total"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 16 } }, bkFmtPrice(total)))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 24, padding: "16px 0", borderTop: "1px solid var(--rule)" } }, [["Name", props.client.firstName + " " + props.client.lastName, true], ["Email", props.client.email, false], ["Phone", props.client.phone, false]].map(function(row) {
        return /* @__PURE__ */ React.createElement("div", { key: row[0], style: { gridColumn: row[2] ? "span 2" : void 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 } }, row[0]), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--body)", fontSize: 14, color: "var(--ink)" } }, row[1]));
      })), needsPay && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 22 } }, /* @__PURE__ */ React.createElement(BkEyebrow, { left: "Payment", right: payLabel }), payCfg.cardOnFile && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 12px" } }, "Your card will be kept securely on file with Square", payCfg.mode === "off" ? " \u2014 nothing is charged today. " : ". ", "It may be charged per our cancellation policy for no-shows."), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid var(--rule)", padding: "14px 14px 2px", background: "var(--paper)" } }, /* @__PURE__ */ React.createElement("div", { id: "bk-card-container" }), !payReady && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-faint)", textTransform: "uppercase", padding: "4px 0 14px", margin: 0 } }, "Loading secure payment form\u2026")), applePayOk && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            confirm(true);
          },
          disabled: props.submitting,
          "aria-label": "Book and pay with Apple Pay",
          style: {
            display: "block",
            width: "100%",
            marginTop: 10,
            padding: "15px 0",
            border: "none",
            borderRadius: 4,
            background: "#000",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "0.01em"
          }
        },
        "Book with  Pay"
      ), payError && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", marginTop: 10, lineHeight: 1.5 } }, payError)), props.error && /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 14, lineHeight: 1.5 } }, props.error), /* @__PURE__ */ React.createElement(BkBtn, { onClick: function() {
        confirm(false);
      }, disabled: props.submitting || needsPay && !payReady || payCfg === null }, props.submitting ? "Sending\u2026" : payCfg === null ? "One moment\u2026" : needsPay && payCfg.mode !== "off" ? "Pay " + bkFmtPrice(dueDollars) + " & book" : "Confirm booking"), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-faint)", textAlign: "center", marginTop: 14, lineHeight: 1.65, textTransform: "uppercase" } }, needsPay && payCfg.mode !== "off" ? "Deposits are refunded when you cancel more than 3 hours ahead." : needsPay ? "No charge today \u2014 card kept on file per our policy." : "No payment required today. We'll confirm by email."));
    }
    function StepDone(props) {
      var total = bkTotalPrice(props.services);
      var dur = bkTotalDuration(props.services);
      var ROW = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 0", borderBottom: "1px solid var(--rule)" };
      var manageUrl = null;
      if (props.manageToken) {
        var endpoint = window.__booking && window.__booking.endpoint;
        var base = endpoint ? endpoint.replace(/\/api\/booking\/create$/, "") : "";
        manageUrl = base + "/booking/manage/" + props.manageToken;
      }
      function calICS() {
        var d = props.date;
        function pad2(n) {
          return String(n).padStart(2, "0");
        }
        var ymd = d.getFullYear() + "" + pad2(d.getMonth() + 1) + pad2(d.getDate());
        var hStart = pad2(props.time.h) + pad2(props.time.m) + "00";
        var endMin = props.time.h * 60 + props.time.m + (dur || 60);
        var hEnd = pad2(Math.floor(endMin / 60)) + pad2(endMin % 60) + "00";
        var stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
        var uid = "booking-" + Date.now() + "@editstudio.space";
        var svcNames = props.services.map(function(s) {
          return s.name;
        }).join(", ");
        var desc = manageUrl ? "Manage your booking: " + manageUrl : "editstudio.space";
        var ics = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Edit Studio//Booking//EN",
          "BEGIN:VEVENT",
          "UID:" + uid,
          "DTSTAMP:" + stamp,
          "DTSTART:" + ymd + "T" + hStart,
          "DTEND:" + ymd + "T" + hEnd,
          "SUMMARY:Edit Studio \u2014 " + svcNames,
          "LOCATION:1846 Oak Bay Avenue\\, Victoria BC",
          "DESCRIPTION:" + desc,
          "END:VEVENT",
          "END:VCALENDAR"
        ].join("\r\n");
        return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
      }
      var linkSt = {
        display: "block",
        width: "100%",
        padding: "14px 20px",
        boxSizing: "border-box",
        border: "1px solid var(--rule)",
        background: "transparent",
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-soft)",
        textDecoration: "none",
        textAlign: "center",
        cursor: "pointer"
      };
      return /* @__PURE__ */ React.createElement("div", { style: { paddingBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { paddingTop: 32, paddingBottom: 24, borderBottom: "1px solid var(--rule)", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.58 0.13 150)", marginBottom: 14 } }, "\u2713 Confirmed"), /* @__PURE__ */ React.createElement("h3", { style: { fontFamily: "var(--display)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(28px,5vw,44px)", margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1 } }, "You're booked."), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", margin: 0 } }, "Confirmation sent to ", props.client.email)), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: ROW }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)" } }, "Date + time"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--body)", fontSize: 14 } }, bkFmtDate(props.date), " \xB7 ", bkFmtTime(props.time.h, props.time.m))), props.services.map(function(s) {
        return /* @__PURE__ */ React.createElement("div", { key: s.id, style: ROW }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 17, letterSpacing: "-0.005em" } }, s.name), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em" } }, bkFmtPrice(s.price)));
      }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)" } }, dur, " min total"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 15 } }, bkFmtPrice(total)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 } }, manageUrl && /* @__PURE__ */ React.createElement("a", { href: manageUrl, style: linkSt }, "Manage or cancel booking \u2192"), /* @__PURE__ */ React.createElement("a", { href: calICS(), download: "edit-studio-booking.ics", style: linkSt }, "Add to calendar \u2192")), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: props.onReset,
          style: { appearance: "none", border: "none", background: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", borderBottom: "1px solid var(--rule)", paddingBottom: 2 }
        },
        "Book another appointment"
      ));
    }
    function BookingEmbed(props) {
      var { useState, useRef, useEffect } = React;
      var categoryProp = props.category || null;
      var [step, setStep] = useState(categoryProp ? "service" : "category");
      var [category, setCategory] = useState(categoryProp);
      var [services, setServices] = useState([]);
      var [addons, setAddons] = useState([]);
      var [date, setDate] = useState(null);
      var [time, setTime] = useState(null);
      var [client, setClient] = useState(null);
      var [submitting, setSubmitting] = useState(false);
      var [intakeResponses, setIntakeResponses] = useState({});
      var [error, setError] = useState(null);
      var [manageToken, setManageToken] = useState(null);
      var [prefillActive, setPrefillActive] = useState(false);
      var [savedContacts, setSavedContacts] = useState(function() {
        return bkLoadContacts();
      });
      var PROGRESS = { category: 0, service: 0.15, datetime: 0.38, client: 0.58, waiver: 0.75, confirm: 0.88, done: 1 };
      var progress = PROGRESS[step] || 0;
      var catLabel = category === "barber" ? "Barbering" : category === "tan" ? "Sunless" : category === "wax" ? "Waxing" : category === "lashes" ? "Lashes" : "Book now";
      function needsIntakeForm(cat) {
        var form = BK_INTAKE_FORMS[cat];
        return form && form.fields && form.fields.length > 0;
      }
      async function handleConfirm(payment) {
        setSubmitting(true);
        setError(null);
        try {
          var endpoint = window.__booking && window.__booking.endpoint;
          if (endpoint) {
            var res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category, services, addons, date: date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"), time, client, intakeResponses, payment: payment || void 0, _hp: document.getElementById("bk-hp") ? document.getElementById("bk-hp").value : "" })
            });
            if (!res.ok) {
              var errData = await res.json().catch(function() {
                return {};
              });
              throw new Error(errData.error || "Booking failed. Please try again or call us at 778 535 3348.");
            }
            var data = await res.json();
            if (data.manageToken) setManageToken(data.manageToken);
          } else {
            await new Promise(function(r) {
              setTimeout(r, 1100);
            });
          }
          bkSaveContact(client);
          setSavedContacts(bkLoadContacts());
          setStep("done");
        } catch (e) {
          setError(e.message || "Something went wrong. Please call 778 535 3348.");
        } finally {
          setSubmitting(false);
        }
      }
      function reset() {
        setStep(categoryProp ? "service" : "category");
        setCategory(categoryProp);
        setServices([]);
        setAddons([]);
        setDate(null);
        setTime(null);
        setClient(null);
        setError(null);
        setPrefillActive(false);
        setManageToken(null);
      }
      var embedRef = useRef(null);
      var mountedRef = useRef(false);
      useEffect(function() {
        function onGoto(e) {
          var p = e && e.detail && e.detail.prefill;
          if (!p || !p.dateStr || p.h == null) return;
          if (categoryProp && categoryProp !== "barber") return;
          var parts = p.dateStr.split("-").map(Number);
          var d = new Date(parts[0], parts[1] - 1, parts[2]);
          if (!categoryProp) setCategory("barber");
          setDate(d);
          setTime({ h: p.h, m: p.m || 0 });
          setPrefillActive(true);
          setStep("service");
        }
        window.addEventListener("edit-studio:goto-booking", onGoto);
        return function() {
          window.removeEventListener("edit-studio:goto-booking", onGoto);
        };
      }, [categoryProp]);
      useEffect(function() {
        if (!mountedRef.current) {
          mountedRef.current = true;
          return;
        }
        var el = embedRef.current;
        if (!el) return;
        var scroller = el.closest(".cpanel");
        var chromeEl = document.querySelector(".chrome-top");
        var clearance = chromeEl ? chromeEl.getBoundingClientRect().bottom + 12 : 110;
        if (scroller) {
          var top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - clearance;
          scroller.scrollTo({ top: Math.max(0, top), behavior: "instant" });
        } else {
          el.scrollIntoView({ behavior: "instant", block: "start" });
        }
      }, [step]);
      return /* @__PURE__ */ React.createElement("div", { ref: embedRef, className: "booking-embed" }, step !== "category" && step !== "done" && /* @__PURE__ */ React.createElement("div", { className: "booking-head" }, /* @__PURE__ */ React.createElement("span", { className: "booking-eyebrow" }, catLabel), /* @__PURE__ */ React.createElement("div", { className: "booking-progress" }, /* @__PURE__ */ React.createElement("div", { className: "booking-progress-fill", style: { width: progress * 100 + "%" } }))), /* @__PURE__ */ React.createElement("div", { className: "booking-body" }, step === "category" && /* @__PURE__ */ React.createElement(StepCategory, { onSelect: function(cat) {
        setCategory(cat);
        setStep("service");
      } }), step === "service" && /* @__PURE__ */ React.createElement(
        StepService,
        {
          category,
          prefillSlot: prefillActive && date && time ? { date, time } : null,
          onClearPrefill: function() {
            setPrefillActive(false);
            setDate(null);
            setTime(null);
          },
          onNext: function(svcs, adds) {
            setServices(svcs);
            setAddons(adds);
            setStep(prefillActive ? "client" : "datetime");
          },
          onBack: categoryProp ? null : function() {
            setStep("category");
          }
        }
      ), step === "datetime" && /* @__PURE__ */ React.createElement(
        StepDatetime,
        {
          category,
          services: services.concat(addons),
          onNext: function(d, t) {
            setDate(d);
            setTime(t);
            setStep("client");
          },
          onBack: function() {
            setStep("service");
          }
        }
      ), step === "client" && /* @__PURE__ */ React.createElement(
        StepClient,
        {
          savedContacts,
          onNext: function(info) {
            setClient(info);
            setStep(needsIntakeForm(category) ? "waiver" : "confirm");
          },
          onBack: function() {
            setStep(prefillActive ? "service" : "datetime");
          }
        }
      ), step === "waiver" && /* @__PURE__ */ React.createElement(
        StepIntakeForm,
        {
          form: BK_INTAKE_FORMS[category],
          category,
          onBack: function() {
            setStep("client");
          },
          onNext: function(r) {
            setIntakeResponses(r);
            setStep("confirm");
          }
        }
      ), step === "confirm" && /* @__PURE__ */ React.createElement(
        StepConfirm,
        {
          category,
          services,
          addons,
          date,
          time,
          client,
          onConfirm: handleConfirm,
          onBack: function() {
            setStep(needsIntakeForm(category) ? "waiver" : "client");
          },
          submitting,
          error
        }
      ), step === "done" && /* @__PURE__ */ React.createElement(
        StepDone,
        {
          client,
          date,
          time,
          services: services.concat(addons),
          manageToken,
          onReset: reset
        }
      )));
    }
    window.__bk = {
      availableSlots: bkAvailableSlots,
      fmtTime: bkFmtTime,
      todayPacific: bkTodayPacific
    };
    window.BookingEmbed = BookingEmbed;
  })();
})();
