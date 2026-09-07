/**
 * Calendario: al hacer clic en un día, abre un modal que carga
 * dinámicamente (vía Fetch API) las fotos asociadas a esa fecha, y deja
 * listo el formulario de subida con la fecha correcta ya seleccionada.
 */
(function () {
  const overlay = document.getElementById("modal-dia");
  if (!overlay) return;

  const titulo = document.getElementById("modal-dia-titulo");
  const loading = document.getElementById("modal-dia-loading");
  const contenedorFotos = document.getElementById("modal-dia-fotos");
  const mensajeVacio = document.getElementById("modal-dia-vacio");
  const inputFecha = document.getElementById("modal-dia-fecha-input");
  const botonCerrar = document.getElementById("modal-dia-cerrar");

  const MESES_LARGO = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  function formatearTitulo(fechaISO) {
    const [anio, mes, dia] = fechaISO.split("-").map(Number);
    return `${dia} de ${MESES_LARGO[mes - 1]}, ${anio}`;
  }

  function abrirModal(fechaISO) {
    titulo.textContent = formatearTitulo(fechaISO);
    inputFecha.value = fechaISO;

    contenedorFotos.hidden = true;
    contenedorFotos.innerHTML = "";
    mensajeVacio.hidden = true;
    loading.hidden = false;

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    fetch(`/galeria/fotos/${fechaISO}`)
      .then((res) => res.json())
      .then((data) => {
        loading.hidden = true;
        const fotos = data.fotos || [];

        if (fotos.length === 0) {
          mensajeVacio.hidden = false;
          return;
        }

        contenedorFotos.hidden = false;
        for (const foto of fotos) {
          const img = document.createElement("img");
          img.src = `/static/${foto.ruta_archivo}`;
          img.alt = `Foto del ${fechaISO}`;
          img.loading = "lazy";
          contenedorFotos.appendChild(img);
        }
      })
      .catch(() => {
        loading.textContent = "No se pudieron cargar las fotos.";
      });
  }

  function cerrarModal() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".calendar-day[data-fecha]").forEach((celda) => {
    celda.addEventListener("click", () => abrirModal(celda.dataset.fecha));
  });

  botonCerrar.addEventListener("click", cerrarModal);
  overlay.addEventListener("click", (evento) => {
    if (evento.target === overlay) cerrarModal();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && overlay.classList.contains("is-open")) {
      cerrarModal();
    }
  });
})();
