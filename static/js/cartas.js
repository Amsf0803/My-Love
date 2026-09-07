/**
 * Alterna entre las dos formas de crear una carta: texto libre o
 * archivo adjunto (foto/PDF). Mantiene sincronizado el input oculto
 * "tipo" que el backend usa para decidir qué guardar.
 */
(function () {
  const botones = document.querySelectorAll(".tab-btn");
  const paneles = document.querySelectorAll(".tab-panel");
  const inputTipo = document.getElementById("carta-tipo");
  if (!botones.length || !inputTipo) return;

  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      const destino = boton.dataset.tab;

      botones.forEach((b) => b.classList.toggle("is-active", b === boton));
      paneles.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === destino));

      inputTipo.value = destino;
    });
  });
})();
