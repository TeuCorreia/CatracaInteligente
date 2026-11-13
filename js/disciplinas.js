// ============================================================
// DISCIPLINAS — a "turma": um professor + os alunos matriculados
// disciplinas/{id} = { nome, professorId, alunoIds: [alunoId...] }
//
// Cada gravação também atualiza o índice alunos_disciplinas/{alunoId}/{discId}
// (js/academico.js), que é o que a catraca/ESP32 consulta.
// ============================================================

import { db } from "./firebase-config.js";
import { ref, push, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { camposDeVinculo, gravarCampos } from "./academico.js";
import { idsDaDisciplina } from "./conflitos.js";

export async function criarDisciplina({ nome, professorId, alunoIds = [] }) {
  validarDisciplina({ nome, professorId });
  const nova = await push(ref(db, "disciplinas"), { nome: nome.trim(), professorId, alunoIds });
  await gravarCampos(camposDeVinculo(nova.key, [], alunoIds));
  return nova;
}

export function escutarDisciplinas(callback) {
  return onValue(ref(db, "disciplinas"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.entries(data).map(([id, d]) => ({ id, ...d })));
  });
}

export async function atualizarDisciplina(disciplinaId, dadosNovos) {
  validarDisciplina(dadosNovos);
  const antes = idsDaDisciplina((await get(ref(db, `disciplinas/${disciplinaId}`))).val());
  const alunoIds = dadosNovos.alunoIds || [];
  await update(ref(db, `disciplinas/${disciplinaId}`), {
    nome: dadosNovos.nome.trim(),
    professorId: dadosNovos.professorId,
    alunoIds,
  });
  await gravarCampos(camposDeVinculo(disciplinaId, antes, alunoIds));
}

export async function removerDisciplina(disciplinaId) {
  const antes = idsDaDisciplina((await get(ref(db, `disciplinas/${disciplinaId}`))).val());
  await remove(ref(db, `disciplinas/${disciplinaId}`));
  await gravarCampos(camposDeVinculo(disciplinaId, antes, []));
}

function validarDisciplina(dados) {
  if (!String(dados.nome ?? "").trim()) throw new Error("Preencha o nome da disciplina.");
  if (!dados.professorId) throw new Error("Selecione um professor.");
}
