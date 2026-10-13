// Scales the 1920x1080 stage (#dc-root) to fit the window, letterboxed and centred.
(function () {
  function fit() {
    var r = document.getElementById('dc-root');
    if (!r) return;
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    r.style.transform = 'scale(' + s + ')';
    r.style.left = ((innerWidth - 1920 * s) / 2) + 'px';
    r.style.top = ((innerHeight - 1080 * s) / 2) + 'px';
  }
  addEventListener('resize', fit);
  addEventListener('orientationchange', fit);
  // fit again every 50 ms for about 2 s: #dc-root may be rendered after this script runs
  var n = 0, t = setInterval(function () { fit(); if (++n > 40) clearInterval(t); }, 50);
})();
