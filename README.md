<div align="center">

```text
   *       .        *       .         *        .       *
      .        _..._           .          *       .
   *        .-'     '-.      *      M I   U N I V E R S O
           /   .---.   \        Una cápsula del tiempo digital,
    .     |   /     \   |   .   interactiva y hecha a medida.
          |   \     /   |
   *       \   '---'   /        *       .         *
            '-._____.-'     .
   .       *        .       *         .        *       .
```

# ✨ Mi Universo

**Aplicación web full-stack privada diseñada como un espacio interactivo de recuerdos, cartas, fechas especiales y visualización 3D.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-Backend-0B0C1F?style=for-the-badge&logo=flask&logoColor=EAB654)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![HTML5 Canvas](https://img.shields.io/badge/3D_ASCII_Engine-Canvas_2D-EF9BB3?style=for-the-badge&logo=html5&logoColor=0B0C1F)](#motor-de-renderizado-3d-ascii)
[![Responsive](https://img.shields.io/badge/UI-Mobile_First-8F86E6?style=for-the-badge)](#arquitectura-visual)

</div>

---

## 🌌 Descripción General

**Mi Universo** combina una interfaz nocturna minimalista (*Starlight & Deep Space UI*) con un **motor propio de renderizado 3D en caracteres ASCII** escrito desde cero en JavaScript puro sobre HTML5 `<canvas>`, sin dependencias externas pesadas.

Cada sección de la plataforma transforma momentos, fotografías, videos y cartas en una experiencia visual dinámica: desde un **Universo 3D navegable**, hasta un **Calendario de recuerdos con portadas mensuales** y pantallas de bienvenida reactivas a fechas importantes.

---

## 🚀 Características Principales

### 🖥️ Motor de Renderizado 3D ASCII (`Zero-Dependency`)
Proyección matemática en perspectiva 3D por software con algoritmo de ordenamiento por profundidad (*Z-Buffer / Painter's Algorithm*) y mapeo dinámico de luminancia sobre la rampa de densidad `" .:-=+*#%@"`:

* **Árbol Navideño 3D (`1–31 de diciembre`):** Pino estructurado en 7 niveles escalonados de ramas, tronco texturizado, guirnalda helicoidal luminosa, esferas parpadeantes, estrella vertical de 5 puntas y nevada ambiental.
* **Corazón Volumétrico 3D (`Día 3 de cada mes`):** Generado mediante curvas paramétricas infladas en el eje $Z$, con ensamblado progresivo de abajo hacia arriba y cálculo automático en tiempo real de los **meses juntos**.
* **Encadenamiento Inteligente (`3 de diciembre`):** Ejecuta automáticamente la escena navideña seguida de una transición fluida hacia el corazón de aniversario mensual.
* **Transiciones Contextuales por Sección:**
  | Sección | Figura 3D ASCII | Detalle Visual |
  | :--- | :--- | :--- |
  | **Dashboard** | Astrolabio / Núcleo Orbital | Esfera central dorada con 3 anillos inclinados en rotación |
  | **Universo** | Galaxia Espiral (Vía Láctea) | Bulbo central luminoso y 4 brazos logarítmicos |
  | **Calendario** | Marco Polaroid 3D | Silueta de recuerdo enmarcada con destellos cálidos |
  | **Cartas** | Sobre con Sello de Lacre | Pliegues geométricos y corazón central carmesí |
  | **Jardín** | Rosa Multicapa 3D | Corola polar concéntrica con tallo y hojas |

---

### 📅 Calendario Interactivo y Galería Multimedia
* **Portadas Mensuales Personalizables:** Soporte para imágenes y videos en bucle (`MP4`, `WebM`, `MOV`) por cada mes con actualización asíncrona y control *anti-caché*.
* **Modal de Recuerdos de Doble Estado:**
  * *Modo Visualización:* Cuadrícula responsiva con reproductor Lightbox en pantalla completa y audio activado bajo demanda.
  * *Modo Edición:* Reordenamiento persistente de recuerdos, selección de miniatura principal del día y eliminación limpia de archivos en servidor.
* **Eventos Especiales Integrados:** Resaltado automático de aniversarios mensuales (día 3) y desbloqueo dinámico de sorpresa de cumpleaños (9 de noviembre).

### 🪐 Universo 3D, Cartas y Jardín
* **Universo 3D:** Escena espacial interactiva renderizada en Canvas 3D para explorar recuerdos en órbita.
* **Línea del Tiempo de Cartas:** Tarjetas diferenciadas por autor, adjuntos multimedia y pestañas de redacción rápida.
* **Contador en Tiempo Real & Acceso PIN:** Reloj vivo desglosado en años, meses, días, horas, minutos y segundos protegido por teclado numérico táctil de 4 dígitos.

---

## 🗂️ Arquitectura del Proyecto

```text
mi-universo/
├── app.py                      # Punto de entrada Flask, blueprints y rutas API
├── models/                     # Modelos de base de datos (recuerdos, cartas, portadas)
├── static/
│   ├── css/
│   │   └── style.css           # Sistema de diseño global, modales, lightbox y responsive
│   ├── js/
│   │   ├── splash_seasonal.js  # Motor 3D ASCII estacional y jerarquía de prioridades
│   │   ├── calendario.js       # Lógica asíncrona del calendario, lightbox y reordenamiento
│   │   ├── aniversario.js      # Lógica de aniversario mensual y contador de meses
│   │   └── starfield.js        # Fondo estelar ambiental persistente
│   └── uploads/                # Almacenamiento local de fotos, videos y portadas
└── templates/
    ├── base.html               # Layout raíz, navbar responsivo y carga de scripts
    ├── dashboard.html          # Vista principal con contador en vivo
    ├── calendario.html         # Cuadrícula mensual, modal de doble estado y lightbox
    ├── cartas.html             # Timeline de cartas y formularios
    ├── universo.html           # Canvas 3D inmersivo
    └── jardin.html             # Colección floral y regalos especiales
```

---

## ⚙️ Instalación y Despliegue Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/mi-universo.git](https://github.com/tu-usuario/mi-universo.git)
   cd mi-universo
   ```

2. **Crear y activar entorno virtual:**
   ```bash
   python -m venv venv
   source venv/bin/activate        # Linux / macOS
   # venv\Scripts\activate         # Windows
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   flask run --debug
   ```
   La aplicación estará disponible en `http://127.0.0.1:5000`.

---

## 🧪 Parámetros URL de Previsualización (Debug / Testing)

Para probar cualquier animación 3D ASCII sin esperar a una fecha específica ni limpiar `sessionStorage`, añade cualquiera de los siguientes parámetros a la URL:

| Parámetro URL | Efecto |
| :--- | :--- |
| `/?navidad=1` | Fuerza la escena del **Árbol de Navidad 3D ASCII** |
| `/?aniversario=1` | Fuerza el **Corazón 3D ASCII** (y lo encadena tras el árbol si es diciembre) |
| `/?loader=dashboard` | Previsualiza el **Astrolabio Orbital 3D** |
| `/?loader=universo` | Previsualiza la **Galaxia Espiral 3D** |
| `/?loader=calendario` | Previsualiza el **Marco Polaroid 3D** |
| `/?loader=cartas` | Previsualiza el **Sobre de Carta 3D** |
| `/?loader=jardin` | Previsualiza la **Flor 3D** |

---

<div align="center">

Hecho con código, matemáticas 3D y mucho cariño ✨

</div>
