/* The Park Bistro — interactions
   Kept deliberately light: a sticky header, scroll-reveals, an active
   section marker on the index rail, and the mobile menu. */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- current year ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- sticky header ---- */
  const head = document.querySelector(".site-head");
  const onScroll = () => {
    if (window.scrollY > 40) head.classList.add("is-stuck");
    else head.classList.remove("is-stuck");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- mobile nav ---- */
  const toggle = document.querySelector(".menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mainEl = document.querySelector("main");

  const setNav = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    // keep the page behind the overlay out of the Tab order and off-limits to screen readers
    // (the toggle button itself stays interactive — it's how the overlay gets closed)
    if (mainEl) open ? mainEl.setAttribute("inert", "") : mainEl.removeAttribute("inert");
    if (open) {
      mobileNav.hidden = false;
      requestAnimationFrame(() => mobileNav.classList.add("is-open"));
      document.body.style.overflow = "hidden";
    } else {
      mobileNav.classList.remove("is-open");
      document.body.style.overflow = "";
      window.setTimeout(() => { mobileNav.hidden = true; }, 400);
    }
  };

  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setNav(false))
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setNav(false);
    });
  }

  /* ---- scroll reveals ---- */
  const revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    const revealObs = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  }

  /* ---- gallery (live Google Places photos, falling back to local shots) ---- */
  (function gallery() {
    const grid = document.querySelector("[data-photos-grid]");
    if (!grid) return;

    // local, always-available photos — used whenever there's no live Google
    // data at all, or too many of the live photo URLs have gone stale
    const FALLBACK_PHOTOS = [
      { url: "assets/images/dish_plated.jpg", alt: "A plated dish at the bistro" },
      { url: "assets/images/dessert.jpg", alt: "A dessert from the bistro's kitchen" },
      { url: "assets/images/table_setting.jpg", alt: "A table set for dining" },
      { url: "assets/images/wine_pour.jpg", alt: "Wine being poured at the table" },
      { url: "assets/images/dish_greens.jpg", alt: "A fresh green dish" },
      { url: "assets/images/hero_canopy.jpg", alt: "The tree canopy near the bistro" },
      { url: "assets/images/forest_path.jpg", alt: "A path near the bistro" },
    ];
    const MIN_VISIBLE = 3;

    const data = window.__PHOTOS__;
    const hasLiveData = data && Array.isArray(data.items) && data.items.length;
    const isGoogle = hasLiveData && data.source === "google";
    const items = hasLiveData ? data.items : FALLBACK_PHOTOS;

    const renderFallback = () => {
      const frag = document.createDocumentFragment();
      FALLBACK_PHOTOS.forEach((item) => {
        const fig = document.createElement("figure");
        fig.className = "gphoto reveal in-view";
        const img = document.createElement("img");
        img.src = item.url;
        img.alt = item.alt;
        img.loading = "lazy";
        fig.appendChild(img);
        frag.appendChild(fig);
      });
      grid.replaceChildren(frag);
      const eyebrow = document.querySelector("[data-gallery-eyebrow]");
      if (eyebrow) eyebrow.textContent = "From the kitchen";
      const attrib = document.querySelector("[data-gallery-attrib]");
      if (attrib) attrib.hidden = true;
    };

    if (!hasLiveData) {
      renderFallback();
      return;
    }

    const frag = document.createDocumentFragment();
    let pendingLoads = items.length;
    let failedLoads = 0;

    items.forEach((item, i) => {
      if (!item || !item.url) return;
      const fig = document.createElement("figure");
      fig.className = "gphoto reveal";

      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.alt || (isGoogle ? "Photo of the bistro, from Google" : "Inside the bistro");
      img.loading = i < 3 ? "eager" : "lazy";
      // if a live Google photo ever fails to load, drop the tile rather than show a broken image
      img.addEventListener("error", () => {
        fig.remove();
        failedLoads += 1;
        checkFallback();
      });
      img.addEventListener("load", checkFallback);
      fig.appendChild(img);

      // Google requires showing the contributor attribution that ships with each photo
      if (isGoogle && item.attribution) {
        const cap = document.createElement("figcaption");
        cap.className = "gphoto__credit";
        cap.innerHTML = item.attribution; // Google-provided HTML (a contributor link)
        cap.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
        fig.appendChild(cap);
      }
      frag.appendChild(fig);
    });

    // if too many of the live photo URLs have gone stale, fall back to the
    // local set entirely rather than leaving the gallery half-empty
    function checkFallback() {
      pendingLoads -= 1;
      if (pendingLoads > 0) return;
      const visible = items.length - failedLoads;
      if (visible < MIN_VISIBLE) renderFallback();
    }

    grid.replaceChildren(frag);

    // when the photos are the real Google ones, surface the "Photos from Google" credit
    if (isGoogle) {
      const attrib = document.querySelector("[data-gallery-attrib]");
      if (attrib) attrib.hidden = false;
      const eyebrow = document.querySelector("[data-gallery-eyebrow]");
      if (eyebrow) eyebrow.textContent = "From Google";
    }

    // reveal the freshly-injected tiles
    if (reduceMotion || !("IntersectionObserver" in window)) {
      grid.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
    } else {
      const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); o.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      grid.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    }
  })();

  /* ---- reviews sliding banner ---- */
  (function reviews() {
    const track = document.querySelector("[data-reviews-track]");
    const data = window.__REVIEWS__;
    if (!track || !data || !Array.isArray(data.items) || !data.items.length) return;

    const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const initials = (name) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const stars = (n) => {
      const full = Math.round(n);
      return `<span class="review__stars" aria-label="${full} out of 5 stars">${"★".repeat(full)}<span class="review__stars-empty">${"★".repeat(5 - full)}</span></span>`;
    };
    const card = (r) => `
      <article class="review">
        ${stars(r.rating)}
        <p class="review__text">${esc(r.text)}</p>
        <div class="review__by">
          <span class="review__avatar" aria-hidden="true">${esc(initials(r.name))}</span>
          <span class="review__meta">
            <span class="review__name">${esc(r.name)}</span>
            <span class="review__when">via Google</span>
          </span>
        </div>
      </article>`;

    // render twice for a seamless marquee loop
    const html = data.items.map(card).join("");
    track.innerHTML = html + html;
    track.querySelectorAll(".review").forEach((c, i) => {
      if (i >= data.items.length) c.setAttribute("aria-hidden", "true");
    });

    // add a "See more" toggle to any review long enough to actually be clipped
    track.querySelectorAll(".review__text").forEach((el) => {
      if (el.scrollHeight - el.clientHeight <= 2) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "review__more";
      btn.textContent = "See more";
      btn.addEventListener("click", () => {
        const expanded = el.classList.toggle("is-expanded");
        btn.textContent = expanded ? "See less" : "See more";
      });
      el.insertAdjacentElement("afterend", btn);
    });

    // summary line (rating + count)
    const summary = document.querySelector("[data-reviews-summary]");
    if (summary && data.rating) {
      const score = summary.querySelector(".reviews__score");
      const count = summary.querySelector(".reviews__count");
      if (score) score.textContent = Number(data.rating).toFixed(1);
      if (count) count.textContent = data.total ? `· ${data.total} Google reviews` : "· from Google reviews";
    }

    // pause the slide while a card has keyboard focus (accessibility)
    track.addEventListener("focusin", () => { track.style.animationPlayState = "paused"; });
    track.addEventListener("focusout", () => { track.style.animationPlayState = ""; });

    // explicit, keyboard-operable pause/play control — focus alone doesn't
    // land on anything inside the cards, so this is the real way to stop it
    const pauseBtn = document.querySelector("[data-reviews-pause]");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        const paused = pauseBtn.getAttribute("aria-pressed") === "true";
        pauseBtn.setAttribute("aria-pressed", String(!paused));
        pauseBtn.setAttribute("aria-label", paused ? "Pause the scrolling reviews" : "Resume the scrolling reviews");
        track.style.animationPlayState = paused ? "" : "paused";
      });
    }
  })();

  /* ---- active section on the index rail ---- */
  const railLinks = Array.from(document.querySelectorAll("[data-rail]"));
  const sections = railLinks
    // only in-page anchors participate — a rail link to another page would
    // throw here, since its href isn't a valid selector
    .filter((l) => l.getAttribute("href").startsWith("#"))
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const railObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = "#" + entry.target.id;
            railLinks.forEach((l) =>
              l.classList.toggle("is-active", l.getAttribute("href") === id)
            );
          }
        });
      },
      { threshold: 0.5, rootMargin: "-20% 0px -40% 0px" }
    );
    sections.forEach((s) => railObs.observe(s));
  }
})();
