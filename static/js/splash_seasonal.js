/**
 * splash_seasonal.js — Sistema de Splash Screens Estacionales
 *
 * Fase 1 (Todo diciembre):   Árbol de Navidad 3D ASCII en Canvas.
 * Fase 2 (Solo el 3 de dic): Corazón 3D ASCII paramétrico encadenado.
 *
 * Zero overhead fuera de diciembre. Desmontaje limpio al finalizar.
 *
 * ─── CONSTANTES CONFIGURABLES ───────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
  const HOLIDAY_MONTH     = 12;    // Mes navideño (1-12)
  const ANNIVERSARY_DAY   = 3;     // Día del aniversario mensual
  const FORCE_CHRISTMAS   = false; // true → fuerza Caso A (solo árbol)
  const FORCE_ANNIVERSARY = false; // true → fuerza Caso B (árbol + corazón)
  const SESSION_KEY       = 'seasonal_splash_seen';

  // Duraciones (ms)
  const TREE_CASE_A_MS    = 7000;  // Caso A: árbol visible antes de desmontar
  const TREE_CASE_B_MS    = 5500;  // Caso B: árbol visible antes de pasar al corazón
  const TRANSITION_MS     = 600;   // Crossfade entre fases
  const HEART_DURATION_MS = 8000;  // Corazón visible antes de desmontar
  const FADE_OUT_MS       = 1200;  // Fade-out del overlay

  // Velocidades de construcción progresiva (segundos para completar)
  const TREE_BUILD_S      = 1.8;   // Árbol: 0 → 100% en 1.8 s
  const HEART_BUILD_S     = 1.8;   // Corazón: 0 → 100% en 1.8 s

  const ASCII_CHARS = ' .:-=+*#%@';

  // ── DETECCIÓN TEMPRANA ─────────────────────────────────────────────────────
  function esDashboard() {
    return (
      document.body.classList.contains('page-dashboard') ||
      document.getElementById('contador') !== null
    );
  }

  const urlParams  = new URLSearchParams(window.location.search);
  const urlNavidad = urlParams.get('navidad')     === '1';
  const urlAniv    = urlParams.get('aniversario') === '1';

  const hoy       = new Date();
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();

  // Fecha exacta de inicio de la relación: 3 de Julio de 2026 (mes 6 en JS, base 0)
  const FECHA_INICIO = new Date(2026, 6, 3);

  function calcularMesesJuntos() {
    let m = (hoy.getFullYear() - FECHA_INICIO.getFullYear()) * 12 +
            (hoy.getMonth() - FECHA_INICIO.getMonth());
    if (hoy.getDate() < FECHA_INICIO.getDate()) {
      m--;
    }
    return Math.max(0, m);
  }
  const mesesJuntos = calcularMesesJuntos();
  const textoAniversario = `FELIZ ANIVERSARIO · ${mesesJuntos} MESES JUNTOS ❤️`;

  // Matriz de comportamiento por fecha:
  // 1. 3 de diciembre (o ambos forzados): Árbol de Navidad -> Corazón encadenado
  // 2. Día 3 de cualquier otro mes (o ?aniversario=1 fuera de dic): Corazón directo
  // 3. Del 1 al 31 de diciembre excepto el 3 (o ?navidad=1): Solo Árbol
  const esDia3      = (diaActual === ANNIVERSARY_DAY) || urlAniv || FORCE_ANNIVERSARY;
  const esDiciembre = (mesActual === HOLIDAY_MONTH)   || urlNavidad || FORCE_CHRISTMAS;

  if (!esDia3 && !esDiciembre) return;

  const yaVisto = sessionStorage.getItem(SESSION_KEY);
  if (yaVisto && !urlNavidad && !urlAniv && !FORCE_CHRISTMAS && !FORCE_ANNIVERSARY) return;

  let modoFlujo;
  if (esDiciembre && esDia3) {
    modoFlujo = 'TREE_AND_HEART';
  } else if (esDia3) {
    modoFlujo = 'HEART_ONLY';
  } else {
    modoFlujo = 'TREE_ONLY';
  }

  // Notificar al sistema que el splash 3D está activo
  window.__splashActive = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INIT — Monta el overlay y arranca la escena correspondiente
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    if (!esDashboard()) return;
    if (document.getElementById('seasonal-splash-overlay')) return;

    sessionStorage.setItem(SESSION_KEY, '1');

    // ── OVERLAY ──
    const overlay = document.createElement('div');
    overlay.id = 'seasonal-splash-overlay';
    Object.assign(overlay.style, {
      position:       'fixed',
      inset:          '0',
      zIndex:         '9999',
      background:     '#07070c',
      overflow:       'hidden',
      opacity:        '1',
      transition:     `opacity ${FADE_OUT_MS}ms ease`,
    });

    // ── CANVAS (ocupa todo el overlay) ──
    const canvas = document.createElement('canvas');
    canvas.id = 'splash-canvas';
    Object.assign(canvas.style, {
      position: 'absolute',
      inset:    '0',
      display:  'block',
    });
    overlay.appendChild(canvas);

    // ── HUD ──
    const hud = document.createElement('div');
    Object.assign(hud.style, {
      position:      'absolute',
      bottom:        'clamp(24px, 5vh, 56px)',
      left:          '0',
      right:         '0',
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           '14px',
      transition:    'opacity 0.7s ease',
      opacity:       '0',
      pointerEvents: 'none',
    });

    const hudText = document.createElement('p');
    Object.assign(hudText.style, {
      margin:        '0',
      color:         '#f4f2ee',
      fontFamily:    "'Courier New', monospace",
      fontSize:      'clamp(13px, 2vw, 19px)',
      letterSpacing: '0.18em',
      textAlign:     'center',
      textShadow:    '0 0 20px rgba(244,209,102,0.6)',
    });

    const hudBtn = document.createElement('button');
    Object.assign(hudBtn.style, {
      background:     'rgba(255,255,255,0.09)',
      border:         '1px solid rgba(255,255,255,0.25)',
      color:          '#f4f2ee',
      fontFamily:     "'Courier New', monospace",
      fontSize:       'clamp(11px, 1.4vw, 14px)',
      letterSpacing:  '0.12em',
      padding:        '9px 28px',
      borderRadius:   '999px',
      cursor:         'pointer',
      transition:     'background 0.25s, border-color 0.25s',
      backdropFilter: 'blur(6px)',
      pointerEvents:  'auto',
    });
    hudBtn.addEventListener('mouseenter', () => {
      hudBtn.style.background   = 'rgba(255,255,255,0.2)';
      hudBtn.style.borderColor  = 'rgba(255,255,255,0.55)';
    });
    hudBtn.addEventListener('mouseleave', () => {
      hudBtn.style.background   = 'rgba(255,255,255,0.09)';
      hudBtn.style.borderColor  = 'rgba(255,255,255,0.25)';
    });

    hud.appendChild(hudText);
    hud.appendChild(hudBtn);
    overlay.appendChild(hud);

    document.body.appendChild(overlay);
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';

    // ── RESIZE ──
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── ESTADO GLOBAL ──
    let rafId      = null;
    let running    = true;
    let fase       = (modoFlujo === 'HEART_ONLY') ? 2 : 1;
    let phaseTimer = null;

    // ── DESMONTAJE LIMPIO ──────────────────────────────────────────────────
    function dismount() {
      running = false;
      if (rafId)      { cancelAnimationFrame(rafId); rafId = null; }
      if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
      window.removeEventListener('resize', resize);
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
        window.__splashActive = false;
        // Permitir que aniversario.js muestre su tarjeta original de felicitación
        window.dispatchEvent(new CustomEvent('splash-finished'));
        if (typeof window.lanzarSorpresaAniversario === 'function') {
          window.lanzarSorpresaAniversario();
        }
      }, FADE_OUT_MS + 60);
    }

    // ── TRANSICIÓN A FASE 2 ───────────────────────────────────────────────
    function goToPhase2() {
      if (fase !== 1) return;
      fase = 2;

      hud.style.opacity = '0';
      setTimeout(() => {
        hudText.textContent = textoAniversario;
        hudBtn.textContent  = 'Entrar a la página →';
        hud.style.opacity   = '1';
      }, TRANSITION_MS);

      startHeartPhase();
    }

    // ── BOTÓN ──
    hudBtn.addEventListener('click', () => {
      if (fase === 1 && modoFlujo === 'TREE_AND_HEART') {
        if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
        goToPhase2();
      } else {
        dismount();
      }
    });

    // Configuración de texto inicial del HUD
    if (modoFlujo === 'HEART_ONLY') {
      hudText.textContent = textoAniversario;
      hudBtn.textContent  = 'Entrar a la página →';
    } else {
      hudText.textContent = 'FELIZ NAVIDAD 🎄';
      hudBtn.textContent  = 'Continuar →';
    }

    // Mostrar HUD con retraso suave
    setTimeout(() => { hud.style.opacity = '1'; }, 1000);

    // ── ARRANQUE ──────────────────────────────────────────────────────────
    if (modoFlujo === 'HEART_ONLY') {
      startHeartPhase();
    } else {
      startTreePhase();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FASE 1 — ÁRBOL NAVIDEÑO 3D ASCII
    // ═══════════════════════════════════════════════════════════════════════
    function startTreePhase() {
      const ctx = canvas.getContext('2d');

      const treeParticles = buildTreeParticles();
      const snowParticles = buildSnowParticles(85);

      let prevTs      = null;
      let elapsed     = 0;
      let buildProg   = 0;
      let treeAngle   = 0;

      // Timer de duración de fase
      const treeDuration = (modoFlujo === 'TREE_AND_HEART') ? TREE_CASE_B_MS : TREE_CASE_A_MS;
      phaseTimer = setTimeout(() => {
        if (!running || fase !== 1) return;
        if (modoFlujo === 'TREE_AND_HEART') goToPhase2();
        else dismount();
      }, treeDuration);

      function loop(ts) {
        if (!running || fase !== 1) return;
        if (prevTs === null) prevTs = ts;
        const dt  = Math.min((ts - prevTs) / 1000, 0.1); // cap a 100 ms por frame
        prevTs    = ts;
        elapsed  += dt;

        // buildProgress basado en tiempo real (independiente de Hz)
        buildProg = Math.min(1, elapsed / TREE_BUILD_S);

        const W  = canvas.width;
        const H  = canvas.height;
        const cx = W / 2;
        const cy = H * 0.43;     // centro vertical elevado de la escena

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#07070c';
        ctx.fillRect(0, 0, W, H);

        treeAngle += dt * 0.6; // rad/s — rotación continua

        renderTree(ctx, treeParticles, cx, cy, W, H, treeAngle, buildProg, elapsed);
        renderSnow(ctx, snowParticles, W, H, dt);

        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }

    // ── Generar partículas del árbol ──────────────────────────────────────
    // 5 elementos: tronco, follaje por niveles, guirnalda, esferas, estrella
    function buildTreeParticles() {
      const particles = [];

      // Coordenadas de escena:
      //   y: -12 = cúspide del follaje, +10 = base follaje, +10..+13.5 = tronco
      //   radio máx en base follaje: 9

      // ── 1. TRONCO cilíndrico (y: +10..+13.5, r ≈ 1.4) ──────────────────
      const TRUNK_N = 180;
      for (let i = 0; i < TRUNK_N; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r     = 0.8 + Math.random() * 0.6;   // radio 0.8–1.4
        const oy    = 10 + Math.random() * 3.5;     // y: 10..13.5
        particles.push({
          ox: r * Math.cos(theta),
          oy,
          oz: r * Math.sin(theta),
          tipo:       'trunk',
          trunkColor: Math.random() < 0.6 ? '#8d5524' : '#c68642',
          char:       Math.random() < 0.5 ? '#' : '|',
          buildOrder: 1.0 + (oy - 10) / 3.5 * 0.05, // tronco: último en aparecer
          blinkPhase: 0, blinkSpeed: 0,
        });
      }

      // ── 2. FOLLAJE por 7 niveles escalonados (y: -10..+10) ──────────────
      const FOLIAGE_N   = 2000;
      const TIER_COLORS = [
        '#1b4332', '#2d6a4f', '#40916c', '#52b788',
        '#2d6a4f', '#1b4332', '#40916c',
      ];
      for (let i = 0; i < FOLIAGE_N; i++) {
        // normY 0=cúspide, 1=base del follaje
        const normY   = Math.pow(Math.random(), 0.6);
        const oy      = -10 + normY * 20;           // y: -10..+10

        // Qué nivel (0–6) dentro del faldón
        const tierVal = (normY * 7) % 1;            // 0..1 dentro del nivel

        // Radio máx del cono exterior
        const coneR   = 0.4 + normY * 8.6;          // 0.4..9

        // Perfil de faldón: se abre hacia la parte baja del nivel (tierVal→1)
        // y se contrae bruscamente al iniciar el siguiente (tierVal→0)
        const tierR   = coneR * (0.3 + 0.7 * tierVal);

        const theta   = Math.random() * Math.PI * 2;
        const r       = Math.sqrt(Math.random()) * tierR;

        const tierIdx = Math.floor(normY * 7) % 7;
        const isOrnament = r >= 0.9 * coneR && Math.random() < 0.08;

        particles.push({
          ox: r * Math.cos(theta),
          oy,
          oz: r * Math.sin(theta),
          tipo:       isOrnament ? 'ornament' : 'foliage',
          verde:      TIER_COLORS[tierIdx],
          luz:        ['#ff4d6d', '#4cc9f0', '#ffd166'][Math.floor(Math.random() * 3)],
          blinkPhase: Math.random() * Math.PI * 2,
          blinkSpeed: 0.6 + Math.random() * 1.5,
          buildOrder: normY,  // base (normY alto) aparece primero
        });
      }

      // ── 3. GUIRNALDA en hélice continua (4.5 vueltas) ───────────────────
      const GARLAND_N = 350;
      for (let i = 0; i < GARLAND_N; i++) {
        const t       = i / GARLAND_N;             // 0..1 de base a cúspide
        const oy      = 10 - t * 20;               // +10 (base) → -10 (cima)
        const normY   = 1 - t;                     // normY para radio del cono
        const coneR   = 0.4 + normY * 8.6;
        // Hélice en el contorno exterior
        const hRad    = coneR * (0.88 + Math.random() * 0.08);
        const theta   = t * 4.5 * Math.PI * 2;    // 4.5 vueltas
        particles.push({
          ox: hRad * Math.cos(theta),
          oy,
          oz: hRad * Math.sin(theta),
          tipo:       'garland',
          garlandColor: Math.random() < 0.6 ? '#ffd166' : '#fff3b0',
          char:       ['@', '*', '+'][Math.floor(Math.random() * 3)],
          blinkPhase: Math.random() * Math.PI * 2,
          blinkSpeed: 1.0 + Math.random() * 2.0,
          buildOrder: normY,  // misma lógica de base a cima
        });
      }

      // ── 4. ESFERAS NAVIDEÑAS en puntas de ramas ──────────────────────────
      const BALL_N      = 180;
      const BALL_COLORS = ['#ff4d6d', '#4cc9f0', '#ffd166'];
      for (let i = 0; i < BALL_N; i++) {
        const normY = Math.pow(Math.random(), 0.5);
        const oy    = -10 + normY * 20;
        const coneR = 0.4 + normY * 8.6;
        // Colocar en el borde exterior (punta de rama)
        const r     = coneR * (0.92 + Math.random() * 0.08);
        const theta = Math.random() * Math.PI * 2;
        particles.push({
          ox: r * Math.cos(theta),
          oy,
          oz: r * Math.sin(theta),
          tipo:       'ball',
          luz:        BALL_COLORS[Math.floor(Math.random() * 3)],
          char:       ['@', 'O', '#'][Math.floor(Math.random() * 3)],
          blinkPhase: Math.random() * Math.PI * 2,
          blinkSpeed: 0.5 + Math.random() * 1.2,
          buildOrder: normY,
        });
      }

      // ── 5. ESTRELLA DE 5 PUNTAS en la cúspide (y ≈ -11.4) ───────────────
      const STAR_N      = 140;
      const STAR_OUTER  = 2.1;
      const STAR_INNER  = 0.85;
      const STAR_CY     = -11.4;      // centro Y de la estrella (cúspide del árbol)
      const SECTOR      = Math.PI * 2 / 5;
      for (let i = 0; i < STAR_N; i++) {
        // alpha: [0, 2π), donde alpha = 0 corresponde a la punta superior vertical
        const alpha     = Math.random() * Math.PI * 2;
        const aMod      = alpha % SECTOR;
        const frac      = aMod / SECTOR; // 0 en pico, 0.5 en valle, 1 en siguiente pico
        const rMax      = frac < 0.5
          ? STAR_OUTER + (STAR_INNER - STAR_OUTER) * (frac * 2)
          : STAR_INNER + (STAR_OUTER - STAR_INNER) * ((frac - 0.5) * 2);

        // Contorno denso (85–100 %) + relleno interior (0–85 %)
        const isContour = Math.random() < 0.55;
        const rDist     = isContour
          ? rMax * (0.85 + Math.random() * 0.15)   // borde
          : rMax * Math.random() * 0.85;            // interior

        // theta empieza en -π/2 para que alpha = 0 apunte exactamente hacia arriba (-Y)
        const theta = alpha - Math.PI / 2;

        // Plano XY vertical: ox = x, oy = y, oz = ligero grosor en Z (±0.6)
        const ox = rDist * Math.cos(theta);
        const oy = STAR_CY + rDist * Math.sin(theta);
        const oz = (Math.random() * 2 - 1) * 0.6;

        particles.push({
          ox, oy, oz,
          tipo:       'apex_star',
          starColor:  Math.random() < 0.72 ? '#ffd166' : '#ffffff',
          char:       isContour ? (Math.random() < 0.5 ? '*' : '@') : '+',
          blinkPhase: Math.random() * Math.PI * 2,
          blinkSpeed: 2.0 + Math.random() * 3.0,
          buildOrder: 0.0, // aparece al final (cima)
        });
      }

      // Ordenar: buildOrder alto (base) primero → construye de abajo hacia arriba
      particles.sort((a, b) => b.buildOrder - a.buildOrder);
      return particles;
    }

    // ── Renderizar árbol ──────────────────────────────────────────────────
    function renderTree(ctx, particles, cx, cy, W, H, angle, buildProg, elapsed) {
      const fov   = 300;
      // Escala compacta y centro elevado → tronco queda sobre el HUD inferior
      const scale = Math.min(W, H) / 38;
      const drawCy = H * 0.43;

      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const totalVisible = Math.floor(particles.length * buildProg);
      const projected    = [];

      for (let i = 0; i < totalVisible; i++) {
        const p = particles[i];

        // Rotación Y
        const rx = p.ox * cosA - p.oz * sinA;
        const ry = p.oy;
        const rz = p.ox * sinA + p.oz * cosA;

        // Perspectiva: evitar z negativo o cero
        const depth  = Math.max(5, fov + rz);
        const factor = fov / depth;

        const sx = cx + rx * scale * factor;
        const sy = drawCy + ry * scale * factor;

        // Brillo por profundidad (-9..+9 → 0..1)
        const brightness = Math.max(0, Math.min(1, (rz + 9) / 18));

        projected.push({ ...p, sx, sy, depth, brightness });
      }

      // Z-sort: más lejos primero → pintor
      projected.sort((a, b) => b.depth - a.depth);

      for (const p of projected) {
        const charIdx = Math.floor(p.brightness * (ASCII_CHARS.length - 1));
        const ch      = ASCII_CHARS[charIdx] || '.';

        switch (p.tipo) {

          case 'trunk': {
            ctx.globalAlpha = 0.88;
            ctx.fillStyle   = p.trunkColor;
            ctx.font        = 'bold 13px "Courier New", monospace';
            ctx.fillText(p.char, p.sx, p.sy);
            break;
          }

          case 'foliage': {
            ctx.globalAlpha = 0.55 + p.brightness * 0.45;
            ctx.fillStyle   = p.verde;
            ctx.font        = 'bold 13px "Courier New", monospace';
            ctx.fillText(ch, p.sx, p.sy);
            break;
          }

          case 'ornament': {
            const flicker   = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * p.blinkSpeed + p.blinkPhase));
            ctx.globalAlpha = 0.7 + flicker * 0.3;
            ctx.fillStyle   = p.luz;
            ctx.font        = 'bold 14px "Courier New", monospace';
            ctx.fillText(ch === ' ' ? '@' : ch, p.sx, p.sy);
            break;
          }

          case 'garland': {
            const flicker   = 0.45 + 0.55 * Math.abs(Math.sin(elapsed * p.blinkSpeed + p.blinkPhase));
            ctx.globalAlpha = 0.65 + flicker * 0.35;
            ctx.fillStyle   = p.garlandColor;
            ctx.font        = 'bold 14px "Courier New", monospace';
            ctx.fillText(p.char, p.sx, p.sy);
            break;
          }

          case 'ball': {
            const flicker   = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * p.blinkSpeed + p.blinkPhase));
            ctx.globalAlpha = 0.72 + flicker * 0.28;
            ctx.fillStyle   = p.luz;
            ctx.font        = 'bold 15px "Courier New", monospace';
            ctx.fillText(p.char, p.sx, p.sy);
            break;
          }

          case 'apex_star': {
            const flicker   = 0.6 + 0.4 * Math.abs(Math.sin(elapsed * p.blinkSpeed + p.blinkPhase));
            ctx.globalAlpha = flicker;
            ctx.fillStyle   = p.starColor;
            ctx.font        = 'bold 15px "Courier New", monospace';
            ctx.fillText(p.char, p.sx, p.sy);
            break;
          }

          default: break;
        }
      }

      ctx.globalAlpha = 1;
    }

    // ── Nieve ─────────────────────────────────────────────────────────────
    function buildSnowParticles(n) {
      return Array.from({ length: n }, () => ({
        x:         Math.random(),
        y:         Math.random(),
        speed:     0.012 + Math.random() * 0.022,
        drift:     Math.random() * Math.PI * 2,
        driftSpd:  0.25 + Math.random() * 0.55,
        char:      ['·', '.', '*', '❄'][Math.floor(Math.random() * 4)],
        alpha:     0.25 + Math.random() * 0.45,
        fontSize:  7 + Math.floor(Math.random() * 7),
      }));
    }

    function renderSnow(ctx, particles, W, H, dt) {
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      for (const p of particles) {
        p.y += p.speed * dt * 60 * (1 / H) * 10; // independiente de Hz
        if (p.y > 1.05) { p.y = -0.04; p.x = Math.random(); }
        p.x += Math.sin(p.drift) * 0.0012;
        p.drift += p.driftSpd * dt;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;

        ctx.font        = `${p.fontSize}px "Courier New", monospace`;
        ctx.fillStyle   = '#c8e6fa';
        ctx.globalAlpha = p.alpha;
        ctx.fillText(p.char, p.x * W, p.y * H);
      }
      ctx.globalAlpha = 1;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FASE 2 — CORAZÓN 3D ASCII PARAMÉTRICO
    // ═══════════════════════════════════════════════════════════════════════
    function startHeartPhase() {
      const ctx = canvas.getContext('2d');

      const heartParticles = buildHeartParticles(2000);
      const bgStars        = buildBgStars(55);

      let prevTs    = null;
      let elapsed   = 0;
      let buildProg = 0;
      let heartAng  = 0;

      // Cancelar el RAF del árbol y arrancar el del corazón inmediatamente
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

      // Timer de duración de fase 2
      phaseTimer = setTimeout(() => { if (running) dismount(); }, HEART_DURATION_MS);

      function loop(ts) {
        if (!running || fase !== 2) return;
        if (prevTs === null) prevTs = ts;
        const dt  = Math.min((ts - prevTs) / 1000, 0.1);
        prevTs    = ts;
        elapsed  += dt;

        buildProg = Math.min(1, elapsed / HEART_BUILD_S);

        const W  = canvas.width;
        const H  = canvas.height;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#07070c';
        ctx.fillRect(0, 0, W, H);

        heartAng += dt * 0.55;

        renderBgStars(ctx, bgStars, W, H, elapsed);
        renderHeart(ctx, heartParticles, W / 2, H * 0.43, W, H, heartAng, buildProg, elapsed);

        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }

    // ── Generar partículas del corazón ────────────────────────────────────
    // Corazón 3D inflado/volumétrico que conserva la silueta clásica.
    // Curva base plana (x0, y0) → extruida por ángulo de grosor φ.
    function buildHeartParticles(n) {
      const particles = [];

      for (let i = 0; i < n; i++) {
        // t: recorre el contorno del corazón 2D (0..2π)
        const t  = Math.random() * Math.PI * 2;
        // φ: ángulo de grosor/profundidad (-π/2..+π/2)
        // Concentrar más partículas cerca de φ≈0 (cara frontal visible)
        const phi = (Math.random() * 2 - 1) * (Math.PI / 2);

        // Curva paramétrica clásica del corazón 2D
        const sinT = Math.sin(t);
        const cosT = Math.cos(t);
        const x0 =  16 * sinT * sinT * sinT;
        const y0 = -(13 * cosT - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

        // Escala de contorno: cara frontal (φ=0) = 100%, trasera = más estrecha
        const contourScale = 0.25 + 0.75 * Math.cos(phi);

        // Coordenadas 3D: x,y siguen la silueta del corazón escalada,
        // z da profundidad sin aplastar la hendidura ni la punta
        const ox = (x0 * contourScale) / 17;
        const oy = (y0 * contourScale + 1.5) / 17; // +1.5 → centra verticalmente
        const oz = (6.5 * Math.sin(phi) * Math.cos(phi * 0.4)) / 17;

        // Color según posición: contorno/frente brillante, interior/fondo oscuro
        const isFront  = phi > -0.4 && phi < 0.4;
        const isEdge   = Math.abs(phi) > 1.1;
        const rnd      = Math.random();

        let color;
        if (isEdge && rnd < 0.35)       color = '#ffd166';  // destellos dorados en el borde
        else if (isFront && rnd < 0.6)  color = '#ff758f';  // rosa brillante en el frente
        else if (isFront)               color = '#ff8fa3';  // rosa claro
        else if (rnd < 0.55)            color = '#ff4d6d';  // carmesí
        else                            color = '#c9184a';  // carmesí profundo interior

        // buildOrder: de dentro (contourScale pequeño = parte trasera)
        //             hacia fuera (cara frontal) → el corazón "emerge"
        const buildOrder = contourScale;

        particles.push({
          ox, oy, oz,
          color,
          blinkPhase:  Math.random() * Math.PI * 2,
          blinkSpeed:  0.4 + Math.random() * 1.2,
          buildOrder,
        });
      }

      // Ordenar de menor contourScale (interior) a mayor (frente) → emerge de dentro
      particles.sort((a, b) => a.buildOrder - b.buildOrder);
      return particles;
    }

    // ── Renderizar corazón ────────────────────────────────────────────────
    function renderHeart(ctx, particles, cx, cy, W, H, angle, buildProg, elapsed) {
      const fov   = 300;
      // Escala ~11% más compacta y centro elevado a H * 0.43 para despejar el HUD inferior
      const scale = Math.min(W, H) * 0.39;
      const drawCy = H * 0.43;

      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = 'bold 13px "Courier New", monospace';

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      // Leve balanceo eje X (cabeceo suave)
      const tiltX = 0.14 * Math.sin(elapsed * 0.35);
      const cosX  = Math.cos(tiltX);
      const sinX  = Math.sin(tiltX);

      const totalVisible = Math.floor(particles.length * buildProg);
      const projected    = [];

      for (let i = 0; i < totalVisible; i++) {
        const p = particles[i];

        // Rotación Y
        const rx = p.ox * cosA - p.oz * sinA;
        const ry = p.oy;
        const rz = p.ox * sinA + p.oz * cosA;

        // Leve rotación X
        const ry2 = ry * cosX - rz * sinX;
        const rz2 = ry * sinX + rz * cosX;

        // Perspectiva: depth en unidades de escena (rz ≈ ±0.38)
        const depth  = Math.max(5, fov + rz2 * 80);
        const factor = fov / depth;

        const sx = cx + rx  * scale * factor;
        const sy = drawCy + ry2 * scale * factor;

        // Brillo: rz2 ≈ -0.38..+0.38 → 0..1
        const brightness = Math.max(0, Math.min(1, (rz2 + 0.4) / 0.8));

        projected.push({ ...p, sx, sy, depth, brightness });
      }

      projected.sort((a, b) => b.depth - a.depth);

      for (const p of projected) {
        const charIdx = Math.floor(p.brightness * (ASCII_CHARS.length - 1));
        const ch      = ASCII_CHARS[charIdx] || '.';

        let alpha;
        if (p.color === '#ffd166' || p.color === '#fff3b0') {
          // Destellos dorados: parpadeo pronunciado
          alpha = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * p.blinkSpeed + p.blinkPhase));
        } else {
          // Carmesí / rosa: intensidad proporcional al brillo + leve pulso
          const pulse = 0.04 * Math.sin(elapsed * 1.2 + p.blinkPhase);
          alpha = 0.55 + p.brightness * 0.45 + pulse;
        }

        ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
        ctx.fillStyle   = p.color;
        ctx.fillText(ch, p.sx, p.sy);
      }

      ctx.globalAlpha = 1;
    }

    // ── Estrellas de fondo fase 2 ─────────────────────────────────────────
    function buildBgStars(n) {
      return Array.from({ length: n }, () => ({
        x:     Math.random(),
        y:     Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.9,
        size:  6 + Math.floor(Math.random() * 7),
        char:  ['.', '*', '+', '·'][Math.floor(Math.random() * 4)],
        color: Math.random() < 0.6 ? '#ffd166' : '#ff85a2',
      }));
    }

    function renderBgStars(ctx, stars, W, H, elapsed) {
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      for (const s of stars) {
        const alpha = 0.1 + 0.3 * Math.abs(Math.sin(elapsed * s.speed + s.phase));
        ctx.font        = `${s.size}px "Courier New", monospace`;
        ctx.fillStyle   = s.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(s.char, s.x * W, s.y * H);
      }
      ctx.globalAlpha = 1;
    }

  } // end init()

})();
