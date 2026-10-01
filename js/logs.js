// ============================================================
// LOGS DE ACESSO / LISTENER EM TEMPO REAL -- Aluno — responsável: Isaque
// ============================================================
// O que você precisa aprender aqui: como "escutar" uma mudança no
// Firebase em tempo real (onValue) e reagir a ela na tela, sem
// precisar recarregar a página. Esse é o conceito central da parte
// de "tempo real" que o projeto exige.
//
// Tutorial recomendado:
// https://firebase.google.com/docs/database/web/read-and-write#listen_for_value_events
// ============================================================

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Registra um log de acesso (liberado ou negado)
export function registrarLog({ alunoId, turmaId, status }) {
  return push(ref(db, "logs_acesso"), {
    alunoId,
    turmaId: turmaId || null,
    status, // "liberado" ou "negado"
    timestamp: Date.now(),
  });
}

// Escuta em tempo real os dados de UMA turma específica, pra mostrar
// na tela do aluno assim que o professor alterar algo (ex: trocou de sala).
// Também resolve a sala da turma (salaId -> dados da sala) e devolve uma
// função para parar de escutar.
export function escutarTurma(turmaId, callback) {
  let pararSala = null;

  const pararTurma = onValue(ref(db, `turmas/${turmaId}`), (snapshot) => {
    const turma = snapshot.val();

    if (!turma) {
      callback(null);
      return;
    }

    if (pararSala) pararSala();

    if (turma.salaId) {
      pararSala = onValue(ref(db, `salas/${turma.salaId}`), (salaSnap) => {
        const sala = salaSnap.val();
        callback({
          ...turma,
          id: turmaId,
          sala: sala ? sala.numero : "Não encontrada",
          modulo: sala ? sala.modulo : "—",
          andar: sala ? sala.andar : "—",
        });
      });
    } else {
      callback({ ...turma, id: turmaId });
    }
  });

  return () => {
    pararTurma();
    if (pararSala) pararSala();
  };
}

// TODO (Isaque): criar também uma função "escutarUltimosLogs" que lista
// os últimos acessos na tela (bom pra mostrar numa tela de "monitoramento"
// se o grupo quiser evoluir o projeto depois).

// TODO (Isaque): decidir com o Emerson o que fazer quando "status" for
// "negado" — hoje o log é salvo, mas a tela do aluno.html só mostra uma
// mensagem simples de acesso negado.
