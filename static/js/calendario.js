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

  const modalContainer = document.getElementById("modal-recuerdos-container") || overlay.querySelector(".modal");
  const titulo = document.getElementById("modal-dia-titulo");
  const loading = document.getElementById("modal-dia-loading");
  const contenedorFotos = document.getElementById("modal-dia-fotos");
  const mensajeVacio = document.getElementById("modal-dia-vacio");
  const inputFecha = document.getElementById("modal-dia-fecha-input");
  const botonCerrar = document.getElementById("modal-dia-cerrar");
  const btnToggleModo = document.getElementById("btn-toggle-modo-edicion");
  const btnToggleTexto = document.getElementById("btn-toggle-modo-texto");

  // Controles del Reproductor en Grande (Lightbox)
  const lightboxOverlay = document.getElementById("lightbox-media");
  const lightboxVideo = document.getElementById("lightbox-video");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCerrar = document.getElementById("lightbox-cerrar");

  // Controles de Portada del Calendario (Mensual)
  const calendarCoverCard = document.getElementById("calendarCoverCard");
  const inputCambiarPortada = document.getElementById("inputCambiarPortada");
  const calendarCoverMedia = document.getElementById("calendarCoverMedia");
  const labelPortadaTexto = document.getElementById("labelPortadaTexto");

  let fechaActualModal = null;
  let modoEdicionActivo = false;

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
   * Abre el reproductor de video en grande y reproduce inmediatamente con AUDIO.
   */
  function abrirReproductorVideo(url) {
    if (!lightboxOverlay || !lightboxVideo) return;

    if (lightboxImg) {
      lightboxImg.style.display = "none";
      lightboxImg.src = "";
    }

    lightboxVideo.style.display = "block";
    lightboxVideo.src = url;
    lightboxVideo.muted = false; // Audio ACTIVADO al hacer grande
    lightboxVideo.volume = 1;

    lightboxOverlay.classList.add("is-open");
    lightboxOverlay.setAttribute("aria-hidden", "false");

    const playPromise = lightboxVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Autoplay con audio requiere interacción:", err);
      });
    }
  }

  /**
   * Abre la foto en grande dentro del lightbox.
   */
  function abrirVisorFoto(url) {
    if (!lightboxOverlay || !lightboxImg) return;

    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.removeAttribute("src");
      lightboxVideo.load();
      lightboxVideo.style.display = "none";
    }

    lightboxImg.src = url;
    lightboxImg.style.display = "block";

    lightboxOverlay.classList.add("is-open");
    lightboxOverlay.setAttribute("aria-hidden", "false");
  }

  /**
   * Cierra el reproductor en grande y detiene el audio/video por completo.
   */
  function cerrarReproductor() {
    if (!lightboxOverlay) return;

    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.removeAttribute("src");
      lightboxVideo.load();
      lightboxVideo.style.display = "none";
    }

    if (lightboxImg) {
      lightboxImg.src = "";
      lightboxImg.style.display = "none";
    }

    lightboxOverlay.classList.remove("is-open");
    lightboxOverlay.setAttribute("aria-hidden", "true");
  }

  /**
   * Control del Sistema de Doble Estado:
   * false -> Modo Visualización (por defecto): CERO controles visibles.
   * true  -> Modo Edición: Muestra controles sobre cada recuerdo y botón de subida.
   */
  function setModoEdicion(activar) {
    modoEdicionActivo = Boolean(activar);

    if (modalContainer) {
      modalContainer.classList.toggle("modo-edicion", modoEdicionActivo);
    }

    if (btnToggleTexto) {
      btnToggleTexto.textContent = modoEdicionActivo ? "Finalizar Edición" : "Editar Recuerdos";
    }
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
    const items = contenedorFotos.querySelectorAll(".media-card, .media-item");
    items.forEach((item, index) => {
      const btnPrev = item.querySelector(".btn-order-prev, .btn-order-up");
      const btnNext = item.querySelector(".btn-order-next, .btn-order-down");
      if (btnPrev) btnPrev.disabled = (index === 0);
      if (btnNext) btnNext.disabled = (index === items.length - 1);
    });
  }

  /**
   * Guarda el nuevo orden de los elementos en el backend.
   */
  function guardarNuevoOrden() {
    const items = contenedorFotos.querySelectorAll(".media-card, .media-item");
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
   * Genera el DOM de un elemento multimedia con tarjeta visual y controles flotantes.
   * Los controles están en el DOM pero ocultos por defecto con CSS hasta activar .modo-edicion.
   */
  function crearMediaCard(foto, fechaISO) {
    const card = document.createElement("div");
    card.className = `media-card media-item ${foto.is_preview ? "is-cover-media" : ""}`;
    card.dataset.id = foto.id;

    const ruta = foto.ruta_archivo || foto.ruta;
    const esVideo = foto.tipo_media === "video" || esVideoUrl(ruta);

    // Contenedor visual del contenido (Foto o Video)
    const mediaContent = document.createElement("div");
    mediaContent.className = "media-card__content";

    if (esVideo) {
      const video = document.createElement("video");
      video.src = `/static/${ruta}`;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.loop = true;
      video.preload = "metadata";
      video.setAttribute("disablePictureInPicture", "");
      mediaContent.appendChild(video);

      const videoBadge = document.createElement("span");
      videoBadge.className = "media-card__type-badge";
      videoBadge.title = "Video";
      videoBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      mediaContent.appendChild(videoBadge);

      const playPrompt = document.createElement("div");
      playPrompt.className = "media-card__play-prompt";
      playPrompt.innerHTML = `
        <div class="media-card__play-prompt-icon" title="Reproducir video con audio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </div>
      `;
      mediaContent.appendChild(playPrompt);
    } else {
      const img = document.createElement("img");
      img.src = `/static/${ruta}`;
      img.alt = "Recuerdo";
      img.loading = "lazy";
      mediaContent.appendChild(img);
    }

    // Clic sobre el recuerdo en Modo Visualización para hacerlo grande
    mediaContent.addEventListener("click", () => {
      // En modo edición no abrimos el reproductor para permitir editar libremente
      if (modoEdicionActivo) return;

      if (esVideo) {
        abrirReproductorVideo(`/static/${ruta}`);
      } else {
        abrirVisorFoto(`/static/${ruta}`);
      }
    });

    // Badge estático de Portada para Modo Visualización
    if (foto.is_preview) {
      const coverBadge = document.createElement("span");
      coverBadge.className = "media-card__cover-badge";
      coverBadge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Portada`;
      mediaContent.appendChild(coverBadge);
    }

    // Overlay translúcido de fondo para Modo Edición
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "media-card__overlay";
    mediaContent.appendChild(overlayDiv);

    // =======================================================================
    // CONTROLES DE EDICIÓN (ocultos por defecto vía CSS)
    // =======================================================================
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "media-card__controls";

    // Fila Superior de Controles: Portada y Eliminar
    const controlsTop = document.createElement("div");
    controlsTop.className = "media-card__controls-top";

    // Botón: Usar como Portada
    const btnPreview = document.createElement("button");
    btnPreview.type = "button";
    btnPreview.className = `btn-media-control btn-media-control--preview btn-media-action--preview ${foto.is_preview ? "is-active" : ""}`;
    btnPreview.title = foto.is_preview ? "Portada del día" : "Usar como portada";
    btnPreview.innerHTML = foto.is_preview
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>Portada</span>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>Portada</span>`;

    btnPreview.addEventListener("click", (e) => {
      e.stopPropagation();
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
            contenedorFotos.querySelectorAll(".media-card, .media-item").forEach((it) => {
              it.classList.remove("is-cover-media");
              const prevBadge = it.querySelector(".media-card__cover-badge");
              if (prevBadge) prevBadge.remove();

              const prevBtn = it.querySelector(".btn-media-control--preview");
              if (prevBtn) {
                prevBtn.classList.remove("is-active");
                prevBtn.title = "Usar como portada";
                prevBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>Portada</span>`;
              }
            });

            card.classList.add("is-cover-media");
            const newBadge = document.createElement("span");
            newBadge.className = "media-card__cover-badge";
            newBadge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Portada`;
            mediaContent.appendChild(newBadge);

            btnPreview.classList.add("is-active");
            btnPreview.title = "Portada del día";
            btnPreview.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>Portada</span>`;

            // Actualizar celda en la grilla del calendario
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

    // Botón: Eliminar recuerdo (rojo con papelera)
    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "btn-media-control btn-media-control--delete btn-media-action--delete";
    btnDelete.title = "Eliminar recuerdo";
    btnDelete.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      const confirmacion = window.confirm(
        "¿Estás seguro de que deseas eliminar este recuerdo?\n\nEsta acción eliminará el archivo del servidor de forma permanente para liberar espacio y no se puede deshacer."
      );
      if (!confirmacion) return;

      btnDelete.disabled = true;

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
            card.style.transform = "scale(0.88)";
            setTimeout(() => {
              card.remove();
              refrescarEstadosFlechas();

              if (data.total_restantes === 0) {
                mensajeVacio.hidden = false;
                if (modalContainer) modalContainer.classList.add("is-empty");
                if (btnToggleModo) btnToggleModo.style.display = "none";
                setModoEdicion(false);
                actualizarMiniaturaCalendario(fechaISO, null, null);
              } else if (data.nueva_portada) {
                const siguienteCard = contenedorFotos.querySelector(`.media-card[data-id="${data.nueva_portada.id}"], .media-item[data-id="${data.nueva_portada.id}"]`);
                if (siguienteCard) {
                  siguienteCard.classList.add("is-cover-media");
                  const sMediaContent = siguienteCard.querySelector(".media-card__content");
                  if (sMediaContent && !sMediaContent.querySelector(".media-card__cover-badge")) {
                    const bg = document.createElement("span");
                    bg.className = "media-card__cover-badge";
                    bg.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Portada`;
                    sMediaContent.appendChild(bg);
                  }
                  const sBtn = siguienteCard.querySelector(".btn-media-control--preview");
                  if (sBtn) {
                    sBtn.classList.add("is-active");
                    sBtn.title = "Portada del día";
                    sBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>Portada</span>`;
                  }
                }
                actualizarMiniaturaCalendario(fechaISO, data.nueva_portada.ruta_archivo, data.nueva_portada.tipo_media);
              }
            }, 200);
          } else {
            btnDelete.disabled = false;
            alert(data.error || "No se pudo eliminar el archivo.");
          }
        })
        .catch(() => {
          btnDelete.disabled = false;
          alert("Error de red al intentar eliminar el archivo.");
        });
    });

    controlsTop.appendChild(btnPreview);
    controlsTop.appendChild(btnDelete);

    // Fila Inferior de Controles: Flechas de Reordenar (Izquierda / Derecha)
    const controlsBottom = document.createElement("div");
    controlsBottom.className = "media-card__controls-bottom";

    const orderBtnsGroup = document.createElement("div");
    orderBtnsGroup.className = "media-card__order-btns media-item__order-btns";

    const btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = "btn-order-arrow btn-order-prev btn-order-up";
    btnPrev.title = "Mover antes";
    btnPrev.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    btnPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      const prev = card.previousElementSibling;
      if (prev) {
        contenedorFotos.insertBefore(card, prev);
        refrescarEstadosFlechas();
        guardarNuevoOrden();
      }
    });

    const btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = "btn-order-arrow btn-order-next btn-order-down";
    btnNext.title = "Mover después";
    btnNext.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
    btnNext.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = card.nextElementSibling;
      if (next) {
        contenedorFotos.insertBefore(next, card);
        refrescarEstadosFlechas();
        guardarNuevoOrden();
      }
    });

    orderBtnsGroup.appendChild(btnPrev);
    orderBtnsGroup.appendChild(btnNext);
    controlsBottom.appendChild(orderBtnsGroup);

    controlsDiv.appendChild(controlsTop);
    controlsDiv.appendChild(controlsBottom);

    card.appendChild(mediaContent);
    card.appendChild(controlsDiv);

    return card;
  }

  /**
   * Abre el modal y carga los datos de la fecha seleccionada vía Fetch API.
   * Siempre inicia estrictamente en MODO VISUALIZACIÓN (setModoEdicion(false)).
   */
  function abrirModal(fechaISO) {
    fechaActualModal = fechaISO;
    titulo.textContent = formatearTitulo(fechaISO);
    inputFecha.value = fechaISO;

    // Resetear al Modo Visualización por defecto
    setModoEdicion(false);

    contenedorFotos.hidden = true;
    contenedorFotos.innerHTML = "";
    mensajeVacio.hidden = true;
    loading.hidden = false;

    if (modalContainer) {
      modalContainer.classList.remove("is-empty");
    }

    if (btnToggleModo) {
      btnToggleModo.style.display = "inline-flex";
    }

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    fetch(`/galeria/fotos/${fechaISO}`)
      .then((res) => res.json())
      .then((data) => {
        loading.hidden = true;
        const fotos = data.fotos || [];

        if (fotos.length === 0) {
          mensajeVacio.hidden = false;
          if (modalContainer) modalContainer.classList.add("is-empty");
          if (btnToggleModo) btnToggleModo.style.display = "none";
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
    cerrarReproductor();
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setModoEdicion(false);
    fechaActualModal = null;
  }

  // Event Listeners del Reproductor en Grande (Lightbox)
  if (lightboxCerrar) {
    lightboxCerrar.addEventListener("click", cerrarReproductor);
  }
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener("click", (evento) => {
      if (evento.target === lightboxOverlay) cerrarReproductor();
    });
  }

  // Alternar Modo Edición desde el botón inferior
  if (btnToggleModo) {
    btnToggleModo.addEventListener("click", () => {
      setModoEdicion(!modoEdicionActivo);
    });
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
    if (evento.key === "Escape") {
      // Si el reproductor en grande está abierto, solo cerramos el reproductor
      if (lightboxOverlay && lightboxOverlay.classList.contains("is-open")) {
        cerrarReproductor();
        return;
      }
      // Si el modal de recuerdos está abierto, lo cerramos
      if (overlay.classList.contains("is-open")) {
        cerrarModal();
      }
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