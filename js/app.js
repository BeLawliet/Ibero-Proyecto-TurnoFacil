"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Clave utilizada para guardar las citas en el navegador
  const CLAVE_ALMACENAMIENTO = "turnoFacilCitas";

  let citas = cargarCitas();
  let citaIdEnEdicion = null;

  // Precios disponibles por servicio
  const preciosServicios = {
    "Corte clásico": 25000,
    "Arreglo de barba": 18000,
    "Combo completo": 35000,
  };

  // Elementos principales del documento
  const formularioReserva = document.querySelector("#formularioReserva");
  const nombreCliente = document.querySelector("#nombreCliente");
  const telefonoCliente = document.querySelector("#telefonoCliente");
  const correoCliente = document.querySelector("#correoCliente");
  const servicioReserva = document.querySelector("#servicioReserva");
  const fechaReserva = document.querySelector("#fechaReserva");
  const horaReserva = document.querySelector("#horaReserva");
  const notasReserva = document.querySelector("#notasReserva");
  const mensajeReserva = document.querySelector("#mensajeReserva");

  const listaCitas = document.querySelector("#listaCitas");
  const estadoVacio = document.querySelector("#estadoVacio");
  const contadorCitas = document.querySelector("#contadorCitas");
  const mensajeCitas = document.querySelector("#mensajeCitas");
  const panelReprogramacion = document.querySelector("#panelReprogramacion");
  const formularioReprogramacion = document.querySelector(
    "#formularioReprogramacion",
  );
  const fechaReprogramacion = document.querySelector("#fechaReprogramacion");
  const horaReprogramacion = document.querySelector("#horaReprogramacion");
  const botonCerrarReprogramacion = document.querySelector(
    "#cerrarFormularioReprogramacion",
  );
  const botonCancelarReprogramacion = document.querySelector(
    "#cancelarReprogramacion",
  );

  // Evita que se seleccionen fechas anteriores al día actual
  fechaReserva.min = obtenerFechaActual();

  fechaReserva.addEventListener("change", actualizarHorasDisponibles);
  horaReserva.addEventListener("focus", actualizarHorasDisponibles);
  horaReserva.addEventListener("pointerdown", actualizarHorasDisponibles);
  horaReserva.addEventListener("click", actualizarHorasDisponibles);

  document.querySelectorAll("#servicios a[data-servicio]").forEach((enlace) => {
    enlace.addEventListener("click", () => {
      servicioReserva.value = enlace.dataset.servicio;
    });
  });

  // Registra una nueva cita
  formularioReserva.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (!formularioReserva.checkValidity()) {
      formularioReserva.reportValidity();
      return;
    }

    const nuevaCita = obtenerDatosFormulario();

    const errorFechaHora = validarFechaHoraCita(
      nuevaCita.fecha,
      nuevaCita.hora,
    );

    if (errorFechaHora) {
      mostrarMensaje(errorFechaHora, "danger");
      return;
    }

    if (horarioEstaOcupado(nuevaCita)) {
      mostrarMensaje(
        "Ya existe una cita registrada para esa fecha y hora.",
        "warning",
      );
      return;
    }

    const citasActualizadas = [...citas, nuevaCita];

    if (!guardarCitas(citasActualizadas)) {
      mostrarMensaje(
        "No fue posible guardar la cita. Inténtalo de nuevo; tus datos siguen en el formulario.",
        "danger",
      );
      return;
    }

    citas = citasActualizadas;

    renderizarCitas();
    formularioReserva.reset();

    mostrarMensaje("La cita fue registrada correctamente.", "success");
  });

  // Oculta mensajes anteriores cuando el usuario limpia el formulario
  formularioReserva.addEventListener("reset", () => {
    ocultarMensaje();
  });

  // Gestiona la cancelación de citas mediante delegación de eventos
  listaCitas.addEventListener("click", (evento) => {
    const botonReprogramar = evento.target.closest(
      '[data-accion="reprogramar"]',
    );

    if (botonReprogramar) {
      abrirFormularioReprogramacion(Number(botonReprogramar.dataset.id));
      return;
    }

    const botonCancelar = evento.target.closest(
      '[data-accion="cancelar"]',
    );

    if (!botonCancelar) {
      return;
    }

    const deseaCancelar = window.confirm(
      "¿Estás seguro de que deseas cancelar esta cita?",
    );

    if (!deseaCancelar) {
      return;
    }

    const citaId = Number(botonCancelar.dataset.id);
    const citasActualizadas = citas.filter((cita) => cita.id !== citaId);

    if (!guardarCitas(citasActualizadas)) {
      mostrarMensajeCitas(
        "No se pudo guardar la cancelación. La cita sigue en tu agenda; inténtalo de nuevo.",
      );
      return;
    }

    citas = citasActualizadas;

    if (citaIdEnEdicion === citaId) {
      cerrarFormularioReprogramacion();
    }

    ocultarMensajeCitas();
    renderizarCitas();
  });

  botonCerrarReprogramacion.addEventListener(
    "click",
    cerrarFormularioReprogramacion,
  );
  botonCancelarReprogramacion.addEventListener(
    "click",
    cerrarFormularioReprogramacion,
  );
  formularioReprogramacion.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (!formularioReprogramacion.checkValidity()) {
      formularioReprogramacion.reportValidity();
      return;
    }

    if (citaIdEnEdicion === null) {
      return;
    }

    const citaOriginal = citas.find(
      (cita) => cita.id === citaIdEnEdicion,
    );

    if (!citaOriginal) {
      mostrarMensajeCitas("No se encontró la cita que intentas reprogramar.");
      return;
    }

    const citaActualizada = {
      ...citaOriginal,
      fecha: fechaReprogramacion.value,
      hora: horaReprogramacion.value,
      horaTexto: obtenerTextoHora(horaReprogramacion.value),
    };
    const errorFechaHora = validarFechaHoraCita(
      citaActualizada.fecha,
      citaActualizada.hora,
    );

    if (errorFechaHora) {
      mostrarMensajeCitas(errorFechaHora);
      return;
    }

    if (horarioEstaOcupado(citaActualizada, citaIdEnEdicion)) {
      mostrarMensajeCitas(
        "Ya existe una cita registrada para esa fecha y hora.",
        "warning",
      );
      return;
    }

    const citasActualizadas = citas.map((cita) =>
      cita.id === citaIdEnEdicion ? citaActualizada : cita,
    );

    if (!guardarCitas(citasActualizadas)) {
      mostrarMensajeCitas(
        "No fue posible guardar la reprogramación. La cita original sigue vigente; inténtalo de nuevo.",
      );
      return;
    }

    citas = citasActualizadas;
    cerrarFormularioReprogramacion();
    renderizarCitas();
    mostrarMensajeCitas("La cita fue reprogramada correctamente.", "success");
  });

  // Obtiene y organiza los datos escritos en el formulario
  function obtenerDatosFormulario() {
    const horaSeleccionada =
      horaReserva.options[horaReserva.selectedIndex].textContent;

    return {
      id: Date.now(),
      nombre: nombreCliente.value.trim(),
      telefono: telefonoCliente.value.trim(),
      correo: correoCliente.value.trim(),
      servicio: servicioReserva.value,
      precio: preciosServicios[servicioReserva.value],
      fecha: fechaReserva.value,
      hora: horaReserva.value,
      horaTexto: horaSeleccionada,
      notas: notasReserva.value.trim(),
    };
  }

  // Comprueba si ya existe una reserva en el mismo horario
  function horarioEstaOcupado(nuevaCita, citaIdExcluida = null) {
    return citas.some(
      (cita) =>
        (citaIdExcluida === null || cita.id !== citaIdExcluida) &&
        cita.fecha === nuevaCita.fecha &&
        cita.hora === nuevaCita.hora,
    );
  }

  // Aplica las validaciones de fecha y momento usadas al crear una cita
  function validarFechaHoraCita(fecha, hora) {
    if (fecha < obtenerFechaActual()) {
      return "La fecha de la cita no puede ser anterior al día actual.";
    }

    if (obtenerMomentoReserva({ fecha, hora }) <= new Date()) {
      return "La fecha y hora de la cita deben ser posteriores al momento actual.";
    }

    return null;
  }

  // Formatea la hora para que la tarjeta conserve el estilo de la agenda
  function obtenerTextoHora(hora) {
    const opcionExistente = Array.from(horaReserva.options).find(
      (opcion) => opcion.value === hora,
    );

    if (opcionExistente) {
      return opcionExistente.textContent.trim();
    }

    const [horas, minutos] = hora.split(":").map(Number);
    const horaDoceHoras = horas % 12 || 12;
    const periodo = horas < 12 ? "a. m." : horas === 12 ? "m." : "p. m.";

    return `${horaDoceHoras}:${String(minutos).padStart(2, "0")} ${periodo}`;
  }

  // Abre el formulario independiente con la fecha y hora actuales de la cita
  function abrirFormularioReprogramacion(citaId) {
    const cita = citas.find((citaRegistrada) => citaRegistrada.id === citaId);

    if (!cita) {
      return;
    }

    citaIdEnEdicion = cita.id;
    formularioReprogramacion.dataset.citaId = String(cita.id);
    fechaReprogramacion.value = cita.fecha;
    horaReprogramacion.value = cita.hora;
    panelReprogramacion.classList.remove("d-none");
    panelReprogramacion.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Cierra la edición sin cambiar la cita
  function cerrarFormularioReprogramacion() {
    citaIdEnEdicion = null;
    delete formularioReprogramacion.dataset.citaId;
    fechaReprogramacion.value = "";
    horaReprogramacion.value = "";
    panelReprogramacion.classList.add("d-none");
  }

  // Interpreta la fecha y la hora como un momento local del navegador
  function obtenerMomentoReserva(cita) {
    const [anio, mes, dia] = cita.fecha.split("-").map(Number);
    const [hora, minuto] = cita.hora.split(":").map(Number);

    return new Date(anio, mes - 1, dia, hora, minuto);
  }

  // Deshabilita las horas que ya pasaron cuando la fecha elegida es hoy
  function actualizarHorasDisponibles() {
    const ahora = new Date();
    const fechaEsHoy = fechaReserva.value === obtenerFechaActual(ahora);
    const horaSeleccionada = horaReserva.value;

    Array.from(horaReserva.options).forEach((opcion) => {
      if (!opcion.value) {
        return;
      }

      opcion.disabled =
        fechaEsHoy &&
        obtenerMomentoReserva({
          fecha: fechaReserva.value,
          hora: opcion.value,
        }) <= ahora;
    });

    const seleccionDeshabilitada = Array.from(horaReserva.options).some(
      (opcion) => opcion.value === horaSeleccionada && opcion.disabled,
    );

    if (horaSeleccionada && seleccionDeshabilitada) {
      horaReserva.value = "";
    }
  }

  // Actualiza las tarjetas, el contador y el estado vacío
  function renderizarCitas() {
    listaCitas.innerHTML = "";

    actualizarContador();
    actualizarEstadoVacio();

    citas.forEach((cita) => {
      const tarjetaCita = crearTarjetaCita(cita);
      listaCitas.appendChild(tarjetaCita);
    });
  }

  // Crea la tarjeta visual de una cita
  function crearTarjetaCita(cita) {
    const columna = document.createElement("div");

    columna.className = "col-md-6 col-xl-4";

    columna.innerHTML = `
      <article class="card h-100 border-0 shadow-sm">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between gap-3 mb-4">
            <div>
              <p class="text-body-secondary small mb-1">
                Servicio reservado
              </p>

              <h3 class="h5 fw-bold mb-0" data-campo="servicio"></h3>
            </div>

            <span class="badge text-bg-success align-self-start">
              Confirmada
            </span>
          </div>

          <ul class="list-group list-group-flush mb-4">
            <li class="list-group-item px-0">
              <span class="d-block text-body-secondary small">
                Cliente
              </span>
              <strong data-campo="nombre"></strong>
            </li>

            <li
              class="list-group-item px-0 d-flex justify-content-between gap-3"
            >
              <div>
                <span class="d-block text-body-secondary small">
                  Fecha
                </span>
                <strong data-campo="fecha"></strong>
              </div>

              <div class="text-end">
                <span class="d-block text-body-secondary small">
                  Hora
                </span>
                <strong data-campo="hora"></strong>
              </div>
            </li>

            <li class="list-group-item px-0">
              <span class="d-block text-body-secondary small">
                Contacto
              </span>
              <span data-campo="telefono"></span>
              <span class="text-body-secondary">·</span>
              <span data-campo="correo"></span>
            </li>

            <li
              class="list-group-item px-0 d-flex justify-content-between"
            >
              <span class="text-body-secondary">Valor</span>
              <strong class="text-primary" data-campo="precio"></strong>
            </li>
          </ul>

          <div
            class="alert alert-secondary py-2"
            data-contenedor="notas"
          >
            <small>
              <strong>Indicaciones:</strong>
              <span data-campo="notas"></span>
            </small>
          </div>

          <div class="d-grid gap-2">
            <button
              class="btn btn-outline-primary"
              type="button"
              data-accion="reprogramar"
              data-id="${cita.id}"
            >
              Reprogramar
            </button>

            <button
              class="btn btn-outline-danger"
              type="button"
              data-accion="cancelar"
              data-id="${cita.id}"
            >
              Cancelar cita
            </button>
          </div>
        </div>
      </article>
    `;

    // Los valores del usuario se agregan con textContent
    columna.querySelector('[data-campo="servicio"]').textContent =
      cita.servicio;

    columna.querySelector('[data-campo="nombre"]').textContent =
      cita.nombre;

    columna.querySelector('[data-campo="fecha"]').textContent =
      formatearFecha(cita.fecha);

    columna.querySelector('[data-campo="hora"]').textContent =
      cita.horaTexto;

    columna.querySelector('[data-campo="telefono"]').textContent =
      cita.telefono;

    columna.querySelector('[data-campo="correo"]').textContent =
      cita.correo;

    columna.querySelector('[data-campo="precio"]').textContent =
      formatearPrecio(cita.precio);

    const contenedorNotas = columna.querySelector(
      '[data-contenedor="notas"]',
    );

    if (cita.notas) {
      columna.querySelector('[data-campo="notas"]').textContent =
        cita.notas;
    } else {
      contenedorNotas.classList.add("d-none");
    }

    return columna;
  }

  // Muestra u oculta el mensaje de agenda vacía
  function actualizarEstadoVacio() {
    const existenCitas = citas.length > 0;

    estadoVacio.classList.toggle("d-none", existenCitas);
  }

  // Actualiza la cantidad de citas registradas
  function actualizarContador() {
    const cantidad = citas.length;
    const textoCitas = cantidad === 1 ? "cita" : "citas";

    contadorCitas.textContent = `${cantidad} ${textoCitas}`;
  }

  // Presenta la fecha con un formato fácil de leer
  function formatearFecha(fecha) {
    const fechaLocal = new Date(`${fecha}T00:00:00`);

    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(fechaLocal);
  }

  // Presenta el precio en pesos colombianos
  function formatearPrecio(precio) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(precio);
  }

  // Obtiene la fecha local en formato YYYY-MM-DD
  function obtenerFechaActual(hoy = new Date()) {
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }

  // Muestra mensajes de éxito, advertencia o error
  function mostrarMensaje(texto, tipo) {
    mensajeReserva.textContent = texto;
    mensajeReserva.className = `alert alert-${tipo} mb-0`;
  }

  function ocultarMensaje() {
    mensajeReserva.textContent = "";
    mensajeReserva.className = "alert d-none mb-0";
  }

  function mostrarMensajeCitas(texto, tipo = "danger") {
    mensajeCitas.textContent = texto;
    mensajeCitas.className = `alert alert-${tipo} mb-4`;
  }

  function ocultarMensajeCitas() {
    mensajeCitas.textContent = "";
    mensajeCitas.className = "alert alert-danger mb-4 d-none";
  }

  // Guarda el arreglo de citas convertido a formato JSON
  function guardarCitas(citasAGuardar = citas) {
    try {
      const citasEnJSON = JSON.stringify(citasAGuardar);
      localStorage.setItem(CLAVE_ALMACENAMIENTO, citasEnJSON);
      return true;
    } catch (error) {
      console.error("No fue posible guardar las citas.", error);
      return false;
    }
  }

  // Recupera las citas guardadas al cargar la página
  function cargarCitas() {
    try {
      const citasGuardadas = localStorage.getItem(CLAVE_ALMACENAMIENTO);

      if (!citasGuardadas) {
        return [];
      }

      const citasConvertidas = JSON.parse(citasGuardadas);

      return Array.isArray(citasConvertidas) ? citasConvertidas : [];
    } catch (error) {
      console.error("No fue posible recuperar las citas.", error);
      localStorage.removeItem(CLAVE_ALMACENAMIENTO);

      return [];
    }
  }

  // Estado inicial de la sección de citas
  renderizarCitas();
});
