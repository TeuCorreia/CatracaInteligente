import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { registrarLog } from "./logs.js";

function dataLocalHoje(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

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

    // Aluno ativo → acesso liberado. Tenta vincular a turma do dia para exibição,
    // mas a presença de turma ativa NÃO bloqueia o acesso.
    const hoje = dataLocalHoje(new Date());
    const turmasSnapshot = await get(ref(db, "turmas"));
    const turmas = [];

    turmasSnapshot.forEach((item) => {
      turmas.push({ ...item.val(), id: item.key });
    });

    const turma = turmas.find((t) => t.data === hoje) || turmas[0] || null;

    if (turma) {
      turmaId = turma.id;
      let sala = null;
      if (turma.salaId) {
        const salaSnapshot = await get(ref(db, `salas/${turma.salaId}`));
        if (salaSnapshot.exists()) sala = salaSnapshot.val();
      }
      return finalizarAcesso(alunoId, turmaId, true, null, { ...turma, sala });
    }

    return finalizarAcesso(alunoId, null, true, null, null);
  } catch (erro) {
    console.error("Erro ao verificar acesso:", erro);
    return finalizarAcesso(alunoId, turmaId, false, "Não foi possível consultar o Firebase.");
  }
}