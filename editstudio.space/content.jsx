// content.jsx — vertical content panels per service

function Eyebrow({ left, right }) {
  return <div className="eyebrow"><span>{left}</span><span>{right}</span></div>;
}

function MenuRow({ name, desc, price }) {
  return (
    <div className="menu-row">
      <div>
        <div className="name" dangerouslySetInnerHTML={{ __html: name }} />
        {desc && <div className="desc">{desc}</div>}
      </div>
      <div className="price">{price}</div>
    </div>);

}



// ── Per-service content blocks ─────────────────────────────────
function BarberingContent({ headline }) {
  return (
    <div className="cpanel">
      <Eyebrow left="01 / Barbering" right="Sharp · Consistent · Detailed" />
      <h2>{headline || <span>Every cut, <em>edited</em>.</span>}</h2>
      <p className="body">Precision cuts, blended to perfection. A personalized experience in a one chair, one barber studio.</p>

      <div className="rule" />
      <window.BookingEmbed category="barber" />

      <div className="rule" />
      <Eyebrow left="Gallery" right="Recent work" />
      <div className="gallery">
        <div className="tile tall">
          <img src="assets/burst-fade-curly-top.jpg" alt="Eric He sculpting a burst fade with curly top — Edit Studio Oak Bay" loading="lazy" decoding="async" width="1280" height="1920" />
        </div>
        <div className="tile square">
          <img src="assets/mid-taper-textured-fringe.webp" alt="Finished mid taper haircut with textured fringe, rear view — men's barbering at Edit Studio Oak Bay" loading="lazy" decoding="async" width="888" height="888" />
        </div>
        <div className="tile">
          <img src="assets/barber-tools-clippers-scissors.webp" alt="Wahl Magic Clip clipper, detail trimmer and barbering scissors on a sunlit counter — Edit Studio Oak Bay barber tools" loading="lazy" decoding="async" width="900" height="1200" />
        </div>
        <div className="tile wide">
          <img src="assets/chair-interior.webp" alt="Edit Studio Oak Bay barber chair, large mirror and STMNT grooming product shelves — Victoria BC studio interior" loading="lazy" decoding="async" width="2048" height="1536" />
        </div>
      </div>

      <div className="rule" />
      <Eyebrow left="The chair" right="Your barber" />
      <div className="stylists">
        <div className="stylist">
          <div className="avatar" style={{ backgroundImage: "url('assets/eric-he-headshot.webp')", backgroundSize: "cover", backgroundPosition: "center 22%" }} />
          <div>
            <h3>Eric He <a className="ig" href="https://www.instagram.com/ricthesurgeon/" target="_blank" rel="noopener noreferrer" aria-label="Eric He on Instagram — @ricthesurgeon"><em>@ricthesurgeon</em></a></h3>
            <div className="role">CoFounder · Barber</div>
            <p>Three years behind the chair, Eric specializes in modern cuts across the board — whether that's technical fading work, or something that's all about shape, texture, and flow. Whatever the direction, the detail is always there, and the love for the craft shows.</p>
          </div>
        </div>
      </div>
    </div>);

}

function TanContent({ headline }) {
  return (
    <div className="cpanel">
      <Eyebrow left="02 / Sunless" right="Custom · Organic · Streak-free" />
      <h2>{headline || <span>Golden hour, <em>on demand</em>.</span>}</h2>
      <p className="body">Luxury custom-blended airbrush spray tans, formulated specifically for your skin tone with NUDA solutions. Crafted with Canadian-made, vegan, skincare-grade ingredients that boost your skin barrier and extend your glow — no orange, no mess, no UV damage. 

      </p>

      <div className="rule" />
      <window.BookingEmbed category="tan" />

      <div className="rule" />
      <Eyebrow left="Gallery" right="Real bodies · real glow" />
      <div className="gallery">
        <div className="tile">
          <img src="assets/spray-tan-in-progress-airbrush.webp" alt="Custom airbrush spray tan application in the Edit Studio sunless booth — Oak Bay Victoria BC" loading="lazy" decoding="async" width="1365" height="2048" style={{ objectPosition: "center 70%" }} />
        </div>
        <div className="tile">
          <img src="assets/nuda-dark-chocolate-spray-tan-solution.webp" alt="NUDA Sunless Dark Chocolate professional spray tan solution — organic, vegan, cruelty-free formula used at Edit Studio Oak Bay" loading="lazy" decoding="async" width="1365" height="2048" style={{ objectPosition: "center 40%" }} />
        </div>
        <div className="tile tall">
          <img src="assets/sunless-tan-closeup-bikini.webp" alt="Close-up of a custom-blended sunless spray tan in a black bikini — natural, streak-free, orange-free golden glow on light skin, by Edit Studio sunless tan artist in Oak Bay Victoria BC" loading="lazy" decoding="async" width="1179" height="2096" />
        </div>
        <div className="tile square">
          <img src="assets/sunless-tan-bikini-outdoor-canon.webp" alt="Sun-drenched outdoor bikini photo showing a flawless custom sunless spray tan — natural, streak-free, orange-free bronze glow by Edit Studio sunless tan artist in Oak Bay Victoria BC" loading="lazy" decoding="async" width="1536" height="1434" style={{ objectPosition: "center bottom" }} />
        </div>
        <div className="tile square">
          <img src="assets/sunless-shimmering-finishing-powder-brush.webp" alt="Gloved sunless tan artist dusting a shimmering finishing powder with a kabuki brush — the signature Edit Studio glow-set step that locks in colour and adds luminosity, Oak Bay Victoria BC" loading="lazy" decoding="async" width="1200" height="1200" style={{ objectPosition: "center 100%", transform: "scale(1.2)", transformOrigin: "bottom center" }} />
        </div>
        <div className="tile square">
          <img src="assets/sunless-airbrush-spray-tan-gun.webp" alt="Edit Studio sunless tan artist holding a professional HVLP airbrush spray tan gun loaded with custom-blended NUDA tanning solution — Oak Bay Victoria BC" loading="lazy" decoding="async" width="1200" height="1200" />
        </div>
      </div>

      <div className="rule" />
      <Eyebrow left="Prep + Aftercare" right="Read before your appointment" />
      <div className="faq">
        <details>
          <summary>Before your tan <span className="plus">+</span></summary>
          <div className="answer">
            <ul className="prep-list">
              <li>Shower at least 3 hours before your appointment.</li>
              <li>Shave, wax and exfoliate 24-48 hours prior — pores need time to close so your tan can develop evenly.</li>
              <li>Skip lotion, gel, wax, shaving cream and any oil-based products on the day — residues block the solution from developing correctly.</li>
              <li>No makeup, cream, sunscreen, perfume or deodorant the day of your appointment.</li>
              <li>Moisturize daily in the days before —  hydrated skin is key.</li>
              <li>The application can be done with or without undergarments or a bathing suit, whichever you're comfortable with.</li>
              <li>Wear loose, dark-coloured clothing when you leave.</li>
            </ul>
          </div>
        </details>
        <details>
          <summary>After your tan <span className="plus">+</span></summary>
          <div className="answer">
            <ul className="prep-list">
              <li>Avoid sweating or contact with liquid during the develop window.</li>
              <li>If you sleep with solution on, wear long sleeves and pants to bed.</li>
              <li>Rinse after 8–12 hours (Signature Classic) or 1–5 hours (Rapid Glow), depending on your solution.</li>
              <li>First shower: rinse the whole body and face thoroughly until the water runs clear. No soap on the first rinse.</li>
              <li>Moisturize daily with an appropriate lotion to extend the result.</li>
              <li>Excessive sweating, saunas, long baths and long showers all cause faster fading.</li>
              <li>Don't wax areas where solution has been applied for the duration of the tan. Gentle shaving is fine, occasionally.</li>
              <li>Use gentle facial cleansers — no oil-based or exfoliating products.</li>
              <li>Avoid lotions, soaps and body washes containing mineral oils, petroleum or alcohol — they all strip the tan.</li>
              <li>Don't exfoliate until the tan starts to fade. Then exfoliate to remove the old residue cleanly before your next session.</li>
            </ul>
          </div>
        </details>
      </div>

      <div className="rule" />
      <Eyebrow left="Your artist" right="Spray specialist" />
      <div className="stylists">
        <div className="stylist">
          <div className="avatar" style={{ backgroundImage: "url('assets/livi-furtado-headshot.webp')", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div>
            <h3>Livi Furtado <a className="ig" href="https://www.instagram.com/estheticsbylivi_/" target="_blank" rel="noopener noreferrer" aria-label="Livi Furtado on Instagram — @estheticsbylivi_"><em>@estheticsbylivi_</em></a></h3>
            <div className="role">CoFounder · Esthetician</div>
            <p>Custom matched spray tans curated uniquely for you. Specializing in luxury, natural looking, orange-free tans in Victoria, BC. Livi utilizes only high quality, Canadian made, organic spray tan solutions that are bound to leave you with a flawless glow no matter your tan goals.    </p>
          </div>
        </div>
      </div>
    </div>);

}

function WaxContent({ headline }) {
  return (
    <div className="cpanel">
      <Eyebrow left="03 / Waxing" right="Soft wax · Brow architecture" />
      <h2>{headline || <span>Smooth, <em>sorted</em>.</span>}</h2>
      <p className="body">Hair removal with your comfort in mind. Gentle, minimal ingredient products utilized to support all skin types.

      </p>

      <div className="rule" />
      <window.BookingEmbed category="wax" />

      <div className="rule" />
      <Eyebrow left="Gallery" right="Studio &amp; brow work" />
      <div className="gallery">
        <div className="tile tall">
          <img src="assets/wax-brow-shaping-studio.webp" alt="Edit Studio esthetician Livi Furtado mapping and grooming a client's brow with a spoolie brush — natural-shape brow architecture session, Oak Bay Victoria BC" loading="lazy" decoding="async" width="900" height="1500" />
        </div>
        <div className="tile square">
          <img src="assets/wax-underarm-treatment.webp" alt="Soft-wax underarm hair removal — gentle five-minute treatment for two-week smooth skin, Edit Studio Oak Bay Victoria BC" loading="lazy" decoding="async" width="1200" height="1200" />
        </div>
        <div className="tile">
          <img src="assets/wax-inner-thigh-treatment.webp" alt="Gentle hard-wax application on inner thigh — minimal-ingredient soft wax suitable for sensitive skin, Edit Studio Oak Bay Victoria BC" loading="lazy" decoding="async" width="1200" height="1200" />
        </div>
        <div className="tile wide">
          <img src="assets/wax-leg-treatment.webp" alt="Full-leg waxing service in progress — smooth, even strip with gentle aftercare, Edit Studio Oak Bay Victoria BC" loading="lazy" decoding="async" width="1200" height="1200" style={{ objectPosition: "center bottom" }} />
        </div>
      </div>

      <div className="rule" />
      <Eyebrow left="Your specialist" right="Brow + body" />
      <div className="stylists">
        <div className="stylist">
          <div className="avatar" style={{ backgroundImage: "url('assets/livi-furtado-waxing-headshot.webp')", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div>
            <h3>Livi Furtado <a className="ig" href="https://www.instagram.com/estheticsbylivi_/" target="_blank" rel="noopener noreferrer" aria-label="Livi Furtado on Instagram — @estheticsbylivi_"><em>@estheticsbylivi_</em></a></h3>
            <div className="role">CoFounder · Esthetician</div>
            <p>With over 3 years of waxing experience - Livi focuses on a detailed yet gentle waxing technique while considering client goals, comfort and personalized aftercare for smooth, ingrown free skin!</p>
          </div>
        </div>
      </div>
    </div>);

}

function LashesContent({ headline }) {
  return (
    <div className="cpanel">
      <Eyebrow left="04 / Lashes" right="Extensions · Lifts · Brows" />
      <h2>{headline || <span>Eyes, <em>elevated</em>.</span>}</h2>
      <p className="body">Lash extensions, lifts and brow services — classic through mega volume, lash &amp; brow lifts, tints and laminations. Tailored to your eye shape with a careful, gentle hand.</p>

      <div className="rule" />
      <window.BookingEmbed category="lashes" />

      {/* TODO: add a lash gallery here once photos are available (mirror the
          .gallery markup used on the Barbering / Waxing pages). */}

      <div className="rule" />
      <Eyebrow left="Your artist" right="Lash + brow" />
      <div className="stylists">
        <div className="stylist">
          {/* TODO: swap in Niamh's headshot — backgroundImage: url('assets/niamh-frazer-headshot.webp') */}
          <div className="avatar" style={{ background: 'oklch(0.55 0.13 290)' }} />
          <div>
            <h3>Niamh Frazer</h3>
            <div className="role">Lash Artist</div>
            <p>Lash and brow specialist focused on natural, eye-enhancing sets and a comfortable, meticulous application. From a soft classic set to dramatic mega volume — plus lifts, tints and brow lamination — tailored to suit you.</p>
          </div>
        </div>
      </div>
    </div>);

}

function VisitContent() {
  return (
    <div className="cpanel">
      <window.BookingEmbed />

      <div className="rule" />
      <Eyebrow left="Visit" right="Oak Bay · Victoria" />
      <h2>The <em>Studio</em>.</h2>
      <div className="address">
        <div className="address-street">1846 Oak Bay Avenue</div>
        <div className="address-city">Victoria, BC · V8R 1C5</div>
        <div className="address-links">
          <a className="address-link"
          href="https://www.google.com/maps/dir/?api=1&destination=1846+Oak+Bay+Ave+Victoria+BC+V8R+1C5&destination_place_id=ChIJmzIz-H51j1QRDs9WrmZ8rVU"
          target="_blank" rel="noopener noreferrer">Get directions <span aria-hidden="true">→</span></a>
          <a className="address-link"
          href="tel:+17785353348">778 535 3348</a>
        </div>
      </div>

      <div className="map">
        <iframe
          src="https://www.google.com/maps?q=Edit+Studio+1846+Oak+Bay+Ave+Victoria+BC&output=embed"
          title="Edit Studio location — 1846 Oak Bay Avenue, Victoria BC"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen={false}>
        </iframe>
      </div>

      <div className="rule" />
      <Eyebrow left="Hours" right="Oak Bay · Victoria" />
      <div className="hours">
        <div className="row"><div>MON – TUE</div><div style={{ textAlign: "right" }}>Closed</div></div>
        <div className="row"><div>WED – SUN</div><div style={{ textAlign: "right" }}>10 – 6</div></div>
        <div className="row"><div>BEFORE/AFTER HOURS</div><div style={{ textAlign: "right" }}>By request</div></div>
      </div>

      <div className="rule" />
      <Eyebrow left="FAQ" right="Read me first" />
      <div className="faq">
        <details>
          <summary>How do I book? <span className="plus">+</span></summary>
          <div className="answer">Tap the "Book now" button at the bottom of the screen to jump straight to scheduling!</div>
        </details>
        <details>
          <summary>Do you take walk-ins? <span className="plus">+</span></summary>
          <div className="answer">When there is availability we are able to take walk-ins. Booking is the safer bet, as we are a small studio and can fill up quite quickly!</div>
        </details>
        <details>
          <summary>What&apos;s your cancellation policy? <span className="plus">+</span></summary>
          <div className="answer">Life happens — we get it. If something comes up, just give us a call or text as soon as you can so we can offer the spot to someone on the waitlist. No fees for the occasional cancel or reschedule. Repeated no-shows will result in a deposit or full charge on future bookings.</div>
        </details>
        <details>
          <summary>Are you accessible? <span className="plus">+</span></summary>
          <div className="answer">Our entry is three steps down, with a small concrete ramp running alongside the stairs. Once inside, both the barber chair and the waxing room are accessible. If you'd like a hand or want to chat through the layout before your visit, just give us a call.</div>
        </details>
        <details>
          <summary>Do you offer gift cards? <span className="plus">+</span></summary>
          <div className="answer">Yes — gift cards are available in-store. Drop by during opening hours and we&apos;ll set you up.</div>
        </details>
        <details>
          <summary>Where do I park? <span className="plus">+</span></summary>
          <div className="answer">Free street parking is available right outside the studio on Oak Bay Avenue.</div>
        </details>
      </div>

      <div className="rule" />
      <Eyebrow left="Goods" right="Curated · Local · Rotating" />
      <div className="goods-card">
        <h4>The <em>shelf</em>.</h4>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>A small, rotating selection of curated products available in studio. Featuring Canadian made wellness products such as Mint Cleaning, Milkjar Candles, NUDA, Bushbalm, and more. 

        </p>
        <div className="row"><span>Visit in person</span><span>→</span></div>
      </div>

      <div className="rule" />
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', lineHeight: 1.6 }}>
        © {new Date().getFullYear()} Edit Studio · Oak Bay, Victoria BC
        <br />
        <a href="/privacy" style={{ color: 'var(--ink-faint)', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink-soft)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-faint)'}>
          Privacy Policy
        </a>
      </p>
    </div>);

}

Object.assign(window, { BarberingContent, TanContent, WaxContent, LashesContent, VisitContent });