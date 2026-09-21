/* =========================================================================
   jardin.js — Control de animaciones del Jardín
   =========================================================================
   Flujo por tarjeta:
     1. Intersection Observer detecta que la tarjeta entra al viewport.
     2. Se calculan los stroke-length reales de cada <path> del SVG y se
        inyectan como variable CSS --stroke-length (precisión pixel-perfect).
     3. Se añade la clase .dibujando → inicia la animación CSS del trazo.
     4. Tras 2.6 s (un poco después de los 2.5 s de la animación) se añade
        la clase .revelado → el SVG se desvanece, la imagen aparece con
        fade-in, y los textos suben suavemente.
   ========================================================================= */

(function () {
  'use strict';

  /* Duración de la animación de dibujo (debe coincidir con el CSS) */
  var DURACION_DIBUJO_MS = 2600;

  /**
   * Calcula y aplica --stroke-length a cada <path> y <circle> del SVG
   * para que stroke-dasharray funcione con el largo real del trazo.
   */
  function prepararStrokeLengths(card) {
    var paths = card.querySelectorAll('.flor-svg__path');
    paths.forEach(function (p) {
      var length = p.getTotalLength();
      p.style.setProperty('--stroke-length', length);
    });
  }

  /**
   * Dispara la secuencia de animación:
   *   dibujando → (espera) → revelado
   */
  function animarFlor(card) {
    /* Ya fue animada, no repetir */
    if (card.classList.contains('dibujando')) return;

    prepararStrokeLengths(card);
    card.classList.add('dibujando');

    setTimeout(function () {
      card.classList.add('revelado');
    }, DURACION_DIBUJO_MS);
  }

  /* ---------------------------------------------------------------
     Intersection Observer — la animación empieza cuando la tarjeta
     entra al viewport (threshold 0.25 = 25 % visible).
     Si entran varias a la vez (lado a lado), florecen con un leve desfase.
     --------------------------------------------------------------- */
  var delayEscalonado = 0;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var target = entry.target;
        setTimeout(function () {
          animarFlor(target);
        }, delayEscalonado);
        delayEscalonado += 350;
        setTimeout(function () { delayEscalonado = 0; }, 1000);
        observer.unobserve(target); /* solo una vez */
      }
    });
  }, { threshold: 0.25 });

  /* Observar todas las tarjetas de flor */
  var cards = document.querySelectorAll('.flor-card');
  cards.forEach(function (card) {
    observer.observe(card);
  });

})();
