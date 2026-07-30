/* LV TOOL — lvnav.js — mémoire de navigation commune
   Usage :
     LVNAV.init({ app:"mon-app", snapshot:function(){return {...}}, restore:function(s){} });
     LVNAV.push()    -> nouvelle vue (bouton retour Android remonte d'un cran)
     LVNAV.replace() -> même vue, état mis à jour
     LVNAV.back()    -> retour arrière (à câbler sur les boutons "← Retour")
     LVNAV.save()    -> sauvegarde immédiate
   Survit au rechargement d'onglet (Chrome Android tue les onglets en arrière-plan).
*/
(function () {
  if (window.LVNAV) return;
  var C = null, KEY = null, TTL = 6 * 3600 * 1000, ready = false, tick = null;

  function store(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        t: Date.now(), s: s, y: window.scrollY || window.pageYOffset || 0
      }));
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

  var LVNAV = {
    init: function (o) {
      C = o;
      KEY = "lvnav:" + o.app + ":v1";
      if (o.ttl) TTL = o.ttl;
      var boot = function () {
        var p = read();
        if (p && p.s) {
          try { C.restore(p.s); } catch (e) {}
          if (p.y) setTimeout(function () { window.scrollTo(0, p.y); }, 80);
        }
        try { history.replaceState({ lv: C.snapshot() }, ""); } catch (e) {}
        ready = true;
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
      else boot();

      window.addEventListener("popstate", function (ev) {
        if (!ev.state || !ev.state.lv) return;
        try { C.restore(ev.state.lv); } catch (e) {}
        store(ev.state.lv);
      });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") LVNAV.save();
      });
      window.addEventListener("pagehide", function () { LVNAV.save(); });
      if (tick) clearInterval(tick);
      tick = setInterval(function () { if (ready) LVNAV.save(); }, 4000);
    },
    save: function () { if (!C || !ready) return; try { store(C.snapshot()); } catch (e) {} },
    push: function () {
      if (!C || !ready) return;
      try { var s = C.snapshot(); history.pushState({ lv: s }, ""); store(s); } catch (e) {}
    },
    replace: function () {
      if (!C || !ready) return;
      try { var s = C.snapshot(); history.replaceState({ lv: s }, ""); store(s); } catch (e) {}
    },
    back: function () { try { history.back(); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
  window.LVNAV = LVNAV;
})();
