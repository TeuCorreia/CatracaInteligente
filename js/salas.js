// ============================================================
// SALAS — CRUD no Firebase + organização automática do prédio
// ============================================================
// Modelo: salas/{id} = { numero, modulo, andar, capacidade, disponivel }
//
// O admin só informa a capacidade. Módulo, andar e número são calculados:
// cada andar comporta SALAS_POR_ANDAR salas (101..110, 201..210, ...) e,
// quando um andar enche, o prédio ganha um andar novo. Vagas liberadas por
// salas removidas são reaproveitadas (sempre a primeira vaga livre).
// ============================================================

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const SALAS_POR_ANDAR = 10;
export const MODULO_PADRAO = "A";
const MAX_ANDARES = 99;

const chaveVaga = (andar, numero) => `${Number(andar)}:${String(numero).trim()}`;
const porAndarENumero = (a, b) => Number(a.andar) - Number(b.andar) || Number(a.numero) - Number(b.numero);

// ---------- regras de numeração (puras, sem acesso ao banco) ----------

/** Uma sala está "no padrão" quando o número é <andar>01 … <andar>10. */
export function salaNoPadrao({ numero, andar }) {
  const k = Number(numero) - Number(andar) * 100;
  return /^\d+$/.test(String(numero).trim()) && Number.isInteger(k) && k >= 1 && k <= SALAS_POR_ANDAR;
}

/** Primeira vaga livre dado o conjunto de chaves já ocupadas. */
function vagaLivre(ocupadas) {
  for (let andar = 1; andar <= MAX_ANDARES; andar++) {
    for (let k = 1; k <= SALAS_POR_ANDAR; k++) {
      const numero = String(andar * 100 + k);
      if (!ocupadas.has(chaveVaga(andar, numero))) return { andar, numero, modulo: MODULO_PADRAO };
    }
  }
  throw new Error("Prédio cheio.");
}

/** Primeira vaga livre do prédio: { andar, numero, modulo }. */
export function proximaVaga(salas) {
  return vagaLivre(new Set(salas.map((s) => chaveVaga(s.andar, s.numero))));
}

/**
 * Plano (não grava nada) para arrumar salas fora do padrão: mantém as corretas,
 * realoca as demais nas primeiras vagas livres e normaliza o módulo.
 */
export function planoDeOrganizacao(salas) {
  const usadas = new Set();
  const mover = [], normalizarModulo = [];
  [...salas].sort(porAndarENumero).forEach((s) => {
    const chave = chaveVaga(s.andar, s.numero);
    if (salaNoPadrao(s) && !usadas.has(chave)) {
      usadas.add(chave);
      if (s.modulo !== MODULO_PADRAO) normalizarModulo.push(s);
    } else mover.push(s);
  });

  const plano = mover.map((s) => {
    const vaga = vagaLivre(usadas);
    usadas.add(chaveVaga(vaga.andar, vaga.numero));
    return { id: s.id, de: `${s.numero} (${s.andar}º andar, mód. ${s.modulo})`, ...vaga };
  });
  normalizarModulo.forEach((s) => plano.push({
    id: s.id, de: `${s.numero} (mód. ${s.modulo})`, andar: Number(s.andar), numero: String(s.numero), modulo: MODULO_PADRAO,
  }));
  return plano;
}

// ---------- acesso ao Firebase ----------

/**
 * Lê as salas em tempo real. `aoFalhar` (opcional) recebe o erro se o Firebase recusar/cair.
 * Devolve a função que cancela a escuta.
 */
export function escutarSalas(callback, aoFalhar) {
  return onValue(
    ref(db, "salas"),
    (snapshot) => callback(Object.entries(snapshot.val() || {}).map(([id, sala]) => ({ id, ...sala }))),
    aoFalhar
  );
}

/** Cria uma sala com todos os campos (validando-os). */
export function criarSala({ numero, modulo, andar, capacidade }) {
  validarSala({ numero, modulo, andar, capacidade });
  return push(ref(db, "salas"), {
    numero: String(numero).trim(),
    modulo: String(modulo).trim(),
    andar: Number(andar),
    capacidade: Number(capacidade),
    disponivel: true,
  });
}

/** Cria uma sala informando só a capacidade; o restante vem da primeira vaga livre. */
export function criarSalaAuto({ capacidade }, salasAtuais) {
  return criarSala({ ...proximaVaga(salasAtuais), capacidade });
}

export function atualizarSala(salaId, dadosNovos) {
  validarSala(dadosNovos);
  return update(ref(db, `salas/${salaId}`), dadosNovos);
}

export function removerSala(salaId) {
  return remove(ref(db, `salas/${salaId}`));
}

/** Grava o plano de organização de uma vez só (atualização atômica em vários caminhos). */
export function aplicarPlano(plano) {
  const campos = {};
  plano.forEach(({ id, numero, andar, modulo }) => {
    campos[`salas/${id}/numero`] = numero;
    campos[`salas/${id}/andar`] = andar;
    campos[`salas/${id}/modulo`] = modulo;
  });
  return update(ref(db), campos);
}

// ---------- validação (só valida os campos presentes: serve para criar e editar) ----------
function validarSala(dados) {
  if ("numero" in dados) {
    const numero = String(dados.numero ?? "").trim();
    if (!numero) throw new Error("Preencha o número da sala.");
    if (!/^\d+$/.test(numero)) throw new Error("O número da sala deve conter apenas números.");
  }

  if ("modulo" in dados && !String(dados.modulo ?? "").trim()) {
    throw new Error("Preencha o módulo.");
  }

  if ("andar" in dados) {
    const andar = String(dados.andar ?? "").trim();
    if (andar === "" || !Number.isInteger(Number(andar))) throw new Error("Informe um andar inteiro.");
  }

  if ("numero" in dados && "andar" in dados && !salaNoPadrao(dados)) {
    const a = Number(dados.andar);
    throw new Error(`Numeração fora do padrão: no ${a}º andar a sala deve ser ${a}01 a ${a}${String(SALAS_POR_ANDAR).padStart(2, "0")}.`);
  }

  if ("capacidade" in dados) {
    const capacidade = Number(dados.capacidade);
    if (!Number.isInteger(capacidade) || capacidade <= 0) {
      throw new Error("A capacidade deve ser um inteiro maior que zero.");
    }
  }
}
