/**
 * ascii_transitions.js — Motor de Pantallas de Carga y Transición 3D ASCII
 *
 * Renderiza escenas 3D volumétricas en arte ASCII sobre Canvas 2D durante
 * las transiciones de navegación entre las secciones del menú:
 *
 *   1. Universo   → Galaxia Espiral (Vía Láctea 3D con 4 brazos logarítmicos)
 *   2. Calendario → Marco Polaroid 3D con silueta de paisaje, sol y clip
 *   3. Cartas     → Sobre de Amor 3D con pliegues y sello de lacre de corazón
 *   4. Jardín     → Flor 3D (Rosa multicapa volumétrica con tallo y hojas)
 *   5. Dashboard  → Esfera Armilar / Órbitas 3D con estrella central
 *
 * Zero Overhead:
 *   - z-index: 9998, background: #07070c
 *   - Tiempo visible mínimo garantizado: ~2.0 segundos
 *   - Desvanecimiento suave (opacity 0 en 0.5s) y desmontaje DOM completo (cancelAnimationFrame + remove)
 *   - Soporta previsualización vía URL: ?loader=universo | calendario | cartas | jardin | dashboard
 */
(function () {
  'use strict';

  const ASCII_CHARS        = ' .:-=+*#%@';
  const MIN_DURATION_MS    = 2000; // Duración mínima visible en transiciones del menú
  const FADE_DURATION_MS   = 500;  // Transición de salida suave
  const STORAGE_KEY        = 'pending_ascii_loader';
  const INITIAL_SPLASH_KEY = 'initial_splash_seen';

  // ── 1. DETECCIÓN DE SECCIÓN SEGÚN RUTA O PARÁMETRO ────────────────────────
  function getSectionFromPath(pathname) {
    if (!pathname) return null;
    const p = pathname.toLowerCase();
    if (p.includes('/universo'))   return 'universo';
    if (p.includes('/calendario')) return 'calendario';
    if (p.includes('/cartas'))     return 'cartas';
    if (p.includes('/jardin'))     return 'jardin';
    if (p.includes('/armario'))    return 'armario';
    if (p === '/' || p === '' || p.includes('/dashboard')) return 'dashboard';
    return null;
  }

  // Comprobar parámetro de prueba directo ?loader=...
  const urlParams   = new URLSearchParams(window.location.search);
  const queryLoader = urlParams.get('loader');
  const isPreview   = Boolean(queryLoader);

  // Determinar la sección a ejecutar (si aplica)
  let activeSection        = null;
  let transitionStartTime  = Date.now();
  let isInitialWelcome     = false;

  if (isPreview) {
    activeSection = queryLoader.toLowerCase();
  } else {
    // Comprobar si venimos de una transición iniciada por un clic en la página anterior
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        sessionStorage.removeItem(STORAGE_KEY);
        // Verificar que no sea una sesión caducada (> 6 segundos)
        if (Date.now() - data.t0 < 6000) {
          activeSection       = data.section;
          transitionStartTime = data.t0;
        }
      }
    } catch (e) {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    // Si aún no hay sección activa, evaluar las vistas que requieren animación de carga propia
    if (!activeSection) {
      const currentSection = getSectionFromPath(window.location.pathname);

      if (currentSection === 'universo') {
        // Vista pesada de Three.js (Universo 3D)
        activeSection = 'universo';
        transitionStartTime = Date.now();
      } else if (currentSection === 'dashboard') {
        // ── JERARQUÍA DE ENTRADA AL DASHBOARD ──
        // Prioridades 1, 2 y 3 (Fechas especiales): son manejadas por splash_seasonal.js
        const urlNavidad      = urlParams.get('navidad') === '1';
        const urlAniv         = urlParams.get('aniversario') === '1';
        const hoyNow          = new Date();
        const diaNow          = hoyNow.getDate();
        const mesNow          = hoyNow.getMonth() + 1;
        const esDia3          = diaNow === 3 || urlAniv;
        const esDic           = mesNow === 12 || urlNavidad;
        const yaVistoSeasonal = sessionStorage.getItem('seasonal_splash_seen');
        const esFechaEspecial = (esDia3 || esDic) && !yaVistoSeasonal;

        // Prioridad 4 (Fallback en cualquier otro día normal):
        // Mostrar animación 3D ASCII del Dashboard (Núcleo Orbital) como pantalla de bienvenida
        const yaVistoInitial = sessionStorage.getItem(INITIAL_SPLASH_KEY);
        if (!esFechaEspecial && !yaVistoInitial) {
          activeSection        = 'dashboard';
          isInitialWelcome     = true;
          transitionStartTime  = Date.now();
          sessionStorage.setItem(INITIAL_SPLASH_KEY, 'true');
        }
      }
    }
  }

  // ── 2. INTERCEPTOR DE ENLACES PARA NAVEGACIÓN INSTANTÁNEA ──────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;

    // Ignorar combinaciones de teclas (abrir en nueva pestaña, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    // Solo enlaces del mismo origen
    let targetUrl;
    try {
      targetUrl = new URL(link.href, window.location.origin);
    } catch (err) {
      return;
    }
    if (targetUrl.origin !== window.location.origin) return;

    // Ignorar si el destino es la misma página exacta
    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
      return;
    }

    // Ignorar enlaces de autenticación o logout
    if (targetUrl.pathname.includes('/logout') || targetUrl.pathname.includes('/login')) {
      return;
    }

    const targetSection = getSectionFromPath(targetUrl.pathname);
    if (!targetSection) return;

    // Si ya hay un seasonal splash corriendo (por ejemplo en Navidad en dashboard), no interferir
    if (document.getElementById('seasonal-splash-overlay')) return;

    // Registrar en sessionStorage para que la siguiente página continúe el flujo
    const t0 = Date.now();
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ section: targetSection, t0: t0 }));
    } catch (err) {}

    // Montar inmediatamente el overlay en la página actual para que la transición
    // sea instantánea sin ningún destello blanco o gris mientras el servidor responde
    mountOverlay(targetSection, t0, false, false);
  }, false);

  // Si no hay sección activa en esta carga, salir de la fase de renderizado inicial
  if (!activeSection) return;

  // Si el splash estacional/aniversario (Prioridades 1, 2, 3) está activo, ceder prioridad absoluta
  const urlNavidad  = urlParams.get('navidad') === '1';
  const urlAniv     = urlParams.get('aniversario') === '1';
  const hoyNow      = new Date();
  const diaNow      = hoyNow.getDate();
  const mesNow      = hoyNow.getMonth() + 1;
  const esDia3      = diaNow === 3 || urlAniv;
  const esDic       = mesNow === 12 || urlNavidad;
  const yaVisto     = sessionStorage.getItem('seasonal_splash_seen');
  const isSplashDue = (esDia3 || esDic) && !yaVisto && (getSectionFromPath(window.location.pathname) === 'dashboard');

  if (isSplashDue && !isPreview) return;
  if (document.getElementById('seasonal-splash-overlay')) return;

  // Arrancar el overlay inmediatamente si document.body ya existe (evita cualquier flash de carga)
  if (document.body) {
    mountOverlay(activeSection, transitionStartTime, isPreview, isInitialWelcome);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountOverlay(activeSection, transitionStartTime, isPreview, isInitialWelcome);
    });
  } else {
    mountOverlay(activeSection, transitionStartTime, isPreview, isInitialWelcome);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MOTOR DE RENDERIZADO Y OVERLAY
  // ═══════════════════════════════════════════════════════════════════════════
  function mountOverlay(section, t0, isManualPreview, isWelcomeSplash) {
    if (document.getElementById('ascii-transition-overlay')) return;

    // Crear Overlay Fixed
    const overlay = document.createElement('div');
    overlay.id = 'ascii-transition-overlay';
    Object.assign(overlay.style, {
      position:   'fixed',
      inset:      '0',
      zIndex:     '9998',
      background: '#07070c',
      overflow:   'hidden',
      opacity:    '1',
      transition: `opacity ${FADE_DURATION_MS}ms ease`,
      pointerEvents: 'all',
      cursor:     isWelcomeSplash ? 'pointer' : 'default',
    });

    const canvas = document.createElement('canvas');
    canvas.id = 'ascii-transition-canvas';
    Object.assign(canvas.style, {
      position: 'absolute',
      inset:    '0',
      display:  'block',
      width:    '100%',
      height:   '100%',
    });
    overlay.appendChild(canvas);

    document.body.appendChild(overlay);

    // Ajuste dinámico de dimensiones
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Generar partículas correspondientes a la sección
    const particles = buildSceneParticles(section);

    let rafId   = null;
    let running = true;
    let prevTs  = null;
    let elapsed = 0;
    let angle   = 0;

    const ctx = canvas.getContext('2d');

    // Loop de animación 3D
    function loop(ts) {
      if (!running) return;
      if (prevTs === null) prevTs = ts;
      const dt = Math.min((ts - prevTs) / 1000, 0.1);
      prevTs   = ts;
      elapsed += dt;

      angle += dt * 0.75; // Velocidad de rotación continua

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#07070c';
      ctx.fillRect(0, 0, W, H);

      renderScene(ctx, particles, section, W, H, angle, elapsed);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    // Función de desmontaje limpio (Zero Overhead)
    let isDismounting = false;
    function dismount() {
      if (isDismounting) return;
      isDismounting = true;

      overlay.style.opacity = '0';
      setTimeout(() => {
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        window.removeEventListener('resize', resize);
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      }, FADE_DURATION_MS + 40);
    }

    // Si es splash de bienvenida al entrar a la aplicación (Prioridad 4)
    if (isWelcomeSplash) {
      // 1. HUD discreto y elegante en la parte inferior
      const hud = document.createElement('div');
      Object.assign(hud.style, {
        position:       'absolute',
        bottom:         'clamp(28px, 6vh, 60px)',
        left:           '0',
        right:          '0',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            '12px',
        zIndex:         '10',
        pointerEvents:  'none',
        opacity:        '0',
        transition:     'opacity 0.7s ease',
      });

      const hudTitle = document.createElement('p');
      Object.assign(hudTitle.style, {
        margin:         '0',
        color:          '#f4f2ee',
        fontFamily:     "'Courier New', monospace",
        fontSize:       'clamp(14px, 2.2vw, 20px)',
        letterSpacing:  '0.2em',
        textAlign:      'center',
        textShadow:     '0 0 20px rgba(234,182,84,0.5)',
      });
      hudTitle.textContent = 'MI UNIVERSO ✨';

      const hudBtn = document.createElement('button');
      hudBtn.textContent = 'Entrar →';
      Object.assign(hudBtn.style, {
        background:     'rgba(255,255,255,0.08)',
        border:         '1px solid rgba(255,255,255,0.22)',
        color:          '#f4f2ee',
        fontFamily:     "'Courier New', monospace",
        fontSize:       'clamp(11px, 1.4vw, 13px)',
        letterSpacing:  '0.14em',
        padding:        '8px 24px',
        borderRadius:   '999px',
        cursor:         'pointer',
        transition:     'all 0.25s ease',
        backdropFilter: 'blur(6px)',
        pointerEvents:  'auto',
      });
      hudBtn.addEventListener('mouseenter', () => {
        hudBtn.style.background = 'rgba(255,255,255,0.18)';
        hudBtn.style.borderColor = 'rgba(255,255,255,0.5)';
      });
      hudBtn.addEventListener('mouseleave', () => {
        hudBtn.style.background = 'rgba(255,255,255,0.08)';
        hudBtn.style.borderColor = 'rgba(255,255,255,0.22)';
      });

      hudBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismount();
      });

      hud.appendChild(hudTitle);
      hud.appendChild(hudBtn);
      overlay.appendChild(hud);

      // Clic en cualquier parte de la pantalla para entrar
      overlay.addEventListener('click', () => {
        dismount();
      });

      // Mostrar HUD con retraso suave
      setTimeout(() => { hud.style.opacity = '1'; }, 800);

      // Duración ágil de bienvenida: ~3.8 segundos una vez lista la página
      let splashReady = false;
      function onSplashReady() {
        if (splashReady) return;
        splashReady = true;
        setTimeout(dismount, 3800);
      }

      if (document.readyState === 'complete') {
        onSplashReady();
      } else {
        window.addEventListener('load', onSplashReady, { once: true });
      }
      setTimeout(onSplashReady, 5500);
      return;
    }

    // Si es modo preview con URL (?loader=...), se mantiene visible 3.5s y se desmonta
    if (isManualPreview) {
      setTimeout(dismount, 3600);
      return;
    }

    // En navegación real: esperar a que la página/recursos estén listos
    let pageReadyFired = false;
    function onReady() {
      if (pageReadyFired) return;
      pageReadyFired = true;

      const elapsedMs = Date.now() - t0;
      const remaining = Math.max(0, MIN_DURATION_MS - elapsedMs);

      setTimeout(dismount, remaining);
    }

    // Escuchar el evento de carga normal de la ventana
    if (document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady, { once: true });
    }

    // Escuchar evento personalizado emitido por vistas pesadas (como Universo 3D)
    window.addEventListener('page-ready', onReady, { once: true });

    // Respaldo de seguridad en caso de fallo de red o eventos no disparados
    setTimeout(onReady, 6000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GENERADORES GEOMÉTRICOS 3D POR SECCIÓN (~2,000–2,500 partículas)
  // ═══════════════════════════════════════════════════════════════════════════
  function buildSceneParticles(section) {
    switch (section) {
      case 'universo':   return buildGalaxyParticles();
      case 'calendario': return buildPolaroidParticles();
      case 'cartas':     return buildLetterParticles();
      case 'jardin':     return buildFlowerParticles();
      case 'dashboard':
      default:           return buildArmillaryParticles();
    }
  }

  // ── 1. UNIVERSO → Galaxia Espiral (Vía Láctea 3D) ─────────────────────────
  function buildGalaxyParticles() {
    const particles = [];

    // A. Núcleo central brillante (~450 partículas)
    const CORE_N = 450;
    for (let i = 0; i < CORE_N; i++) {
      const u = Math.pow(Math.random(), 2.0); // Concentración exponencial al centro
      const r = u * 3.4;
      const theta = Math.random() * Math.PI * 2;
      const ox = r * Math.cos(theta);
      const oz = r * Math.sin(theta);
      // Grosor esférico/elipsoidal en el núcleo
      const oy = (Math.random() * 2 - 1) * 1.8 * Math.max(0.2, 1 - r / 3.6);

      particles.push({
        ox, oy, oz,
        color: Math.random() < 0.65 ? '#ffffff' : '#ffd166',
        char: Math.random() < 0.4 ? '@' : '*',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.0 + Math.random() * 2.0,
      });
    }

    // B. 4 brazos espirales logarítmicos (~1,800 partículas)
    const ARMS = 4;
    const ARM_N = 1800;
    for (let i = 0; i < ARM_N; i++) {
      const armIdx = i % ARMS;
      const baseArmAngle = armIdx * (Math.PI / 2);

      // Progreso radial no lineal
      const prog = 0.12 + 0.88 * Math.pow(Math.random(), 0.85);
      const r = prog * 13.5;

      // Ecuación espiral logarítmica
      const theta = baseArmAngle + 2.4 * prog + 0.65 * Math.log(prog + 0.05);

      // Dispersión orgánica perpendicular y angular
      const spread = 0.35 + 1.6 * prog;
      const dr = (Math.random() - 0.5) * spread;
      const dTheta = (Math.random() - 0.5) * (0.4 / (Math.sqrt(prog) + 0.3));

      const finalR = Math.max(0.5, r + dr);
      const finalTheta = theta + dTheta;

      const ox = finalR * Math.cos(finalTheta);
      const oz = finalR * Math.sin(finalTheta);
      // Disco galáctico delgado con ligero ensanchamiento en bordes
      const oy = (Math.random() - 0.5) * (0.4 + 1.1 * prog);

      // Degradado de color del centro a la periferia
      let color;
      let ch = '.';
      if (prog < 0.28) {
        color = Math.random() < 0.6 ? '#ffd166' : '#fff3b0';
        ch = '*';
      } else if (prog < 0.55) {
        color = '#4cc9f0'; // Azul cósmico
        ch = Math.random() < 0.5 ? '+' : ':';
      } else if (prog < 0.8) {
        color = '#7209b7'; // Violeta profundo
        ch = Math.random() < 0.5 ? '*' : '.';
      } else {
        color = '#f72585'; // Magenta / neón exterior
        ch = Math.random() < 0.6 ? '.' : '·';
      }

      particles.push({
        ox, oy, oz,
        color,
        char: ch,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.6 + Math.random() * 1.5,
      });
    }

    // C. Halo tenue de estrellas (~150 partículas)
    for (let i = 0; i < 150; i++) {
      const r = 4.0 + Math.random() * 10.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.7;

      particles.push({
        ox: r * Math.cos(phi) * Math.cos(theta),
        oy: r * Math.sin(phi) * 0.4,
        oz: r * Math.cos(phi) * Math.sin(theta),
        color: Math.random() < 0.5 ? '#4cc9f0' : '#b5179e',
        char: '·',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.5 + Math.random() * 1.0,
      });
    }

    return particles;
  }

  // ── 2. CALENDARIO → Marco Polaroid 3D de Recuerdos ─────────────────────────
  function buildPolaroidParticles() {
    const particles = [];

    // Proporciones de foto Polaroid: W=12, H=16 (y: -8.5 .. +7.5)
    // Ventana interior: x: -4.6..+4.6, y: -7.0..+1.8
    // Margen inferior amplio: y: +1.8..+7.5

    // A. Marco blanco / plata de la Polaroid (~1,100 partículas)
    const FRAME_N = 1100;
    for (let i = 0; i < FRAME_N; i++) {
      let ox, oy;
      const region = Math.random();

      if (region < 0.18) {
        // Borde superior
        ox = (Math.random() * 2 - 1) * 6.0;
        oy = -8.5 + Math.random() * 1.5;
      } else if (region < 0.36) {
        // Borde lateral izquierdo
        ox = -6.0 + Math.random() * 1.4;
        oy = -7.0 + Math.random() * 8.8;
      } else if (region < 0.54) {
        // Borde lateral derecho
        ox = 4.6 + Math.random() * 1.4;
        oy = -7.0 + Math.random() * 8.8;
      } else {
        // Margen inferior amplio clásico de Polaroid
        ox = (Math.random() * 2 - 1) * 6.0;
        oy = 1.8 + Math.random() * 5.7;
      }

      // Ligero grosor volumétrico en Z (±0.7)
      const oz = (Math.random() * 2 - 1) * 0.7;
      const isEdge = Math.abs(ox) > 5.7 || oy < -8.2 || oy > 7.2;

      particles.push({
        ox, oy, oz,
        color: isEdge ? '#f8f9fa' : (Math.random() < 0.6 ? '#e9ecef' : '#adb5bd'),
        char: isEdge ? '#' : (Math.random() < 0.5 ? '=' : '+'),
        blinkPhase: 0,
        blinkSpeed: 0,
      });
    }

    // B. Clip / argolla superior metálica (~180 partículas)
    const CLIP_N = 180;
    for (let i = 0; i < CLIP_N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 1.0 + Math.random() * 0.35;
      const ox = r * Math.cos(theta);
      const oy = -8.8 + r * Math.sin(theta);
      const oz = (Math.random() * 2 - 1) * 0.6;

      particles.push({
        ox, oy, oz,
        color: Math.random() < 0.65 ? '#ffd166' : '#ffffff',
        char: Math.random() < 0.5 ? 'O' : '@',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.5,
      });
    }

    // C. Detalle interior de la foto: paisaje minimalista (Sol + Montañas + Corazón) (~900 partículas)
    // 1. Sol radiante dorado
    for (let i = 0; i < 200; i++) {
      const r = Math.sqrt(Math.random()) * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const ox = 2.4 + r * Math.cos(theta);
      const oy = -4.5 + r * Math.sin(theta);
      const oz = 0.1 + (Math.random() - 0.5) * 0.3;

      particles.push({
        ox, oy, oz,
        color: Math.random() < 0.7 ? '#ffd166' : '#fff3b0',
        char: Math.random() < 0.6 ? '@' : '*',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.2,
      });
    }

    // 2. Silueta de dos montañas escalonadas
    for (let i = 0; i < 550; i++) {
      // Montaña 1 (izquierda) y Montaña 2 (derecha)
      const isLeft = Math.random() < 0.55;
      const apexX = isLeft ? -1.6 : 2.0;
      const apexY = isLeft ? -2.6 : -1.8;
      const baseW = isLeft ? 3.8 : 3.0;

      const normY = Math.random(); // 0 en cima, 1 en base
      const oy = apexY + normY * (1.8 - apexY);
      const wAtY = normY * baseW;
      const ox = apexX + (Math.random() * 2 - 1) * wAtY;
      const oz = (isLeft ? 0.3 : 0.1) + (Math.random() - 0.5) * 0.3;

      if (ox >= -4.5 && ox <= 4.5 && oy <= 1.7) {
        particles.push({
          ox, oy, oz,
          color: isLeft ? '#4cc9f0' : '#3a86ff',
          char: normY < 0.15 ? '^' : (Math.random() < 0.5 ? '/' : '#'),
          blinkPhase: 0,
          blinkSpeed: 0,
        });
      }
    }

    // 3. Pequeño corazón en el cielo de la foto
    for (let i = 0; i < 120; i++) {
      const t = Math.random() * Math.PI * 2;
      const u = Math.sqrt(Math.random()) * 0.9;
      const x0 = 16 * Math.pow(Math.sin(t), 3);
      const y0 = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

      particles.push({
        ox: -2.2 + (x0 * u) / 16,
        oy: -4.8 + (y0 * u) / 16,
        oz: 0.2 + (Math.random() - 0.5) * 0.25,
        color: '#ff85a2',
        char: Math.random() < 0.6 ? '*' : '+',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.8,
      });
    }

    return particles;
  }

  // ── 3. CARTAS → Carta / Sobre de Amor 3D ──────────────────────────────────
  function buildLetterParticles() {
    const particles = [];
    const W = 17; // x: -8.5 .. +8.5
    const H = 11; // y: -5.5 .. +5.5

    // A. Cuerpo del sobre (caras y bordes exteriores) (~1,100 partículas)
    const BODY_N = 1100;
    for (let i = 0; i < BODY_N; i++) {
      const ox = (Math.random() * 2 - 1) * (W / 2);
      const oy = (Math.random() * 2 - 1) * (H / 2);
      const oz = (Math.random() * 2 - 1) * 0.65;

      const isBorder = Math.abs(ox) > 8.0 || Math.abs(oy) > 5.0;

      particles.push({
        ox, oy, oz,
        color: isBorder ? '#ff758f' : (Math.random() < 0.7 ? '#fff0f3' : '#ffb3c1'),
        char: isBorder ? '#' : (Math.random() < 0.4 ? '.' : ':'),
        blinkPhase: 0,
        blinkSpeed: 0,
      });
    }

    // B. Pliegues diagonales y solapa triangular del sobre (~550 partículas)
    const FOLD_N = 550;
    for (let i = 0; i < FOLD_N; i++) {
      const t = Math.random();
      const side = Math.random();
      let ox, oy;

      if (side < 0.35) {
        // Solapa superior izquierda: (-8.5, -5.5) -> (0, +0.6)
        ox = -8.5 + t * 8.5;
        oy = -5.5 + t * 6.1;
      } else if (side < 0.7) {
        // Solapa superior derecha: (+8.5, -5.5) -> (0, +0.6)
        ox = 8.5 - t * 8.5;
        oy = -5.5 + t * 6.1;
      } else if (side < 0.85) {
        // Pliegue inferior izquierdo: (-8.5, +5.5) -> (0, +0.6)
        ox = -8.5 + t * 8.5;
        oy = 5.5 - t * 4.9;
      } else {
        // Pliegue inferior derecho: (+8.5, +5.5) -> (0, +0.6)
        ox = 8.5 - t * 8.5;
        oy = 5.5 - t * 4.9;
      }

      particles.push({
        ox: ox + (Math.random() - 0.5) * 0.35,
        oy: oy + (Math.random() - 0.5) * 0.35,
        oz: 0.68 + (Math.random() - 0.5) * 0.2, // Relieve frontal
        color: '#ff758f',
        char: Math.random() < 0.5 ? '/' : '\\',
        blinkPhase: 0,
        blinkSpeed: 0,
      });
    }

    // C. Sello de lacre en forma de corazón en el vértice de la solapa (~650 partículas)
    const SEAL_N = 650;
    for (let i = 0; i < SEAL_N; i++) {
      const t = Math.random() * Math.PI * 2;
      const u = Math.sqrt(Math.random());
      const sinT = Math.sin(t);
      const cosT = Math.cos(t);

      // Curva clásica de corazón para el sello
      const x0 = 16 * Math.pow(sinT, 3);
      const y0 = -(13 * cosT - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

      const scale = 2.4 / 16;
      const ox = (x0 * scale * u);
      const oy = 0.7 + (y0 * scale * u);
      const oz = 0.85 + (Math.random() - 0.5) * 0.4;

      const isRim = u > 0.85;

      particles.push({
        ox, oy, oz,
        color: isRim && Math.random() < 0.35 ? '#ffd166' : (Math.random() < 0.6 ? '#ff4d6d' : '#c9184a'),
        char: isRim ? '@' : (Math.random() < 0.5 ? '#' : '%'),
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.5,
      });
    }

    // D. Chispas de amor orbitando alrededor del sobre (~100 partículas)
    for (let i = 0; i < 100; i++) {
      const r = 9.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      particles.push({
        ox: r * Math.cos(theta),
        oy: (r * Math.sin(theta)) * 0.65,
        oz: (Math.random() * 2 - 1) * 3.0,
        color: Math.random() < 0.5 ? '#ffd166' : '#ff85a2',
        char: Math.random() < 0.5 ? '*' : '+',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 2.0,
      });
    }

    return particles;
  }

  // ── 4. JARDÍN → Flor 3D (Rosa / Flor en Capas con Tallo y Hojas) ───────────
  function buildFlowerParticles() {
    const particles = [];

    // A. Corola / Pétalos multicapa en rosa polar 3D (~1,500 partículas)
    // 4 niveles concéntricos escalonados en radio y altura para dar volumen
    const LAYERS = [
      { rMax: 1.8, k: 3, yBase: -3.5, color: '#ffd166', char: '@', count: 250 }, // Núcleo dorado
      { rMax: 3.6, k: 4, yBase: -3.2, color: '#ff4d6d', char: '%', count: 350 }, // Capa interna carmesí
      { rMax: 5.4, k: 5, yBase: -2.5, color: '#ff758f', char: '#', count: 450 }, // Capa media rosa
      { rMax: 7.2, k: 6, yBase: -1.6, color: '#ffccd5', char: '*', count: 450 }, // Capa externa abierta
    ];

    LAYERS.forEach((layer, idx) => {
      const angleOffset = idx * 0.45;
      for (let i = 0; i < layer.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        // Ecuación polar de rosa multicapa
        const petalShape = 0.35 + 0.65 * Math.abs(Math.cos(layer.k * theta + angleOffset));
        const u = Math.sqrt(Math.random());
        const r = layer.rMax * petalShape * u;

        // Curvatura vertical de copa (los pétalos se abren hacia arriba y hacia afuera)
        const curveY = Math.pow(r / layer.rMax, 1.8) * 1.5;
        const ox = r * Math.cos(theta);
        const oz = r * Math.sin(theta);
        const oy = layer.yBase + curveY + (Math.random() - 0.5) * 0.5;

        particles.push({
          ox, oy, oz,
          color: layer.color,
          char: layer.char,
          blinkPhase: Math.random() * Math.PI * 2,
          blinkSpeed: 0.8 + Math.random() * 1.2,
        });
      }
    });

    // B. Tallo vertical con suave curvatura natural (~400 partículas)
    const STEM_N = 400;
    for (let i = 0; i < STEM_N; i++) {
      const prog = i / STEM_N; // 0 en base flor, 1 en parte baja
      const oy = -1.5 + prog * 12.5; // y: -1.5 .. +11.0

      // Curva sutil en S
      const stemCurveX = 0.8 * Math.sin(prog * Math.PI) + 0.3 * prog;
      const stemCurveZ = 0.4 * Math.cos(prog * Math.PI);

      const rStem = 0.55 * Math.random();
      const theta = Math.random() * Math.PI * 2;

      particles.push({
        ox: stemCurveX + rStem * Math.cos(theta),
        oy: oy,
        oz: stemCurveZ + rStem * Math.sin(theta),
        color: Math.random() < 0.6 ? '#2ecc71' : '#1b4332',
        char: Math.random() < 0.5 ? '|' : '#',
        blinkPhase: 0,
        blinkSpeed: 0,
      });
    }

    // C. Dos hojas laterales en forma paramétrica (~450 partículas)
    // Hoja 1 (izquierda, a media altura)
    for (let i = 0; i < 225; i++) {
      const t = Math.random(); // a lo largo de la hoja (0..1)
      const w = Math.sin(t * Math.PI) * 1.35; // anchura máxima en el centro
      const lateral = (Math.random() * 2 - 1) * w;

      const ox = 0.5 - t * 4.4;
      const oy = 3.6 - t * 1.1 + lateral * 0.4;
      const oz = lateral * 0.9;

      particles.push({
        ox, oy, oz,
        color: Math.random() < 0.65 ? '#2ecc71' : '#52b788',
        char: Math.random() < 0.5 ? '%' : '*',
        blinkPhase: 0,
        blinkSpeed: 0,
      });
    }

    // Hoja 2 (derecha, más abajo)
    for (let i = 0; i < 225; i++) {
      const t = Math.random();
      const w = Math.sin(t * Math.PI) * 1.45;
      const lateral = (Math.random() * 2 - 1) * w;

      const ox = 0.8 + t * 4.6;
      const oy = 6.4 - t * 1.2 + lateral * 0.4;
      const oz = lateral * 0.9;

      particles.push({
        ox, oy, oz,
        color: Math.random() < 0.6 ? '#40916c' : '#2ecc71',
        char: Math.random() < 0.5 ? '%' : '*',
        blinkPhase: 0,
        blinkSpeed: 0,
      });
    }

    return particles;
  }

  // ── 5. DASHBOARD / INICIO → Núcleo Orbital / Astrolabio Estelar 3D ─────────
  // ~2,400 partículas: Núcleo luminoso esférico (r=3.2), 3 anillos orbitales
  // concéntricos inclinados que giran a distintas velocidades, y destellos satélite.
  function buildArmillaryParticles() {
    const particles = [];

    // A. Esfera/Núcleo central luminoso (~700 partículas, r <= 3.2)
    const CORE_N = 700;
    for (let i = 0; i < CORE_N; i++) {
      const u     = Math.pow(Math.random(), 0.75) * 3.2; // Concentración radial
      const theta = Math.random() * Math.PI * 2;
      const phi   = (Math.random() - 0.5) * Math.PI;

      particles.push({
        ox: u * Math.cos(phi) * Math.cos(theta),
        oy: u * Math.sin(phi),
        oz: u * Math.cos(phi) * Math.sin(theta),
        color: Math.random() < 0.65 ? '#ffffff' : '#ffd166',
        char: Math.random() < 0.5 ? '@' : '*',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.5 + Math.random() * 2.0,
      });
    }

    // B. Tres anillos orbitales concéntricos inclinados (~1,500 partículas, 500 por anillo)
    // r = 6.5 (azul cielo), r = 8.5 (violeta), r = 10.5 (rosa suave)
    const RINGS_DEF = [
      { r: 6.5,  tiltX: 0.55,  tiltZ: 0.35,  speedMult: 1.35,  color: '#4cc9f0', count: 500 }, // Anillo interior
      { r: 8.5,  tiltX: -0.85, tiltZ: 0.65,  speedMult: -0.95, color: '#a06cd5', count: 500 }, // Anillo intermedio
      { r: 10.5, tiltX: 1.25,  tiltZ: -0.45, speedMult: 0.75,  color: '#ff85a2', count: 500 }, // Anillo exterior
    ];

    RINGS_DEF.forEach((ring) => {
      const cosTiltX = Math.cos(ring.tiltX);
      const sinTiltX = Math.sin(ring.tiltX);
      const cosTiltZ = Math.cos(ring.tiltZ);
      const sinTiltZ = Math.sin(ring.tiltZ);

      for (let i = 0; i < ring.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const rad   = ring.r + (Math.random() - 0.5) * 0.55;
        const dr    = (Math.random() - 0.5) * 0.35; // Grosor leve del anillo

        particles.push({
          rad,
          theta,
          dr,
          cosTiltX,
          sinTiltX,
          cosTiltZ,
          sinTiltZ,
          speedMult: ring.speedMult,
          isOrbitalRing: true,
          color: ring.color,
          char: Math.random() < 0.4 ? 'O' : (Math.random() < 0.7 ? '+' : '='),
          blinkPhase: 0,
          blinkSpeed: 0,
        });
      }
    });

    // C. Destellos satélite exteriores (~200 partículas, r: 11.5 .. 14.5)
    const SAT_N = 200;
    for (let i = 0; i < SAT_N; i++) {
      const rad       = 11.5 + Math.random() * 3.0;
      const theta     = Math.random() * Math.PI * 2;
      const phi       = (Math.random() - 0.5) * Math.PI * 0.75;
      const speedMult = (Math.random() < 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.5);

      particles.push({
        rad,
        theta,
        phi,
        speedMult,
        isSatellite: true,
        color: Math.random() < 0.5 ? '#ffd166' : (Math.random() < 0.8 ? '#ffffff' : '#4cc9f0'),
        char: Math.random() < 0.5 ? '@' : '*',
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 1.2 + Math.random() * 1.8,
      });
    }

    return particles;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROYECCIÓN Y DIBUJO EN CANVAS 2D
  // ═══════════════════════════════════════════════════════════════════════════
  function renderScene(ctx, particles, section, W, H, angle, elapsed) {
    const fov    = 300;
    // Escala proporcional y centro exacto especificado (centerY = H * 0.48)
    const scale  = Math.min(W, H) / 36;
    const drawCy = H * 0.48;
    const drawCx = W / 2;

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 13px "Courier New", monospace';

    // Inclinaciones particulares según la escena para optimizar la perspectiva
    let tiltX = 0;
    let tiltY = angle;

    if (section === 'universo') {
      tiltX = 0.49; // Inclinación galáctica hacia la cámara (~28°)
    } else if (section === 'jardin') {
      tiltX = 0.38; // Flor ligeramente orientada al frente
    } else if (section === 'calendario' || section === 'cartas') {
      tiltX = 0.16 * Math.sin(elapsed * 0.6); // Balanceo suave en fotografía / carta
    } else {
      tiltX = 0.22;
    }

    const cosY = Math.cos(tiltY);
    const sinY = Math.sin(tiltY);
    const cosX = Math.cos(tiltX);
    const sinX = Math.sin(tiltX);

    const projected = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      let ox = p.ox;
      let oy = p.oy;
      let oz = p.oz;

      if (p.isOrbitalRing) {
        // Rotación orbital independiente por anillo alrededor del núcleo
        const currentTheta = p.theta + elapsed * p.speedMult;
        const xr = p.rad * Math.cos(currentTheta);
        const yr = p.dr * 0.3;
        const zr = p.rad * Math.sin(currentTheta);

        // Aplicar inclinación 3D fija de este anillo
        const y1 = yr * p.cosTiltX - zr * p.sinTiltX;
        const z1 = yr * p.sinTiltX + zr * p.cosTiltX;
        ox = xr * p.cosTiltZ - y1 * p.sinTiltZ;
        oy = xr * p.sinTiltZ + y1 * p.cosTiltZ;
        oz = z1;
      } else if (p.isSatellite) {
        // Órbita circular de los destellos satélite
        const currentTheta = p.theta + elapsed * p.speedMult;
        ox = p.rad * Math.cos(p.phi) * Math.cos(currentTheta);
        oy = p.rad * Math.sin(p.phi);
        oz = p.rad * Math.cos(p.phi) * Math.sin(currentTheta);
      }

      // 1. Rotación general alrededor del eje Y
      const rx = ox * cosY - oz * sinY;
      const ry = oy;
      const rz = ox * sinY + oz * cosY;

      // 2. Inclinación general alrededor del eje X
      const ry2 = ry * cosX - rz * sinX;
      const rz2 = ry * sinX + rz * cosX;

      // 3. Proyección en perspectiva
      const depth = Math.max(5, fov + rz2 * 2.2);
      const factor = fov / depth;

      const sx = drawCx + rx  * scale * factor;
      const sy = drawCy + ry2 * scale * factor;

      // 4. Brillo según profundidad Z
      const brightness = Math.max(0, Math.min(1, (rz2 + 10) / 20));

      projected.push({
        ...p,
        sx, sy,
        depth,
        brightness,
      });
    }

    // Ordenamiento por profundidad (Z-sort: pintor)
    projected.sort((a, b) => b.depth - a.depth);

    // Dibujar cada caracter ASCII
    for (let i = 0; i < projected.length; i++) {
      const p = projected[i];

      // Si el caracter viene definido lo usamos; sino mapeamos a rampa ASCII
      let ch = p.char;
      if (!ch || ch === '.') {
        const charIdx = Math.floor(p.brightness * (ASCII_CHARS.length - 1));
        ch = ASCII_CHARS[charIdx] || '.';
      }

      // Parpadeo suave si tiene phase/speed
      let alpha = 0.55 + p.brightness * 0.45;
      if (p.blinkSpeed > 0) {
        const flicker = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * p.blinkSpeed + p.blinkPhase));
        alpha = alpha * (0.6 + flicker * 0.4);
      }

      ctx.globalAlpha = Math.max(0.15, Math.min(1, alpha));
      ctx.fillStyle   = p.color;
      ctx.fillText(ch, p.sx, p.sy);
    }

    ctx.globalAlpha = 1;
  }

})();
