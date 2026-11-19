// ============================================================
// PRÉDIO 3D — recursos compartilhados (materiais, geometrias, "lote")
//
// Por que existe: criar uma geometria/material por peça gera milhares de objetos
// e centenas de chamadas de desenho. Aqui:
//   • materiais e geometrias comuns são criados UMA vez e reutilizados;
//   • o Lote funde todas as caixas estáticas de mesmo material numa só malha.
// ============================================================
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { STATUS, SELECAO } from "./config.js";

export const M = (color, opcoes = {}) => new THREE.MeshStandardMaterial({ color, roughness: .75, metalness: 0, ...opcoes });

// ---------- materiais (únicos e compartilhados) ----------
export const mat = {
  // transparentes: opacidade controlada pelo modo de visualização
  parede: M(0xf6f7fb, { transparent: true, opacity: .16, depthWrite: false }),
  fachada: M(0xe6e9f1, { transparent: true, opacity: 1 }),
  vidro: M(0x7fb8ff, { transparent: true, opacity: .1, depthWrite: false, roughness: .05, metalness: .25 }),
  // estrutura
  estrutura: M(0x3a4254, { roughness: .6 }), laje: M(0xc4c9d6, { roughness: .9 }), corredor: M(0xe3e7f1),
  fundacao: M(0x8b93a6, { roughness: 1 }), telhado: M(0xaab1c2, { roughness: .95 }),
  // entorno
  praca: M(0xdfe3ea, { roughness: 1 }), caminho: M(0xcbd1de, { roughness: 1 }), poste: M(0x4b5368),
  luz: M(0xfff0c0, { emissive: 0xffe3a0, emissiveIntensity: .2 }),
  tronco: M(0x7a5a3a, { roughness: 1 }),
  folhas: [0x4e9f5f, 0x5fb06f, 0x3f8a52, 0x6aa84f].map((c) => M(c, { roughness: .9, flatShading: true })),   // low-poly
  faixa: M(0x1a4be0, { roughness: .5 }),                                   // faixa de identidade entre os andares
  solar: M(0x1d2b5a, { roughness: .25, metalness: .6 }),                   // painéis solares no telhado
  // mobília e detalhes
  madeira: M(0xb98b5e), mesa: M(0xeadbc4, { roughness: .6 }), cadeira: M(0x4a64a8), quadro: M(0x24493a),
  metal: M(0x9aa3b5, { roughness: .35, metalness: .7 }), moldura: M(0xd9dde6, { roughness: .5 }),
  tela: M(0x1b2336, { emissive: 0x2c6cff, emissiveIntensity: .85 }), assento: M(0xb23a48),
  estante: M(0x8a6040), palco: M(0x6e4b33), vaso: M(0xc8b39a, { roughness: .8 }),
  planta: M(0x4aa35f, { flatShading: true }), livros: [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60].map((c) => M(c)),
  elev: M(0x55607a, { metalness: .4 }), elevLuz: M(0xaecbff, { emissive: 0x4a7dd8, emissiveIntensity: .4 }),
  oculto: new THREE.MeshBasicMaterial({ visible: false }),
};

/** Piso da sala conforme o estado: 3 materiais para todas as salas. O brilho próprio evita que sombra/ACES "lavem" a cor. */
export const matStatus = Object.fromEntries(
  Object.entries(STATUS).map(([chave, s]) => [chave, M(s.hex, { roughness: .55, emissive: s.hex, emissiveIntensity: .3 })])
);
export const COR_STATUS = Object.fromEntries(Object.entries(STATUS).map(([chave, s]) => [chave, new THREE.Color(s.hex)]));
/** Anel da sala selecionada: mantém a cor de status visível por dentro. */
export const matSelecao = new THREE.MeshBasicMaterial({ color: SELECAO.hex, transparent: true, opacity: .8, depthWrite: false });

// ---------- geometrias em cache ----------
const caixas = new Map();
/** BoxGeometry reutilizada por dimensões. */
export function geoCaixa(w, h, d) {
  const chave = `${w}|${h}|${d}`;
  let g = caixas.get(chave);
  if (!g) caixas.set(chave, (g = new THREE.BoxGeometry(w, h, d)));
  return g;
}

const arestas = new Map();
/** Contorno (linhas) de uma caixa, em cache. */
export function geoArestas(w, h, d) {
  const chave = `${w}|${h}|${d}`;
  let g = arestas.get(chave);
  if (!g) arestas.set(chave, (g = new THREE.EdgesGeometry(geoCaixa(w, h, d))));
  return g;
}

const matArestas = new Map();
/** Material de linha por cor de módulo (compartilhado). */
export function matAresta(cor) {
  let m = matArestas.get(cor);
  if (!m) matArestas.set(cor, (m = new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: .85 })));
  return m;
}
export function definirOpacidadeArestas(v) { for (const m of matArestas.values()) m.opacity = v; }

export const geo = {
  tronco: new THREE.CylinderGeometry(.12, .16, 1, 8).translate(0, .5, 0),
  copaBaixa: new THREE.ConeGeometry(.9, 1.6, 9).translate(0, 1.7, 0),
  copaAlta: new THREE.ConeGeometry(.7, 1.3, 9).translate(0, 2.5, 0),
  poste: new THREE.CylinderGeometry(.06, .08, 2.6, 8).translate(0, 1.3, 0),
  lampada: new THREE.SphereGeometry(.2, 12, 10).translate(0, 2.7, 0),
  tanque: new THREE.CylinderGeometry(.8, .8, 1.3, 20),
  // árvores frondosas e arbustos (esferas de poucos lados = visual low-poly; todas indexadas para fundir no Lote)
  troncoAlto: new THREE.CylinderGeometry(.13, .19, 1.8, 7).translate(0, .9, 0),
  copaRedonda: new THREE.SphereGeometry(1.15, 7, 5).scale(1, .85, 1).translate(0, 2.3, 0),
  copaTopo: new THREE.SphereGeometry(.75, 6, 4).translate(.35, 3.0, .2),
  arbusto: new THREE.SphereGeometry(.55, 6, 4).scale(1, .7, 1).translate(0, .3, 0),
  folhagemVaso: new THREE.SphereGeometry(.38, 6, 4).translate(0, .85, 0),
};

// ---------- Lote: funde geometrias estáticas por material ----------
const SOMBRA = { sombra: true, recebe: true };
export const OPC = {
  casco: SOMBRA,                                   // estrutura: projeta e recebe sombra
  mobilia: { sombra: false, recebe: true },        // móveis: só recebem
  translucido: { sombra: false, recebe: false },   // paredes/vidro: sem sombra
};

export class Lote {
  constructor() { this.grupos = new Map(); }

  /** Adiciona uma cópia da geometria já transformada por `matriz`. */
  add(geometria, material, matriz, opcoes = OPC.mobilia) {
    const chave = `${material.uuid}|${opcoes.sombra}|${opcoes.recebe}`;
    let grupo = this.grupos.get(chave);
    if (!grupo) this.grupos.set(chave, (grupo = { material, opcoes, geos: [] }));
    grupo.geos.push(geometria.clone().applyMatrix4(matriz));
  }

  /** Cria uma malha por material dentro de `pai` e esvazia o lote. */
  construir(pai) {
    for (const { material, opcoes, geos } of this.grupos.values()) {
      const fundida = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!fundida) throw new Error("Falha ao fundir geometrias (atributos incompatíveis).");
      if (geos.length > 1) geos.forEach((g) => g.dispose());
      const linha = material.isLineBasicMaterial;
      const obj = linha ? new THREE.LineSegments(fundida, material) : new THREE.Mesh(fundida, material);
      obj.castShadow = opcoes.sombra;
      obj.receiveShadow = opcoes.recebe && !linha;
      obj.userData.fundida = true;          // geometria própria: precisa de dispose ao descartar
      pai.add(obj);
    }
    this.grupos.clear();
  }
}

/** Atalho para desenhar caixas num Lote a partir de um sistema de coordenadas local. */
export class Pincel {
  constructor(lote, base = new THREE.Matrix4()) { this.lote = lote; this.base = base; }

  caixa(w, h, d, material, x, y, z, opcoes) {
    const m = new THREE.Matrix4().makeTranslation(x, y, z).premultiply(this.base);
    this.lote.add(geoCaixa(w, h, d), material, m, opcoes);
  }

  /** Qualquer geometria, com matriz local (posição/escala). */
  forma(geometria, material, matrizLocal, opcoes) {
    this.lote.add(geometria, material, matrizLocal.clone().premultiply(this.base), opcoes);
  }
}

/** Matriz de translação + rotação em Y (posição de uma sala/lado dentro do andar). */
export const matrizPosRot = (x, z, rotY = 0) => new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
