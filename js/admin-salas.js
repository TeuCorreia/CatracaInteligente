// ============================================================
// ADMIN — cadastro de salas (admin-salas.html)
// O admin informa só a capacidade; número, andar e módulo vêm de js/salas.js.
// ============================================================
import {
  criarSalaAuto, escutarSalas, removerSala, atualizarSala, proximaVaga, salaNoPadrao,
  planoDeOrganizacao, aplicarPlano, SALAS_POR_ANDAR,
} from "./salas.js";
import { contarReservasFuturas } from "./reservas.js";
import { esc, andarNome } from "./util.js";

const $ = (id) => document.getElementById(id);
const estado = { salas: [], emEdicao: null, plano: [] };

// ---------- prévia ao vivo da próxima sala ----------
function renderPrevia() {
  const previa = $("previa");
  if (estado.emEdicao) {
    const s = estado.salas.find((x) => x.id === estado.emEdicao);
    if (s) previa.innerHTML = `Editando <b>Sala ${esc(s.numero)}</b><small>Módulo ${esc(s.modulo)} · ${esc(andarNome(s.andar))} — número, andar e módulo não mudam ao editar.</small>`;
    return;
  }
  try {
    const v = proximaVaga(estado.salas);
    const novoAndar = !estado.salas.some((s) => Number(s.andar) === v.andar) && v.andar > 1;
    previa.innerHTML = `Esta sala será a <b>Sala ${esc(v.numero)}</b>
      <small>Módulo ${esc(v.modulo)} · ${esc(andarNome(v.andar))} · ${novoAndar ? "🆕 o prédio ganha um andar novo" : `vaga ${Number(v.numero) - v.andar * 100} de ${SALAS_POR_ANDAR} neste andar`}</small>`;
  } catch { previa.textContent = "Prédio cheio."; }
}

// ---------- resumo, aviso de reorganização e lista ----------
function renderResumo() {
  const { salas } = estado;
  $("r-salas").textContent = salas.length;
  $("r-andares").textContent = new Set(salas.map((s) => Number(s.andar))).size;
  try { $("r-prox").textContent = proximaVaga(salas).numero; } catch { $("r-prox").textContent = "—"; }
}

function renderAviso() {
  const aviso = $("aviso");
  aviso.hidden = estado.plano.length === 0;
  if (aviso.hidden) return;
  aviso.innerHTML = `⚠️ <b>${estado.plano.length} sala(s) fora do padrão</b> de numeração. Posso reorganizá-las automaticamente:
    <ul>${estado.plano.map((p) => `<li>${esc(p.de)} → <b>${esc(p.numero)}</b> (${esc(andarNome(p.andar))}, módulo ${esc(p.modulo)})</li>`).join("")}</ul>
    <button type="button" data-acao="organizar">🧹 Reorganizar numeração</button>`;
}

function renderLista() {
  const lista = $("lista-salas");
  if (!estado.salas.length) { lista.innerHTML = "<p>Nenhuma sala cadastrada ainda.</p>"; return; }
  const ordenadas = [...estado.salas].sort((a, b) => Number(a.andar) - Number(b.andar) || Number(a.numero) - Number(b.numero));
  let andarAtual = null, html = "";
  for (const s of ordenadas) {
    if (Number(s.andar) !== andarAtual) { andarAtual = Number(s.andar); html += `<div class="andar-titulo">${esc(andarNome(andarAtual))}</div>`; }
    html += `<div class="lista-item">
      <span>Sala <b>${esc(s.numero)}</b> — módulo ${esc(s.modulo)} · ${esc(s.capacidade)} lugares ${salaNoPadrao(s) ? "" : "⚠️"}</span>
      <span class="linha-btns">
        <button type="button" data-acao="editar" data-id="${esc(s.id)}">Editar</button>
        <button type="button" data-acao="remover" data-id="${esc(s.id)}">Remover</button>
      </span></div>`;
  }
  lista.innerHTML = html;
}

// ---------- edição ----------
function entrarEdicao(sala) {
  estado.emEdicao = sala.id;
  $("titulo-form").textContent = `Editando sala ${sala.numero}`;
  $("capacidade").value = sala.capacidade;
  $("btn-salvar").textContent = "Salvar alterações";
  $("btn-cancelar").hidden = false;
  renderPrevia();
  $("capacidade").focus();
}

function sairEdicao() {
  estado.emEdicao = null;
  $("titulo-form").textContent = "Nova sala";
  $("form-sala").reset();
  $("btn-salvar").textContent = "Cadastrar sala";
  $("btn-cancelar").hidden = true;
  renderPrevia();
}

// ---------- eventos ----------
$("form-sala").addEventListener("submit", async (e) => {
  e.preventDefault();
  const botao = $("btn-salvar");
  if (botao.disabled) return;
  botao.disabled = true;
  try {
    if (estado.emEdicao) {
      await atualizarSala(estado.emEdicao, { capacidade: Number($("capacidade").value) });
      sairEdicao();
    } else {
      const nova = await criarSalaAuto({ capacidade: $("capacidade").value }, estado.salas);
      location.href = `planta3d.html?sala=${encodeURIComponent(nova.key)}&nova=1`;   // direto para a sala no prédio 3D
    }
  } catch (erro) {
    alert(erro.message);
  } finally {
    botao.disabled = false;
  }
});

$("btn-cancelar").addEventListener("click", sairEdicao);

// Um único ouvinte para todos os botões gerados dinamicamente (lista e aviso)
document.addEventListener("click", async (e) => {
  const botao = e.target.closest("button[data-acao]");
  if (!botao) return;
  const sala = estado.salas.find((s) => s.id === botao.dataset.id);
  try {
    switch (botao.dataset.acao) {
      case "editar": if (sala) entrarEdicao(sala); break;
      case "remover": {
        if (!sala) break;
        const futuras = await contarReservasFuturas(sala.id);
        const aviso = futuras ? `\n\n⚠️ Existem ${futuras} aula(s) marcadas nessa sala; elas ficarão sem sala.` : "";
        if (confirm(`Remover a sala ${sala.numero}? A vaga ficará livre para a próxima sala cadastrada.${aviso}`)) await removerSala(sala.id);
        break;
      }
      case "organizar":
        if (confirm(`Renumerar ${estado.plano.length} sala(s) como mostrado? As reservas existentes continuam valendo.`)) await aplicarPlano(estado.plano);
        break;
    }
  } catch (erro) {
    alert(erro.message);
  }
});

escutarSalas((salas) => {
  estado.salas = salas;
  estado.plano = planoDeOrganizacao(salas);
  if (estado.emEdicao && !salas.some((s) => s.id === estado.emEdicao)) sairEdicao();   // a sala editada foi removida
  renderResumo(); renderAviso(); renderLista(); renderPrevia();
});
