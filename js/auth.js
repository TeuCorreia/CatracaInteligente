import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { registrarLog } from "./logs.js";
import { aulaDoAlunoAgora } from "./academico.js";

// Política da catraca: true = só entra quem tem aula hoje (turma correlacionada); false = qualquer aluno
// ativo entra (a aula, se houver, é só exibida). Deixe false até os alunos estarem todos vinculados às
// turmas; senão a catraca negaria quem ainda não foi cadastrado em uma disciplina.
const EXIGIR_AULA = false;

async function finalizarAcesso(alunoId, turmaId, autorizado, motivo, turma) {
  try {
    await registrarLog({
      alunoId,
      turmaId,
      status: autorizado ? "liberado" : "negado",
    });
  } catch (erro) {
    console.error("Falha ao salvar o log:", erro);
    return {
      autorizado: false,
      motivo: autorizado ? "Acesso bloqueado: não foi possível salvar o log." : motivo,
    };
  }

  return { autorizado, ...(motivo ? { motivo } : {}), ...(turma ? { turma } : {}) };
}

export async function verificarAcesso(matricula) {
  const matriculaNormalizada = String(matricula ?? "").trim();
  if (!matriculaNormalizada) return { autorizado: false, motivo: "Informe a matrícula." };

  let alunoId = null;
  let turmaId = null;

  try {
    const alunosSnapshot = await get(ref(db, "alunos"));
    const alunos = [];

    alunosSnapshot.forEach((item) => {
      const aluno = item.val();
      if (String(aluno.matricula) === matriculaNormalizada) {
        alunos.push({ ...aluno, id: item.key });
      }
    });

    if (alunos.length === 0) {
      return finalizarAcesso(null, null, false, "Aluno não encontrado.");
    }
    if (alunos.length > 1) {
      return finalizarAcesso(null, null, false, "Matrícula duplicada.");
    }

    const aluno = alunos[0];
    alunoId = aluno.id;

    if (aluno.ativo !== true) {
      return finalizarAcesso(alunoId, null, false, "Aluno inativo.");
    }

    // Aluno ativo → procura a aula DELE pela correlação aluno → turma (disciplina) → aula de hoje
    // (js/academico.js). É o mesmo caminho que o ESP32 seguirá depois do reconhecimento facial.
    const achada = await aulaDoAlunoAgora(alunoId);

    if (achada) {
      const { turma, estado } = achada;
      turmaId = turma.id;
      let sala = null;
      if (turma.salaId) {
        const salaSnapshot = await get(ref(db, `salas/${turma.salaId}`));
        if (salaSnapshot.exists()) sala = salaSnapshot.val();
      }
      return finalizarAcesso(alunoId, turmaId, true, null, { ...turma, sala, estadoAula: estado });
    }

    // Sem aula hoje para este aluno. Com EXIGIR_AULA a catraca nega; sem, apenas libera sem turma.
    if (EXIGIR_AULA) return finalizarAcesso(alunoId, null, false, "Sem aula hoje para este aluno.");
    return finalizarAcesso(alunoId, null, true, null, null);
  } catch (erro) {
    console.error("Erro ao verificar acesso:", erro);
    return finalizarAcesso(alunoId, turmaId, false, "Não foi possível consultar o Firebase.");
  }
}