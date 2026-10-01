/* Site runtime.
   - Pausable vignettes: any [data-pausable] gets its .pause button wired, sleeps
     while offscreen, and starts paused under prefers-reduced-motion.
   - MM.loop(el, fn): a requestAnimationFrame loop that only runs while `el` is
     visible and not paused, so a page full of vignettes costs almost nothing.
   - Copy buttons ([data-copy]) and a small toast. */
(function () {
  "use strict";

  var root = document.documentElement;
  var preview = /(^|#)preview\b/.test(location.hash);
  if (preview) root.classList.add("is-preview");
  var reduceMQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  var MM = (window.MM = window.MM || {});
  MM.preview = preview;
  MM.reduced = function () { return reduceMQ.matches; };

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  MM.el = el;

  var ICON = {
    pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4" width="4.2" height="16" rx="1.3" fill="currentColor"/><rect x="14.3" y="4" width="4.2" height="16" rx="1.3" fill="currentColor"/></svg>',
    play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.6v14.8c0 .8.9 1.3 1.6.8l11.3-7.4a1 1 0 0 0 0-1.6L8.6 3.8C7.9 3.3 7 3.8 7 4.6Z" fill="currentColor"/></svg>'
  };
  MM.ICON = ICON;

  /* ---------------------------------------------------------- toast --- */
  var toastEl, toastT;
  MM.toast = function (msg) {
    if (!toastEl) { toastEl = el("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  };

  MM.copy = function (text, btn) {
    function done(ok) {
      MM.toast(ok ? "Copied " + text : "Select the text to copy it");
      if (btn) { var o = btn.textContent; btn.textContent = ok ? "Copied" : "Select"; setTimeout(function () { btn.textContent = o; }, 1600); }
    }
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } catch (e) { done(false); }
  };

  /* ------------------------------------------------------ pausables --- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var t = en.target;
      if (en.isIntersecting) t.removeAttribute("data-offscreen");
      else t.setAttribute("data-offscreen", "");
      t.dispatchEvent(new CustomEvent("mm:visibility", { detail: { visible: en.isIntersecting } }));
      syncVideos(t);
    });
  }, { rootMargin: "120px 0px" }) : null;

  function syncVideos(t) {
    var paused = t.getAttribute("data-paused") === "true" || t.hasAttribute("data-offscreen");
    t.querySelectorAll("video[data-loop]").forEach(function (v) {
      if (paused) v.pause();
      else { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }

  MM.setPaused = function (t, paused) {
    t.setAttribute("data-paused", paused ? "true" : "false");
    var b = t.querySelector(":scope > .pause, .pause--own");
    if (b) b.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
    t.dispatchEvent(new CustomEvent("mm:pause", { detail: { paused: paused } }));
    syncVideos(t);
  };

  MM.pausable = function (t) {
    if (t.__mmPausable) return;
    t.__mmPausable = true;
    var btn = t.querySelector(":scope > .pause, .pause--own");
    if (!btn && !t.hasAttribute("data-no-button")) {
      btn = el("button", { class: "pause", type: "button", "aria-label": "Pause animation" }, ICON.pause + ICON.play);
      t.appendChild(btn);
    } else if (btn && !btn.innerHTML.trim()) {
      btn.innerHTML = ICON.pause + ICON.play;
    }
    if (btn) btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      MM.setPaused(t, t.getAttribute("data-paused") !== "true");
    });
    // Things the visitor drives (a game) keep running under reduced motion; ambient loops start paused.
    MM.setPaused(t, (MM.reduced() && !t.hasAttribute("data-interactive")) || preview && t.hasAttribute("data-preview-still"));
    if (io) io.observe(t);
  };

  /* A rAF loop that runs only while `t` is on screen and not paused. */
  MM.loop = function (t, fn, opts) {
    opts = opts || {};
    var raf = 0, last = 0, time = opts.start || 0, dead = false;
    function active() {
      return document.visibilityState !== "hidden" && t.getAttribute("data-paused") !== "true" && !t.hasAttribute("data-offscreen");
    }
    function tick(now) {
      raf = 0;
      if (dead) return;
      var dt = last ? Math.min(now - last, 48) : 16;
      last = now;
      time += dt;
      fn(time, dt);
      if (active()) raf = requestAnimationFrame(tick);
      else last = 0;
    }
    function wake() { if (!raf && !dead && active()) raf = requestAnimationFrame(tick); }
    t.addEventListener("mm:pause", wake);
    t.addEventListener("mm:visibility", wake);
    document.addEventListener("visibilitychange", wake);
    // Paint one frame at rest so a paused or reduced-motion vignette is never blank.
    requestAnimationFrame(function () { fn(time, 0); wake(); });
    return { stop: function () { dead = true; if (raf) cancelAnimationFrame(raf); }, wake: wake, get time() { return time; }, set time(v) { time = v; } };
  };

  /* Deterministic PRNG for layouts that must match on every load. */
  MM.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  MM.ease = {
    inOutCubic: function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    outCubic: function (u) { return 1 - Math.pow(1 - u, 3); },
    outQuint: function (u) { return 1 - Math.pow(1 - u, 5); },
    inOutSine: function (u) { return -(Math.cos(Math.PI * u) - 1) / 2; },
    smoother: function (u) { return u * u * u * (u * (u * 6 - 15) + 10); }
  };
  MM.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* Canvas sized to its box at device pixel ratio (capped at 2). Refuses zero boxes. */
  MM.fitCanvas = function (canvas, ctx) {
    var r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height, dpr: dpr };
  };

  function boot() {
    document.querySelectorAll("[data-pausable]").forEach(MM.pausable);
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-copy]");
      if (b) { e.preventDefault(); MM.copy(b.getAttribute("data-copy"), b); }
    });
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", function () {
      document.querySelectorAll("[data-pausable]:not([data-interactive])").forEach(function (t) { MM.setPaused(t, reduceMQ.matches); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
