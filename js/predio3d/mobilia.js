// ============================================================
// PRÉDIO 3D — mobília de cada tipo de sala
// `p` é um Pincel (js/predio3d/recursos.js) já posicionado no centro da sala,
// com o fundo da sala em -z e a porta em +z. Tudo vira geometria fundida no
// Lote, então o detalhe extra (pés, encostos, molduras) não aumenta as
// chamadas de desenho, só triângulos.
// ============================================================
import { mat } from "./recursos.js";
import { T } from "./config.js";

/** Grade de itens centralizada em x: chama `item(x, z, linha, coluna)` para cada posição. */
function grade(colunas, linhas, passoX, z0, passoZ, item) {
  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < colunas; c++) item((c - (colunas - 1) / 2) * passoX, z0 + r * passoZ, r, c);
  }
}

/** Quatro pés finos sob um tampo de largura w e profundidade d, com altura h. */
function pes(p, x, z, w, d, h, material = mat.metal) {
  const dx = w / 2 - .04, dz = d / 2 - .04;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.caixa(.035, h, .035, material, x + sx * dx, T + h / 2, z + sz * dz);
}

/** Cadeira com assento, encosto e pés. `frente` = +1 olha para -z (para o quadro). */
function cadeira(p, x, z, frente = 1, material = mat.cadeira) {
  p.caixa(.36, .04, .34, material, x, T + .27, z);                          // assento
  p.caixa(.36, .3, .04, material, x, T + .44, z + frente * .17);            // encosto
  pes(p, x, z, .34, .32, .25);
}

/** Carteira com tampo e pés. */
function carteira(p, x, z) {
  p.caixa(.62, .035, .42, mat.mesa, x, T + .46, z);
  pes(p, x, z, .6, .4, .44);
}

function quadroBranco(p, largura, z) {
  p.caixa(largura + .1, .62, .03, mat.moldura, 0, 1.05, z);                 // moldura
  p.caixa(largura, .52, .04, mat.quadro, 0, 1.05, z + .01);                  // quadro
  p.caixa(largura * .9, .03, .07, mat.moldura, 0, .76, z + .04);            // apoio do giz
}

function mesaProfessor(p, z) {
  p.caixa(1.15, .04, .55, mat.madeira, 0, T + .5, z);                      // tampo
  p.caixa(.05, .48, .5, mat.madeira, -.55, T + .25, z);                     // laterais
  p.caixa(.05, .48, .5, mat.madeira, .55, T + .25, z);
  p.caixa(1.1, .3, .03, mat.madeira, 0, T + .32, z - .24);                  // painel frontal
  p.caixa(.34, .02, .24, mat.metal, .25, T + .53, z);                       // notebook (base)
  p.caixa(.34, .22, .02, mat.tela, .25, T + .64, z - .11);                  // notebook (tela)
  cadeira(p, -.2, z - .5, -1);                                               // cadeira do professor (olha para a turma)
}

function salaDeAula(p, sw, sd) {
  const fundo = -sd / 2;
  quadroBranco(p, sw * .55, fundo + .07);
  mesaProfessor(p, fundo + 1.0);
  const colunas = Math.max(2, Math.floor((sw - 1.1) / .95));
  const linhas = Math.max(2, Math.floor((sd - 2.7) / .85));
  grade(colunas, linhas, .95, fundo + 1.9, .85, (x, z) => {
    carteira(p, x, z);
    cadeira(p, x, z + .34);
  });
  p.caixa(.4, .9, .35, mat.estante, sw / 2 - .35, T + .45, sd / 2 - .5);     // armário ao lado da porta
}

function auditorio(p, sw, sd) {
  const fundo = -sd / 2;
  p.caixa(sw - 1.0, .35, 1.6, mat.palco, 0, T + .175, fundo + 1.0);         // palco
  p.caixa(.8, .17, .3, mat.palco, 0, T + .085, fundo + 1.95);               // degrau
  p.caixa(sw * .55 + .1, 1.1, .03, mat.moldura, 0, 1.25, fundo + .06);      // telão com moldura
  p.caixa(sw * .55, 1.0, .04, mat.tela, 0, 1.25, fundo + .08);
  p.caixa(.4, .55, .3, mat.madeira, sw * .3, T + .35 + .27, fundo + 1.2);   // púlpito
  const colunas = Math.floor((sw - 1.4) / .6), linhas = Math.floor((sd - 3.2) / .62);
  grade(colunas, linhas, .6, fundo + 2.5, .62, (x, z, _r, c) => {
    if (c === Math.floor(colunas / 2)) return;                               // corredor central
    p.caixa(.46, .1, .4, mat.assento, x, T + .3, z);                         // poltrona: assento
    p.caixa(.46, .42, .08, mat.assento, x, T + .5, z + .18);                 // encosto
    p.caixa(.05, .3, .4, mat.estrutura, x - .25, T + .2, z);                 // braço
  });
}

function salaDeReuniao(p, sw, sd) {
  p.caixa(sw * .62, .05, 1.0, mat.madeira, 0, T + .5, 0);                   // tampo
  p.caixa(.12, .45, .7, mat.metal, -sw * .2, T + .25, 0);                   // pés-painel
  p.caixa(.12, .45, .7, mat.metal, sw * .2, T + .25, 0);
  for (let i = 0; i < 4; i++) {
    const x = -.8 + i * .55;
    cadeira(p, x, -.75, -1);
    cadeira(p, x, .75, 1);
  }
  p.caixa(sw * .6 + .08, .58, .03, mat.estrutura, 0, 1.1, -sd / 2 + .06);   // TV
  p.caixa(sw * .6, .5, .04, mat.tela, 0, 1.1, -sd / 2 + .08);
  // estante com livros
  p.caixa(.9, 1.1, .3, mat.estante, sw / 2 - .6, T + .55, sd / 2 - .5);
  mat.livros.forEach((m, i) => p.caixa(.18, .26, .22, m, sw / 2 - .95 + i * .2, T + .78, sd / 2 - .5));
}

const POR_TIPO = { "Sala de aula": salaDeAula, "Auditório": auditorio, "Sala de reunião": salaDeReuniao };

export function mobiliar(p, tipo, sw, sd) {
  (POR_TIPO[tipo] ?? salaDeAula)(p, sw, sd);
}
