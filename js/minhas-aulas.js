// ============================================================
// MINHAS AULAS (aluno)
// As turmas em que o aluno está matriculado, as aulas de hoje (com a sala) e as próximas.
// Admin pode abrir como um aluno com ?matricula=NNN (para conferir o que o aluno vê).
// ============================================================
import { escutarAcademico, proximasAulas } from "./academico.js";
import { conflitosGerais, aulaDoAluno } from "./conflitos.js";
import { esc, andarNome, hojeISO, comTitulo } from "./util.js";
import { Sessao, pronto } from "./sessao.js";

const $ = (id) => document.getElementById(id);

await pronto;
const sessao = Sessao.obter() ?? {};
// Admin pode conferir a tela de um aluno via ?matricula=NUMERO. Só números,
// para não transformar a URL em vetor de injeção nem consultar outro registro.
const paramMatricula = new URLSearchParams(location.search).get("matricula");
const matriculaVista = sessao.papel === "admin" && /^\d{1,20}$/.test(String(paramMatricula ?? "").trim())
  ? String(paramMatricula).trim()
  : sessao.matricula;

const dataBR = (iso) => esc(String(iso ?? "").split("-").reverse().join("/"));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const ESTADO = { agora: "Agora", proxima: "Mais tarde", encerrada: "Já aconteceu" };

function salaTexto(d, salaId) {
  const s = d.salaPorId.get(salaId);
  return s ? `Sala ${s.numero} · ${andarNome(s.andar)} · módulo ${s.modulo}` : "Sala não definida";
}

function render(d) {
  const aluno = d.alunos.find((a) => String(a.matricula).trim() === String(matriculaVista ?? "").trim());
  if (!aluno) {
    $("resumo").innerHTML = "";
    $("hoje").innerHTML = $("turmas").innerHTML =
      `<p class="vazio">${sessao.papel === "admin" ? "Abra com ?matricula=NÚMERO para ver como um aluno." : "Seu cadastro não foi encontrado."}</p>`;
    return;
  }

  const hoje = hojeISO(), agora = new Date(), agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const minhasTurmas = d.disciplinas.filter((t) => (Array.isArray(t.alunoIds) ? t.alunoIds : Object.keys(t.alunoIds ?? {})).includes(aluno.id));
  const minhasAulas = d.aulas.filter((a) => a.alunoIds.has(aluno.id) && a.data >= hoje);
  const conflitos = conflitosGerais(minhasAulas);

  $("resumo").innerHTML = `
    <div><b>${esc(aluno.nome.split(" ")[0])}</b><span>matrícula ${esc(aluno.matricula)}${aluno.ativo === true ? "" : " · inativa"}</span></div>
    <div><b>${minhasTurmas.length}</b><span>turma${minhasTurmas.length === 1 ? "" : "s"}</span></div>
    <div class="${conflitos.length ? "alerta" : ""}"><b>${conflitos.length}</b><span>choque${conflitos.length === 1 ? "" : "s"} de horário</span></div>`;

  // hoje: a mesma lógica que a catraca usa para decidir a aula do aluno
  const doDia = minhasAulas.filter((a) => a.data === hoje).sort((x, y) => x.ini.localeCompare(y.ini));
  const destaque = aulaDoAluno(doDia, aluno.id, agoraMin);
  $("hoje").innerHTML = doDia.length ? `<ul class="aulas">${doDia.map((a) => {
    const estado = destaque?.aula.id === a.id ? destaque.estado : null;
    return `<li><span class="quando ${estado === "agora" ? "hoje" : ""}">${esc(a.ini)}${a.fim ? "–" + esc(a.fim) : ""}</span>
      <span><b>${esc(a.nome)}</b> · ${esc(salaTexto(d, a.salaId))}</span>
      ${estado ? `<span class="selo ${estado === "agora" ? "destaque" : ""}">${ESTADO[estado]}</span>` : ""}</li>`;
  }).join("")}</ul>` : `<p class="vazio">Você não tem aula marcada hoje.</p>`;

  // turmas e próximas aulas
  $("turmas").innerHTML = minhasTurmas.length ? minhasTurmas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((t) => {
    const prof = d.professorPorId.get(t.professorId);
    const aulas = proximasAulas(d.aulas, [t.id], 4, hoje);
    return `<article class="turma"><h3>${esc(t.nome)}</h3>
      <p class="meta">${esc(prof ? comTitulo(prof.nome) : "Professor não encontrado")}</p>
      ${aulas.length ? `<ul class="aulas">${aulas.map((a) => `<li>
        <span class="quando ${a.data === hoje ? "hoje" : ""}">${a.data === hoje ? "Hoje" : dataBR(a.data)} · ${esc(a.ini)}${a.fim ? "–" + esc(a.fim) : ""}</span>
        <span>${esc(salaTexto(d, a.salaId))}</span></li>`).join("")}</ul>` : `<p class="vazio">Sem aulas marcadas por enquanto.</p>`}
    </article>`;
  }).join("") : `<p class="vazio">Você ainda não está em nenhuma turma. Procure a secretaria.</p>`;

  // choques que envolvem o próprio aluno
  $("conflitos-card").hidden = conflitos.length === 0;
  $("conflitos").innerHTML = conflitos.map((c) => `<div class="conflito"><b>${dataBR(c.a.data)} · ${esc(c.a.ini)}–${esc(c.a.fim ?? "")}</b>
    ${esc(c.a.nome)} e ${esc(c.b.nome)} <small>${plural(1, "choque", "choques")} no mesmo horário</small></div>`).join("");
}

escutarAcademico(render, (erro) => {
  console.error(erro);
  $("turmas").innerHTML = `<p class="vazio">Não foi possível carregar suas aulas agora.</p>`;
});
