// ============================================================
// VERIFICAÇÃO DE ACESSO — responsável: Emerson
// ============================================================
// Esta é a peça que liga tudo: recebe o resultado do reconhecimento
// facial (ou, por enquanto, uma matrícula digitada manualmente),
// confere se o aluno existe e está ativo, encontra a turma dele
// para o dia/horário atual, e retorna o resultado.
//
// TODO (Emerson): esse é o ponto mais importante do sistema — ele
// depende da coleção "alunos" (ainda não criada por ninguém) e da
// coleção "turmas" (Davi). Sugestão de próximos passos:
//   1. Definir com o grupo como vincular aluno <-> turma
//      (aluno tem uma lista de turmas? ou a turma tem uma lista de
//      alunos matriculados?)
//   2. Criar a coleção "alunos" com matrícula + faceId + ativo
//   3. Implementar de fato a busca abaixo (hoje é só um rascunho)
// ============================================================

import { db } from "./firebase-config.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { registrarLog } from "./logs.js";

export async function verificarAcesso(matricula) {
  // TODO (Emerson): trocar esse rascunho pela consulta real assim que
  // a coleção "alunos" existir. Por enquanto retorna um resultado
  // simulado pra Isaque conseguir testar a tela dele sem depender
  // do resto pronto.

  const alunosRef = query(ref(db, "alunos"), orderByChild("matricula"), equalTo(matricula));
  const snapshot = await get(alunosRef);

  if (!snapshot.exists()) {
    await registrarLog({ alunoId: matricula, turmaId: null, status: "negado" });
    return { autorizado: false, motivo: "Aluno não encontrado" };
  }

  // TODO (Emerson): aqui ainda falta achar a turma do dia/horário atual
  // pra esse aluno. Por enquanto retorna autorizado sem turma vinculada.
  await registrarLog({ alunoId: matricula, turmaId: null, status: "liberado" });
  return { autorizado: true, turma: null };
}
