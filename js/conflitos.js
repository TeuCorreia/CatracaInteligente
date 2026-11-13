// ============================================================
// CONFLITOS DE TURMA — regras puras (sem Firebase, sem DOM)
//
// Modelo (já existente no banco):
//   disciplinas/{id} = { nome, professorId, alunoIds: [alunoId, ...] }   ← a "turma": um professor + seus alunos
//   turmas/{id}      = { disciplinaId?, disciplina, professorId?, salaId, data, horario, horarioFim, ... }   ← uma AULA marcada
//
// Dois tipos de conflito entre duas aulas no mesmo dia e horário:
//   • professor: o mesmo professor em duas aulas ao mesmo tempo;
//   • alunos:    pelo menos um aluno matriculado nas duas turmas ao mesmo tempo
//                (o caso clássico de "choque de horário" entre disciplinas);
//   • sala:      a mesma sala nas duas.
// Funciona igual no navegador e (futuramente) em qualquer outro cliente, como o ESP32/gateway.
// ============================================================
import { aulasSeSobrepoem, paraMinutos, faixa } from "./tempo.js";

/** Os alunos de uma disciplina, aceitando lista (formato atual) ou mapa {id:true} (formato do índice). */
export const idsDaDisciplina = (d) => (!d?.alunoIds ? [] : Array.isArray(d.alunoIds) ? d.alunoIds.filter(Boolean) : Object.keys(d.alunoIds));

const normalizar = (s) => String(s ?? "").trim().toLowerCase();

/**
 * Transforma as turmas (aulas marcadas) em aulas completas, ligadas à disciplina,
 * ao professor e ao conjunto de alunos. Aulas antigas, sem `disciplinaId`, são ligadas
 * pelo nome da disciplina quando ele identifica uma única disciplina.
 */
export function montarAulas({ turmas, disciplinas }) {
  const porId = new Map(disciplinas.map((d) => [d.id, d]));
  const porNome = new Map();
  for (const d of disciplinas) {
    const chave = normalizar(d.nome);
    porNome.set(chave, porNome.has(chave) ? null : d);       // nome repetido → ambíguo → não liga
  }
  return turmas.map((t) => {
    const d = porId.get(t.disciplinaId) ?? porNome.get(normalizar(t.disciplina ?? t.curso)) ?? null;
    return {
      id: t.id, data: t.data, ini: t.horario || "00:00", fim: t.horarioFim || null, salaId: t.salaId ?? null,
      disciplinaId: d?.id ?? null,
      nome: d?.nome ?? t.curso ?? t.disciplina ?? "Aula",
      professorId: t.professorId ?? d?.professorId ?? null,
      professorNome: t.professorNome ?? null,
      assunto: t.assunto ?? "",
      alunoIds: new Set(idsDaDisciplina(d)),
    };
  });
}

/** O que duas aulas têm em conflito (ou null se nada). Não compara datas: quem chama garante o mesmo dia. */
function conflitoEntre(a, b) {
  if (!aulasSeSobrepoem(a, b)) return null;
  const professor = !!a.professorId && a.professorId === b.professorId;
  const alunos = [...a.alunoIds].filter((id) => b.alunoIds.has(id));
  const sala = !!a.salaId && a.salaId === b.salaId;
  return professor || alunos.length || sala ? { professor, alunos, sala } : null;
}

/**
 * Conflitos de uma aula NOVA (ainda não gravada) com as aulas existentes.
 * @param nova  { data, ini, fim, salaId, professorId, alunoIds:Set|Array }
 * @returns [{ aula, professor, alunos:[alunoId], sala }]
 */
export function conflitosDaAula(nova, aulas, ignorarId = null) {
  const candidata = { ...nova, alunoIds: new Set(nova.alunoIds ?? []) };
  const lista = [];
  for (const aula of aulas) {
    if (aula.id === ignorarId || aula.data !== nova.data) continue;
    const c = conflitoEntre(candidata, aula);
    if (c) lista.push({ aula, ...c });
  }
  return lista;
}

/** Todos os conflitos entre aulas já marcadas: [{ a, b, professor, alunos, sala }], do dia mais antigo ao mais novo. */
export function conflitosGerais(aulas, { incluirSala = false } = {}) {
  const porData = new Map();
  for (const a of aulas) if (a.data) (porData.get(a.data) ?? porData.set(a.data, []).get(a.data)).push(a);
  const lista = [];
  for (const [, doDia] of [...porData].sort(([x], [y]) => x.localeCompare(y))) {
    for (let i = 0; i < doDia.length; i++) {
      for (let j = i + 1; j < doDia.length; j++) {
        const c = conflitoEntre(doDia[i], doDia[j]);
        if (c && (c.professor || c.alunos.length || (incluirSala && c.sala))) lista.push({ a: doDia[i], b: doDia[j], ...c });
      }
    }
  }
  return lista;
}

/**
 * A aula do aluno "agora": a que está acontecendo (ou começa em até `antecedenciaMin`),
 * senão a próxima do dia, senão a última que já acabou. `aulasDoDia` já deve ser só de uma data.
 * @returns { aula, estado: "agora" | "proxima" | "encerrada" } | null
 */
export function aulaDoAluno(aulasDoDia, alunoId, agoraMin, antecedenciaMin = 30) {
  const dele = aulasDoDia.filter((a) => a.alunoIds.has(alunoId)).sort((a, b) => paraMinutos(a.ini) - paraMinutos(b.ini));
  const agora = dele.find((a) => { const [i, f] = faixa(a); return agoraMin >= i - antecedenciaMin && agoraMin < f; });
  if (agora) return { aula: agora, estado: "agora" };
  const proxima = dele.find((a) => faixa(a)[0] > agoraMin);
  if (proxima) return { aula: proxima, estado: "proxima" };
  return dele.length ? { aula: dele[dele.length - 1], estado: "encerrada" } : null;
}

// ---------- textos prontos para a tela ----------
const horario = (a) => `${a.ini}${a.fim ? "–" + a.fim : ""}`;
const listaCurta = (nomes, max = 3) => (nomes.length <= max ? nomes.join(", ") : `${nomes.slice(0, max).join(", ")} e mais ${nomes.length - max}`);

/**
 * Descreve conflitos para exibição. `contexto`: { alunoPorId:Map, salaPorId:Map }.
 * Devolve frases curtas, uma por problema.
 */
export function descreverConflitos(conflitos, { alunoPorId = new Map(), salaPorId = new Map() } = {}) {
  const frases = [];
  for (const c of conflitos) {
    const outra = c.aula ?? c.b;
    const sala = salaPorId.get(outra.salaId);
    const onde = sala ? `, sala ${sala.numero}` : "";
    if (c.professor) frases.push(`o professor já tem "${outra.nome}" (${horario(outra)}${onde})`);
    if (c.alunos.length) {
      const nomes = c.alunos.map((id) => alunoPorId.get(id)?.nome ?? "aluno removido");
      frases.push(`${c.alunos.length} aluno${c.alunos.length > 1 ? "s" : ""} com aula de "${outra.nome}" (${horario(outra)}${onde}): ${listaCurta(nomes)}`);
    }
    if (c.sala) frases.push(`a sala já está ocupada por "${outra.nome}" (${horario(outra)})`);
  }
  return [...new Set(frases)];   // a mesma aula marcada duas vezes não repete a frase
}
