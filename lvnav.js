/* LV TOOL — lvnav.js v2 — mémoire de navigation commune
   LVNAV.init({
     app:"mon-app",
     snapshot:function(){return {...}},   // optionnel
     restore:function(s){},               // optionnel
     sections:".sec",                     // optionnel : éléments dépliables mémorisés
     overlays:"#player, .sheet",          // optionnel : le retour Android les ferme
     close:"closeSheet"                   // optionnel : fonction globale de fermeture
   });
   LVNAV.push() / .replace() / .back() / .save()
   Survit au rechargement d'onglet (Chrome Android tue les onglets en arrière-plan).
*/
(function () {
  if (window.LVNAV && window.LVNAV.v === 2) return;
  var C = null, KEY = null, TTL = 6 * 3600 * 1000, ready = false, tick = null, obs = null, guard = false;
  var OPEN = ["open", "on", "show", "active"];

  function vis(el) {
    if (!el) return false;
    if (el.tagName === "DETAILS") return el.hasAttribute("open");
    for (var i = 0; i < OPEN.length; i++) if (el.classList.contains(OPEN[i])) return true;
    return false;
  }
  function secState() {
    if (!C || !C.sections) return null;
    var els = document.querySelectorAll(C.sections), s = [];
    for (var i = 0; i < els.length; i++) if (vis(els[i])) s.push(i);
    return s;
  }
  function secApply(list) {
    if (!C || !C.sections || !list) return;
    var els = document.querySelectorAll(C.sections);
    for (var i = 0; i < els.length; i++) {
      var want = list.indexOf(i) !== -1, el = els[i];
      if (el.tagName === "DETAILS") { if (want) el.setAttribute("open", ""); else el.removeAttribute("open"); }
      else if (want !== vis(el)) {
        if (want) el.classList.add("open");
        else for (var j = 0; j < OPEN.length; j++) el.classList.remove(OPEN[j]);
      }
    }
  }
  function openOverlay() {
    if (!C || !C.overlays) return null;
    var els = document.querySelectorAll(C.overlays);
    for (var i = 0; i < els.length; i++) if (vis(els[i])) return els[i];
    return null;
  }
  function closeOverlay(el) {
    if (C && C.close && typeof window[C.close] === "function") { try { window[C.close](); return; } catch (e) {} }
    guard = true;
    for (var j = 0; j < OPEN.length; j++) el.classList.remove(OPEN[j]);
    setTimeout(function () { guard = false; }, 60);
  }

  function pack() {
    var s = {};
    try { s.u = C.snapshot ? C.snapshot() : {}; } catch (e) { s.u = {}; }
    s.k = secState();
    return s;
  }
  function unpack(s) {
    if (!s) return;
    try { if (C.restore) C.restore(s.u || s); } catch (e) {}
    try { secApply(s.k); } catch (e) {}
  }
  function store(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), s: s, y: window.scrollY || window.pageYOffset || 0 }));
    } catch (e) {}
  }
  function read() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY));
      if (!p || !p.t) return null;
      if (Date.now() - p.t > TTL) { localStorage.removeItem(KEY); return null; }
      return p;
    } catch (e) { return null; }
  }

  /* Un overlay qui s'ouvre = une entrée d'historique -> le retour Android le referme */
  function watch() {
    if (!C || !C.overlays || obs) return;
    obs = new MutationObserver(function (muts) {
      if (!ready || guard) return;
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (!t.matches || !t.matches(C.overlays)) continue;
        if (vis(t) && !LVNAV._ov) { LVNAV._ov = true; LVNAV.push(); return; }
        if (!vis(t) && LVNAV._ov && !openOverlay()) { LVNAV._ov = false; return; }
      }
    });
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class", "open"] });
  }

  var LVNAV = {
    v: 2,
    _ov: false,
    init: function (o) {
      C = o;
      KEY = "lvnav:" + o.app + ":v1";
      if (o.ttl) TTL = o.ttl;
      var boot = function () {
        var p = read();
        if (p && p.s) {
          unpack(p.s);
          if (p.y) setTimeout(function () { window.scrollTo(0, p.y); }, 80);
        }
        try { history.replaceState({ lv: pack() }, ""); } catch (e) {}
        ready = true;
        watch();
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
      else boot();

      window.addEventListener("popstate", function (ev) {
        var ov = openOverlay();
        if (ov) { closeOverlay(ov); LVNAV._ov = false; return; }
        if (!ev.state || !ev.state.lv) return;
        unpack(ev.state.lv);
        store(ev.state.lv);
      });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") LVNAV.save();
      });
      window.addEventListener("pagehide", function () { LVNAV.save(); });
      if (tick) clearInterval(tick);
      tick = setInterval(function () { if (ready) LVNAV.save(); }, 4000);
    },
    save: function () { if (!C || !ready) return; store(pack()); },
    push: function () {
      if (!C || !ready) return;
      try { var s = pack(); history.pushState({ lv: s }, ""); store(s); } catch (e) {}
    },
    replace: function () {
      if (!C || !ready) return;
      try { var s = pack(); history.replaceState({ lv: s }, ""); store(s); } catch (e) {}
    },
    back: function () { try { history.back(); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
  window.LVNAV = LVNAV;
})();
