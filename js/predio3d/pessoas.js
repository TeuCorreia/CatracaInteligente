// ============================================================
// PRÉDIO 3D — pessoas (alunos/professores) com geometrias e materiais compartilhados
// Cada pessoa tem pernas com sapatos, tronco, braços com mãos, pescoço, cabeça,
// cabelo (curto ou comprido), olhos e, opcionalmente, mochila.
// ============================================================
import * as THREE from "three";
import { M } from "./recursos.js";

const G = {
  perna: new THREE.CapsuleGeometry(.05, .34, 3, 8).translate(0, -.22, 0),
  sapato: new THREE.BoxGeometry(.09, .05, .16).translate(0, -.44, .03),
  braco: new THREE.CapsuleGeometry(.038, .28, 3, 8).translate(0, -.17, 0),
  mao: new THREE.SphereGeometry(.042, 8, 6).translate(0, -.35, 0),
  torso: new THREE.CapsuleGeometry(.13, .26, 4, 12),
  pescoco: new THREE.CylinderGeometry(.04, .045, .06, 8),
  cabeca: new THREE.SphereGeometry(.1, 16, 12),
  cabeloCurto: new THREE.SphereGeometry(.106, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.1),
  cabeloLongo: new THREE.CapsuleGeometry(.1, .14, 3, 12).translate(0, -.06, -.025),
  olho: new THREE.SphereGeometry(.013, 6, 4),
  mochila: new THREE.BoxGeometry(.22, .26, .1),
};
const camisas = [0xe4572e, 0x29a19c, 0xf3a712, 0x5b7fe0, 0x3e8e7e, 0x4caf72, 0xd94f70, 0x2d3a5c].map((c) => M(c));
const calcas = [0x2b3350, 0x4a5568, 0x1f4e79, 0x5d4037].map((c) => M(c));
const peles = [0xf1c9a5, 0xd9a577, 0xa8704a, 0x7a4b30].map((c) => M(c, { roughness: .6 }));
const cabelos = [0x2a1c14, 0x5a3a22, 0x111111, 0xc9a45c].map((c) => M(c, { roughness: .9 }));
const sapato = M(0x1c1f26, { roughness: .5 });
const olho = new THREE.MeshBasicMaterial({ color: 0x111111 });
const mochilas = [0x37474f, 0xc62828, 0x1565c0].map((c) => M(c));

/** Cria uma pessoa; `i` escolhe de forma determinística roupa, pele e cabelo. */
export function criarPessoa(i, { mochila = false } = {}) {
  const g = new THREE.Group();
  const camisa = camisas[i % camisas.length], calca = calcas[(i * 5) % calcas.length];
  const pele = peles[i % peles.length], cabelo = cabelos[(i * 3) % cabelos.length];
  const parte = (geometria, material, x, y, z, sombra = true) => {
    const o = new THREE.Mesh(geometria, material);
    o.position.set(x, y, z); o.castShadow = sombra;
    return o;
  };
  const perna = (x) => { const o = parte(G.perna, calca, x, .5, 0); o.add(parte(G.sapato, sapato, 0, 0, 0)); return o; };
  const braco = (x) => { const o = parte(G.braco, camisa, x, .9, 0); o.add(parte(G.mao, pele, 0, 0, 0, false)); return o; };

  const pernaE = perna(-.07), pernaD = perna(.07), bracoE = braco(-.18), bracoD = braco(.18);
  g.add(pernaE, pernaD, bracoE, bracoD,
    parte(G.torso, camisa, 0, .72, 0),
    parte(G.pescoco, pele, 0, .97, 0, false),
    parte(G.cabeca, pele, 0, 1.08, 0),
    parte(i % 3 === 1 ? G.cabeloLongo : G.cabeloCurto, cabelo, 0, i % 3 === 1 ? 1.1 : 1.1, 0),
    parte(G.olho, olho, -.035, 1.09, .092, false),
    parte(G.olho, olho, .035, 1.09, .092, false));
  if (mochila) g.add(parte(G.mochila, mochilas[i % mochilas.length], 0, .76, -.18));
  g.scale.setScalar(1.15);
  return { g, pernaE, pernaD, bracoE, bracoD, fase: i * 1.7 };
}

/** Balanço de braços e pernas ao andar. */
export function balancar(p, t, amplitude = .7) {
  const s = Math.sin(t + p.fase) * amplitude;
  p.pernaE.rotation.x = s; p.pernaD.rotation.x = -s;
  p.bracoE.rotation.x = -s * .8; p.bracoD.rotation.x = s * .8;
}
