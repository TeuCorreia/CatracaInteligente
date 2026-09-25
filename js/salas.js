// ============================================================
// SALAS — responsável: Murilo
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

// UPDATE — TODO (Murilo): implementar edição de sala existente
// dica: update(ref(db, `salas/${salaId}`), { disponivel: false })
export function atualizarSala(salaId, dadosNovos) {
  return update(ref(db, `salas/${salaId}`), dadosNovos);
}

// DELETE
export function removerSala(salaId) {
  return remove(ref(db, `salas/${salaId}`));
}

// TODO (Murilo): validar campos antes de salvar (ex: capacidade > 0,
// não deixar número de sala em branco, etc.)
