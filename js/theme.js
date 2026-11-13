// ============================================================
// TEMA CLARO / ESCURO — switch fixo, visível em qualquer página
//
// Uso: <script src="js/theme.js"></script> no <head> (aplica o tema antes de
// pintar a página, evitando "flash"). Não precisa de css/style.css.
//
// - Guarda a escolha em localStorage ("tema_catraca"); sem escolha, segue o sistema.
// - Mantém as abas abertas sincronizadas (evento "storage").
// - Avisa quem precisar reagir (ex.: cena 3D) com o evento "temachange" no
//   document: event.detail.escuro === true | false. Também há window.Tema.escuro().
// ============================================================
(function () {
  const KEY = "tema_catraca";
  const root = document.documentElement;
  const sistema = matchMedia("(prefers-color-scheme: dark)");

  const guardado = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const escuro = () => root.dataset.theme === "dark";

  function aplicar(tema) {
    const mudou = root.dataset.theme !== tema;
    root.dataset.theme = tema;
    const botao = document.getElementById("tema-switch");
    if (botao) {
      botao.setAttribute("aria-checked", String(tema === "dark"));
      botao.title = tema === "dark" ? "Mudar para o modo claro" : "Mudar para o modo escuro";
    }
    if (mudou) document.dispatchEvent(new CustomEvent("temachange", { detail: { escuro: tema === "dark" } }));
  }

  function definir(tema) {
    try { localStorage.setItem(KEY, tema); } catch { /* sem armazenamento: vale só nesta página */ }
    aplicar(tema);
  }

  aplicar(guardado() || (sistema.matches ? "dark" : "light"));
  window.Tema = { escuro, alternar: () => definir(escuro() ? "light" : "dark") };

  // Sem escolha manual, acompanha o sistema; com escolha, sincroniza entre abas.
  sistema.addEventListener("change", (e) => { if (!guardado()) aplicar(e.matches ? "dark" : "light"); });
  addEventListener("storage", (e) => { if (e.key === KEY && e.newValue) aplicar(e.newValue); });

  const CSS = `
    #tema-switch { all: unset; box-sizing: border-box; position: fixed; top: 14px; right: 14px; z-index: 99999;
      width: 68px; height: 34px; border-radius: 999px; cursor: pointer; background: var(--c-surface, #ececef); border: 1px solid var(--c-line, rgba(0,0,0,.14));
      transition: background .25s; display: block; }
    #tema-switch:focus-visible { outline: 3px solid var(--c-action, #1a4be0); outline-offset: 2px; }
    #tema-switch[aria-checked="true"] { background: #2a2b31; border-color: rgba(255,255,255,.2); }
    #tema-switch .ic { position: absolute; top: 50%; transform: translateY(-50%); font-size: 15px; line-height: 1; opacity: .9; }
    #tema-switch .sol { left: 8px; } #tema-switch .lua { right: 8px; }
    #tema-switch .bola { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4); transition: transform .25s; }
    #tema-switch[aria-checked="true"] .bola { transform: translateX(34px); background: #e8ecf5; }
    @media (max-width: 520px) { #tema-switch { top: 8px; right: 8px; transform: scale(.85); transform-origin: top right; } }`;

  document.addEventListener("DOMContentLoaded", () => {
    const estilo = document.createElement("style");
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    const botao = document.createElement("button");
    botao.id = "tema-switch";
    botao.type = "button";
    botao.setAttribute("role", "switch");
    botao.setAttribute("aria-label", "Modo escuro");
    botao.innerHTML = '<span class="ic sol">☀️</span><span class="ic lua">🌙</span><span class="bola"></span>';
    botao.addEventListener("click", () => window.Tema.alternar());
    document.body.appendChild(botao);
    aplicar(root.dataset.theme); // sincroniza aria-checked do botão recém-criado
  });
})();
