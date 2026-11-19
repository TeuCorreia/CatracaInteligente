// ============================================================
// PRÉDIO 3D — cena base: renderizador, câmera, luzes, chão, céu e tema
// ============================================================
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { mat } from "./recursos.js";

const CEU = { claro: ["#86b4ec", "#eaf3fc"], escuro: ["#060a16", "#1b2744"] };

function texturaCeu(topo, base) {
  const canvas = document.createElement("canvas");
  canvas.width = 2; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topo); grad.addColorStop(1, base);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function criarCena(contenedor, elementoRotulos) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const toque = matchMedia("(pointer: coarse)").matches;   // celular/tablet: menos pixels e sombra menor (GPU fraca, bateria)
  renderer.setPixelRatio(Math.min(devicePixelRatio, toque ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  contenedor.appendChild(renderer.domElement);
  const rotulos = new CSS2DRenderer({ element: elementoRotulos });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
  camera.position.set(40, 28, 46);

  const controles = new OrbitControls(camera, renderer.domElement);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.08, maxPolarAngle: Math.PI / 2.05, minDistance: 4, maxDistance: 140, autoRotateSpeed: 0.7 });

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa0bd, 1.0);
  const sol = new THREE.DirectionalLight(0xfff3df, 2.1);
  sol.position.set(18, 30, 16);
  sol.castShadow = true;
  sol.shadow.mapSize.setScalar(toque ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { near: 1, far: 140 });
  sol.shadow.bias = -0.0004; sol.shadow.radius = 4;
  scene.add(hemi, sol, sol.target);

  const chao = new THREE.Mesh(new THREE.CircleGeometry(400, 90), new THREE.MeshStandardMaterial({ color: 0xcfe3cf, roughness: 1 }));
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.62; chao.receiveShadow = true;
  scene.add(chao);

  // deslocamento vertical da imagem (setViewOffset): rótulos e cliques continuam certos, pois usam a mesma projeção
  let desloc = 0, deslocAlvo = 0;
  function aplicarDeslocamento() {
    const w = innerWidth, h = innerHeight;
    if (desloc) camera.setViewOffset(w, h, 0, desloc, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  return {
    renderer, rotulos, scene, camera, controles,

    /** Ajusta sol, sombra e limite de zoom ao tamanho do prédio (inclusive a altura). */
    ajustarSombra(largura, profundidade, altura) {
      const ext = Math.max(largura, profundidade, altura) * 0.8 + 8;
      sol.position.set(largura * 0.7, altura + 24 + ext * 0.3, profundidade * 0.6 + 10);
      sol.target.position.set(0, altura / 2, 0);
      Object.assign(sol.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, far: (altura + 60 + ext) * 2 });
      sol.shadow.camera.updateProjectionMatrix();
      controles.maxDistance = Math.max(140, ext * 4);
    },

    /** Dia/noite: céu, luzes, chão e materiais que acendem à noite. */
    aplicarTema(escuro) {
      const [topo, base] = escuro ? CEU.escuro : CEU.claro;
      scene.background?.dispose();
      scene.background = texturaCeu(topo, base);
      scene.fog = new THREE.Fog(new THREE.Color(base), 80, 200);
      document.body.style.background = base;
      hemi.intensity = escuro ? 0.8 : 1.0; hemi.color.set(escuro ? 0x8aa0ff : 0xffffff);
      sol.intensity = escuro ? 0.9 : 2.1; sol.color.set(escuro ? 0x9db4ff : 0xfff3df);
      chao.material.color.set(escuro ? 0x15211b : 0xcfe3cf);
      mat.praca.color.set(escuro ? 0x2a3142 : 0xdfe3ea);
      mat.caminho.color.set(escuro ? 0x343c50 : 0xcbd1de);
      mat.tela.emissiveIntensity = escuro ? 1.6 : 0.85;
      mat.luz.emissiveIntensity = escuro ? 1.8 : 0.2;
      mat.vidro.emissive.set(escuro ? 0xffd98a : 0x000000);
      mat.vidro.emissiveIntensity = escuro ? 0.18 : 0;
      // detalhes: luminárias, faróis/lanternas e nuvens mudam com a noite
      mat.luzTeto.emissiveIntensity = escuro ? 1.5 : 0.25;
      mat.lanterna.emissiveIntensity = escuro ? 1.6 : 0.4;
      mat.antena.emissiveIntensity = escuro ? 2.2 : 0.8;
      mat.catraca.emissiveIntensity = escuro ? 1.6 : 0.9;
      mat.nuvem.color.set(escuro ? 0x2c3654 : 0xffffff);
    },

    redimensionar() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h); rotulos.setSize(w, h);
      camera.aspect = w / h;
      aplicarDeslocamento();
    },

    /** Sobe o centro da imagem `px` pixels (a gaveta do celular cobre a parte de baixo). Anima em desenhar(). */
    deslocarVista(px) { deslocAlvo = Math.round(px); },

    desenhar() {
      if (desloc !== deslocAlvo) {
        desloc = Math.abs(deslocAlvo - desloc) < 1 ? deslocAlvo : desloc + (deslocAlvo - desloc) * 0.18;
        aplicarDeslocamento();
      }
      controles.update(); renderer.render(scene, camera); rotulos.render(scene, camera);
    },
  };
}
