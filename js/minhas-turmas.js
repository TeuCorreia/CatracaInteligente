// ============================================================
// MINHAS TURMAS (professor / admin)
// Mostra as turmas do professor, os alunos de cada uma, as próximas aulas e os conflitos
// de horário (aluno ou professor em dois lugares ao mesmo tempo).
// O admin vê todas as turmas, filtra por professor e sincroniza o índice usado pela catraca.
// ============================================================
import { escutarAcademico, camposDeReconstrucao, gravarCampos, proximasAulas } from "./academico.js";
import { conflitosGerais, idsDaDisciplina } from "./conflitos.js";
import { liberarAula, reagendarAula, problemasDeReagendar } from "./reservas.js";
import { esc, andarNome, hojeISO, comTitulo } from "./util.js";

const $ = (id) => document.getElementById(id);
const sessao = window.Sessao.obter() ?? {};
const ehAdmin = sessao.papel === "admin";
const ehProfessor = sessao.papel === "professor";
const meuProfessorId = ehProfessor ? sessao.professorId ?? null : null;
// Professor sem vínculo com o cadastro NÃO vê turma nenhuma (nunca "tudo"): filtro impossível de casar.
const SEM_VINCULO = ehProfessor && !meuProfessorId;

const estado = { dados: null, filtro: ehAdmin ? "" : meuProfessorId ?? "__nenhum__", editando: null };   // editando = { id, ini, fim, salaId }

const dataBR = (iso) => iso.split("-").reverse().join("/");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function turmasVisiveis(d) {
  return d.disciplinas
    .filter((x) => !estado.filtro || x.professorId === estado.filtro)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function salaTexto(d, salaId) {
  const s = d.salaPorId.get(salaId);
  return s ? `sala ${s.numero} · ${andarNome(s.andar)}` : "sala não definida";
}

// ---------- render ----------
function render() {
  const d = estado.dados;
  if (!d) return;
  const hoje = hojeISO();
  const turmas = turmasVisiveis(d);
  const idsTurmas = new Set(turmas.map((t) => t.id));

  // conflitos de hoje em diante que envolvem pelo menos uma turma visível
  const aulasFuturas = d.aulas.filter((a) => a.data >= hoje);
  const conflitos = conflitosGerais(aulasFuturas).filter((c) => idsTurmas.has(c.a.disciplinaId) || idsTurmas.has(c.b.disciplinaId));
  const alunosEmConflito = new Set(conflitos.flatMap((c) => c.alunos));

  const alunosUnicos = new Set(turmas.flatMap((t) => idsDaDisciplina(t)));
  $("resumo").innerHTML = `
    <div><b>${turmas.length}</b><span>turma${turmas.length === 1 ? "" : "s"}</span></div>
    <div><b>${alunosUnicos.size}</b><span>aluno${alunosUnicos.size === 1 ? "" : "s"} no total</span></div>
    <div class="${conflitos.length ? "alerta" : ""}"><b>${conflitos.length}</b><span>conflito${conflitos.length === 1 ? "" : "s"}</span></div>`;

  // filtro (admin)
  $("filtro").hidden = !ehAdmin;
  if (ehAdmin && $("f-professor").options.length !== d.professores.length + 1) {
    $("f-professor").innerHTML = `<option value="">Todos os professores</option>` +
      d.professores.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");
    $("f-professor").value = estado.filtro;
  }

  // conflitos
  $("conflitos").innerHTML = conflitos.length
    ? conflitos.map((c) => {
        const nomes = c.alunos.map((id) => d.alunoPorId.get(id)?.nome ?? "aluno removido");
        const motivos = [];
        if (c.professor) motivos.push(`mesmo professor (${esc(d.professorPorId.get(c.a.professorId)?.nome ?? c.a.professorNome ?? "—")})`);
        if (c.alunos.length) motivos.push(`${plural(c.alunos.length, "aluno", "alunos")} em comum: ${esc(nomes.slice(0, 5).join(", "))}${nomes.length > 5 ? ` e mais ${nomes.length - 5}` : ""}`);
        return `<div class="conflito"><b>${dataBR(c.a.data)} · ${esc(c.a.ini)}–${esc(c.a.fim ?? "")} × ${esc(c.b.ini)}–${esc(c.b.fim ?? "")}</b>
          ${esc(c.a.nome)} (${esc(salaTexto(d, c.a.salaId))}) e ${esc(c.b.nome)} (${esc(salaTexto(d, c.b.salaId))})
          <small>${motivos.join(" · ")}</small>
          ${ehAdmin ? `<div class="corrigir">${[c.a, c.b].map((aula) => acoesDaAula(d, aula)).join("")}</div>` : ""}</div>`;
      }).join("")
    : `<p class="ok">Nenhum conflito de horário. ✓</p>`;

  // turmas
  $("turmas").innerHTML = turmas.length ? turmas.map((t) => {
    const prof = d.professorPorId.get(t.professorId);
    const alunos = idsDaDisciplina(t).map((id) => d.alunoPorId.get(id)).filter(Boolean)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const aulas = proximasAulas(d.aulas, [t.id], 4, hoje);
    return `<article class="turma">
      <h3>${esc(t.nome)}</h3>
      <p class="meta">${ehAdmin ? `${esc(prof ? comTitulo(prof.nome) : "Professor não encontrado")} · ` : ""}${plural(alunos.length, "aluno", "alunos")}</p>
      ${aulas.length ? `<ul class="aulas">${aulas.map((a) => `
        <li><span class="quando ${a.data === hoje ? "hoje" : ""}">${a.data === hoje ? "Hoje" : dataBR(a.data)} · ${esc(a.ini)}${a.fim ? "–" + esc(a.fim) : ""}</span><span>${esc(salaTexto(d, a.salaId))}</span></li>`).join("")}</ul>`
        : `<p class="vazio">Nenhuma aula marcada. <a href="planta3d.html">Reservar uma sala</a></p>`}
      <details class="alunos"><summary>Ver alunos (${alunos.length})</summary>
        ${alunos.length ? `<table class="tabela"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Situação</th></tr></thead><tbody>
          ${alunos.map((a) => `<tr><td>${esc(a.nome)}</td><td>${esc(a.matricula)}</td><td>
            ${a.ativo === true ? "ativo" : '<span class="selo">inativo</span>'}
            ${alunosEmConflito.has(a.id) ? ' <span class="selo perigo">choque de horário</span>' : ""}</td></tr>`).join("")}</tbody></table>`
          : `<p class="vazio">Nenhum aluno vinculado. Peça ao administrador para vincular em Disciplinas.</p>`}
      </details></article>`;
  }).join("") : `<p class="vazio">${SEM_VINCULO ? "Seu usuário não está ligado a um professor cadastrado, por isso nenhuma turma aparece. Entre com o e-mail cadastrado ou peça ao administrador." : "Nenhuma turma encontrada" + (meuProfessorId ? " para o seu cadastro. Peça ao administrador para vincular você a uma disciplina" : "") + "."}</p>`;

  renderVinculos(d);
}

// ---------- correcao de conflitos (admin): mudar horario/sala ou liberar a aula ----------
const contexto = (d) => ({ turmas: d.turmas, disciplinas: d.disciplinas, alunos: d.alunos, salas: d.salas });

function acoesDaAula(d, aula) {
  const edit = estado.editando?.id === aula.id ? estado.editando : null;
  const salas = [...d.salas].sort((x, y) => Number(x.numero) - Number(y.numero));
  const problemas = edit ? problemasDeReagendar(aula.id, edit, contexto(d)) : [];
  return `<div class="acao">
    <span class="acao-nome"><b>${esc(aula.nome)}</b> · ${esc(aula.ini)}${aula.fim ? "–" + esc(aula.fim) : ""} · ${esc(salaTexto(d, aula.salaId))}</span>
    <span class="acao-botoes">
      <button type="button" class="mini" data-acao="editar" data-id="${esc(aula.id)}">${edit ? "Fechar" : "Mudar horário ou sala"}</button>
      <button type="button" class="mini perigo" data-acao="liberar" data-id="${esc(aula.id)}">Liberar aula</button>
    </span>
    ${edit ? `<form class="edicao" data-id="${esc(aula.id)}">
      <label>Início<input type="time" name="ini" value="${esc(edit.ini)}" required /></label>
      <label>Fim<input type="time" name="fim" value="${esc(edit.fim)}" required /></label>
      <label>Sala<select name="salaId">${salas.map((s) => `<option value="${esc(s.id)}" ${s.id === edit.salaId ? "selected" : ""}>Sala ${esc(s.numero)} · ${esc(andarNome(s.andar))}</option>`).join("")}</select></label>
      <p class="previa ${problemas.length ? "erro" : "ok"}" role="status">${problemas.length ? "⚠️ " + esc(problemas.join("; ")) : "Sem conflitos com esse horário e sala. ✓"}</p>
      <button type="submit" class="mini" ${problemas.length ? "disabled" : ""}>Salvar mudança</button>
    </form>` : ""}
  </div>`;
}

// ---------- indice para a catraca/ESP32 (admin) ----------
function renderVinculos(d) {
  const box = $("vinculos");
  box.hidden = !ehAdmin;
  if (!ehAdmin) return;
  const diferencas = Object.keys(camposDeReconstrucao(d.disciplinas, d.vinculos)).length;
  box.innerHTML = `<div><h3>Vínculos para a catraca</h3>
      <p class="dica">Índice aluno → turmas que o ESP32 consulta. ${diferencas ? `<b>${plural(diferencas, "diferença", "diferenças")}</b> em relação às disciplinas.` : '<span class="ok">Em dia ✓</span>'}</p></div>
    ${diferencas ? `<button type="button" id="sincronizar">Sincronizar agora</button>` : ""}`;
}

document.addEventListener("click", async (e) => {
  const sync = e.target.closest("#sincronizar");
  if (sync) {
    sync.disabled = true;
    try { await gravarCampos(camposDeReconstrucao(estado.dados.disciplinas, estado.dados.vinculos)); }
    catch (erro) { alert(erro.message); sync.disabled = false; }
    return;
  }

  const botao = e.target.closest("button[data-acao]");
  if (!botao || !ehAdmin) return;
  const aula = estado.dados.aulas.find((a) => a.id === botao.dataset.id);
  if (!aula) return;

  if (botao.dataset.acao === "editar") {
    estado.editando = estado.editando?.id === aula.id ? null : { id: aula.id, ini: aula.ini, fim: aula.fim ?? "", salaId: aula.salaId };
    return render();
  }
  if (botao.dataset.acao === "liberar") {
    if (botao.dataset.confirmar !== "1") {                       // 1o clique pede confirmacao (volta em 4 s)
      botao.dataset.confirmar = "1"; botao.textContent = "Confirmar?";
      setTimeout(() => { if (botao.isConnected) { botao.dataset.confirmar = ""; botao.textContent = "Liberar aula"; } }, 4000);
      return;
    }
    botao.disabled = true;
    try { await liberarAula(aula.id); if (estado.editando?.id === aula.id) estado.editando = null; }
    catch (erro) { alert(erro.message); botao.disabled = false; }
  }
});

// a edicao guarda o que foi digitado e recalcula a previa na hora
document.addEventListener("input", (e) => {
  const form = e.target.closest("form.edicao");
  if (!form || !estado.editando) return;
  estado.editando = { ...estado.editando, ini: form.ini.value, fim: form.fim.value, salaId: form.salaId.value };
  const previa = form.querySelector(".previa"), enviar = form.querySelector("button[type=submit]");
  const problemas = problemasDeReagendar(estado.editando.id, estado.editando, contexto(estado.dados));
  previa.className = `previa ${problemas.length ? "erro" : "ok"}`;
  previa.textContent = problemas.length ? "⚠️ " + problemas.join("; ") : "Sem conflitos com esse horário e sala. ✓";
  enviar.disabled = problemas.length > 0;
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("form.edicao");
  if (!form) return;
  e.preventDefault();
  const botao = form.querySelector("button[type=submit]");
  botao.disabled = true;
  try {
    await reagendarAula(estado.editando.id, estado.editando, contexto(estado.dados));
    estado.editando = null;                                      // o listener do banco redesenha a tela ja corrigida
  } catch (erro) {
    form.querySelector(".previa").textContent = "⚠️ " + erro.message; botao.disabled = false;
  }
});

$("f-professor").addEventListener("change", (e) => { estado.filtro = e.target.value; render(); });

if (meuProfessorId) $("titulo").textContent = "Minhas turmas";
else if (ehAdmin) $("titulo").textContent = "Turmas e conflitos";

escutarAcademico((dados) => { estado.dados = dados; render(); }, (erro) => {
  console.error(erro);
  $("turmas").innerHTML = `<p class="vazio">Não foi possível carregar os dados do Firebase.</p>`;
  $("conflitos").textContent = "";
});
