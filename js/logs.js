import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast,
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

// Chama o callback novamente quando a turma mudar; retorna a função para parar de escutar.
export function escutarTurma(turmaId, callback, aoFalhar) {
  return onValue(
    ref(db, `turmas/${turmaId}`),
    (snapshot) => callback(snapshot.exists() ? { ...snapshot.val(), id: turmaId } : null),
    aoFalhar
  );
}

// Opcional: acompanha os registros mais recentes, com o mais novo primeiro.
export function escutarUltimosLogs(callback, quantidade = 20, aoFalhar) {
  const limite = Number.isInteger(quantidade) && quantidade > 0 ? quantidade : 20;
  const consulta = query(ref(db, "logs_acesso"), orderByChild("timestamp"), limitToLast(limite));

  return onValue(
    consulta,
    (snapshot) => {
      const logs = [];
      snapshot.forEach((item) => logs.push({ ...item.val(), id: item.key }));
      callback(logs.reverse());
    },
    aoFalhar
  );
}