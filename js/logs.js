import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const statusValidos = new Set(["liberado", "negado"]);

export function registrarLog({ alunoId = null, turmaId = null, status }) {
  if (!statusValidos.has(status)) {
    throw new Error(`Status de acesso inválido: ${status}`);
  }

  return push(ref(db, "logs_acesso"), {
    alunoId: alunoId || null,
    turmaId: turmaId || null,
    status,
    timestamp: Date.now(),
  });
}

// Escuta em tempo real os dados de UMA turma específica, pra mostrar
// na tela do aluno assim que o professor alterar algo (ex: trocou de sala).
// Chama o callback novamente quando a turma mudar; retorna a função para parar de escutar.
export function escutarTurma(turmaId, callback, aoFalhar) {
  const turmaRef = ref(db, `turmas/${turmaId}`);

  return onValue(
    turmaRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const turma = { ...snapshot.val(), id: turmaId };

      if (!turma.salaId) {
        callback(turma);
        return;
      }

      // Resolve os dados da sala (numero, modulo, andar) junto da turma
      onValue(ref(db, `salas/${turma.salaId}`), (salaSnap) => {
        const sala = salaSnap.val();
        callback({
          ...turma,
          sala: sala ? sala.numero : "Não encontrada",
          modulo: sala ? sala.modulo : "—",
          andar: sala ? sala.andar : "—",
        });
      });
    },
    aoFalhar
  );
}

// Opcional: acompanha os registros mais recentes, com o mais novo primeiro.
export function escutarUltimosLogs(callback, quantidade = 20, aoFalhar) {
  const limite = Number.isInteger(quantidade) && quantidade > 0 ? quantidade : 20;
  const refLogs = ref(db, "logs_acesso");

  return onValue(
    refLogs,
    (snapshot) => {
      const logs = [];
      snapshot.forEach((item) => logs.push({ ...item.val(), id: item.key }));
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(logs.slice(0, limite));
    },
    aoFalhar
  );
}