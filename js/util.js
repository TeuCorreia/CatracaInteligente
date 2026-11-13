// ============================================================
// UTILITÁRIOS COMPARTILHADOS
// ============================================================

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapa texto para uso seguro dentro de innerHTML (dados do banco são texto livre). */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Nome amigável do andar: 0 → "Térreo", 2 → "2º andar". */
export const andarNome = (andar) => (Number(andar) === 0 ? "Térreo" : `${Number(andar)}º andar`);

/** "Ana" → "Prof. Ana"; nomes que já trazem o título ("Prof. Ana") ficam como estão. */
export const comTitulo = (nome) => (/^\s*prof(?:a|\.|essor|essora)?\b/i.test(String(nome ?? "")) ? String(nome).trim() : `Prof. ${String(nome ?? "—").trim()}`);

/** Data local de hoje no formato AAAA-MM-DD (o que o <input type="date"> espera). */
export function hojeISO(data = new Date()) {
  const d = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
