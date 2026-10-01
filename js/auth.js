// ============================================================
// VERIFICAÇÃO DE ACESSO — responsável: Emerson
// ============================================================
// Recebe a matrícula (por enquanto digitada; depois virá do
// reconhecimento facial), confere se o aluno existe e está ativo,
// encontra a turma dele para o dia atual e retorna o resultado.
// ============================================================

import { db } from "./firebase-config.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { registrarLog } from "./logs.js";

export async function verificarAcesso(matricula) {
  const alunosRef = query(ref(db, "alunos"), orderByChild("matricula"), equalTo(matricula));
  const snapshot = await get(alunosRef);

  if (!snapshot.exists()) {
    await registrarLog({ alunoId: matricula, turmaId: null, status: "negado" });
    return { autorizado: false, motivo: "Aluno não encontrado" };
  }

  const [alunoId, aluno] = Object.entries(snapshot.val())[0];

  if (aluno.ativo === false) {
    await registrarLog({ alunoId, turmaId: null, status: "negado" });
    return { autorizado: false, motivo: "Aluno inativo" };
  }

  // Procura a turma do dia; se não houver nenhuma de hoje, usa a mais recente.
  const turmaId = await encontrarTurma();

  await registrarLog({ alunoId, turmaId: turmaId || null, status: "liberado" });
  return { autorizado: true, turmaId, aluno: { id: alunoId, ...aluno } };
}

function dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function encontrarTurma() {
  const snap = await get(ref(db, "turmas"));
  if (!snap.exists()) return null;
  const turmas = Object.entries(snap.val()).map(([id, t]) => ({ id, ...t }));
  const hoje = turmas.find((t) => t.data === dataHoje());
  return (hoje || turmas[0]).id;
}
