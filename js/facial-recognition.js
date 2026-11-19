// ============================================================
// RECONHECIMENTO FACIAL — captura/cadastro e identificação com face-api.js
// - Cadastro: salva descritores em alunos/{id}.faceDescriptor (e opcionalmente professores)
// - Catraca: reconhece o rosto, encontra o aluno e devolve a matrícula para verificarAcesso()
// Modelos: por padrão carrega de CDN; se houver pasta ./models no projeto, pode-se passar baseUrl "./models".
// ============================================================
import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const SCRIPT_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";
const MODELOS_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
let modelosProntos = null;
let scriptCarregado = null;

function garantirFaceApi() {
  if (globalThis.faceapi) return Promise.resolve(globalThis.faceapi);
  if (scriptCarregado) return scriptCarregado;
  scriptCarregado = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_CDN;
    s.async = true;
    s.onload = () => resolve(globalThis.faceapi);
    s.onerror = () => reject(new Error("Não foi possível carregar a biblioteca face-api.js (verifique a internet/CDN)."));
    document.head.appendChild(s);
  });
  return scriptCarregado;
}

export async function carregarModelos(baseUrl = MODELOS_CDN) {
  const faceapi = await garantirFaceApi();
  if (modelosProntos === baseUrl) return faceapi;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
  ]);
  modelosProntos = baseUrl;
  return faceapi;
}

export async function iniciarCamera(videoEl) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este navegador não suporta acesso à câmera.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {});
  return stream;
}

export function pararCamera(videoEl) {
  const stream = videoEl?.srcObject;
  if (stream?.getTracks) stream.getTracks().forEach((t) => t.stop());
  if (videoEl) videoEl.srcObject = null;
}

const detector = () => new globalThis.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

export async function capturarDescritor(videoEl, baseUrl = MODELOS_CDN) {
  const faceapi = await carregarModelos(baseUrl);
  if (!videoEl || videoEl.readyState < 2) throw new Error("Câmera não está pronta.");
  const resultado = await faceapi
    .detectSingleFace(videoEl, detector())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!resultado) return null;
  return Array.from(resultado.descriptor);
}

export function temDescritor(valor) {
  return Array.isArray(valor) && valor.length >= 128;
}

function normalizarDescritor(valor) {
  return temDescritor(valor) ? new Float32Array(valor) : null;
}

export async function listarAlunosComFace() {
  const snap = await get(ref(db, "alunos"));
  const alunos = [];
  snap.forEach((item) => {
    const a = item.val() || {};
    if (temDescritor(a.faceDescriptor)) alunos.push({ id: item.key, ...a });
  });
  return alunos;
}

export async function identificarAlunoPorFace(videoEl, { baseUrl = MODELOS_CDN, limiar = 0.5 } = {}) {
  const faceapi = await carregarModelos(baseUrl);
  const descritor = await capturarDescritor(videoEl, baseUrl);
  if (!descritor) return { encontrado: false, motivo: "Nenhum rosto detectado. Posicione-se melhor e tente novamente." };

  const alunos = await listarAlunosComFace();
  if (!alunos.length) return { encontrado: false, motivo: "Nenhum aluno com facial cadastrada." };

  const labeled = alunos
    .map((a) => {
      const d = normalizarDescritor(a.faceDescriptor);
      return d ? new faceapi.LabeledFaceDescriptors(a.id, [d]) : null;
    })
    .filter(Boolean);

  const matcher = new faceapi.FaceMatcher(labeled, limiar);
  const melhor = matcher.findBestMatch(new Float32Array(descritor));

  if (!melhor || melhor.label === "unknown") {
    return { encontrado: false, motivo: "Rosto não reconhecido no cadastro." };
  }
  const aluno = alunos.find((a) => a.id === melhor.label);
  return { encontrado: true, alunoId: melhor.label, aluno, distancia: melhor.distance };
}

// Compatibilidade: captura/identifica a partir de um <video> ativo e retorna a matrícula reconhecida.
export async function reconhecerRosto(videoEl) {
  const resultado = await identificarAlunoPorFace(videoEl);
  if (!resultado.encontrado) throw new Error(resultado.motivo || "Rosto não reconhecido.");
  const matricula = resultado.aluno?.matricula;
  if (!matricula) throw new Error("Aluno reconhecido sem matrícula cadastrada.");
  return String(matricula);
}
