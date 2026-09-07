/**
 * Teclado numérico del login: funciona como un PIN de 4 dígitos.
 * Cada toque agrega un dígito, se rellenan los puntos visualmente,
 * y al llegar a 4 dígitos el formulario se envía automáticamente.
 *
 * Si el servidor responde con un error (fecha incorrecta), el propio
 * mensaje flash queda visible; aquí solo animamos el PIN con un
 * pequeño "shake" si detectamos ese flash de error al cargar la página.
 */
(function () {
  const form = document.getElementById("form-login");
  const inputPassword = document.getElementById("password");
  const pinDisplay = document.getElementById("pin-display");
  const puntos = pinDisplay ? pinDisplay.querySelectorAll("[data-dot]") : [];
  const botonBorrar = document.getElementById("keypad-borrar");

  if (!form || !inputPassword || !pinDisplay) return;

  const LONGITUD_PIN = 4;
  let valorActual = "";

  function actualizarPuntos() {
    puntos.forEach((punto, indice) => {
      punto.classList.toggle("is-filled", indice < valorActual.length);
    });
  }

  function agregarDigito(digito) {
    if (valorActual.length >= LONGITUD_PIN) return;
    pinDisplay.classList.remove("is-error");
    valorActual += digito;
    inputPassword.value = valorActual;
    actualizarPuntos();

    if (valorActual.length === LONGITUD_PIN) {
      // Pequeña pausa para que se vea el último punto antes de enviar.
      setTimeout(() => form.submit(), 180);
    }
  }

  function borrarDigito() {
    valorActual = valorActual.slice(0, -1);
    inputPassword.value = valorActual;
    actualizarPuntos();
  }

  document.querySelectorAll(".keypad__key[data-digit]").forEach((tecla) => {
    tecla.addEventListener("click", () => agregarDigito(tecla.dataset.digit));
  });

  if (botonBorrar) {
    botonBorrar.addEventListener("click", borrarDigito);
  }

  // Soporte de teclado físico, por si acceden desde una computadora.
  document.addEventListener("keydown", (evento) => {
    if (/^[0-9]$/.test(evento.key)) {
      agregarDigito(evento.key);
    } else if (evento.key === "Backspace") {
      borrarDigito();
    }
  });

  // Si la página se recargó tras una fecha incorrecta, resalta el PIN
  // en rojo brevemente para dar retroalimentación visual.
  if (document.querySelector(".flash--error")) {
    pinDisplay.classList.add("is-error");
    valorActual = "1111"; // fuerza los 4 puntos visibles para el efecto
    actualizarPuntos();
    setTimeout(() => {
      valorActual = "";
      inputPassword.value = "";
      pinDisplay.classList.remove("is-error");
      actualizarPuntos();
    }, 500);
  }
})();
