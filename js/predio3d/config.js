// ============================================================
// PRÉDIO 3D — constantes e regras de domínio (sem Three.js)
// ============================================================

// Medidas em metros "de cena"
export const RW = 4.4;     // largura de cada sala (módulo estrutural)
export const RD = 3.8;     // profundidade da sala
export const COR = 2.2;    // largura do corredor
export const PAD = .5;     // folga entre as salas e a fachada
export const FH = 3.7;     // altura de um andar (piso a piso)
export const WH = 3.2;     // altura das paredes
export const T = .12;      // espessura do piso da sala
export const SALA_L = RW - .14;   // largura útil da sala (deixa a espessura das divisórias)
export const SALA_P = RD;         // profundidade útil

// Contornos dos módulos: evitam o azul/ciano/laranja/violeta usados nos estados e na seleção.
export const CORES_MODULO = [0x6fbf4a, 0xe5527a, 0xc9a227, 0x8d6e63, 0x2e9e8f, 0x5d6b82];

// ÚNICA fonte das cores de estado (JS e CSS leem daqui). Paleta azul/laranja: distinguível por daltônicos;
// cada estado também tem ícone/texto no rótulo, então a cor nunca é o único sinal.
export const STATUS = {
  livre:   { hex: 0x46c6e8, css: "#46c6e8", texto: "✓ livre", leitor: "livre" },
  ocupada: { hex: 0xff9d42, css: "#ff9d42", texto: "● ocupada", leitor: "ocupada no horário" },
  parcial: { hex: 0xffd54a, css: "#ffd54a", texto: "◐ outro horário", leitor: "com aula em outro horário" },
};
export const SELECAO = { hex: 0x1a4be0, css: "#1a4be0" };   // = azul de ação do sistema (css/tokens.css)

/** Tipo de ambiente deduzido da capacidade (o cadastro só guarda a capacidade). */
export const tipoDe = (capacidade) => (capacidade >= 100 ? "Auditório" : capacidade <= 12 ? "Sala de reunião" : "Sala de aula");

/** Converte os registros do Firebase em salas prontas para desenhar. */
export function normalizarSalas(brutas) {
  return brutas.map((s) => {
    const capacidade = Number(s.capacidade) || 0;
    return {
      ...s,
      andar: Number(s.andar) || 0,
      modulo: String(s.modulo ?? "?").trim().toUpperCase() || "?",
      capacidade,
      tipo: tipoDe(capacidade),
    };
  });
}

/** Ordem no corredor: pelo número da sala, para a sequência ficar sempre consistente. */
export const porNumero = (a, b) =>
  Number(a.numero) - Number(b.numero) || String(a.numero).localeCompare(String(b.numero), "pt-BR", { numeric: true });
