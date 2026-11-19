// ============================================================
// PRÉDIO 3D — detalhes que dão vida à cena
// Portão com catracas (o tema do projeto), rua com carros, estacionamento,
// canteiros, mastros, bicicletário e nuvens. Tudo o que é parado vai para o
// Lote do entorno (vira poucas malhas); só os carros da rua e as nuvens são
// grupos próprios, porque se movem (ver animarDetalhes).
// ============================================================
import * as THREE from "three";
import { mat, geo, Lote, Pincel, OPC, matrizPosRot } from "./recursos.js";

const CHAO = -.6;   // altura do topo do gramado/praça
const m4 = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const escala = (x, y, z, s) => new THREE.Matrix4().makeScale(s, s, s).setPosition(x, y, z);

/** Carro com a frente em +z, apoiado no chão local (y = 0). */
function carro(p, cor) {
  const L = 2.0, W = .95;
  p.caixa(W, .4, L, cor, 0, .37, 0, OPC.casco);                          // carroceria
  p.caixa(W - .12, .34, L * .5, mat.vidroCarro, 0, .74, -.1, OPC.casco);   // cabine com vidros
  p.caixa(W - .16, .04, L * .46, cor, 0, .93, -.1, OPC.casco);             // teto
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.forma(geo.roda, mat.pneu, m4(sx * (W / 2 - .03), .2, sz * .62), OPC.casco);
  for (const sx of [-.3, .3]) {
    p.caixa(.2, .08, .03, mat.luz, sx, .46, L / 2 + .01, OPC.mobilia);      // faróis
    p.caixa(.2, .08, .03, mat.lanterna, sx, .46, -L / 2 - .01, OPC.mobilia); // lanternas
  }
}

/** Portão do campus com 3 catracas e a câmera de reconhecimento facial, no começo da praça. */
function portaoCatracas(p, z) {
  const y = CHAO;
  for (const x of [-2.25, 2.25]) p.caixa(.36, 2.9, .36, mat.estrutura, x, y + 1.45, z, OPC.casco);   // pilares
  p.caixa(4.86, .36, .5, mat.estrutura, 0, y + 3.05, z, OPC.casco);                                 // viga
  p.caixa(4.86, .08, .52, mat.faixa, 0, y + 3.27, z, OPC.casco);                                    // faixa azul da marca
  p.caixa(4.1, .04, .26, mat.luzTeto, 0, y + 2.85, z, OPC.mobilia);                                 // luz sob a viga
  p.caixa(.34, .22, .3, mat.estrutura, 0, y + 2.72, z + .08, OPC.casco);                            // câmera (rosto)
  p.forma(geo.lente, mat.tela, m4(0, y + 2.72, z + .27), OPC.mobilia);
  const pedestais = [-1.65, -.55, .55, 1.65];
  pedestais.forEach((x, i) => {
    p.caixa(.24, .98, .72, mat.metal, x, y + .49, z, OPC.casco);
    p.caixa(.2, .03, .3, mat.catraca, x, y + .995, z + .12, OPC.mobilia);                           // visor verde: "liberado"
    if (i < 3) p.caixa(.76, .045, .045, mat.metal, x + .5, y + .82, z - .1, OPC.mobilia);           // braço da catraca
  });
}

function canteiro(p, x, z, semente) {
  p.forma(geo.canteiro, mat.laje, m4(x, CHAO, z), OPC.casco);
  p.forma(geo.terraCanteiro, mat.terra, m4(x, CHAO, z), OPC.mobilia);
  p.forma(geo.arbusto, mat.folhas[semente % mat.folhas.length], escala(x, CHAO + .28, z, 1.1), OPC.mobilia);
  for (let i = 0; i < 16; i++) {                                   // flores em espiral (determinístico)
    const a = i * 2.399 + semente, r = .45 + (i % 4) * .17;
    p.forma(geo.flor, mat.flores[(i + semente) % mat.flores.length], m4(x + Math.cos(a) * r, CHAO + .36, z + Math.sin(a) * r), OPC.mobilia);
  }
}

function mastros(p, x0, z) {
  const bandeiras = [mat.faixa, mat.moldura, mat.folhas[0]];
  bandeiras.forEach((cor, i) => {
    const x = x0 + i * .85;
    p.forma(geo.mastro, mat.metal, m4(x, CHAO, z), OPC.casco);
    p.caixa(.86, .52, .025, cor, x + .45, CHAO + 4.2, z, OPC.casco);
    p.forma(geo.bolinha, mat.metal, escala(x, CHAO + 4.62, z, .5), OPC.mobilia);
  });
}

function bicicletario(p, x0, z) {
  p.caixa(3.0, .05, 1.4, mat.calcada, x0, CHAO + .03, z, OPC.mobilia);
  for (let i = 0; i < 4; i++) p.forma(geo.arco, mat.metal, m4(x0 - 1.1 + i * .73, CHAO + .05, z), OPC.mobilia);
  for (const i of [0, 2]) {                                         // duas bicicletas encostadas
    const x = x0 - 1.1 + i * .73 + .2;
    for (const dz of [-.42, .42]) p.forma(geo.rodaBike, mat.pneu, m4(x, CHAO + .33, z + dz), OPC.mobilia);
    p.caixa(.04, .04, .8, i ? mat.carros[1] : mat.carros[0], x, CHAO + .52, z, OPC.mobilia);        // quadro
    p.caixa(.04, .3, .04, mat.estrutura, x, CHAO + .62, z - .3, OPC.mobilia);                       // selim
    p.caixa(.36, .03, .04, mat.estrutura, x, CHAO + .78, z + .36, OPC.mobilia);                     // guidão
  }
}

function poste(p, x, z) {
  const m = m4(x, CHAO, z);
  p.forma(geo.poste, mat.poste, m, OPC.casco); p.forma(geo.lampada, mat.luz, m, OPC.mobilia);
}

/**
 * Adiciona os detalhes do entorno ao pincel `p` (Lote do entorno) e devolve os grupos animados.
 * @returns {{ carros: {g:THREE.Group, v:number, dir:number}[], nuvens: THREE.Group, zonaLivre:(x:number,z:number)=>boolean }}
 */
export function detalharEntorno(p, grp, W, D) {
  const frente = D / 2;
  const zRua = frente + 24, zEst = frente + 16;

  portaoCatracas(p, frente + 4.7);
  mastros(p, 3.4, frente + 3.4);
  bicicletario(p, -5.2, frente + 3.4);
  for (const lado of [-1, 1]) canteiro(p, lado * 6.2, frente + 8.6, lado > 0 ? 1 : 2);
  for (const z of [frente + 8.6, frente + 13.8]) for (const x of [-2.1, 2.1]) poste(p, x, z);

  // ---------- estacionamento dos dois lados do caminho ----------
  const vagas = Math.max(3, Math.min(8, Math.floor((W / 2 + 7) / 2.6)));
  for (const lado of [-1, 1]) {
    const x0 = lado * 4.4, larg = vagas * 2.6;
    p.caixa(larg, .06, 6.4, mat.asfalto, x0 + lado * larg / 2, CHAO + .03, zEst, OPC.mobilia);
    for (let k = 0; k <= vagas; k++) p.caixa(.08, .01, 4.2, mat.faixaRua, x0 + lado * k * 2.6, CHAO + .065, zEst - .9, OPC.mobilia);
    for (let k = 0; k < vagas; k++) {
      if ((k * 7 + (lado > 0 ? 3 : 0)) % 5 === 1) continue;          // algumas vagas vazias
      const x = x0 + lado * (1.3 + k * 2.6);
      carro(new Pincel(p.lote, matrizPosRot(x, zEst - .9, Math.PI).premultiply(m4(0, CHAO + .06, 0))), mat.carros[(k * 3 + (lado > 0 ? 1 : 0)) % mat.carros.length]);
    }
  }

  // ---------- rua com calçadas, faixa tracejada e faixa de pedestres ----------
  p.caixa(280, .08, 6, mat.asfalto, 0, CHAO + .01, zRua, OPC.mobilia);
  for (const s of [-1, 1]) {
    p.caixa(280, .12, 1.6, mat.calcada, 0, CHAO + .02, zRua + s * 3.8, OPC.mobilia);
    p.caixa(280, .16, .12, mat.laje, 0, CHAO + .04, zRua + s * 3.0, OPC.mobilia);          // meio-fio
  }
  for (let x = -132; x <= 132; x += 4.5) if (Math.abs(x) > 3.5) p.caixa(2.2, .01, .14, mat.faixaRua, x, CHAO + .055, zRua, OPC.mobilia);
  for (let i = -3; i <= 3; i++) p.caixa(.45, .01, 5.2, mat.faixaRua, i * .82, CHAO + .055, zRua, OPC.mobilia);
  for (let x = -63; x <= 63; x += 14) if (Math.abs(x) > 4) poste(p, x, zRua - 3.9);

  // árvores do outro lado da rua (dão profundidade à cena)
  for (let i = 0; i < 16; i++) {
    const x = -46 + i * 6.1 + ((i * 17) % 5) * .4, z = zRua + 8 + ((i * 11) % 4) * 1.6, tam = .9 + ((i * 7) % 5) / 10;
    const m = new THREE.Matrix4().makeScale(tam, tam, tam).setPosition(x, CHAO - .02, z);
    p.forma(geo.troncoAlto, mat.tronco, m, OPC.casco);
    p.forma(geo.copaRedonda, mat.folhas[i % mat.folhas.length], m, OPC.casco);
    p.forma(geo.copaTopo, mat.folhas[(i + 1) % mat.folhas.length], m, OPC.casco);
  }

  // ---------- carros andando na rua (grupos próprios: movem-se a cada quadro) ----------
  const carros = [];
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1, lote = new Lote(), g = new THREE.Group();
    carro(new Pincel(lote), mat.carros[(i * 2 + 1) % mat.carros.length]);
    lote.construir(g);
    g.rotation.y = dir * Math.PI / 2;
    g.position.set(-70 + i * 37, CHAO + .05, zRua + dir * 1.5);
    grp.add(g);
    carros.push({ g, dir, v: 5 + (i % 3) * 1.6 });
  }

  // ---------- nuvens (low-poly, sem sombra) ----------
  const nuvens = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const lote = new Lote(), np = new Pincel(lote), c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = 3.6 + ((i + k * 3) % 4) * 1.1;
      np.forma(geo.nuvem, mat.nuvem, new THREE.Matrix4().makeScale(s * 1.3, s * .7, s).setPosition((k - 1.5) * 4, (k % 2) * 1.5, (k % 3) * 1.3), OPC.translucido);
    }
    lote.construir(c);
    const ang = i * 2.1;
    c.position.set(Math.cos(ang) * (90 + (i % 3) * 25), 62 + (i % 4) * 6, Math.sin(ang) * (90 + (i % 3) * 25) - 30);   // altas e longe: não cruzam a câmera
    c.userData.v = .6 + (i % 3) * .3;
    nuvens.add(c);
  }
  grp.add(nuvens);

  // onde NÃO plantar as árvores do anel (estacionamento, rua e caminho)
  const zonaLivre = (x, z) => !(z > frente + 9.5 && z < zRua + 5) && !(Math.abs(x) < 3 && z > 0);
  return { carros, nuvens, zonaLivre };
}

/** Move carros e nuvens (chamado a cada quadro, se o usuário não pediu movimento reduzido). */
export function animarDetalhes({ carros, nuvens }, dt) {
  for (const c of carros) {
    c.g.position.x += c.dir * c.v * dt;
    if (c.g.position.x > 75) c.g.position.x = -75; else if (c.g.position.x < -75) c.g.position.x = 75;
  }
  for (const n of nuvens.children) {
    n.position.x += n.userData.v * dt;
    if (n.position.x > 170) n.position.x = -170;
  }
}

/** Detalhes da fachada de um andar: brises de madeira na frente e no fundo (sem tapar a porta do térreo). */
export function brises(p, W, D, WH, terreo) {
  for (const lado of [-1, 1]) {
    for (let x = -W / 2 + .7; x <= W / 2 - .7; x += 1.15) {
      if (terreo && lado > 0 && Math.abs(x) < 2.6) continue;
      p.caixa(.08, WH - .15, .5, mat.brise, x, (WH - .15) / 2 + .05, lado * (D / 2 + .3), OPC.casco);
    }
  }
}
