/**
 * Efecto inmersivo de Aniversario.
 * Se muestra automáticamente en pantalla completa cada vez que se cargue
 * o recargue la página, únicamente si hoy es el día 3 del mes.
 *
 * Sin persistencia en localStorage/sessionStorage, garantizando que se aprecie
 * en cada recarga durante el día 3.
 */
(function () {
  const hoy = new Date();

  // 1. Condición estricta: Solo ejecutar si hoy es el día 3 del mes
  if (hoy.getDate() !== 3) {
    return;
  }

  // 2. Fecha de inicio: 3 de Julio de 2026 (mes 6 en JavaScript, base 0)
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

  // 4. Crear e inyectar el contenedor inmersivo en el DOM (únicamente en el menú principal)
  function lanzarSorpresa() {
    const esDashboard =
      document.body.classList.contains("page-dashboard") ||
      document.getElementById("contador") !== null;

    if (!esDashboard) return;
    if (document.getElementById("anniversary-overlay")) return;

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

    document.body.appendChild(overlay);

    // 5. Mostrar durante 4.5 segundos antes de iniciar el desvanecimiento
    const TIEMPO_VISIBLE_MS = 4500;

    setTimeout(() => {
      overlay.classList.add("fade-out");

      // Remover del DOM una vez concluida la transición suave de CSS
      overlay.addEventListener(
        "transitionend",
        () => {
          overlay.remove();
        },
        { once: true }
      );

      // Respaldo de seguridad en caso de que la pestaña esté en segundo plano
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      }, 1600);
    }, TIEMPO_VISIBLE_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", lanzarSorpresa);
  } else {
    lanzarSorpresa();
  }
})();
