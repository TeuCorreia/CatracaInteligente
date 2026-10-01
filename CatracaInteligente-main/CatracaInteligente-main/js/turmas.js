// ============================================================
// TURMAS / ALOCAÇÃO -- Professor — responsável: Davi
// ============================================================
// O que você precisa aprender aqui: como ligar um formulário HTML
// a uma escrita no Firebase, e como ler uma lista já existente
// (nesse caso, a lista de salas que o Murilo criou) para popular
// um <select>.
//
// Tutorial recomendado:
// https://firebase.google.com/docs/database/web/read-and-write
// ============================================================

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Lê as salas cadastradas (dependência do trabalho do Murilo)
export function escutarSalasParaSelect(callback) {
  onValue(ref(db, "salas"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.entries(data).map(([id, sala]) => ({ id, ...sala })));
  });
}

// Cria uma alocação de turma (professor escolhe sala/módulo/andar/data)
export function criarTurma({ disciplina, professorId, salaId, data, horario }) {
  return push(ref(db, "turmas"), {
    disciplina,
    professorId,
    salaId,
    data,
    horario,
  });
}

// TODO (Davi): no formulário real, "disciplina" e "professorId" deveriam
// vir de um select carregado da coleção "disciplinas" / "professores",
// e não de um campo de texto livre como está no rascunho abaixo.
// Por enquanto, deixamos como texto simples pra você focar em aprender
// o fluxo de leitura + escrita primeiro.

// TODO (Davi): pensar com o Emerson como a turma vai ser "encontrada"
// pelo aluno.html na hora do acesso (provavelmente filtrando por data +
// horário atual).
