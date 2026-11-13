// ============================================================
// ACADÊMICO — leitura combinada do banco, índice de vínculos e "aula do aluno agora"
//
// CONTRATO DE DADOS (usado pelo site e, no futuro, pelo ESP32 da catraca):
//
//   alunos/{alunoId}                     = { nome, matricula, faceId, ativo }
//   disciplinas/{discId}                 = { nome, professorId, alunoIds: [alunoId...] }   ← fonte da verdade ("a turma")
//   alunos_disciplinas/{alunoId}/{discId}= true                                              ← ÍNDICE derivado, para consulta rápida
//   turmas/{turmaId}                     = { disciplinaId, salaId, data, horario, horarioFim, professorId, ... }   ← uma AULA marcada
//
// O índice existe porque o Realtime Database não consulta "dentro" de listas: com ele, o firmware faz
// 3 leituras curtas (ver aulaDoAlunoAgora) em vez de baixar o banco inteiro.
// ============================================================
import { db } from "./firebase-config.js";
import {
  ref, get, onValue, update, query, orderByChild, equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { montarAulas, idsDaDisciplina, aulaDoAluno } from "./conflitos.js";
import { paraMinutos } from "./tempo.js";
import { hojeISO } from "./util.js";

const RAIZES = ["alunos", "disciplinas", "professores", "turmas", "salas", "alunos_disciplinas"];
const comoLista = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));

// ---------- leitura combinada em tempo real ----------

/**
 * Escuta tudo o que as telas de turma/aluno precisam e chama `callback(estado)` a cada mudança
 * (só depois que todas as coleções chegaram). Devolve a função que cancela as escutas.
 * estado = { alunos, disciplinas, professores, turmas, salas, vinculos, aulas, alunoPorId, disciplinaPorId, professorPorId, salaPorId }
 */
export function escutarAcademico(callback, aoFalhar) {
  const dados = {}, faltam = new Set(RAIZES);
  const cancelar = RAIZES.map((nome) => onValue(ref(db, nome), (snap) => {
    dados[nome] = nome === "alunos_disciplinas" ? snap.val() || {} : comoLista(snap.val());
    faltam.delete(nome);
    if (!faltam.size) callback(montarEstado(dados));
  }, aoFalhar));
  return () => cancelar.forEach((c) => c());
}

function montarEstado(d) {
  const mapa = (lista) => new Map(lista.map((x) => [x.id, x]));
  return {
    alunos: d.alunos, disciplinas: d.disciplinas, professores: d.professores, turmas: d.turmas, salas: d.salas,
    vinculos: d.alunos_disciplinas,
    aulas: montarAulas({ turmas: d.turmas, disciplinas: d.disciplinas }),
    alunoPorId: mapa(d.alunos), disciplinaPorId: mapa(d.disciplinas), professorPorId: mapa(d.professores), salaPorId: mapa(d.salas),
  };
}

// ---------- índice alunos_disciplinas (derivado de disciplinas.alunoIds) ----------

/** Caminhos a gravar para refletir a troca de alunos de uma disciplina (true = vincula, null = remove). */
export function camposDeVinculo(disciplinaId, antes = [], depois = []) {
  const campos = {}, a = new Set(antes), d = new Set(depois);
  for (const id of a) if (!d.has(id)) campos[`alunos_disciplinas/${id}/${disciplinaId}`] = null;
  for (const id of d) if (!a.has(id)) campos[`alunos_disciplinas/${id}/${disciplinaId}`] = true;
  return campos;
}

/** Grava vários caminhos de uma vez (atômico). Não faz nada se não houver o que gravar. */
export const gravarCampos = (campos) => (Object.keys(campos).length ? update(ref(db), campos) : Promise.resolve());

/** Diferença entre o índice guardado e o que as disciplinas dizem: caminhos para corrigi-lo. */
export function camposDeReconstrucao(disciplinas, vinculos = {}) {
  const esperado = {};
  for (const d of disciplinas) for (const id of idsDaDisciplina(d)) (esperado[id] ??= {})[d.id] = true;
  const campos = {};
  for (const [alunoId, discs] of Object.entries(esperado)) for (const discId of Object.keys(discs)) {
    if (!vinculos[alunoId]?.[discId]) campos[`alunos_disciplinas/${alunoId}/${discId}`] = true;
  }
  for (const [alunoId, discs] of Object.entries(vinculos)) for (const discId of Object.keys(discs)) {
    if (!esperado[alunoId]?.[discId]) campos[`alunos_disciplinas/${alunoId}/${discId}`] = null;
  }
  return campos;
}

/** Remove o aluno de todas as turmas e do índice (usado ao apagar um aluno). */
export async function desvincularAluno(alunoId) {
  const snap = await get(ref(db, "disciplinas"));
  const campos = { [`alunos_disciplinas/${alunoId}`]: null };
  for (const d of comoLista(snap.val())) {
    const ids = idsDaDisciplina(d);
    if (ids.includes(alunoId)) campos[`disciplinas/${d.id}/alunoIds`] = ids.filter((x) => x !== alunoId);
  }
  return update(ref(db), campos);
}

// A consulta por "data" só funciona se as regras do banco tiverem  "turmas": { ".indexOn": ["data"] }.
// Sem esse índice o Firebase recusa a consulta ("Index not defined"); então caímos para ler as turmas
// e filtrar aqui (correto, só menos econômico). A decisão é lembrada para não repetir a tentativa.
let consultaIndexada = true;
async function turmasDoDia(data) {
  if (consultaIndexada) {
    try { return comoLista((await get(query(ref(db, "turmas"), orderByChild("data"), equalTo(data)))).val()); }
    catch (erro) { if (!/index not defined/i.test(String(erro?.message))) throw erro; consultaIndexada = false; }
  }
  return comoLista((await get(ref(db, "turmas"))).val()).filter((t) => t.data === data);
}

// ---------- "qual é a aula deste aluno agora?" (a mesma lógica que o ESP32 vai seguir) ----------

/**
 * Passos (todos leituras curtas; o firmware faz o mesmo por REST — ver README):
 *   1. alunos_disciplinas/{alunoId}                       → ids das turmas do aluno
 *   2. turmas com data == hoje (consulta indexada; ver turmasDoDia) → aulas de hoje
 *   3. disciplinas/{id} de cada turma do aluno            → nome (liga aulas antigas, sem disciplinaId)
 * @returns { turma, aula, estado:"agora"|"proxima"|"encerrada" } | null   (turma = registro bruto de turmas/{id})
 */
export async function aulaDoAlunoAgora(alunoId, agora = new Date()) {
  const vinculadas = Object.keys((await get(ref(db, `alunos_disciplinas/${alunoId}`))).val() || {});
  if (!vinculadas.length) return null;

  const [turmas, disciplinas] = await Promise.all([
    turmasDoDia(hojeISO(agora)),
    Promise.all(vinculadas.map(async (id) => ({ id, ...(await get(ref(db, `disciplinas/${id}`))).val() }))),
  ]);
  const aulas = montarAulas({ turmas, disciplinas });
  const achada = aulaDoAluno(aulas, alunoId, agora.getHours() * 60 + agora.getMinutes());
  return achada && { ...achada, turma: turmas.find((t) => t.id === achada.aula.id) };
}

// ---------- utilitários de leitura para as telas ----------

/** Próximas aulas (de hoje em diante) de um conjunto de disciplinas, em ordem. */
export function proximasAulas(aulas, disciplinaIds, limite = 20, hoje = hojeISO()) {
  const alvo = new Set(disciplinaIds);
  return aulas
    .filter((a) => alvo.has(a.disciplinaId) && a.data >= hoje)
    .sort((x, y) => x.data.localeCompare(y.data) || paraMinutos(x.ini) - paraMinutos(y.ini))
    .slice(0, limite);
}
