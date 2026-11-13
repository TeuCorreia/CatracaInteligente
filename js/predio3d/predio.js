// ============================================================
// PRÉDIO 3D — construção da geometria a partir da lista de salas
//
// Estrutura: um único prédio (fundação, andares empilhados, fachada de vidro,
// telhado, entrada). Cada andar tem um corredor central e salas dos dois lados,
// em ordem numérica. A largura do prédio cresce com a quantidade de salas do
// andar mais cheio; a altura cresce com a quantidade de andares.
//
// Desempenho: tudo que é estático é fundido em poucas malhas (Lote); só os
// pisos das salas, os volumes de status e as pessoas continuam individuais.
// ============================================================
import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RW, RD, COR, PAD, FH, WH, T, SALA_L, SALA_P, CORES_MODULO, porNumero } from "./config.js";
import { mat, matStatus, matSelecao, geo, geoCaixa, geoArestas, matAresta, Lote, Pincel, OPC, matrizPosRot } from "./recursos.js";
import { criarPessoa } from "./pessoas.js";
import { mobiliar } from "./mobilia.js";

const matriz = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

// ---------- fachada de um andar ----------
function fachada(lote, W, D) {
  const lado = (comprimento, x, z, rot) => {
    const p = new Pincel(lote, matrizPosRot(x, z, rot));
    p.caixa(comprimento, .9, .14, mat.fachada, 0, .45, 0, OPC.casco);               // peitoril
    p.caixa(comprimento, .4, .14, mat.fachada, 0, WH - .2, 0, OPC.casco);            // verga
    p.caixa(comprimento, WH - 1.3, .05, mat.vidro, 0, .9 + (WH - 1.3) / 2, 0, OPC.translucido);
    const vaos = Math.max(2, Math.round(comprimento / RW));
    for (let i = 0; i <= vaos; i++) p.caixa(.1, WH, .18, mat.estrutura, -comprimento / 2 + (comprimento / vaos) * i, WH / 2, 0, OPC.casco);
  };
  lado(W, 0, D / 2, 0); lado(W, 0, -D / 2, 0);
  lado(D, W / 2, 0, Math.PI / 2); lado(D, -W / 2, 0, Math.PI / 2);
  const cantos = new Pincel(lote);
  for (const a of [-1, 1]) for (const b of [-1, 1]) cantos.caixa(.34, WH, .34, mat.estrutura, a * W / 2, WH / 2, b * D / 2, OPC.casco);
}

function entrada(p, D) {
  p.caixa(4.4, .16, 2.2, mat.estrutura, 0, 2.75, D / 2 + 1.0, OPC.casco);          // marquise
  for (const x of [-1.9, 1.9]) p.caixa(.16, 2.7, .16, mat.estrutura, x, 1.35, D / 2 + 1.95, OPC.casco);
  p.caixa(4.6, .14, .6, mat.laje, 0, .07, D / 2 + .5, OPC.casco);                  // degraus
  p.caixa(4.2, .28, .55, mat.laje, 0, .14, D / 2 + 1.05, OPC.casco);
  // porta dupla de vidro com caixilho
  p.caixa(2.2, .12, .12, mat.estrutura, 0, 2.36, D / 2 + .04, OPC.casco);
  for (const x of [-1.05, 0, 1.05]) p.caixa(.08, 2.3, .12, mat.estrutura, x, 1.15, D / 2 + .04, OPC.casco);
  for (const x of [-.52, .52]) {
    p.caixa(.95, 2.2, .04, mat.vidro, x, 1.15, D / 2 + .04, OPC.translucido);
    p.caixa(.04, .5, .06, mat.metal, x + (x < 0 ? .38 : -.38), 1.1, D / 2 + .1, OPC.mobilia);   // puxadores
  }
}

// ---------- sala ----------
function criarSala(pred, fl, sala, { cx, cz, rot }, lotes) {
  const base = matrizPosRot(cx, cz, rot);
  const parede = new Pincel(lotes.paredes, base);
  const w = (x, y, z, ww, hh, dd) => parede.caixa(ww, hh, dd, mat.parede, x, y, z, OPC.translucido);
  const e = .1, porta = 1.1, trecho = (SALA_L - porta) / 2;
  w(-SALA_L / 2 + e / 2, WH / 2, 0, e, WH, SALA_P);
  w(SALA_L / 2 - e / 2, WH / 2, 0, e, WH, SALA_P);
  w(0, WH / 2, -SALA_P / 2 + e / 2, SALA_L, WH, e);
  w(-(porta / 2 + trecho / 2), WH / 2, SALA_P / 2 - e / 2, trecho, WH, e);
  w(porta / 2 + trecho / 2, WH / 2, SALA_P / 2 - e / 2, trecho, WH, e);
  w(0, WH - .45, SALA_P / 2 - e / 2, porta, .9, e);
  lotes.paredes.add(geoArestas(SALA_L, WH, SALA_P), matAresta(pred.corDe(sala.modulo)),
    matriz(0, WH / 2, 0).premultiply(base), OPC.translucido);                        // contorno colorido do módulo

  mobiliar(new Pincel(lotes.mobilia, base), sala.tipo, SALA_L, SALA_P);

  const tile = new THREE.Mesh(geoCaixa(SALA_L, T, SALA_P), matStatus.livre);        // piso (cor = status)
  tile.position.set(cx, T / 2, cz); tile.receiveShadow = true; fl.grp.add(tile);

  const volMat = new THREE.MeshBasicMaterial({ color: 0x9fe0b4, transparent: true, opacity: .13, depthWrite: false });
  const vol = new THREE.Mesh(geoCaixa(SALA_L - .1, WH - .06, SALA_P - .1), volMat); // volume translúcido (cor = status, clicável)
  vol.position.set(cx, WH / 2, cz); fl.paredes.add(vol);

  // anel de seleção: aparece em volta do piso e deixa a cor de status visível por dentro
  const anel = new THREE.Mesh(geoCaixa(SALA_L + .3, .14, SALA_P + .3), matSelecao);
  anel.position.set(cx, .0, cz); anel.visible = false; fl.grp.add(anel);

  // rótulo = <button>: clicável, focável por teclado e com nome para leitor de tela (texto definido em atualizarSalas)
  const div = document.createElement("button"); div.type = "button"; div.className = "lbl livre"; div.dataset.sala = sala.id;
  div.style.setProperty("--modulo", `#${new THREE.Color(pred.corDe(sala.modulo)).getHexString()}`);
  const lab = new CSS2DObject(div); lab.position.set(cx, 2.5, cz); fl.grp.add(lab);

  const r = { s: sala, fl, base, rot, centro: new THREE.Vector3(cx, fl.grp.position.y, cz), tile, vol, volMat, anel, div, lab,
              rotulo: "", classe: "", status: "", prof: null, pulsoAte: 0 };
  vol.userData.sala = r;
  pred.pickSalas.push(vol); pred.salas.push(r); fl.salas.push(r);
}

// ---------- andar ----------
function criarAndar(pred, idx, andar, salas, { W, D, colunas }) {
  const grp = new THREE.Group(); grp.position.y = idx * FH;
  const fach = new THREE.Group(), paredes = new THREE.Group();   // estes dois "baixam" no corte por andar
  grp.add(fach, paredes);
  const fl = { idx, andar, grp, fach, paredes, salas: [], esc: 1, escAlvo: 1 };

  const lotes = { casco: new Lote(), mobilia: new Lote(), fachada: new Lote(), paredes: new Lote() };
  const p = new Pincel(lotes.casco);
  p.caixa(W, .3, D, mat.laje, 0, -.15, 0, OPC.casco);                                            // laje
  p.caixa(W + .06, .12, D + .06, mat.faixa, 0, -.12, 0, OPC.casco);                               // faixa de identidade na borda da laje
  p.caixa(W - 2 * PAD, .05, COR, mat.corredor, 0, .025, 0, OPC.mobilia);                          // piso do corredor
  p.caixa(1.0, 2.0, 1.4, mat.elev, -W / 2 + PAD + .6, 1.0, 0, OPC.casco);                         // elevador
  p.caixa(.05, 1.5, .8, mat.elevLuz, -W / 2 + PAD + 1.13, .9, 0, OPC.mobilia);
  for (const lado of [-1, 1]) {                                                                    // vasos
    const x = W / 2 - PAD - .6;
    p.caixa(.42, .5, .42, mat.vaso, x, .25, lado * .8, OPC.mobilia);
    p.forma(geo.folhagemVaso, mat.planta, matriz(x, 0, lado * .8), OPC.mobilia);
  }
  if (idx === 0) entrada(p, D);
  fachada(lotes.fachada, W, D);

  salas.forEach((sala, i) => {                // ordem no corredor: pares/ímpares em lados opostos
    const frente = i % 2 === 0;
    criarSala(pred, fl, sala, {
      cx: -(colunas * RW) / 2 + RW / 2 + Math.floor(i / 2) * RW,
      cz: (frente ? -1 : 1) * (COR / 2 + RD / 2),
      rot: frente ? 0 : Math.PI,
    }, lotes);
  });

  lotes.casco.construir(grp); lotes.mobilia.construir(grp);
  lotes.fachada.construir(fach); lotes.paredes.construir(paredes);

  const hit = new THREE.Mesh(geoCaixa(W, WH, D), mat.oculto);   // alvo de clique na visão "por fora"
  hit.position.y = WH / 2; hit.userData.piso = fl; grp.add(hit); pred.pickPredio.push(hit);

  const quantidade = Math.max(2, Math.min(5, Math.round(W / 5)));   // gente no corredor
  for (let k = 0; k < quantidade; k++) {
    const pessoa = criarPessoa(pred.andarilhos.length * 2 + k, { mochila: k % 2 === 0 });
    Object.assign(pessoa, {
      fl, dir: k % 2 ? 1 : -1, min: -W / 2 + PAD + 2.0, max: W / 2 - PAD - 1.2, vel: .55 + ((k * 13) % 5) * .12,
      x: -W / 2 + 3 + ((k * 37 + idx * 11 + 5) % Math.max(2, Math.round(W - 6))),
    });
    grp.add(pessoa.g); pred.andarilhos.push(pessoa);
  }
  pred.raiz.add(grp);
  return fl;
}

function criarTelhado(W, D, H, colunas) {
  const grp = new THREE.Group(); grp.position.y = H;
  const lote = new Lote(), p = new Pincel(lote), c = OPC.casco;
  const Wt = W + .7, Dt = D + .7;
  p.caixa(Wt, .3, Dt, mat.telhado, 0, -.15, 0, c);
  p.caixa(Wt, .6, .2, mat.fachada, 0, .3, Dt / 2 - .1, c); p.caixa(Wt, .6, .2, mat.fachada, 0, .3, -Dt / 2 + .1, c);   // platibanda
  p.caixa(.2, .6, Dt, mat.fachada, Wt / 2 - .1, .3, 0, c); p.caixa(.2, .6, Dt, mat.fachada, -Wt / 2 + .1, .3, 0, c);
  for (let i = 0; i < Math.min(3, colunas); i++) {                                                                   // condensadores
    p.caixa(1.4, .8, 1.0, mat.elev, -W / 2 + 2.5 + i * 3.2, .4, -1.2, c);
    p.caixa(.8, .12, .8, mat.estrutura, -W / 2 + 2.5 + i * 3.2, .86, -1.2, c);
  }
  p.forma(geo.tanque, mat.fachada, matriz(W / 2 - 2, .65, 1.3), c);                                                   // caixa d'água
  // painéis solares inclinados para o sol, em fileiras na metade da frente do telhado
  const inclinacao = new THREE.Matrix4().makeRotationX(-.35);
  for (let x = -W / 2 + 1.6; x < W / 2 - 3.5; x += 1.9) {
    for (const z of [1.4, 3.0]) {
      p.forma(geoCaixa(1.7, .05, 1.1), mat.solar, inclinacao.clone().setPosition(x, .55, z), c);
      p.caixa(.05, .45, .05, mat.metal, x, .22, z + .3, c);
    }
  }
  lote.construir(grp);
  return grp;
}

function criarEntorno(W, D) {
  const grp = new THREE.Group(), lote = new Lote(), p = new Pincel(lote), chao = OPC.mobilia;
  p.caixa(W + 9, .06, D + 9, mat.praca, 0, -.6, 0, chao);                                   // praça
  p.caixa(3.4, .07, 30, mat.caminho, 0, -.6, D / 2 + 4.5 + 15, chao);                        // caminho até a entrada
  for (const a of [-1, 1]) for (const b of [-1, 1]) {                                        // postes
    const m = matriz(a * (W / 2 + 3.2), -.6, b * (D / 2 + 3.2));
    p.forma(geo.poste, mat.poste, m, OPC.casco); p.forma(geo.lampada, mat.luz, m, chao);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), esc = new THREE.Vector3();
  const eixoY = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 44; i++) {                                                             // árvores (posição determinística)
    const ang = i * 2.399, k = 3 + ((i * 7) % 9), tam = .8 + ((i * 13) % 7) / 10;
    pos.set(Math.cos(ang) * (W / 2 + 5 + k), -.62, Math.sin(ang) * (D / 2 + 5 + k));
    if (Math.abs(pos.x) < 3 && pos.z > 0) continue;                                          // não bloqueia o caminho
    m.compose(pos, q.setFromAxisAngle(eixoY, i * 1.3), esc.setScalar(tam));
    const folha = mat.folhas[i % mat.folhas.length];
    if (i % 3 === 0) {                                                                        // conífera
      p.forma(geo.tronco, mat.tronco, m, OPC.casco);
      p.forma(geo.copaBaixa, folha, m, OPC.casco);
      p.forma(geo.copaAlta, folha, m, OPC.casco);
    } else {                                                                                  // frondosa
      p.forma(geo.troncoAlto, mat.tronco, m, OPC.casco);
      p.forma(geo.copaRedonda, folha, m, OPC.casco);
      p.forma(geo.copaTopo, folha, m, OPC.casco);
    }
  }
  // arbustos contornando o prédio (deixando livre a entrada)
  let n = 0;
  for (const lado of [-1, 1]) {
    for (let x = -W / 2 + .8; x <= W / 2 - .8; x += 1.6) {
      if (lado > 0 && Math.abs(x) < 3) continue;
      p.forma(geo.arbusto, mat.folhas[n++ % mat.folhas.length], matriz(x, -.6, lado * (D / 2 + 1.6)), OPC.mobilia);
    }
  }
  // bancos de praça ao longo do caminho
  for (const lado of [-1, 1]) {
    for (const z of [D / 2 + 6, D / 2 + 11]) {
      const x = lado * 2.6;
      p.caixa(.5, .06, 1.6, mat.madeira, x, -.15, z, OPC.casco);                              // assento
      p.caixa(.08, .45, 1.6, mat.madeira, x + lado * .24, .05, z, OPC.casco);                 // encosto
      for (const dz of [-.65, .65]) p.caixa(.45, .42, .06, mat.estrutura, x, -.39, z + dz, OPC.casco);
    }
  }
  lote.construir(grp);
  return grp;
}

// ---------- API ----------
/**
 * Constrói o prédio para uma lista de salas normalizadas (ver normalizarSalas).
 * @returns resultado com grupos para a cena e as listas usadas na interação.
 */
export function criarPredio(salas) {
  // Todos os andares de ponta a ponta, mesmo os que ficaram sem salas: o prédio nunca "encolhe" no meio
  const usados = salas.map((s) => s.andar);
  const andares = usados.length ? Array.from({ length: Math.max(...usados) - Math.min(...usados) + 1 }, (_, i) => Math.min(...usados) + i) : [];
  const modulos = [...new Set(salas.map((s) => s.modulo))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const porAndar = new Map(andares.map((a) => [a, salas.filter((s) => s.andar === a).sort(porNumero)]));

  const maiorAndar = Math.max(0, ...[...porAndar.values()].map((l) => l.length));
  const colunas = Math.max(3, Math.ceil(maiorAndar / 2));
  const W = colunas * RW + 2 * PAD, D = 2 * RD + COR + 2 * PAD, H = Math.max(1, andares.length) * FH;

  const pred = {
    raiz: new THREE.Group(), entorno: criarEntorno(W, D), pisos: [], salas: [], pickSalas: [], pickPredio: [], andarilhos: [],
    andares, modulos, corDe: (m) => CORES_MODULO[modulos.indexOf(m) % CORES_MODULO.length],
    medidas: { W, D, H }, colunas, telhado: null, placa: null,
  };

  const fundacao = new Lote();
  new Pincel(fundacao).caixa(W + 1.0, .5, D + 1.0, mat.fundacao, 0, -.37, 0, OPC.casco);
  fundacao.construir(pred.raiz);

  andares.forEach((andar, idx) => pred.pisos.push(criarAndar(pred, idx, andar, porAndar.get(andar), { W, D, colunas })));

  pred.telhado = criarTelhado(W, D, H, colunas);
  pred.raiz.add(pred.telhado);

  const div = document.createElement("div"); div.className = "placa"; div.textContent = "🏫 Catraca Inteligente — Faculdade";
  pred.placa = new CSS2DObject(div); pred.placa.position.set(0, 3.7, D / 2 + 1.0); pred.raiz.add(pred.placa);
  return pred;
}

/** Libera o que é exclusivo desta construção (geometrias fundidas, materiais de volume, rótulos). */
export function descartarPredio(pred) {
  for (const grupo of [pred.raiz, pred.entorno]) grupo.traverse((o) => { if (o.userData.fundida) o.geometry.dispose(); });
  pred.salas.forEach((r) => { r.div.remove(); r.volMat.dispose(); });
  pred.placa.element.remove();
}
