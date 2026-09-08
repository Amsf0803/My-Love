/**
 * "Universo": escena 3D construida con Three.js.
 *
 * - Una estrella emisiva en el centro, con un halo de brillo.
 * - Un texto 3D flotante ("Tú eres mi universo") que siempre mira a la
 *   cámara, renderizado como textura de canvas sobre un plano.
 * - Los archivos multimedia (fotos y VIDEOS) se posicionan matemáticamente
 *   formando un espiral ascendente que orbita alrededor de la estrella.
 * - OrbitControls para rotar y hacer zoom.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Ahora recibimos objetos con { ruta, tipo }
const mediaItems = window.MEDIA_ITEMS || [];

const canvas = document.getElementById("universo-canvas");
const loadingOverlay = document.getElementById("universo-loading");

// --- Escena, cámara y renderer -------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060f, 0.028);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 22;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.target.set(0, 0.6, 0);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Fondo de estrellas lejanas (Multicapa y Brillantes) -------------------

// 1. Creamos una textura circular difuminada
function crearTexturaEstrella() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

const texturaEstrella = crearTexturaEstrella();

function crearCampoDeEstrellas(cantidad, radio, colorHex, tamaño) {
  const posiciones = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) {
    const r = radio * (0.2 + Math.random() * 0.8);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    posiciones[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    posiciones[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    posiciones[i * 3 + 2] = r * Math.cos(phi);
  }
  
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  
  const material = new THREE.PointsMaterial({
    color: colorHex,
    size: tamaño,
    map: texturaEstrella,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  
  return new THREE.Points(geometria, material);
}

const fondoEstrellas = new THREE.Group();
fondoEstrellas.add(crearCampoDeEstrellas(2500, 90, 0xffffff, 0.3));
fondoEstrellas.add(crearCampoDeEstrellas(1000, 70, 0x8ab4f8, 0.6));
fondoEstrellas.add(crearCampoDeEstrellas(350, 50, 0xeab654, 1.2));
scene.add(fondoEstrellas);


// --- Estrella central emisiva ----------------------------------------------
const grupoEstrella = new THREE.Group();

const estrella = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xeab654 })
);
grupoEstrella.add(estrella);

function crearTexturaHalo() {
  const tam = 256;
  const lienzo = document.createElement("canvas");
  lienzo.width = tam;
  lienzo.height = tam;
  const ctx = lienzo.getContext("2d");
  const gradiente = ctx.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  gradiente.addColorStop(0, "rgba(255, 226, 160, 0.9)");
  gradiente.addColorStop(0.4, "rgba(234, 182, 84, 0.35)");
  gradiente.addColorStop(1, "rgba(234, 182, 84, 0)");
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, tam, tam);
  return new THREE.CanvasTexture(lienzo);
}

const halo = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: crearTexturaHalo(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  })
);
halo.scale.set(4.5, 4.5, 1);
grupoEstrella.add(halo);

const luzEstrella = new THREE.PointLight(0xeab654, 6, 25, 2);
grupoEstrella.add(luzEstrella);

scene.add(grupoEstrella);
scene.add(new THREE.AmbientLight(0x30264f, 1.1));


// --- Texto 3D flotante: "Tú eres mi universo" -------------------------------
function crearTextoFlotante(texto, { colorTexto = "#f4f2ee", tamañoFuente = 64 } = {}) {
  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d");
  lienzo.width = 1024;
  lienzo.height = 256;

  ctx.font = `italic 500 ${tamañoFuente}px "Fraunces", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = "rgba(234, 182, 84, 0.85)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = colorTexto;
  ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2);
  ctx.shadowBlur = 10;
  ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2);

  const textura = new THREE.CanvasTexture(lienzo);
  textura.minFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    depthWrite: false,
  });
  const geometria = new THREE.PlaneGeometry(6, 1.5);
  return new THREE.Mesh(geometria, material);
}

const textoFlotante = crearTextoFlotante("Tú eres mi universo");
textoFlotante.position.set(0, 2.6, 0);
scene.add(textoFlotante);


// --- Archivos multimedia en espiral (Formación de Galaxia) -------------------
const grupoFotos = new THREE.Group();
scene.add(grupoFotos);

const ANGULO_DORADO = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
const RADIO_BASE = 3.5;
const ESPACIADO = 1.3;

function posicionarEnGalaxia(indice) {
  const angulo = indice * ANGULO_DORADO;
  const radio = RADIO_BASE + Math.sqrt(indice) * ESPACIADO;
  const y = (Math.random() - 0.5) * 1.8;

  return {
    x: radio * Math.cos(angulo),
    y: y,
    z: radio * Math.sin(angulo),
  };
}

const cargadorTexturas = new THREE.TextureLoader();

function crearMarcoMedia(item, indice) {
  const grupo = new THREE.Group();
  const { x, y, z } = posicionarEnGalaxia(indice);
  
  grupo.position.set(x, y, z);
  grupo.lookAt(0, y, 0);
  grupo.rotateY(Math.PI);
  grupo.rotateX((Math.random() - 0.5) * 0.3);
  grupo.rotateZ((Math.random() - 0.5) * 0.1);

  // Marco dorado
  const marco = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 1.34),
    new THREE.MeshBasicMaterial({ color: 0xeab654 })
  );
  marco.position.z = -0.02;
  grupo.add(marco);

  // Placeholder oscuro para el contenido
  const foto = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshBasicMaterial({ color: 0x1c1e3d, side: THREE.DoubleSide })
  );
  grupo.add(foto);

  if (item.tipo === "video") {
    // Es un video: crear elemento, configurarlo para autoplay y extraer VideoTexture
    const videoElement = document.createElement("video");
    videoElement.src = item.ruta;
    videoElement.muted = true; // Obligatorio para autoplay
    videoElement.loop = true;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.setAttribute("playsinline", "");
    videoElement.crossOrigin = "anonymous";
    
    // Iniciar reproducción
    videoElement.play().catch(e => console.warn("Autoplay bloqueado:", e));

    const texturaVideo = new THREE.VideoTexture(videoElement);
    texturaVideo.minFilter = THREE.LinearFilter;
    texturaVideo.magFilter = THREE.LinearFilter;
    
    // Esperar a que cargue la metadata para saber la resolución del video
    videoElement.addEventListener("loadedmetadata", () => {
      const aspecto = videoElement.videoWidth / videoElement.videoHeight;
      if (aspecto >= 1) {
        foto.scale.set(1, 1 / aspecto, 1);
      } else {
        foto.scale.set(aspecto, 1, 1);
      }
    });

    foto.material.map = texturaVideo;
    foto.material.color.set(0xffffff);
    foto.material.needsUpdate = true;
    
  } else {
    // Es una imagen: cargar textura normal
    cargadorTexturas.load(
      item.ruta,
      (textura) => {
        const aspecto = textura.image.width / textura.image.height;
        if (aspecto >= 1) {
          foto.scale.set(1, 1 / aspecto, 1);
        } else {
          foto.scale.set(aspecto, 1, 1);
        }
        foto.material.map = textura;
        foto.material.color.set(0xffffff);
        foto.material.needsUpdate = true;
      },
      undefined,
      () => {
        foto.material.color.set(0x2a2c52); // color de error
      }
    );
  }

  return grupo;
}


if (mediaItems.length > 0) {
  mediaItems.forEach((item, indice) => {
    grupoFotos.add(crearMarcoMedia(item, indice));
  });
} else {
  const invitacion = crearTextoFlotante("Sube fotos desde el calendario", {
    colorTexto: "#a6a3c4",
    tamañoFuente: 40,
  });
  invitacion.position.set(0, 1.5, 0);
  invitacion.scale.set(0.6, 0.6, 0.6);
  scene.add(invitacion);
}

// --- Animación ---------------------------------------------------------
const relojInterno = new THREE.Clock();

function animar() {
  requestAnimationFrame(animar);
  const t = relojInterno.getElapsedTime();

  fondoEstrellas.rotation.y = t * 0.01;
  fondoEstrellas.rotation.z = t * 0.005;

  estrella.rotation.y = t * 0.15;
  halo.material.rotation = t * 0.05;

  textoFlotante.position.y = 2.6 + Math.sin(t * 0.8) * 0.12;
  textoFlotante.quaternion.copy(camera.quaternion);

  grupoFotos.rotation.y = t * 0.03;

  controls.update();
  renderer.render(scene, camera);
}

animar();

requestAnimationFrame(() => {
  setTimeout(() => loadingOverlay.classList.add("is-hidden"), 350);
});
