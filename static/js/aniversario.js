/**
 * Efecto inmersivo de Aniversario.
 * Se muestra automáticamente en el menú principal cada vez que se cargue
 * la página el día 3 del mes (o con el parámetro ?aniversario=1).
 *
 * Se coordina con splash_seasonal.js para no encimarse:
 * Si el Corazón 3D ASCII está activo, espera a que concluya antes de mostrar
 * esta tarjeta conmemorativa con el mensaje de felicitación.
 */
(function () {
  const hoy = new Date();
  const urlParams = new URLSearchParams(window.location.search);
  const forzarAniversario = urlParams.get('aniversario') === '1';

  // 1. Condición estricta: Solo ejecutar si hoy es el día 3 del mes (o forzado con ?aniversario=1)
  if (hoy.getDate() !== 3 && !forzarAniversario) {
    return;
  }

  // 2. Fecha de inicio de la relación: 3 de Julio de 2026 (mes 6 en JavaScript, base 0)
  const fechaInicio = new Date(2026, 6, 3);

  // Cálculo exacto de los meses transcurridos
  let meses =
    (hoy.getFullYear() - fechaInicio.getFullYear()) * 12 +
    (hoy.getMonth() - fechaInicio.getMonth());

  if (hoy.getDate() < fechaInicio.getDate()) {
    meses--;
  }

  meses = Math.max(0, meses);

  // 3. Nombre del mes actual en español con primera letra en mayúscula
  const nombreMes = hoy.toLocaleDateString("es-ES", { month: "long" });
  const mesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  let sorpresaLanzada = false;

  // 4. Crear e inyectar el contenedor inmersivo en el DOM (únicamente en el menú principal)
  function lanzarSorpresa() {
    if (sorpresaLanzada) return;

    // Si el splash 3D ASCII está activo en este instante, posponer para no encimar overlays
    if (window.__splashActive || document.getElementById('seasonal-splash-overlay')) {
      return;
    }

    const esDashboard =
      document.body.classList.contains("page-dashboard") ||
      document.getElementById("contador") !== null;

    if (!esDashboard) return;
    if (document.getElementById("anniversary-overlay")) return;

    sorpresaLanzada = true;

    const overlay = document.createElement("div");
    overlay.id = "anniversary-overlay";
    overlay.className = "anniversary-overlay";
    overlay.setAttribute("aria-live", "polite");

    overlay.innerHTML = `
      <div class="anniversary-card">
        <div class="anniversary-icon" aria-hidden="true">✨ ❤️ ✨</div>
        <h1 class="anniversary-title">Feliz 3 de ${mesCapitalizado}</h1>
        <p class="anniversary-message">He sido inmensamente feliz estos ${meses} meses a tu lado.</p>
      </div>
    `;

    // Bloquear scroll de la página de fondo en móviles mientras el overlay esté activo
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    document.body.appendChild(overlay);

    function limpiarOverlay() {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    }

    // 5. Mostrar durante 4.5 segundos antes de iniciar el desvanecimiento
    const TIEMPO_VISIBLE_MS = 4500;

    setTimeout(() => {
      overlay.classList.add("fade-out");

      // Remover del DOM una vez concluida la transición suave de CSS
      overlay.addEventListener("transitionend", limpiarOverlay, { once: true });

      // Respaldo de seguridad en caso de que la pestaña esté en segundo plano en móviles
      setTimeout(limpiarOverlay, 1600);
    }, TIEMPO_VISIBLE_MS);
  }

  // Exponer para que splash_seasonal.js pueda ejecutarlo al desmontarse
  window.lanzarSorpresaAniversario = lanzarSorpresa;
  window.addEventListener('splash-finished', lanzarSorpresa);

  // Ejecución inicial: si el splash 3D no está presente, arrancar de inmediato
  function checkInit() {
    if (!window.__splashActive && !document.getElementById('seasonal-splash-overlay')) {
      lanzarSorpresa();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkInit);
  } else {
    checkInit();
  }
})();
