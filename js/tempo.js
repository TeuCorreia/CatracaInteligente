// ============================================================
// TEMPO — funções puras de horário (sem Firebase, sem DOM)
// Compartilhadas pela reserva de salas, pelos conflitos e pela catraca.
// ============================================================

export const DURACAO_PADRAO_MIN = 100;   // aula antiga sem horário de fim

/** "19:30" → 1170 (minutos desde 00:00). */
export const paraMinutos = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};

/** 1170 → "19:30". */
export const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Faixa [início, fim) em minutos de uma aula { ini, fim? }. */
export const faixa = (aula) => [
  paraMinutos(aula.ini),
  aula.fim ? paraMinutos(aula.fim) : paraMinutos(aula.ini) + DURACAO_PADRAO_MIN,
];

/** true se a aula se sobrepõe ao intervalo [ini, fim) (strings "HH:MM"). */
export function sobrepoe(aula, ini, fim) {
  const [ai, af] = faixa(aula);
  return paraMinutos(ini) < af && paraMinutos(fim) > ai;
}

/** true se duas aulas { ini, fim? } se sobrepõem no tempo (a data é comparada por quem chama). */
export function aulasSeSobrepoem(a, b) {
  const [ai, af] = faixa(a), [bi, bf] = faixa(b);
  return ai < bf && bi < af;
}
