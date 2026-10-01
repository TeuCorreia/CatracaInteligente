// ============================================================
// DISCIPLINAS — cadastro, listagem, edição e remoção
// ============================================================

import { db } from "./firebase-config.js";
import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function criarDisciplina({ nome, professorId }) {
  validarDisciplina({ nome, professorId });
  return push(ref(db, "disciplinas"), { nome: nome.trim(), professorId });
}

export function escutarDisciplinas(callback) {
  onValue(ref(db, "disciplinas"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.entries(data).map(([id, d]) => ({ id, ...d })));
  });
}

export function atualizarDisciplina(disciplinaId, dadosNovos) {
  validarDisciplina(dadosNovos);
  return update(ref(db, `disciplinas/${disciplinaId}`), {
    nome: dadosNovos.nome.trim(),
    professorId: dadosNovos.professorId,
  });
}

export function removerDisciplina(disciplinaId) {
  return remove(ref(db, `disciplinas/${disciplinaId}`));
}

function validarDisciplina(dados) {
  if (!String(dados.nome ?? "").trim()) throw new Error("Preencha o nome da disciplina.");
  if (!dados.professorId) throw new Error("Selecione um professor.");
}
