import { db } from "./firebase-config.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { registrarLog } from "./logs.js";

const DURACAO_AULA_MINUTOS = 60;

function dataLocalHoje(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function horarioEmMinutos(horario) {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(horario ?? ""));
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
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
    const consultaAluno = query(ref(db, "alunos"), orderByChild("matricula"), equalTo(matriculaNormalizada));
    const alunosSnapshot = await get(consultaAluno);
    const alunos = [];

    alunosSnapshot.forEach((item) => alunos.push({ ...item.val(), id: item.key }));

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

    const agora = new Date();
    const hoje = dataLocalHoje(agora);
    const minutoAtual = agora.getHours() * 60 + agora.getMinutes();
    const consultaTurmas = query(ref(db, "turmas"), orderByChild("data"), equalTo(hoje));
    const turmasSnapshot = await get(consultaTurmas);
    const turmasAtivas = [];

    turmasSnapshot.forEach((item) => {
      const turma = item.val();
      const inicio = horarioEmMinutos(turma.horario);
      if (inicio === null) return;

      // Temporário: considera a aula ativa por 60 minutos após o horário inicial.
      if (minutoAtual >= inicio && minutoAtual < inicio + DURACAO_AULA_MINUTOS) {
        turmasAtivas.push({ ...turma, id: item.key });
      }
    });

    if (turmasAtivas.length === 0) {
      return finalizarAcesso(alunoId, null, false, "Nenhuma turma está acontecendo agora.");
    }
    if (turmasAtivas.length > 1) {
      return finalizarAcesso(alunoId, null, false, "Há mais de uma turma ativa neste horário.");
    }

    const turma = turmasAtivas[0];
    turmaId = turma.id;

    if (!turma.salaId) {
      return finalizarAcesso(alunoId, turmaId, false, "A turma não tem sala cadastrada.");
    }

    const salaSnapshot = await get(ref(db, `salas/${turma.salaId}`));
    if (!salaSnapshot.exists()) {
      return finalizarAcesso(alunoId, turmaId, false, "Sala não encontrada.");
    }

    return finalizarAcesso(alunoId, turmaId, true, null, {
      ...turma,
      sala: salaSnapshot.val(),
    });
  } catch (erro) {
    console.error("Erro ao verificar acesso:", erro);
    return finalizarAcesso(alunoId, turmaId, false, "Não foi possível consultar o Firebase.");
  }
}