/**
 * Fondo decorativo de estrellas titilantes.
 *
 * Ligero (sin dependencias) y consciente de `prefers-reduced-motion`.
 * Se engancha al <canvas id="starfield"> presente en base.html.
 */
(function () {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stars = [];
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    const cantidad = Math.floor((width * height) / 9000);
    stars = Array.from({ length: cantidad }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radio: Math.random() * 1.1 + 0.2,
      fase: Math.random() * Math.PI * 2,
      velocidad: Math.random() * 0.015 + 0.005,
    }));
  }

  function dibujar(tiempo) {
    ctx.clearRect(0, 0, width, height);
    for (const estrella of stars) {
      const brillo = reduceMotion
        ? 0.6
        : 0.4 + 0.6 * Math.abs(Math.sin(estrella.fase + tiempo * estrella.velocidad));
      ctx.beginPath();
      ctx.arc(estrella.x, estrella.y, estrella.radio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(244, 242, 238, ${brillo.toFixed(2)})`;
      ctx.fill();
    }
    if (!reduceMotion) {
      requestAnimationFrame(dibujar);
    }
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(dibujar);
})();
