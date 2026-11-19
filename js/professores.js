// ============================================================
// PROFESSORES — cadastro, listagem, edição e remoção
// ============================================================

import { db } from "./firebase-config.js";
import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function criarProfessor({ nome, email, faceDescriptor = null }) {
  validarProfessor({ nome, email });
  return push(ref(db, "professores"), {
    nome: nome.trim(),
    email: email.trim(),
    faceDescriptor: Array.isArray(faceDescriptor) ? faceDescriptor : null,
  });
}

export function escutarProfessores(callback) {
  onValue(ref(db, "professores"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.entries(data).map(([id, p]) => ({ id, ...p })));
  });
}

export function atualizarProfessor(professorId, dadosNovos) {
  validarProfessor(dadosNovos);
  const payload = {
    nome: dadosNovos.nome.trim(),
    email: dadosNovos.email.trim(),
  };
  if (Object.prototype.hasOwnProperty.call(dadosNovos, "faceDescriptor")) {
    payload.faceDescriptor = Array.isArray(dadosNovos.faceDescriptor) ? dadosNovos.faceDescriptor : null;
  }
  return update(ref(db, `professores/${professorId}`), payload);
}

export function removerProfessor(professorId) {
  return remove(ref(db, `professores/${professorId}`));
}

function validarProfessor(dados) {
  if (!String(dados.nome ?? "").trim()) throw new Error("Preencha o nome do professor.");
  if (!String(dados.email ?? "").trim()) throw new Error("Preencha o e-mail do professor.");
}
