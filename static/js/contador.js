/**
 * Contador en tiempo real: años, meses, días, horas, minutos y segundos
 * transcurridos desde la fecha de inicio de la relación.
 *
 * La fecha de inicio se lee del atributo data-fecha-inicio del contenedor
 * #contador (inyectada por Flask en dashboard.html), en formato YYYY-MM-DD.
 */
(function () {
  const contenedor = document.getElementById("contador");
  if (!contenedor) return;

  const fechaInicio = new Date(`${contenedor.dataset.fechaInicio}T00:00:00`);

  const nodos = {
    anios: contenedor.querySelector('[data-unidad="anios"]'),
    meses: contenedor.querySelector('[data-unidad="meses"]'),
    dias: contenedor.querySelector('[data-unidad="dias"]'),
    horas: contenedor.querySelector('[data-unidad="horas"]'),
    minutos: contenedor.querySelector('[data-unidad="minutos"]'),
    segundos: contenedor.querySelector('[data-unidad="segundos"]'),
  };

  function calcularDiferencia(inicio, ahora) {
    let anios = ahora.getFullYear() - inicio.getFullYear();
    let meses = ahora.getMonth() - inicio.getMonth();
    let dias = ahora.getDate() - inicio.getDate();
    let horas = ahora.getHours() - inicio.getHours();
    let minutos = ahora.getMinutes() - inicio.getMinutes();
    let segundos = ahora.getSeconds() - inicio.getSeconds();

    if (segundos < 0) {
      segundos += 60;
      minutos -= 1;
    }
    if (minutos < 0) {
      minutos += 60;
      horas -= 1;
    }
    if (horas < 0) {
      horas += 24;
      dias -= 1;
    }
    if (dias < 0) {
      // Días del mes anterior respecto al mes actual de "ahora"
      const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
      dias += finMesAnterior.getDate();
      meses -= 1;
    }
    if (meses < 0) {
      meses += 12;
      anios -= 1;
    }

    return { anios, meses, dias, horas, minutos, segundos };
  }

  function pad(numero) {
    return String(Math.max(numero, 0)).padStart(2, "0");
  }

  function actualizar() {
    const ahora = new Date();
    const diff = calcularDiferencia(fechaInicio, ahora);

    nodos.anios.textContent = pad(diff.anios);
    nodos.meses.textContent = pad(diff.meses);
    nodos.dias.textContent = pad(diff.dias);
    nodos.horas.textContent = pad(diff.horas);
    nodos.minutos.textContent = pad(diff.minutos);
    nodos.segundos.textContent = pad(diff.segundos);
  }

  actualizar();
  setInterval(actualizar, 1000);
})();
