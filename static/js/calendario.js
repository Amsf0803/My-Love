/**
 * Módulo de Calendario Interactivo · Mi Universo
 *
 * Funcionalidades:
 * - Carga asíncrona de recuerdos por día.
 * - Eliminación total física y lógica con confirmación (/delete-media).
 * - Selección de portada del día en tiempo real (/set-preview).
 * - Reordenamiento con flechas y persistencia (/reorder-media).
 * - Cambio de portada general del calendario con anti-caché (/set-calendar-cover).
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

  // Controles de Portada del Calendario (Mensual)
  const calendarCoverCard = document.getElementById("calendarCoverCard");
  const inputCambiarPortada = document.getElementById("inputCambiarPortada");
  const calendarCoverMedia = document.getElementById("calendarCoverMedia");
  const labelPortadaTexto = document.getElementById("labelPortadaTexto");

  let fechaActualModal = null;

  const MESES_LARGO = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  function formatearTitulo(fechaISO) {
    const [anio, mes, dia] = fechaISO.split("-").map(Number);
    return `${dia} de ${MESES_LARGO[mes - 1]}, ${anio}`;
  }

  function esVideoUrl(url) {
    return typeof url === "string" && Boolean(url.match(/\.(mp4|webm|mov|mkv)$/i));
  }

  /**
   * Actualiza la miniatura en la casilla del calendario para una fecha dada.
   */
  function actualizarMiniaturaCalendario(fechaISO, nuevaRuta, tipoMedia) {
    const thumbContainer = document.getElementById(`thumb-${fechaISO}`);
    if (!thumbContainer) return;

    if (!nuevaRuta) {
      thumbContainer.innerHTML = "";
      thumbContainer.style.display = "none";
      return;
    }

    thumbContainer.style.display = "";
    const esVideo = tipoMedia === "video" || esVideoUrl(nuevaRuta);

    if (esVideo) {
      thumbContainer.innerHTML = `
        <video src="/static/${nuevaRuta}"
               muted loop playsinline autoplay disablePictureInPicture
               style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
        </video>
      `;
    } else {
      thumbContainer.innerHTML = `
        <img src="/static/${nuevaRuta}" alt="" loading="lazy">
      `;
    }
  }

  /**
   * Actualiza los estados de los botones de flecha (primer y último elemento).
   */
  function refrescarEstadosFlechas() {
    const items = contenedorFotos.querySelectorAll(".media-item");
    items.forEach((item, index) => {
      const btnUp = item.querySelector(".btn-order-up");
      const btnDown = item.querySelector(".btn-order-down");
      if (btnUp) btnUp.disabled = (index === 0);
      if (btnDown) btnDown.disabled = (index === items.length - 1);
    });
  }

  /**
   * Guarda el nuevo orden de los elementos en el backend.
   */
  function guardarNuevoOrden() {
    const items = contenedorFotos.querySelectorAll(".media-item");
    const ordenIds = Array.from(items).map((item) => Number(item.dataset.id)).filter(Boolean);

    if (ordenIds.length <= 1) return;

    fetch("/reorder-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orden_ids: ordenIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error("Error al guardar orden:", data.error);
        }
      })
      .catch((err) => console.error("Error de red al reordenar:", err));
  }

  /**
   * Genera el DOM de un elemento multimedia con sus controles interactivos.
   */
  function crearMediaCard(foto, fechaISO) {
    const card = document.createElement("div");
    card.className = `media-item ${foto.is_preview ? "is-cover-media" : ""}`;
    card.dataset.id = foto.id;

    const ruta = foto.ruta_archivo || foto.ruta;
    const esVideo = foto.tipo_media === "video" || esVideoUrl(ruta);

    // Contenedor de preview
    const previewDiv = document.createElement("div");
    previewDiv.className = "media-item__preview";

    if (esVideo) {
      const video = document.createElement("video");
      video.src = `/static/${ruta}`;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      previewDiv.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = `/static/${ruta}`;
      img.alt = "Recuerdo";
      img.loading = "lazy";
      previewDiv.appendChild(img);
    }

    if (foto.is_preview) {
      const badge = document.createElement("span");
      badge.className = "media-item__badge";
      badge.textContent = "Portada";
      previewDiv.appendChild(badge);
    }

    // Info y acciones
    const infoDiv = document.createElement("div");
    infoDiv.className = "media-item__info";

    const typeDiv = document.createElement("div");
    typeDiv.className = "media-item__type";
    typeDiv.innerHTML = esVideo
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Video`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Foto`;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "media-item__actions";

    // Botón: Usar como portada
    const btnPreview = document.createElement("button");
    btnPreview.type = "button";
    btnPreview.className = `btn-media-action btn-media-action--preview ${foto.is_preview ? "is-active" : ""}`;
    btnPreview.innerHTML = foto.is_preview
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Portada del día`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Usar de portada`;

    btnPreview.addEventListener("click", () => {
      if (card.classList.contains("is-cover-media")) return;

      btnPreview.disabled = true;
      fetch("/set-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: foto.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          btnPreview.disabled = false;
          if (data.success) {
            // Actualizar tarjetas en el modal
            contenedorFotos.querySelectorAll(".media-item").forEach((it) => {
              it.classList.remove("is-cover-media");
              const prevBadge = it.querySelector(".media-item__badge");
              if (prevBadge) prevBadge.remove();

              const prevBtn = it.querySelector(".btn-media-action--preview");
              if (prevBtn) {
                prevBtn.classList.remove("is-active");
                prevBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Usar de portada`;
              }
            });

            card.classList.add("is-cover-media");
            const newBadge = document.createElement("span");
            newBadge.className = "media-item__badge";
            newBadge.textContent = "Portada";
            previewDiv.appendChild(newBadge);

            btnPreview.classList.add("is-active");
            btnPreview.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Portada del día`;

            // Actualizar la celda en la grilla del calendario
            actualizarMiniaturaCalendario(fechaISO, data.ruta_archivo, data.tipo_media);
          } else {
            alert(data.error || "No se pudo actualizar la portada.");
          }
        })
        .catch(() => {
          btnPreview.disabled = false;
          alert("Error de red al actualizar la portada.");
        });
    });

    // Botón: Eliminar total
    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "btn-media-action btn-media-action--delete";
    btnDelete.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar`;

    btnDelete.addEventListener("click", () => {
      const confirmacion = window.confirm(
        "¿Estás seguro de que deseas eliminar este recuerdo?\n\nEsta acción eliminará el archivo del servidor de forma permanente para liberar espacio y no se puede deshacer."
      );
      if (!confirmacion) return;

      btnDelete.disabled = true;
      btnDelete.textContent = "Borrando…";

      fetch("/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: foto.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Animación suave de salida
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            setTimeout(() => {
              card.remove();
              refrescarEstadosFlechas();

              if (data.total_restantes === 0) {
                mensajeVacio.hidden = false;
                actualizarMiniaturaCalendario(fechaISO, null, null);
              } else if (data.nueva_portada) {
                // Si promovió a otra foto como portada
                const siguienteCard = contenedorFotos.querySelector(`.media-item[data-id="${data.nueva_portada.id}"]`);
                if (siguienteCard) {
                  siguienteCard.classList.add("is-cover-media");
                  const pDiv = siguienteCard.querySelector(".media-item__preview");
                  if (pDiv && !pDiv.querySelector(".media-item__badge")) {
                    const bg = document.createElement("span");
                    bg.className = "media-item__badge";
                    bg.textContent = "Portada";
                    pDiv.appendChild(bg);
                  }
                  const sBtn = siguienteCard.querySelector(".btn-media-action--preview");
                  if (sBtn) {
                    sBtn.classList.add("is-active");
                    sBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Portada del día`;
                  }
                }
                actualizarMiniaturaCalendario(fechaISO, data.nueva_portada.ruta_archivo, data.nueva_portada.tipo_media);
              }
            }, 200);
          } else {
            btnDelete.disabled = false;
            btnDelete.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar`;
            alert(data.error || "No se pudo eliminar el archivo.");
          }
        })
        .catch(() => {
          btnDelete.disabled = false;
          alert("Error de red al intentar eliminar el archivo.");
        });
    });

    actionsDiv.appendChild(btnPreview);
    actionsDiv.appendChild(btnDelete);

    infoDiv.appendChild(typeDiv);
    infoDiv.appendChild(actionsDiv);

    // Botones de reordenamiento (Arriba / Abajo)
    const orderBtnsDiv = document.createElement("div");
    orderBtnsDiv.className = "media-item__order-btns";

    const btnUp = document.createElement("button");
    btnUp.type = "button";
    btnUp.className = "btn-order-arrow btn-order-up";
    btnUp.title = "Mover antes";
    btnUp.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>`;
    btnUp.addEventListener("click", () => {
      const prev = card.previousElementSibling;
      if (prev) {
        contenedorFotos.insertBefore(card, prev);
        refrescarEstadosFlechas();
        guardarNuevoOrden();
      }
    });

    const btnDown = document.createElement("button");
    btnDown.type = "button";
    btnDown.className = "btn-order-arrow btn-order-down";
    btnDown.title = "Mover después";
    btnDown.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
    btnDown.addEventListener("click", () => {
      const next = card.nextElementSibling;
      if (next) {
        contenedorFotos.insertBefore(next, card);
        refrescarEstadosFlechas();
        guardarNuevoOrden();
      }
    });

    orderBtnsDiv.appendChild(btnUp);
    orderBtnsDiv.appendChild(btnDown);

    card.appendChild(previewDiv);
    card.appendChild(infoDiv);
    card.appendChild(orderBtnsDiv);

    return card;
  }

  /**
   * Abre el modal y carga los datos de la fecha seleccionada vía Fetch API.
   */
  function abrirModal(fechaISO) {
    fechaActualModal = fechaISO;
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
        fotos.forEach((foto) => {
          const card = crearMediaCard(foto, fechaISO);
          contenedorFotos.appendChild(card);
        });

        refrescarEstadosFlechas();
      })
      .catch(() => {
        loading.textContent = "No se pudieron cargar los recuerdos de este día.";
      });
  }

  function cerrarModal() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    fechaActualModal = null;
  }

  // Event Listeners del Modal
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

  // =========================================================================
  // Cambio de Portada Mensual del Calendario (Anti-Caché)
  // =========================================================================
  if (inputCambiarPortada) {
    inputCambiarPortada.addEventListener("change", () => {
      const archivo = inputCambiarPortada.files && inputCambiarPortada.files[0];
      if (!archivo) return;

      const textoOriginal = labelPortadaTexto.textContent;
      labelPortadaTexto.textContent = "Subiendo…";

      const formData = new FormData();
      formData.append("portada", archivo);

      // Enviamos el año y mes activo para asociar la portada a ese mes específico
      if (calendarCoverCard) {
        if (calendarCoverCard.dataset.anio) {
          formData.append("anio", calendarCoverCard.dataset.anio);
        }
        if (calendarCoverCard.dataset.mes) {
          formData.append("mes", calendarCoverCard.dataset.mes);
        }
      }

      fetch("/set-calendar-cover", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          labelPortadaTexto.textContent = textoOriginal;
          inputCambiarPortada.value = "";

          if (data.success) {
            // Anti-caché forzando query param con timestamp
            const cacheBusterUrl = `/static/${data.ruta_portada}?t=${data.timestamp || Date.now()}`;
            const esVideo = data.tipo_media === "video" || esVideoUrl(data.ruta_portada);

            if (esVideo) {
              calendarCoverMedia.innerHTML = `
                <video id="calendarCoverVideo" src="${cacheBusterUrl}"
                       autoplay muted loop playsinline disablePictureInPicture
                       style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
                </video>
              `;
            } else {
              calendarCoverMedia.innerHTML = `
                <img id="calendarCoverImg" src="${cacheBusterUrl}" alt="Portada del Mes"
                     style="width: 100%; height: 100%; object-fit: cover; display: block;">
              `;
            }
          } else {
            alert(data.error || "No se pudo cambiar la portada del calendario.");
          }
        })
        .catch(() => {
          labelPortadaTexto.textContent = textoOriginal;
          inputCambiarPortada.value = "";
          alert("Error de conexión al subir la portada.");
        });
    });
  }
})();