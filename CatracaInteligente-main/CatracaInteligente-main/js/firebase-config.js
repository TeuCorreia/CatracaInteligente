// Já está pronto e conectado ao FireBase
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYcX_RDv_KXVUhnlZ2pDz-f7cPE4pAkzo",
  authDomain: "catraca-inteligente-b90fe.firebaseapp.com",
  projectId: "catraca-inteligente-b90fe",
  storageBucket: "catraca-inteligente-b90fe.firebasestorage.app",
  messagingSenderId: "985826306190",
  appId: "1:985826306190:web:bde95c28978d674472c1df",
  measurementId: "G-DM7W87LSWF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ------------------------------------------------------------
// ESTRUTURA DO BANCO (combinada pelo grupo — não mudar sem avisar todo mundo)
// ------------------------------------------------------------
// salas/            { salaId: { numero, modulo, andar, capacidade, disponivel } }
// alunos/           { alunoId: { nome, matricula, faceId, ativo } }
// professores/      { professorId: { nome, email } }
// disciplinas/      { disciplinaId: { nome, professorId } }
// turmas/           { turmaId: { disciplinaId, professorId, salaId, data, horario } }
// logs_acesso/      { logId: { alunoId, turmaId, timestamp, status } }
// ------------------------------------------------------------
