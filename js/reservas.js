// ============================================================
// RESERVAS — aulas alocadas em salas (coleção "turmas" do Firebase)
//
// turmas/{id} = { disciplina, curso, assunto, disciplinaId|null, professorId|null, professorNome,
//                 salaId, data: "AAAA-MM-DD", horario: "HH:MM", horarioFim, criadoPor }
// "disciplina" guarda o nome do curso para continuar compatível com a tela do aluno e com a
// catraca. Quando a aula é de uma TURMA cadastrada (disciplinas/{id}), `disciplinaId` liga a aula
// aos alunos dela: é assim que o sistema acha os conflitos e a aula de cada aluno.
// ============================================================
import { db } from "./firebase-config.js";
import { ref, onValue, push, remove, get, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { hojeISO } from "./util.js";
import { paraMinutos, sobrepoe, faixa } from "./tempo.js";
import { montarAulas, conflitosDaAula, descreverConflitos, idsDaDisciplina } from "./conflitos.js";

export { paraMinutos, sobrepoe };   // mantidos aqui: outras telas já importam daqui

const comoLista = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));

/** Lê todas as turmas em tempo real. Devolve a função que cancela a escuta. */
export function escutarTurmas(callback, aoFalhar) {
  return onValue(ref(db, "turmas"), (snap) => callback(comoLista(snap.val())), aoFalhar);
}

/**
 * Agrupa as aulas de uma data por sala: Map(salaId → aulas ordenadas por horário).
 * `professores`: Map(id → nome), usado quando a turma só tem o professorId.
 * `disciplinas`: Map(id → disciplina), usado para mostrar quantos alunos a turma tem.
 */
export function aulasPorSala(turmas, data, professores = new Map(), disciplinas = new Map()) {
  const porSala = new Map();
  for (const t of turmas) {
    if (t.data !== data || !t.salaId) continue;
    const disc = disciplinas.get(t.disciplinaId);
    const aula = {
      id: t.id,
      ini: t.horario || "00:00",
      fim: t.horarioFim || null,
      curso: t.curso || t.disciplina || "Aula",
      assunto: t.assunto || "",
      prof: t.professorNome || professores.get(t.professorId ?? disc?.professorId) || "—",
      criadoPor: t.criadoPor ?? null,
      disciplinaId: t.disciplinaId ?? null,
      professorId: t.professorId ?? disc?.professorId ?? null,
      nAlunos: disc ? idsDaDisciplina(disc).length : null,
    };
    (porSala.get(t.salaId) ?? porSala.set(t.salaId, []).get(t.salaId)).push(aula);
  }
  for (const aulas of porSala.values()) aulas.sort((a, b) => a.ini.localeCompare(b.ini));
  return porSala;
}

/**
 * Conflitos de turma de uma aula NOVA, descritos em frases: professor ocupado e alunos que já têm
 * outra aula no mesmo horário. `contexto` = { turmas, disciplinas, alunos, salas } (listas do Firebase).
 * Com `disciplinaId`: checa o professor da turma E os alunos dela. Só com `professorId` (aula sem turma
 * vinculada): checa apenas o professor. Sem nenhum dos dois não há o que checar (devolve []).
 */
export function conflitosDeTurma({ disciplinaId, professorId = null, data, ini, fim, salaId }, contexto) {
  if ((!disciplinaId && !professorId) || !data || !ini || !fim || fim <= ini) return [];
  const disciplina = contexto.disciplinas.find((d) => d.id === disciplinaId) ?? null;
  if (disciplinaId && !disciplina) return [];
  const aulas = montarAulas({ turmas: contexto.turmas, disciplinas: contexto.disciplinas });
  const achados = conflitosDaAula(
    { data, ini, fim, salaId: null, professorId: disciplina?.professorId ?? professorId, alunoIds: disciplina ? idsDaDisciplina(disciplina) : [] }, aulas   // sala: checada à parte
  ).filter((c) => c.professor || c.alunos.length);
  return descreverConflitos(achados, {
    alunoPorId: new Map(contexto.alunos.map((a) => [a.id, a])),
    salaPorId: new Map(contexto.salas.map((s) => [s.id, s])),
  });
}

/**
 * Reserva uma sala. Valida os dados e recusa:
 *   • horários que se sobrepõem às `aulasDaSala` (a sala já está ocupada);
 *   • com `disciplinaId` + `contexto`: o professor ocupado e alunos da turma que já têm outra aula no horário.
 * Lança Error com mensagem pronta para exibir ao usuário.
 */
export function reservarSala(
  { salaId, data, curso, assunto, professor, ini, fim, usuario, professorId = null, disciplinaId = null },
  aulasDaSala = [],
  contexto = null
) {
  if (!salaId || !data) throw new Error("Escolha a sala e a data.");
  if (data < hojeISO()) throw new Error("Não é possível reservar em uma data que já passou.");
  if (![curso, assunto, professor].every((v) => String(v ?? "").trim())) throw new Error("Preencha professor, curso e assunto.");
  if (!ini || !fim || paraMinutos(fim) <= paraMinutos(ini)) throw new Error("O fim deve ser depois do início.");

  const [i, f] = [paraMinutos(ini), paraMinutos(fim)];
  const conflito = aulasDaSala.find((a) => { const [ai, af] = faixa(a); return i < af && f > ai; });
  if (conflito) throw new Error(`Conflito com ${conflito.curso} (${conflito.ini}${conflito.fim ? "–" + conflito.fim : ""}).`);

  if ((disciplinaId || professorId) && contexto) {
    const problemas = conflitosDeTurma({ disciplinaId, professorId, data, ini, fim, salaId }, contexto);
    if (problemas.length) throw new Error(`Choque de turma: ${problemas.join("; ")}.`);
  }

  return push(ref(db, "turmas"), {
    disciplina: curso.trim(),
    curso: curso.trim(),
    assunto: assunto.trim(),
    disciplinaId,
    professorId,
    professorNome: professor.trim(),
    salaId,
    data,
    horario: ini,
    horarioFim: fim,
    criadoPor: usuario || null,
  });
}

export const liberarAula = (id) => remove(ref(db, `turmas/${id}`));

/**
 * Valida (sem gravar) uma mudança de horário/sala de uma aula já marcada: devolve as frases de problema
 * (sala ocupada, professor ou alunos em outra aula). Ignora a própria aula. `contexto` = { turmas, disciplinas, alunos, salas }.
 */
export function problemasDeReagendar(id, { ini, fim, salaId }, contexto) {
  const turma = contexto.turmas.find((t) => t.id === id);
  if (!turma) return ["Aula não encontrada."];
  if (!ini || !fim || paraMinutos(fim) <= paraMinutos(ini)) return ["O fim deve ser depois do início."];
  const outras = { ...contexto, turmas: contexto.turmas.filter((t) => t.id !== id) };

  const problemas = [];
  const naSala = aulasPorSala(outras.turmas, turma.data).get(salaId) ?? [];
  const [i, f] = [paraMinutos(ini), paraMinutos(fim)];
  const choqueSala = naSala.find((a) => { const [ai, af] = faixa(a); return i < af && f > ai; });
  if (choqueSala) problemas.push(`a sala já tem ${choqueSala.curso} (${choqueSala.ini}${choqueSala.fim ? "–" + choqueSala.fim : ""})`);

  const disciplinaId = montarAulas({ turmas: [turma], disciplinas: contexto.disciplinas })[0]?.disciplinaId ?? null;
  problemas.push(...conflitosDeTurma({ disciplinaId, professorId: turma.professorId ?? null, data: turma.data, ini, fim, salaId }, outras));
  return problemas;
}

/** Muda o horário e/ou a sala de uma aula marcada, recusando se criar conflito. */
export async function reagendarAula(id, { ini, fim, salaId }, contexto) {
  const problemas = problemasDeReagendar(id, { ini, fim, salaId }, contexto);
  if (problemas.length) throw new Error(`Não foi possível mudar: ${problemas.join("; ")}.`);
  return update(ref(db, `turmas/${id}`), { horario: ini, horarioFim: fim, salaId });
}

/** Quantas aulas (de hoje em diante) estão marcadas numa sala; usado antes de removê-la. */
export async function contarReservasFuturas(salaId) {
  const snap = await get(ref(db, "turmas"));
  const hoje = hojeISO();
  return Object.values(snap.val() || {}).filter((t) => t.salaId === salaId && t.data >= hoje).length;
}

/**
 * Alocação feita pela Área do Professor (professor.html): lê o estado atual do banco e grava com a
 * MESMA regra do prédio 3D (sala ocupada + choque de turma).
 */
export async function alocarTurma({ disciplina, disciplinaId = null, professorId, professorNome, salaId, data, ini, fim, usuario }) {
  const [turmas, disciplinas, alunos, salas] = await Promise.all(
    ["turmas", "disciplinas", "alunos", "salas"].map(async (nome) => comoLista((await get(ref(db, nome))).val()))
  );
  const aulasDaSala = aulasPorSala(turmas, data).get(salaId) ?? [];
  return reservarSala(
    { salaId, data, curso: disciplina, assunto: disciplina, professor: professorNome || "—", ini, fim, usuario, professorId: professorId || null, disciplinaId },
    aulasDaSala,
    { turmas, disciplinas, alunos, salas }
  );
}
