// ============================================================
// ALUNOS — cadastro, listagem, edição e remoção de alunos
// ============================================================
import { desvincularAluno } from "./academico.js";

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function criarAluno({ nome, matricula, faceDescriptor = null }) {
  validarAluno({ nome, matricula });
  return push(ref(db, "alunos"), {
    nome: nome.trim(),
    matricula: String(matricula).trim(),
    faceId: null,
    faceDescriptor: Array.isArray(faceDescriptor) ? faceDescriptor : null,
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
  const payload = {
    nome: dadosNovos.nome.trim(),
    matricula: String(dadosNovos.matricula).trim(),
    ativo: Boolean(dadosNovos.ativo),
  };
  if (Object.prototype.hasOwnProperty.call(dadosNovos, "faceDescriptor")) {
    payload.faceDescriptor = Array.isArray(dadosNovos.faceDescriptor) ? dadosNovos.faceDescriptor : null;
  }
  return update(ref(db, `alunos/${alunoId}`), payload);
}

export async function removerAluno(alunoId) {
  await remove(ref(db, `alunos/${alunoId}`));
  await desvincularAluno(alunoId);   // tira o aluno das turmas e do índice (evita matrícula "fantasma")
}

export async function matriculaExiste(matricula, ignorarId = null) {
  const snap = await get(ref(db, "alunos"));
  if (!snap.exists()) return false;
  let existe = false;
  snap.forEach((item) => {
    if (String(item.val().matricula) === String(matricula) && item.key !== ignorarId) {
      existe = true;
    }
  });
  return existe;
}

function validarAluno(dados) {
  if (!String(dados.nome ?? "").trim()) {
    throw new Error("Preencha o nome do aluno.");
  }
  if (!/^[0-9]+$/.test(String(dados.matricula ?? "").trim())) {
    throw new Error("A matrícula deve conter apenas números.");
  }
}
