// ============================================================
// PRÉDIO 3D — painel lateral
//   • sem sala escolhida: (professor) "Suas aulas" com onde ele vai dar aula + "Encontrar sala"
//   • com sala escolhida: detalhes, linha do tempo do dia e, SÓ PARA O ADMIN, o formulário de alocação
//
// Quem aloca é o administrador: ele escolhe o professor, a turma dele, o assunto e o horário.
// O professor apenas vê (somente leitura) onde e quando vai dar aula.
//
// As estruturas são montadas uma vez; quando os dados mudam, só as partes dinâmicas
// (resultados, lista de aulas, linha do tempo) são redesenhadas, então o que a pessoa está
// digitando nunca é apagado.
// ============================================================
import { esc, andarNome, comTitulo } from "../util.js";
import { salaNoPadrao } from "../salas.js";
import { sobrepoe, paraMinutos } from "../reservas.js";
import { STATUS } from "./config.js";

const DIA_INI = 7 * 60, DIA_FIM = 23 * 60;           // janela da linha do tempo (07:00–23:00)
const rotuloData = (iso) => iso.split("-").reverse().join("/");
const pct = (min) => `${((Math.min(Math.max(min, DIA_INI), DIA_FIM) - DIA_INI) / (DIA_FIM - DIA_INI)) * 100}%`;
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const OUTRO = `<option value="">Outro — sem turma vinculada</option>`;

/**
 * @param {HTMLElement} el contêiner do painel
 * @param {{sessao:object, ehAdmin:boolean, aoFechar:Function, aoReservar:Function, aoLiberar:Function,
 *          aoFiltrar:(filtro:object)=>void, aoEscolher:(salaId:string, data?:string)=>void,
 *          professoresParaAlocar:()=>{id:string,nome:string}[],
 *          turmasDoProfessor:(professorId:string)=>{id:string,nome:string,nAlunos:number}[],
 *          aoVerificar:(dados:{salaId,disciplinaId,professorId,ini,fim})=>string[]}} deps
 */
export function criarPainel(el, {
  sessao, ehAdmin, aoFechar, aoReservar, aoLiberar, aoFiltrar, aoEscolher,
  professoresParaAlocar = () => [], turmasDoProfessor = () => [], aoVerificar = () => [],
}) {
  let salaId = null, aulasAtuais = [], htmlResultados = "", htmlMinhas = "";
  const $ = (seletor) => el.querySelector(seletor);

  /** Só o admin libera/remove aulas (o professor apenas visualiza). */
  const podeLiberar = () => ehAdmin;
  const minha = (aula) => !ehAdmin && !!sessao.professorId && aula.professorId === sessao.professorId;

  const htmlAulas = (aulas) => aulas.length
    ? aulas.map((a) => `
        <div class="aloc${minha(a) ? " minha" : ""}">${podeLiberar() ? `<button type="button" class="liberar" data-del="${esc(a.id)}">✕ liberar</button>` : ""}
          <b>${minha(a) ? "★ " : ""}${esc(a.curso)} — ${esc(a.ini)}${a.fim ? " às " + esc(a.fim) : ""}</b>${esc(a.assunto)}<br>
          <small>${esc(comTitulo(a.prof))}${a.nAlunos != null ? ` · ${a.nAlunos} aluno${a.nAlunos === 1 ? "" : "s"}` : ""}${minha(a) ? " · sua aula" : ""}</small></div>`).join("")
    : `<div class="aloc livre"><small>Nenhuma aula neste dia. Sala livre.</small></div>`;

  function mensagem(texto = "", tipo = "") {
    const m = $("#msg");
    if (m) { m.textContent = texto; m.className = `msg ${tipo}`; }
  }

  // ---------- linha do tempo do dia (aulas + horário escolhido no formulário) ----------
  function renderLinha() {
    const linha = $("#linha"); if (!linha) return;
    const ini = $("#campo-ini")?.value, fim = $("#campo-fim")?.value;
    const escolhaOk = ini && fim && fim > ini;
    const conflitos = escolhaOk ? aulasAtuais.filter((a) => sobrepoe(a, ini, fim)) : [];
    const marcas = [8, 10, 12, 14, 16, 18, 20, 22].map((h) => `<span class="marca" style="left:${pct(h * 60)}">${h}h</span>`).join("");
    const blocos = aulasAtuais.map((a) => {
      const i = paraMinutos(a.ini), f = a.fim ? paraMinutos(a.fim) : i + 100;
      return `<span class="bloco${conflitos.includes(a) ? " conflito" : ""}${minha(a) ? " minha" : ""}" style="left:${pct(i)};width:calc(${pct(f)} - ${pct(i)})" title="${esc(a.curso)} ${esc(a.ini)}–${esc(a.fim ?? "")}"></span>`;
    }).join("");
    const escolha = escolhaOk ? `<span class="escolha" style="left:${pct(paraMinutos(ini))};width:calc(${pct(paraMinutos(fim))} - ${pct(paraMinutos(ini))})"></span>` : "";
    linha.innerHTML = `<div class="trilho">${blocos}${escolha}</div>${marcas}`;
    const aviso = $("#conflito");
    if (aviso) {
      const linhas = [];
      if (conflitos.length) linhas.push(`⚠️ A sala já tem ${conflitos.map((a) => `${a.curso} (${a.ini}${a.fim ? "–" + a.fim : ""})`).join(", ")}.`);
      if (escolhaOk) {
        const choques = aoVerificar({ salaId, disciplinaId: $("#campo-turma")?.value || null, professorId: $("#campo-professor")?.value || null, ini, fim });
        linhas.push(...choques.map((t) => `⚠️ Choque de turma: ${t}.`));
      }
      aviso.innerHTML = linhas.map(esc).join("<br>");
    }
  }

  // ---------- eventos (delegação: um único conjunto de ouvintes) ----------
  el.addEventListener("click", async (e) => {
    if (e.target.closest("#fechar")) return aoFechar();

    const resultado = e.target.closest("[data-sala]");
    if (resultado) return aoEscolher(resultado.dataset.sala, resultado.dataset.data);

    const trilho = e.target.closest("#linha");
    if (trilho && $("#campo-ini")) {           // clique na linha do tempo: sugere 1h40 a partir dali (meia em meia hora)
      const r = trilho.getBoundingClientRect();
      const min = DIA_INI + Math.round(((e.clientX - r.left) / r.width) * (DIA_FIM - DIA_INI) / 30) * 30;
      const ini = Math.min(Math.max(min, DIA_INI), DIA_FIM - 60);
      $("#campo-ini").value = hhmm(ini); $("#campo-fim").value = hhmm(Math.min(ini + 100, DIA_FIM));
      return renderLinha();
    }

    const liberar = e.target.closest("[data-del]");
    if (!liberar) return;
    if (liberar.dataset.confirmar !== "1") {          // 1º clique: pede confirmação (volta ao normal em 4 s)
      liberar.dataset.confirmar = "1"; liberar.textContent = "Confirmar?"; liberar.classList.add("perigo");
      clearTimeout(liberar.temporizador);
      liberar.temporizador = setTimeout(() => {
        liberar.dataset.confirmar = ""; liberar.textContent = "✕ liberar"; liberar.classList.remove("perigo");
      }, 4000);
      return;
    }
    clearTimeout(liberar.temporizador);
    liberar.disabled = true;
    try { await aoLiberar(liberar.dataset.del); mensagem("Aula liberada.", "ok"); }
    catch { mensagem("Não foi possível liberar a aula.", "erro"); liberar.disabled = false; }
  });

  el.addEventListener("input", (e) => {
    if (e.target.closest(".busca")) aoFiltrar(lerFiltro());
    else if (e.target.name === "ini" || e.target.name === "fim") renderLinha();   // conflito verificado ao vivo
  });

  el.addEventListener("change", (e) => {
    const alvo = e.target, curso = $("#campo-curso"), info = $("#turma-info");
    if (alvo.id === "campo-professor") {             // escolheu o professor: oferece as turmas DELE
      const turmas = turmasDoProfessor(alvo.value);
      const sel = $("#campo-turma");
      sel.innerHTML = OUTRO + turmas.map((t) => `<option value="${esc(t.id)}">${esc(t.nome)} — ${t.nAlunos} aluno${t.nAlunos === 1 ? "" : "s"}</option>`).join("");
      sel.disabled = !alvo.value;
      if (curso.readOnly) curso.value = "";
      curso.readOnly = false;
      info.textContent = alvo.value && !turmas.length ? "Este professor ainda não tem turma cadastrada; a aula será registrada sem alunos vinculados." : "";
      return renderLinha();
    }
    if (alvo.id !== "campo-turma") return;
    const turma = turmasDoProfessor($("#campo-professor").value).find((t) => t.id === alvo.value);
    curso.readOnly = !!turma;                         // o curso vem da turma escolhida
    if (turma) curso.value = turma.nome;
    info.textContent = turma ? `${turma.nAlunos} aluno${turma.nAlunos === 1 ? "" : "s"} da turma serão vinculados a esta aula.` : "";
    renderLinha();
  });

  el.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target, botao = form.querySelector("button[type=submit]");
    botao.disabled = true; botao.textContent = "Alocando…";
    try {
      await aoReservar(salaId, Object.fromEntries(new FormData(form)));
      form.elements.curso.value = ""; form.elements.assunto.value = "";
      if (form.elements.curso.readOnly) { form.elements.turma.value = ""; form.elements.curso.readOnly = false; $("#turma-info").textContent = ""; }
      mensagem("Professor alocado com sucesso!", "ok");
    } catch (erro) {
      mensagem(erro.message || "Erro ao salvar a alocação.", "erro");
    } finally {
      botao.disabled = false; botao.textContent = "Alocar professor";
    }
  });

  function lerFiltro() {
    return {
      capMin: Number($("#b-cap")?.value) || 0,
      andar: $("#b-andar")?.value ?? "",
      soLivres: !!$("#b-livres")?.checked,
    };
  }

  const htmlResultado = (r) => `
    <button type="button" class="resultado ${r.status}" data-sala="${esc(r.id)}"
      aria-label="Sala ${esc(r.numero)}, ${esc(andarNome(r.andar))}, ${esc(r.capacidade)} lugares, ${STATUS[r.status].leitor}">
      <span class="bolinha" aria-hidden="true"></span>
      <b>Sala ${esc(r.numero)}</b><span>${esc(andarNome(r.andar))} · ${esc(r.capacidade)} lug.</span>
      <em>${esc(STATUS[r.status].texto)}</em>
    </button>`;

  /** "Suas aulas" (professor): onde e quando ele vai dar aula. `minhas` = { vinculado, lista } ou null (admin). */
  const htmlMinhasAulas = (minhas) => {
    if (!minhas) return "";
    const corpo = !minhas.vinculado
      ? `<p class="sub">Seu usuário não está ligado a um professor cadastrado. Entre com o e-mail cadastrado ou peça ao administrador.</p>`
      : minhas.lista.length
        ? `<div class="resultados">${minhas.lista.map((a) => `
            <button type="button" class="resultado minha" data-sala="${esc(a.salaId)}" data-data="${esc(a.data)}">
              <span class="bolinha" aria-hidden="true"></span>
              <b>${esc(a.quando)} · ${esc(a.ini)}${a.fim ? "–" + esc(a.fim) : ""}</b>
              <span>${esc(a.onde)}</span><em>Ver no prédio</em>
            </button>`).join("")}</div>`
        : `<p class="sub">Nenhuma aula marcada para você ainda. A alocação das salas é feita pelo administrador.</p>`;
    return `<section id="minhas" aria-label="Suas aulas"><h2>Suas aulas</h2>${corpo}</section>`;
  };

  /** Reinicia a animação de entrada do painel (chamado só quando o conteúdo troca de tela). */
  function entrar() { el.classList.remove("troca"); void el.offsetWidth; el.classList.add("troca"); }

  return {
    /** Tela inicial: (professor) suas aulas + filtros "Encontrar sala" e a lista de salas (alternativa acessível ao 3D). */
    mostrarBusca({ filtro, andares, resultados, resumo, minhasAulas = null }) {
      salaId = null; htmlResultados = ""; htmlMinhas = "";
      entrar();
      el.innerHTML = `
        <div id="bloco-minhas"></div>
        <h2>Encontrar sala</h2>
        <p class="sub">Informe um <b>horário</b> na barra para ver o que está livre nele. As salas fora do filtro ficam apagadas no prédio.</p>
        <div class="busca">
          <div class="row2">
            <div><label for="b-cap">Capacidade mínima</label><input id="b-cap" type="number" min="0" step="5" placeholder="Qualquer" value="${esc(filtro.capMin || "")}" /></div>
            <div><label for="b-andar">Andar</label><select id="b-andar">
              <option value="">Todos</option>${andares.map((a) => `<option value="${esc(a)}" ${String(filtro.andar) === String(a) ? "selected" : ""}>${esc(andarNome(a))}</option>`).join("")}
            </select></div>
          </div>
          <label class="check"><input id="b-livres" type="checkbox" ${filtro.soLivres ? "checked" : ""} /> Só salas livres</label>
        </div>
        <div class="sub" id="b-resumo" role="status" aria-live="polite"></div>
        <div class="resultados" id="resultados"></div>
        <details class="ajuda"><summary>Como usar</summary>
          <p class="sub">Clique numa sala do prédio, num rótulo (Tab + Enter) ou na lista acima. <b>Por fora</b> mostra a fachada,
          <b>Translúcido</b> deixa ver tudo por dentro, os botões de andar cortam o prédio e <b>Planta 2D</b> mostra os andares de cima.
          ${ehAdmin ? "Para alocar um professor, escolha a sala e preencha o formulário." : "A alocação das salas é feita pelo administrador."}</p>
        </details>`;
      this.atualizarMinhasAulas(minhasAulas);
      this.atualizarResultados(resultados, resumo);
    },

    atualizarMinhasAulas(minhas) {
      const bloco = $("#bloco-minhas"); if (!bloco) return;
      const html = htmlMinhasAulas(minhas);
      if (html !== htmlMinhas) { htmlMinhas = html; bloco.innerHTML = html; }
    },

    atualizarResultados(resultados, resumo) {
      const lista = $("#resultados"); if (!lista) return;
      const html = resultados.length ? resultados.map(htmlResultado).join("") : `<p class="sub">Nenhuma sala atende ao filtro.</p>`;
      if (html !== htmlResultados) { htmlResultados = html; lista.innerHTML = html; }
      const r = $("#b-resumo"); if (r && r.textContent !== resumo) r.textContent = resumo;
    },

    /** `padrao`: horário inicial do formulário (ex.: o intervalo escolhido na barra). */
    mostrarSala(sala, aulas, dataISO, padrao = {}) {
      salaId = sala.id; aulasAtuais = aulas;
      entrar();
      const aviso = salaNoPadrao(sala) ? "" : `<div class="aloc aviso"><small>⚠️ Número fora do padrão.
        ${ehAdmin ? '<a class="link" href="admin-salas.html">Reorganizar</a>' : "Avise o administrador."}</small></div>`;
      const formulario = ehAdmin ? `
        <form>
          <h2 style="margin-top:18px">Alocar professor nesta sala</h2>
          <label for="campo-professor">Professor</label>
          <select id="campo-professor" name="professorId" required>
            <option value="">Escolha o professor…</option>
            ${professoresParaAlocar().map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("")}
          </select>
          <label for="campo-turma">Turma (alunos vinculados)</label>
          <select id="campo-turma" name="turma" disabled>${OUTRO}</select>
          <div class="sub" id="turma-info" role="status"></div>
          <label for="campo-curso">Curso / disciplina</label>
          <input id="campo-curso" name="curso" required placeholder="Ex: Engenharia de Software, Medicina, Direito…" />
          <label for="campo-assunto">Assunto da aula</label>
          <textarea id="campo-assunto" name="assunto" required placeholder="Sobre o que será a aula?"></textarea>
          <div class="row2">
            <div><label for="campo-ini">Início</label><input id="campo-ini" type="time" name="ini" required value="${esc(padrao.ini || "19:00")}" /></div>
            <div><label for="campo-fim">Fim</label><input id="campo-fim" type="time" name="fim" required value="${esc(padrao.fim || "20:40")}" /></div>
          </div>
          <div id="conflito" class="msg erro" aria-live="polite"></div>
          <button class="primario" type="submit">Alocar professor</button>
          <div id="msg" class="msg" role="status" aria-live="polite"></div>
        </form>
        <a class="link" href="admin-salas.html">⚙️ Gerenciar salas</a>`
        : `<p class="sub nota">Somente o administrador aloca salas. Aqui você vê onde cada aula acontece
           ${sessao.professorId ? "(as suas aulas aparecem com ★)" : ""}.</p>`;
      el.innerHTML = `
        <div class="cab"><h2>Sala ${esc(sala.numero)}<span class="tag">${esc(sala.capacidade)} lugares</span></h2>
          <button type="button" id="fechar" class="fechar" title="Fechar (Esc)" aria-label="Fechar painel">✕</button></div>
        <div class="sub">Módulo ${esc(sala.modulo)} · ${esc(andarNome(sala.andar))} · ${esc(sala.tipo)}</div>
        ${aviso}
        <div class="sub" style="margin-top:10px">Ocupação em <span id="data-sala">${rotuloData(dataISO)}</span>${ehAdmin ? `
          <small>(clique num horário vazio para usá-lo)</small>` : ""}:</div>
        <div class="linha-tempo" id="linha" role="img" aria-label="Linha do tempo das aulas do dia"></div>
        <div id="aulas">${htmlAulas(aulas)}</div>
        ${formulario}`;
      renderLinha();
    },

    /** Redesenha só a lista de aulas, a linha do tempo e a data, preservando o formulário. */
    atualizarAulas(aulas, dataISO) {
      aulasAtuais = aulas;
      const lista = $("#aulas");
      if (lista) lista.innerHTML = htmlAulas(aulas);
      const data = $("#data-sala");
      if (data && dataISO) data.textContent = rotuloData(dataISO);
      renderLinha();
    },

    /** Os professores chegaram (ou mudaram) depois do formulário abrir: recarrega as opções sem perder a escolha. */
    atualizarProfessores() {
      const sel = $("#campo-professor");
      if (!sel) return;
      const atual = sel.value;
      sel.innerHTML = `<option value="">Escolha o professor…</option>` +
        professoresParaAlocar().map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");
      sel.value = atual;
    },

    mensagem,
    get salaAtual() { return salaId; },
    mostrarErro(texto) { salaId = null; el.innerHTML = `<h2>Sem conexão</h2><p class="sub">${esc(texto)}</p>`; },
  };
}
