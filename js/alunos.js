// ============================================================
// ALUNOS — cadastro, listagem, edição e remoção de alunos
// ============================================================

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function criarAluno({ nome, matricula }) {
  validarAluno({ nome, matricula });
  return push(ref(db, "alunos"), {
    nome: nome.trim(),
    matricula: String(matricula).trim(),
    faceId: null,
    ativo: true,
  });
}

export function escutarAlunos(callback) {
  onValue(ref(db, "alunos"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.entries(data).map(([id, a]) => ({ id, ...a })));
  });
}

export function atualizarAluno(alunoId, dadosNovos) {
  validarAluno(dadosNovos);
  return update(ref(db, `alunos/${alunoId}`), {
    nome: dadosNovos.nome.trim(),
    matricula: String(dadosNovos.matricula).trim(),
    ativo: Boolean(dadosNovos.ativo),
  });
}

export function removerAluno(alunoId) {
  return remove(ref(db, `alunos/${alunoId}`));
}

export async function matriculaExiste(matricula, ignorarId = null) {
  const q = query(ref(db, "alunos"), orderByChild("matricula"), equalTo(String(matricula)));
  const snap = await get(q);
  if (!snap.exists()) return false;
  return Object.keys(snap.val()).some((id) => id !== ignorarId);
}

function validarAluno(dados) {
  if (!String(dados.nome ?? "").trim()) {
    throw new Error("Preencha o nome do aluno.");
  }
  if (!/^[0-9]+$/.test(String(dados.matricula ?? "").trim())) {
    throw new Error("A matrícula deve conter apenas números.");
  }
}
