/* ================================================
   ADAS PRO — LandPage: visualização "ADAS Live"
   - Radar ACC (canvas #radarCanvas)
   - HUD da câmera frontal (#cameraHUD)
   - Rotação dos parâmetros ADAS (.adas-metric-val[data-values])
   - Contador dramático (.dramatic-section[data-target])
   Todos os blocos são autodeclarativos: se o elemento não existir
   na página, a função simplesmente não faz nada.
   ================================================ */

(function () {
  'use strict';

  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ─── 1. Radar ACC ─────────────────────────────────────────── */
  function initRadar() {
    var c = document.getElementById('radarCanvas');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    if (!ctx) return;

    var CSS = 160;                       // tamanho exibido (atributos width/height)
    c.width = Math.round(CSS * DPR);
    c.height = Math.round(CSS * DPR);
    c.style.width = CSS + 'px';
    c.style.height = CSS + 'px';
    ctx.scale(DPR, DPR);

    var cx = CSS / 2, cy = CSS / 2, R = CSS / 2 - 6;
    var angle = 0;

    // Alvos fixos (ângulo em rad, distância 0..1, força 0..1)
    var targets = [
      { a: -0.75, d: 0.62, s: 1.00, c: '#06A77D' },
      { a:  0.42, d: 0.44, s: 0.85, c: '#06A77D' },
      { a:  2.30, d: 0.78, s: 0.60, c: '#F4A261' },
      { a: -2.45, d: 0.35, s: 0.70, c: '#06A77D' }
    ];

    function draw() {
      ctx.clearRect(0, 0, CSS, CSS);

      // Fundo
      var bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, R);
      bg.addColorStop(0, 'rgba(0,180,216,0.14)');
      bg.addColorStop(1, 'rgba(0,180,216,0.02)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();

      // Anéis de distância
      ctx.strokeStyle = 'rgba(0,180,216,0.22)';
      ctx.lineWidth = 1;
      for (var i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cruzeta
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.strokeStyle = 'rgba(0,180,216,0.14)';
      ctx.stroke();

      // Varredura
      var sweep = ctx.createConicGradient
        ? ctx.createConicGradient(angle - 0.9, cx, cy)
        : null;
      if (sweep) {
        sweep.addColorStop(0, 'rgba(0,180,216,0)');
        sweep.addColorStop(0.86, 'rgba(0,180,216,0.05)');
        sweep.addColorStop(1, 'rgba(0,180,216,0.45)');
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = sweep; ctx.fill();
      }
      // Linha de varredura (sempre)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
      ctx.strokeStyle = 'rgba(128,223,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Alvos
      targets.forEach(function (t) {
        var x = cx + Math.cos(t.a) * R * t.d;
        var y = cy + Math.sin(t.a) * R * t.d;
        // pisca quando a varredura passa perto
        var diff = Math.abs(((angle - t.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        var glow = Math.max(0, 1 - diff / 1.1);
        ctx.beginPath();
        ctx.arc(x, y, 3 + glow * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = t.c;
        ctx.globalAlpha = 0.35 + glow * 0.65;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (glow > 0.05) {
          ctx.beginPath();
          ctx.arc(x, y, 7 + glow * 7, 0, Math.PI * 2);
          ctx.strokeStyle = t.c;
          ctx.globalAlpha = glow * 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Veículo próprio
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00B4D8';
      ctx.fill();

      angle += 0.018;
      if (angle > Math.PI * 2) angle -= Math.PI * 2;
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ─── 2. HUD da câmera frontal ─────────────────────────────── */
  function initCameraHUD() {
    var host = document.getElementById('cameraHUD');
    if (!host) return;

    var cv = document.createElement('canvas');
    cv.style.width = '100%';
    cv.style.height = '130px';
    cv.style.display = 'block';
    cv.style.borderRadius = '10px';
    host.appendChild(cv);
    var ctx = cv.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 130, t = 0;

    function resize() {
      W = Math.max(host.clientWidth, 160);
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    else window.addEventListener('resize', resize);

    function box(x, y, w, h, label, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x, y, w, h);
      // cantos destacados
      var k = Math.min(10, w / 3, h / 3);
      ctx.lineWidth = 2.4;
      [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(function (p) {
        ctx.beginPath();
        ctx.moveTo(p[0] + p[2] * k, p[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.lineTo(p[0], p[1] + p[3] * k);
        ctx.stroke();
      });
      if (label) {
        ctx.font = '600 8px Inter, sans-serif';
        var tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 13, tw, 12);
        ctx.fillStyle = '#04121a';
        ctx.fillText(label, x + 4, y - 4);
      }
    }

    function draw() {
      if (!W) { requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);

      // Céu / pista
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0a1a26');
      sky.addColorStop(0.42, '#123043');
      sky.addColorStop(0.43, '#1a2733');
      sky.addColorStop(1, '#0e1a24');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      var hz = H * 0.43;
      var vx = W / 2;

      // Faixas em perspectiva
      function lane(offset, color, width, dash) {
        ctx.beginPath();
        ctx.moveTo(vx + offset * 6, hz);
        ctx.lineTo(vx + offset * W * 0.55, H + 10);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      lane(-1, 'rgba(255,255,255,.55)', 3);
      lane( 1, 'rgba(255,255,255,.55)', 3);
      lane( 0, 'rgba(255,255,255,.28)', 2, [10, 14 - (t % 14)]);

      // Realce LKAS (verde)
      lane(-1, 'rgba(77,217,168,.85)', 2);
      lane( 1, 'rgba(77,217,168,.85)', 2);

      // Veículos à frente
      var bob = Math.sin(t / 26) * 2;
      box(W * 0.5 - 34, hz - 6 + bob, 68, 42, '22.1m  78km/h', '#06A77D');
      box(W * 0.5 + 46, hz + 16 + bob * 0.6, 40, 30, 'AVM', '#00B4D8');

      // Bracket de câmera
      ctx.strokeStyle = 'rgba(0,180,216,.5)';
      ctx.lineWidth = 1.5;
      var m = 8, k = 12;
      [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (p) {
        ctx.beginPath();
        ctx.moveTo(p[0] + p[2] * k, p[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.lineTo(p[0], p[1] + p[3] * k);
        ctx.stroke();
      });

      // HUD superior
      ctx.font = '700 8px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillText('LKAS ATIVO', m + 6, m + 12);
      ctx.fillStyle = '#4dd9a8';
      ctx.fillText('AEB ARMED', W - m - 62, m + 12);

      t += 1;
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ─── 3. Rotação dos parâmetros ADAS ───────────────────────── */
  function initMetricRotation() {
    var els = document.querySelectorAll('.adas-metric-val[data-values]');
    if (!els.length) return;
    var idx = 0;
    setInterval(function () {
      idx++;
      els.forEach(function (el) {
        var vals = (el.dataset.values || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!vals.length) return;
        el.style.opacity = '0.25';
        setTimeout(function () {
          el.textContent = vals[idx % vals.length];
          el.style.opacity = '1';
        }, 180);
      });
    }, 2800);
    els.forEach(function (el) { el.style.transition = 'opacity .18s ease'; });
  }

  /* ─── 4. Contador dramático (.dramatic-section) ────────────── */
  function initDramaticCounters() {
    var els = document.querySelectorAll('.dramatic-section[data-target]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        var el = e.target;
        var target = parseInt(el.dataset.target, 10);
        if (isNaN(target)) return;
        var suffix = el.dataset.suffix || '';
        var dur = 1600, start = null;
        el.textContent = '0' + suffix;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });

    els.forEach(function (el) { obs.observe(el); });
  }

  /* ─── Init ─── */
  function boot() {
    try { initRadar(); } catch (e) { console.warn('[adas-viz] radar:', e); }
    try { initCameraHUD(); } catch (e) { console.warn('[adas-viz] hud:', e); }
    try { initMetricRotation(); } catch (e) { console.warn('[adas-viz] metrics:', e); }
    try { initDramaticCounters(); } catch (e) { console.warn('[adas-viz] counters:', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
