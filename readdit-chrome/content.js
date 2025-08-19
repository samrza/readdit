(() => {
  const OVERLAY_ID = "rr_overlay";
  const CSS_ID = "rr_css";

  // 1) Add CSS that hides EVERYTHING except our overlay
  function injectHiderCSS() {
    let style = document.getElementById(CSS_ID);
    if (style) return;
    style = document.createElement("style");
    style.id = CSS_ID;
    style.textContent = `
      html, body { background: #000 !important; }
      /* Hide all direct children of body EXCEPT our overlay */
      body > :not(#${OVERLAY_ID}) { display: none !important; }
    `;
    document.documentElement.appendChild(style);
  }

  // 2) Create (or clear) our overlay container
  function ensureOverlay() {
    let ov = document.getElementById(OVERLAY_ID);
    if (!ov) {
      ov = document.createElement("div");
      ov.id = OVERLAY_ID;
      ov.setAttribute("style", `
        display:block !important;
        color:#fff;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",sans-serif;
        line-height:1.85;
        font-size:18px;
        max-width:700px;
        margin:0 auto;
        padding:32px 24px 56px;
        white-space:pre-wrap;
      `);
      document.body.appendChild(ov);
      // ESC to exit
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const css = document.getElementById(CSS_ID);
          if (css) css.remove();
          ov.remove();
        }
      });
    } else {
      ov.textContent = ""; // clear
    }
    return ov;
  }

  // 3) Try multiple selectors (Reddit changes these often)
  function extractStrictText() {
    const title =
      (document.querySelector('h1, a[data-testid="post-title"], h2')?.innerText || document.title || "Reddit Post").trim();

    // Known/likely text containers (try in order)
    const candidates = [
      'div[data-post-click-location="text-body"]',     // newer Reddit (mid-2025)
      'div[data-click-id="text"]',                     // common text post body
      'div[data-test-id="post-content"] [data-click-id="text"]', // older path
      'article div[data-click-id="text"]'
    ];

    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) {
        const t = (el.innerText || "").trim();
        if (t.length > 80) return { title, body: t };
      }
    }

    // Fallback: heuristic — pick the largest readable block (avoid comments/sidebars)
    const blocks = Array.from(document.querySelectorAll("article, main, section, div, p"))
      .filter(el => {
        const tag = el.tagName.toLowerCase();
        if (["nav","aside","header","footer","form","menu"].includes(tag)) return false;
        const cls = (el.className || "").toString().toLowerCase();
        if (/(comment|reply|sidebar|menu|nav|footer|header|login|signup|modal)/.test(cls)) return false;
        const role = el.getAttribute?.("role") || "";
        if (/(navigation|dialog|banner|complementary)/.test(role)) return false;
        const text = (el.innerText || "").trim();
        return text.split(/\s+/).length > 60;
      })
      .map(el => ({ el, score: (el.innerText || "").length }))
      .sort((a, b) => b.score - a.score);

    const body = (blocks[0]?.el?.innerText || "").trim();
    return { title, body };
  }

  // 4) Render into overlay
  function render({ title, body }) {
    const ov = ensureOverlay();

    const h1 = document.createElement("div");
    h1.textContent = title;
    h1.style.fontSize = "2rem";
    h1.style.fontWeight = "700";
    h1.style.margin = "0 0 1.25rem 0";

    const text = document.createElement("div");
    text.textContent = body || "";
    text.style.fontWeight = "400";

    ov.appendChild(h1);
    ov.appendChild(text);
  }

  // 5) Boot: hide everything first, then try to extract; retry briefly while Reddit renders
  function start() {
    injectHiderCSS();
    render({ title: "Loading…", body: "" });

    let attempts = 0;
    const maxAttempts = 30; // ~6s total
    const tick = () => {
      const out = extractStrictText();
      if (out.body && out.body.length > 80) {
        render(out);
      } else if (attempts++ < maxAttempts) {
        setTimeout(tick, 200);
      } else {
        render({ title: document.title || "Reddit Post", body: "No text body found." });
      }
    };
    tick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  // 6) Handle SPA route changes (open a new post without full reload)
  const _pushState = history.pushState;
  history.pushState = function () {
    const r = _pushState.apply(this, arguments);
    setTimeout(start, 50);
    return r;
  };
  window.addEventListener("popstate", () => setTimeout(start, 50));
})();
