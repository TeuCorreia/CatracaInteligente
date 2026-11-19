// ============================================================
// PRÉDIO 3D — aplicação: estado, modos de visão, interação e dados em tempo real
//
//   js/salas.js        salas (Firebase)         js/reservas.js   aulas/reservas (Firebase)
//   predio3d/predio.js geometria do prédio      predio3d/painel.js  painel lateral
//   predio3d/cena.js   renderizador/tema        predio3d/recursos.js materiais/lotes
// ============================================================
import * as THREE from "three";
import { escutarSalas, salaNoPadrao } from "../salas.js";
import { escutarProfessores } from "../professores.js";
import { escutarTurmas, aulasPorSala, reservarSala, liberarAula, sobrepoe, conflitosDeTurma } from "../reservas.js";
import { escutarDisciplinas } from "../disciplinas.js";
import { escutarAlunos } from "../alunos.js";
import { idsDaDisciplina, montarAulas } from "../conflitos.js";
import { esc, andarNome, hojeISO } from "../util.js";
import { FH, T, SALA_L, SALA_P, STATUS, SELECAO, normalizarSalas } from "./config.js";
import { matStatus, COR_STATUS, mat, definirOpacidadeArestas } from "./recursos.js";
import { criarPessoa, balancar } from "./pessoas.js";
import { criarCena } from "./cena.js";
import { criarPredio, descartarPredio } from "./predio.js";
import { animarDetalhes } from "./detalhes.js";
import { criarPainel } from "./painel.js";

const $ = (seletor) => document.querySelector(seletor);
const raiz = document.documentElement;

// ======================= ESTADO =======================
const sessao = window.Sessao?.obter?.() ?? {};
const ehAdmin = sessao.papel === "admin";
const reduzirMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
let salaPendente = params.get("sala");       // sala a destacar quando os dados chegarem (vem do cadastro)
const veioDoCadastro = params.has("nova");

const estado = {
  modo: "transp",                // "fora" | "transp" | "a<índice do andar>" (corte) | "planta" (2D)
  selecionada: null, hover: null, assinaturaSel: null,
  filtro: { capMin: 0, andar: "", soLivres: false },
  brutas: [], salas: [], turmas: [], disciplinas: [], alunos: [], professores: new Map(), professoresLista: [], aulas: new Map(),
  pred: null, medidas: "",
};

// Como cada modo de visão ajusta a transparência (ver passoVisual)
const PRESETS = {
  fora:   { parede: .95, fach: 1,   vidro: .5,  vol: 0,   aresta: 0 },
  transp: { parede: .16, fach: .14, vidro: .1,  vol: .13, aresta: .85 },
  corte:  { parede: .95, fach: .35, vidro: .14, vol: .15, aresta: .85 },
};
const visual = { ...PRESETS.transp };
let alvo = { ...PRESETS.transp };
let pickAtivos = [];

const indiceCorte = () => (estado.modo.startsWith("a") ? Number(estado.modo.slice(1)) : null);
const salaSelecionada = () => estado.pred?.salas.find((r) => r.s.id === estado.selecionada) ?? null;
const aulasDa = (salaId) => estado.aulas.get(salaId) ?? [];

// Cores de estado: a fonte é config.js; o CSS lê estas variáveis (legenda e rótulos)
for (const [k, s] of Object.entries(STATUS)) raiz.style.setProperty(`--st-${k}`, s.css);
raiz.style.setProperty("--st-sel", SELECAO.css);

// ======================= CENA, PAINEL, FILTROS =======================
const cena = criarCena($("#cena"), $("#labels"));
const { scene, camera, controles } = cena;

const dataInput = $("#data"), iniInput = $("#ini"), fimInput = $("#fim");
dataInput.value = hojeISO();
if (ehAdmin) $("#nova-sala").hidden = false;
$("#usuario").textContent = sessao.nome ?? "";
$("#sair").addEventListener("click", () => window.Sessao?.sair());

// ---------- celular: gaveta inferior (recolhida / aberta) ----------
const telaEstreita = matchMedia("(max-width: 800px)");
const folha = $("#folha"), alca = $("#alca");
/** Abre ou recolhe a gaveta (no computador a classe não tem efeito: o painel fica sempre aberto ao lado). */
function abrirFolha(aberta, titulo) {
  folha.classList.toggle("recolhida", !aberta);
  alca.setAttribute("aria-expanded", String(aberta));
  if (titulo) $("#alca-txt").textContent = titulo;
}
alca.addEventListener("click", () => abrirFolha(folha.classList.contains("recolhida")));

/** No celular a gaveta cobre o pé da tela e a barra cobre o topo: centraliza o prédio no espaço que sobra. */
function ajustarVista() {
  const topoH = $("#topo").offsetHeight;
  raiz.style.setProperty("--topo-h", `${topoH}px`);   // o painel começa logo abaixo da barra superior, qualquer que seja a altura dela
  cena.deslocarVista(telaEstreita.matches ? (folha.offsetHeight - topoH - 8) / 2 : 0);
}
new ResizeObserver(ajustarVista).observe($("#topo"));
new ResizeObserver(ajustarVista).observe(folha);       // acompanha a gaveta abrindo/fechando
telaEstreita.addEventListener("change", () => { ajustarVista(); atualizarSalas(); if (estado.pred && !estado.selecionada) vistaModo(); });

/** Intervalo escolhido na barra ([ini, fim]) ou null = dia todo. */
function intervalo() {
  const ini = iniInput.value, fim = fimInput.value;
  return ini && fim && fim > ini ? [ini, fim] : null;
}

const painel = criarPainel($("#painel"), {
  sessao, ehAdmin,
  aoFechar: () => fechar(),
  aoLiberar: liberarAula,
  // ALOCAÇÃO (só o admin vê o formulário): o admin escolhe o professor e, opcionalmente, a turma dele
  aoReservar: (salaId, d) => {
    const professor = estado.professoresLista.find((p) => p.id === d.professorId);
    if (!professor) throw new Error("Escolha o professor que será alocado.");
    const turma = estado.disciplinas.find((x) => x.id === d.turma);   // turma escolhida: liga a aula aos alunos dela
    return reservarSala(
      { salaId, data: dataInput.value, curso: d.curso, assunto: d.assunto, professor: professor.nome, ini: d.ini, fim: d.fim,
        usuario: sessao.usuario, disciplinaId: turma?.id ?? null, professorId: professor.id },
      aulasDa(salaId),
      contextoTurmas()
    );
  },
  professoresParaAlocar: () => professoresParaAlocar(),          // funções definidas mais abaixo: chamadas só depois do carregamento
  turmasDoProfessor: (id) => turmasDoProfessor(id),
  aoVerificar: ({ disciplinaId, professorId, ini, fim, salaId }) => conflitosDeTurma({ disciplinaId, professorId, data: dataInput.value, ini, fim, salaId }, contextoTurmas()),
  aoFiltrar: (filtro) => { estado.filtro = filtro; atualizarSalas(); },
  aoEscolher: (salaId, data) => {            // da lista/"Suas aulas": vai para o dia da aula e destaca a sala
    const r = estado.pred?.salas.find((x) => x.s.id === salaId);
    if (!r) return;
    if (data && data !== dataInput.value) { dataInput.value = data; recalcularAulas(); atualizarSalas(); }
    selecionar(r);
  },
});

// ---------- filtro "Encontrar sala" ----------
const filtroAtivo = () => estado.filtro.capMin > 0 || estado.filtro.andar !== "" || estado.filtro.soLivres;
const atende = (r) =>
  r.s.capacidade >= estado.filtro.capMin &&
  (estado.filtro.andar === "" || String(r.s.andar) === String(estado.filtro.andar)) &&
  (!estado.filtro.soLivres || r.status === "livre");

function resultadosBusca() {
  const lista = estado.pred.salas.filter(atende)
    .sort((a, b) => a.s.andar - b.s.andar || Number(a.s.numero) - Number(b.s.numero))
    .map((r) => ({ id: r.s.id, numero: r.s.numero, andar: r.s.andar, capacidade: r.s.capacidade, status: r.status }));
  const iv = intervalo();
  const livres = lista.filter((r) => r.status === "livre").length;
  const resumo = `${lista.length} sala${lista.length === 1 ? "" : "s"} · ${livres} livre${livres === 1 ? "" : "s"} ${iv ? `das ${iv[0]} às ${iv[1]}` : "no dia todo"}`;
  return { lista, resumo };
}

const ehProfessor = sessao.papel === "professor";
const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");

/** Professores que o admin pode alocar (do cadastro). */
const professoresParaAlocar = () => estado.professoresLista.map((p) => ({ id: p.id, nome: p.nome })).sort(porNome);

/** Turmas (disciplinas) de um professor: o que o admin pode vincular à aula ao alocá-lo. */
const turmasDoProfessor = (professorId) => estado.disciplinas
  .filter((d) => !!professorId && d.professorId === professorId)
  .map((d) => ({ id: d.id, nome: d.nome, nAlunos: idsDaDisciplina(d).length })).sort(porNome);

/** "Suas aulas" do professor logado: onde e quando ele vai dar aula (null para o admin). */
function minhasAulas() {
  if (!ehProfessor) return null;
  if (!sessao.professorId) return { vinculado: false, lista: [] };
  const hoje = hojeISO(), salas = new Map(estado.brutas.map((s) => [s.id, s]));
  const lista = montarAulas({ turmas: estado.turmas, disciplinas: estado.disciplinas })
    .filter((a) => a.professorId === sessao.professorId && a.data >= hoje)
    .sort((x, y) => x.data.localeCompare(y.data) || x.ini.localeCompare(y.ini)).slice(0, 6)
    .map((a) => {
      const s = salas.get(a.salaId);
      return { salaId: a.salaId, data: a.data, ini: a.ini, fim: a.fim, nome: a.nome,
               quando: a.data === hoje ? "Hoje" : a.data.split("-").reverse().slice(0, 2).join("/"),
               onde: s ? `Sala ${s.numero} · ${andarNome(s.andar)} · módulo ${s.modulo}` : "Sala não definida" };
    });
  return { vinculado: true, lista };
}
const atualizarMinhasNoPainel = () => { if (!estado.selecionada) painel.atualizarMinhasAulas(minhasAulas()); };
const contextoTurmas = () => ({ turmas: estado.turmas, disciplinas: estado.disciplinas, alunos: estado.alunos, salas: estado.brutas });

function mostrarPainel() {
  const r = salaSelecionada();
  estado.assinaturaSel = r ? assinatura(r) : null;
  if (!r) {
    if (!estado.pred) { $("#painel").innerHTML = `<p class="sub">Carregando salas…</p>`; return; }
    const { lista, resumo } = resultadosBusca();
    return painel.mostrarBusca({ filtro: estado.filtro, andares: estado.pred.andares, resultados: lista, resumo, minhasAulas: minhasAulas() });
  }
  const iv = intervalo();
  painel.mostrarSala(r.s, aulasDa(r.s.id), dataInput.value, iv ? { ini: iv[0], fim: iv[1] } : {});
}
const assinatura = (r) => JSON.stringify([r.s.numero, r.s.capacidade, r.s.modulo, r.s.andar]);

function aviso(texto) {
  const el = $("#toast");
  el.textContent = texto; el.classList.add("on");
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove("on"), 4600);
}

// ======================= ESTADO VISUAL DAS SALAS =======================
function recalcularAulas() {
  estado.aulas = aulasPorSala(estado.turmas, dataInput.value, estado.professores, new Map(estado.disciplinas.map((d) => [d.id, d])));
}

/** livre | ocupada (aula dentro do horário escolhido, ou no dia se não há horário) | parcial (só em outro horário). */
function statusDe(aulas) {
  if (!aulas.length) return "livre";
  const iv = intervalo();
  if (!iv) return "ocupada";
  return aulas.some((a) => sobrepoe(a, iv[0], iv[1])) ? "ocupada" : "parcial";
}

function criarProfessorDaSala(r) {
  const p = criarPessoa(estado.pred.salas.indexOf(r) + 3);
  p.g.position.set(SALA_L * .28, T, -SALA_P / 2 + (r.s.tipo === "Auditório" ? 1.3 : 1.45)).applyMatrix4(r.base);
  p.g.rotation.y = r.rot;
  r.fl.grp.add(p.g);
  r.prof = p;
}

const geoPin = new THREE.ConeGeometry(.42, .95, 4).rotateX(Math.PI);          // ponta para baixo
const matPin = new THREE.MeshBasicMaterial({ color: SELECAO.hex });
/** Marcador flutuante sobre a sala onde o professor dá aula (sobe e desce em animar). */
function criarPin(r) {
  const pin = new THREE.Mesh(geoPin, matPin);
  pin.position.set(r.centro.x, 1.2, r.centro.z);
  r.fl.grp.add(pin);
  r.pin = pin;
}

/** Sincroniza cor, rótulo e professor de cada sala com as aulas da data. Só mexe no que mudou. */
function atualizarSalas() {
  const pred = estado.pred;
  if (!pred) return;
  const iv = intervalo();
  const filtrando = filtroAtivo();
  // rótulos compactos: no translúcido com muitos andares, só o andar em foco mostra o rótulo completo
  const compacto = estado.modo === "transp" && pred.pisos.length > 2;
  const focoAndar = salaSelecionada()?.fl ?? pred.salas.find((r) => r.s.id === estado.hover)?.fl ?? null;
  estado.focoAndar = focoAndar;
  let total = 0;
  for (const r of pred.salas) {
    const aulas = aulasDa(r.s.id);
    total += aulas.length;
    const st = statusDe(aulas), sel = estado.selecionada === r.s.id;
    if (r.status !== st) { r.status = st; r.tile.material = matStatus[st]; r.volMat.color.copy(COR_STATUS[st]); }
    r.apagada = filtrando && !atende(r);
    // "sua aula": o professor logado tem aula nesta sala na data escolhida → marcador flutuante no 3D
    r.minha = ehProfessor && !!sessao.professorId && aulas.some((a) => a.professorId === sessao.professorId);
    if (r.minha && !r.pin) criarPin(r);
    if (r.pin) r.pin.visible = r.minha && estado.modo !== "fora";
    r.anel.visible = sel;
    if (aulas.length && !r.prof) criarProfessorDaSala(r);
    if (r.prof) r.prof.g.visible = aulas.length > 0;

    // o texto repete o estado da cor (ícone + palavra): a cor nunca é o único sinal
    const qtd = iv ? aulas.filter((a) => sobrepoe(a, iv[0], iv[1])).length : aulas.length;
    const estadoTxt = r.minha ? "★ sua aula" : st === "ocupada" ? `● ${qtd} aula${qtd > 1 ? "s" : ""}` : STATUS[st].texto;
    const html = `<b>${esc(r.s.numero)}${salaNoPadrao(r.s) ? "" : " ⚠️"}</b><small>${esc(estadoTxt)} · ${r.s.capacidade} lug.</small>`;
    if (r.rotulo !== html) {
      r.rotulo = html; r.div.innerHTML = html;
      r.div.setAttribute("aria-label", `Sala ${r.s.numero}, ${andarNome(r.s.andar)}, ${r.s.capacidade} lugares, ${STATUS[st].leitor}`);
    }
    // celular: só o número em todas (a sala escolhida mostra o rótulo completo); senão os rótulos se cobrem
    const mini = !sel && (telaEstreita.matches || (compacto && r.fl !== focoAndar));
    const classe = `lbl ${st}${sel ? " sel" : ""}${r.minha ? " minha" : ""}${r.apagada ? " apagada" : ""}${mini ? " mini" : ""}`;
    if (r.classe !== classe) { r.classe = classe; r.div.className = classe; }
  }
  const s = pred.salas.length;
  $("#stats").textContent = `${s} sala${s === 1 ? "" : "s"} · ${total} aula${total === 1 ? "" : "s"} na data`;

  if (!estado.selecionada) { const { lista, resumo } = resultadosBusca(); painel.atualizarResultados(lista, resumo); }
  if (estado.modo === "planta") renderPlanta();
}

// ======================= PLANTA 2D (andares vistos de cima, em HTML) =======================
let htmlPlanta = "";
function renderPlanta() {
  const pred = estado.pred;
  const andares = [...pred.pisos].reverse().map((fl) => {
    const salas = fl.salas.map((r, i) => {
      const col = Math.floor(i / 2) + 1, linha = i % 2 === 0 ? 1 : 3;   // mesma disposição do 3D: lados alternados do corredor
      const cls = `sala2d ${r.status}${estado.selecionada === r.s.id ? " sel" : ""}${r.minha ? " minha" : ""}${r.apagada ? " apagada" : ""}`;
      return `<button type="button" class="${cls}" data-sala="${esc(r.s.id)}" style="grid-column:${col};grid-row:${linha}"
        aria-label="${esc(r.div.getAttribute("aria-label") ?? "")}">
        <b>${r.minha ? "★ " : ""}${esc(r.s.numero)}</b><small>${esc(r.minha ? "sua aula" : STATUS[r.status].texto)}</small><small>${r.s.capacidade} lug.</small></button>`;
    }).join("");
    return `<section class="andar2d"><h3>${esc(andarNome(fl.andar))}</h3>
      <div class="grade2d" style="--cols:${pred.colunas}">${salas}<div class="corredor2d" style="grid-column:1/-1;grid-row:2">corredor</div></div></section>`;
  }).join("");
  const html = andares || `<p class="sub">Nenhuma sala cadastrada.</p>`;
  if (html !== htmlPlanta) { htmlPlanta = html; $("#planta2d").innerHTML = html; }
}
$("#planta2d").addEventListener("click", (e) => {
  const botao = e.target.closest("[data-sala]");
  const r = botao && estado.pred?.salas.find((x) => x.s.id === botao.dataset.sala);
  if (r) selecionar(r);
});

// ======================= MODOS DE VISÃO =======================
function escreverVisual() {
  mat.parede.opacity = visual.parede; mat.parede.depthWrite = visual.parede > .85;
  mat.fachada.opacity = visual.fach; mat.fachada.depthWrite = visual.fach > .85;
  mat.brise.opacity = visual.fach; mat.brise.depthWrite = visual.fach > .85;   // brises somem junto com a fachada
  mat.vidro.opacity = visual.vidro;
  definirOpacidadeArestas(visual.aresta);
}

/** Aproxima `visual` do `alvo` (transições suaves). Só escreve nos materiais quando algo mudou. */
function passoVisual(k) {
  let mudou = false;
  for (const chave in alvo) {
    const d = alvo[chave] - visual[chave];
    if (d === 0) continue;
    visual[chave] = Math.abs(d) < .002 ? alvo[chave] : visual[chave] + d * k;
    mudou = true;
  }
  if (mudou) escreverVisual();
  for (const fl of estado.pred?.pisos ?? []) {
    const d = fl.escAlvo - fl.esc;
    if (d === 0) continue;
    fl.esc = Math.abs(d) < .002 ? fl.escAlvo : fl.esc + d * k;
    fl.paredes.scale.y = fl.fach.scale.y = fl.esc;
  }
}

/** Aplica o modo atual. `snap` pula as animações; `reenquadrar` move a câmera. */
function aplicarModo({ snap = false, reenquadrar = true } = {}) {
  const pred = estado.pred;
  const fora = estado.modo === "fora", planta = estado.modo === "planta", corte = indiceCorte();
  alvo = fora ? PRESETS.fora : corte === null ? PRESETS.transp : PRESETS.corte;
  $("#planta2d").hidden = !planta;
  $("#labels").hidden = planta;            // o 3D fica pausado: seus rótulos não podem ficar "congelados" por cima
  $("#cena").classList.toggle("pausada", planta);
  if (planta) {
    htmlPlanta = ""; renderPlanta();
    const p2d = $("#planta2d"); p2d.classList.add("entrando");
    clearTimeout(aplicarModo.t); aplicarModo.t = setTimeout(() => p2d.classList.remove("entrando"), 900);   // anima só ao abrir
  }

  pickAtivos = [];
  for (const fl of pred.pisos) {
    fl.grp.visible = corte === null || fl.idx <= corte;          // corte: mostra o prédio só até o andar escolhido
    fl.escAlvo = corte !== null && fl.idx === corte ? .5 : 1;    // e baixa as paredes desse andar
    const interativo = !fora && !planta && (corte === null || fl.idx === corte);   // só o andar cortado tem rótulos e cliques
    for (const r of fl.salas) {
      r.lab.visible = interativo;
      if (interativo) pickAtivos.push(r.vol);
    }
  }
  if (fora) pickAtivos = pred.pickPredio;
  pred.telhado.visible = pred.placa.visible = fora;
  controles.autoRotate = fora && !estado.selecionada && !reduzirMovimento;
  document.querySelectorAll("#modos [data-m]").forEach((b) => {
    const ativo = b.dataset.m === estado.modo;
    b.classList.toggle("on", ativo); b.setAttribute("aria-pressed", String(ativo));
  });

  if (estado.selecionada && !fora && !planta && !pickAtivos.some((m) => m.userData.sala.s.id === estado.selecionada)) {
    estado.selecionada = null; mostrarPainel(); abrirFolha(false, "Encontrar sala");   // a sala escolhida ficou fora do andar do corte
  }
  if (snap || reduzirMovimento) {
    Object.assign(visual, alvo); escreverVisual();
    for (const fl of pred.pisos) { fl.esc = fl.escAlvo; fl.paredes.scale.y = fl.fach.scale.y = fl.esc; }
  }
  atualizarSalas();
  if (reenquadrar) vistaModo(!snap);
}

// ======================= CÂMERA =======================
let rota = null;
function irPara(pos, alvoCam, animar = true) {
  if (!animar || reduzirMovimento) { camera.position.set(...pos); controles.target.set(...alvoCam); rota = null; return; }
  rota = { pos: new THREE.Vector3(...pos), alvo: new THREE.Vector3(...alvoCam) };
}
controles.addEventListener("start", () => { rota = null; controles.autoRotate = false; });

/** Tela em pé (celular): o campo de visão horizontal fica estreito, então a câmera recua para o prédio caber. */
const recuo = () => Math.min(1.5, Math.max(1, 0.62 / camera.aspect));

function vistaModo(animar = true) {
  const { W, D, H } = estado.pred.medidas, d = Math.max(W, D * 1.2, H * 1.3, 14) * 1.5 * recuo();   // a altura também conta (prédios altos)
  const corte = indiceCorte();
  if (corte !== null) { const y = corte * FH; return irPara([d * .35, y + d * .8, d * .72], [0, y, 0], animar); }
  const fora = estado.modo === "fora";
  irPara([d * (fora ? .8 : .75), H * .5 + d * (fora ? .3 : .42), d * (fora ? 1.15 : 1.0)], [0, H * .42, 0], animar);
}

function focarSala(r) {
  const c = r.centro, k = Math.sqrt(recuo());   // celular: um pouco mais longe para a sala inteira caber na largura
  irPara([c.x + 1.5 * k, c.y + 6.5 * k, c.z + 7.5 * k], [c.x, c.y + .8, c.z]);
}

// ======================= SELEÇÃO E INTERAÇÃO =======================
function selecionar(r, destacar = false) {
  if (estado.modo === "fora") { estado.modo = "transp"; aplicarModo({ reenquadrar: false }); }
  // vindo da lista/planta com um corte em outro andar: troca o corte para o andar da sala
  if (indiceCorte() !== null && indiceCorte() !== r.fl.idx) { estado.modo = `a${r.fl.idx}`; aplicarModo({ reenquadrar: false }); }
  estado.selecionada = r.s.id;
  if (destacar && !reduzirMovimento) r.pulsoAte = performance.now() + 4500;
  controles.autoRotate = false;
  atualizarSalas(); mostrarPainel(); focarSala(r);
  abrirFolha(true, `Sala ${r.s.numero}`);
}

function fechar() {
  if (!estado.selecionada) return;
  estado.selecionada = null;
  atualizarSalas(); mostrarPainel(); vistaModo();
  abrirFolha(false, "Encontrar sala");
}
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) fechar();
});

const raio = new THREE.Raycaster(), mouse = new THREE.Vector2();
/** Quem está sob o ponteiro: a sala (modos internos) ou o prédio (visão por fora). */
function apontar(ev) {
  const b = cena.renderer.domElement.getBoundingClientRect();
  mouse.set(((ev.clientX - b.left) / b.width) * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1);
  raio.setFromCamera(mouse, camera);
  const hit = raio.intersectObjects(pickAtivos, false)[0]?.object;
  return estado.modo === "fora" ? { predio: !!hit } : { sala: hit?.userData.sala ?? null };
}

const tela = cena.renderer.domElement;
let pressionado = null, movimento = null;
tela.addEventListener("pointerdown", (e) => { pressionado = [e.clientX, e.clientY]; });
tela.addEventListener("pointerup", (e) => {
  if (!pressionado || Math.hypot(e.clientX - pressionado[0], e.clientY - pressionado[1]) > 5) return;
  const a = apontar(e);
  if (a.predio) { estado.modo = "transp"; aplicarModo(); aviso("Visão translúcida: clique numa sala para ver detalhes."); }
  else if (a.sala) selecionar(a.sala);
});
// o "hover" é calculado no máximo uma vez por quadro (ver animar), não a cada evento do mouse
tela.addEventListener("pointermove", (e) => { movimento = e.buttons ? null : e; });

// Rótulos são <button>: também funcionam com Tab + Enter (alternativa ao clique no 3D)
$("#labels").addEventListener("click", (e) => {
  const botao = e.target.closest(".lbl");
  const r = botao && estado.pred?.salas.find((x) => x.s.id === botao.dataset.sala);
  if (r) selecionar(r);
});

dataInput.addEventListener("change", () => {
  recalcularAulas(); atualizarSalas();
  const r = salaSelecionada();
  if (r) painel.atualizarAulas(aulasDa(r.s.id), dataInput.value);   // só a lista e a data: o formulário fica intacto
});
for (const campo of [iniInput, fimInput]) campo.addEventListener("input", atualizarSalas);
$("#limpar-horario").addEventListener("click", () => { iniInput.value = fimInput.value = ""; atualizarSalas(); });

$("#modos").addEventListener("click", (e) => {
  const botao = e.target.closest("[data-m]");
  if (botao) { estado.modo = botao.dataset.m; aplicarModo(); }
});

// ======================= CONSTRUÇÃO / DADOS =======================
function montarControles(pred) {
  $("#modos").innerHTML = [
    `<button data-m="fora">Por fora</button>`, `<button data-m="transp">Translúcido</button>`, `<button data-m="planta">Planta 2D</button>`,
    `<span class="sep"></span>`,
    ...pred.andares.map((a, i) => `<button data-m="a${i}">${esc(andarNome(a))}</button>`),
  ].join("");
  const hex = (m) => `#${new THREE.Color(pred.corDe(m)).getHexString()}`;
  $("#legenda").innerHTML =
    `<span><i style="background:${STATUS.livre.css}"></i>Livre</span><span><i style="background:${STATUS.ocupada.css}"></i>Ocupada</span>` +
    `<span><i style="background:${STATUS.parcial.css}"></i>Aula em outro horário</span><span><i style="background:${SELECAO.css}"></i>Selecionada</span>` +
    (pred.modulos.length > 1 ? `<span>Módulos: ${pred.modulos.map((m) => `<i style="background:${hex(m)};margin-left:6px"></i>${esc(m)}`).join(" ")}</span>` : "");
}

function reconstruir(brutas) {
  estado.brutas = brutas;
  estado.salas = normalizarSalas(brutas);

  const anterior = estado.pred;
  if (anterior) { scene.remove(anterior.raiz, anterior.entorno); descartarPredio(anterior); }
  const pred = estado.pred = criarPredio(estado.salas);
  scene.add(pred.raiz, pred.entorno);

  const { W, D, H } = pred.medidas;
  cena.ajustarSombra(W, D, H);
  $("#vazio").hidden = estado.salas.length > 0;
  if (!estado.salas.length) {
    $("#vazio-link").hidden = !ehAdmin;
    $("#vazio-txt").textContent = ehAdmin ? "Cadastre as salas para o prédio aparecer aqui em 3D." : "Peça ao administrador para cadastrar as salas.";
  }
  montarControles(pred);

  if (estado.modo.startsWith("a") && !pred.pisos[indiceCorte()]) estado.modo = "transp";
  if (estado.selecionada && !pred.salas.some((r) => r.s.id === estado.selecionada)) estado.selecionada = null;

  // A câmera só se reposiciona se o tamanho do prédio mudou (ou na primeira carga):
  // assim, uma sala nova cadastrada por outra pessoa não tira o professor de onde ele está olhando.
  const medidas = `${W}|${D}|${H}`;
  const primeira = estado.medidas === "";
  aplicarModo({ snap: true, reenquadrar: medidas !== estado.medidas });
  estado.medidas = medidas;
  // primeira carga: a câmera começa mais longe e "chega" ao prédio (cortado com movimento reduzido)
  if (primeira && !reduzirMovimento) { camera.position.multiplyScalar(1.7); vistaModo(true); }

  // O painel só é refeito se a sala aberta mudou de verdade; senão o formulário em preenchimento fica intacto.
  const r = salaSelecionada();
  if (!r) { if (!$("#resultados")) mostrarPainel(); }    // a busca já existe: seus filtros/foco ficam intactos (resultados já atualizados)
  else if (assinatura(r) !== estado.assinaturaSel) mostrarPainel();
}

const aoFalhar = (texto) => (erro) => { console.error(erro); $("#stats").textContent = "erro ao carregar"; painel.mostrarErro(texto); };

escutarSalas((brutas) => {
  reconstruir(brutas);
  const r = salaPendente && estado.pred.salas.find((x) => x.s.id === salaPendente);
  if (r) {
    selecionar(r, true);
    if (veioDoCadastro) aviso(`✅ Sala ${r.s.numero} cadastrada! Veja onde ela ficou no prédio.`);
  }
  if (salaPendente) { history.replaceState(null, "", location.pathname); salaPendente = null; }
}, aoFalhar("Não foi possível carregar as salas do Firebase."));

escutarTurmas((turmas) => {
  estado.turmas = turmas; recalcularAulas(); atualizarSalas(); atualizarMinhasNoPainel();
  const r = salaSelecionada();
  if (r) painel.atualizarAulas(aulasDa(r.s.id));   // só a lista: não apaga o formulário
}, aoFalhar("Não foi possível carregar as aulas reservadas."));

escutarProfessores((lista) => {
  estado.professoresLista = lista;
  estado.professores = new Map(lista.map((p) => [p.id, p.nome]));
  recalcularAulas(); atualizarSalas();
  painel.atualizarProfessores();       // a sala pode já estar aberta (vinda do cadastro) antes dos professores chegarem
});

// disciplinas (turmas) e alunos: base para vincular a aula aos alunos e achar choques de horário
escutarDisciplinas((lista) => {
  estado.disciplinas = lista; recalcularAulas(); atualizarSalas(); atualizarMinhasNoPainel();
  const r = salaSelecionada();
  if (r) painel.atualizarAulas(aulasDa(r.s.id));
});
escutarAlunos((lista) => { estado.alunos = lista; });

// ======================= TEMA =======================
cena.aplicarTema(window.Tema?.escuro() ?? false);
document.addEventListener("temachange", (e) => cena.aplicarTema(e.detail.escuro));

// ======================= LOOP DE ANIMAÇÃO =======================
addEventListener("resize", cena.redimensionar);
cena.redimensionar();

const relogio = new THREE.Clock();
const FAIXA = { 1: -.72, [-1]: -.12 };   // sentidos opostos andam em faixas diferentes do corredor

function animar() {
  requestAnimationFrame(animar);
  const dt = Math.min(relogio.getDelta(), .1), t = relogio.elapsedTime, agora = performance.now();
  const k = 1 - Math.pow(.001, dt);   // fator de suavização independente da taxa de quadros
  const pred = estado.pred;
  if (estado.modo === "planta") return;   // planta 2D em HTML: o 3D fica pausado (economiza CPU/bateria)

  if (pred) {
    passoVisual(Math.min(1, k * 1.4));

    if (movimento) {   // hover: um raycast por quadro, no máximo
      const a = apontar(movimento); movimento = null;
      estado.hover = a.sala?.s.id ?? null;
      tela.style.cursor = a.sala || a.predio ? "pointer" : "grab";
      // rótulos compactos acompanham o andar sob o cursor
      if (pred.pisos.length > 2 && estado.modo === "transp" && (a.sala?.fl ?? estado.focoAndar) !== estado.focoAndar && !estado.selecionada) atualizarSalas();
    }

    if (!reduzirMovimento) {
      animarDetalhes(pred.animados, dt);          // carros na rua e nuvens
      for (const p of pred.andarilhos) {
        if (!p.fl.grp.visible) continue;
        p.x += p.dir * p.vel * dt;
        if (p.x > p.max) { p.x = p.max; p.dir = -1; } else if (p.x < p.min) { p.x = p.min; p.dir = 1; }
        p.g.position.set(p.x, Math.abs(Math.sin(t * p.vel * 6 + p.fase)) * .03, FAIXA[p.dir]);
        p.g.rotation.y = p.dir * Math.PI / 2;
        balancar(p, t * p.vel * 6);
      }
    }

    const semVolume = alvo.vol === 0;
    for (const r of pred.salas) {
      const extra = estado.selecionada === r.s.id ? .22 : estado.hover === r.s.id ? .1 : 0;
      r.volMat.opacity = semVolume ? 0 : (visual.vol + extra) * (r.apagada ? .25 : 1);   // fora do filtro: quase apagada
      if (r.pin?.visible && !reduzirMovimento) r.pin.position.y = 1.2 + Math.sin(t * 3 + r.centro.x) * .12;
      if (r.prof?.g.visible && !reduzirMovimento) {
        r.prof.bracoD.rotation.x = -.6 + Math.sin(t * 1.6 + r.prof.fase) * .35;
        r.prof.g.position.y = T + Math.sin(t * 2 + r.prof.fase) * .006;
      }
      if (r.pulsoAte) {   // pulso de destaque da sala recém-cadastrada
        if (agora < r.pulsoAte) { r.volMat.color.set(SELECAO.hex); r.volMat.opacity = .25 + .25 * Math.sin(agora / 160); }
        else { r.pulsoAte = 0; r.status = ""; atualizarSalas(); }
      }
    }
  }

  if (rota) {
    camera.position.lerp(rota.pos, .07); controles.target.lerp(rota.alvo, .09);
    if (camera.position.distanceTo(rota.pos) < .05 && controles.target.distanceTo(rota.alvo) < .05) rota = null;
  }
  cena.desenhar();
}
mostrarPainel();
animar();
