// ============================================================
// SALAS - Admin-salas — responsável: Murilo
// ============================================================
// O que você precisa aprender aqui: como escrever, ler, atualizar
// e remover dados no Firebase Realtime Database (CRUD básico).
//
// Tutorial recomendado para começar:
// https://firebase.google.com/docs/database/web/read-and-write
// ============================================================

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// CREATE — adiciona uma nova sala
export function criarSala({ numero, modulo, andar, capacidade }) {
  validarSala({ numero, modulo, andar, capacidade });
  const salasRef = ref(db, "salas");
  return push(salasRef, {
    numero,
    modulo,
    andar: Number(andar),
    capacidade: Number(capacidade),
    disponivel: true,
  });
}

// READ (tempo real) — chama callback toda vez que a lista de salas mudar
export function escutarSalas(callback) {
  const salasRef = ref(db, "salas");
  onValue(salasRef, (snapshot) => {
    const data = snapshot.val() || {};
    // transforma o objeto do Firebase em array [{ id, ...dados }]
    const lista = Object.entries(data).map(([id, sala]) => ({ id, ...sala }));
    callback(lista);
  });
}

// Implementação da edição de sala.
export function atualizarSala(salaId, dadosNovos) {
  validarSala(dadosNovos);
  return update(ref(db, `salas/${salaId}`), dadosNovos);
}

// DELETE
export function removerSala(salaId) {
  return remove(ref(db, `salas/${salaId}`));
}

// Validar campos antes de salvar (ex: capacidade > 0,
// não deixar número de sala em branco, etc.)

function validarSala(dados) {
  if ("numero" in dados && !String(dados.numero ?? "").trim()) {
    throw new Error("Preencha o número da sala.");
  }

  if ("numero" in dados) {
  const numero = String(dados.numero ?? "").trim();

  if (!/^[0-9]+$/.test(numero)) {
    throw new Error("O número da sala deve conter apenas números.");
  }
}

  if ("modulo" in dados && !String(dados.modulo ?? "").trim()) {
    throw new Error("Preencha o módulo.");
  }

  if ("andar" in dados) {
    const andar = String(dados.andar ?? "").trim();

    if (andar === "" || !Number.isInteger(Number(andar))) {
      throw new Error("Informe um andar inteiro.");
    }
  }

  if ("capacidade" in dados) {
    const capacidade = Number(dados.capacidade);

    if (!Number.isInteger(capacidade) || capacidade <= 0) {
      throw new Error("A capacidade deve ser um inteiro maior que zero.");
    }
  }
}