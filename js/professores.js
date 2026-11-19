// ============================================================
// PROFESSORES — cadastro, listagem, edição e remoção
// ============================================================

import { db } from "./firebase-config.js";
import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function criarProfessor({ nome, email }) {
  validarProfessor({ nome, email });
  return push(ref(db, "professores"), { nome: nome.trim(), email: email.trim() });
}

export function escutarProfessores(callback) {
  onValue(ref(db, "professores"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.entries(data).map(([id, p]) => ({ id, ...p })));
  });
}

export function atualizarProfessor(professorId, dadosNovos) {
  validarProfessor(dadosNovos);
  return update(ref(db, `professores/${professorId}`), {
    nome: dadosNovos.nome.trim(),
    email: dadosNovos.email.trim(),
  });
}

export function removerProfessor(professorId) {
  return remove(ref(db, `professores/${professorId}`));
}

function validarProfessor(dados) {
  const nome = String(dados.nome ?? "").trim();
  const email = String(dados.email ?? "").trim();
  if (!nome || nome.length > 120) throw new Error("Informe o nome do professor (até 120 caracteres).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Informe um e-mail válido.");
  }
}
