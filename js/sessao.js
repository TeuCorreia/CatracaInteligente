// ============================================================
// SESSÃO REAL — Firebase Auth + perfil no Realtime Database
//
// A identidade do usuário vem do token do Firebase Auth (auth.currentUser) e o
// perfil (papel, vínculos) vem de usuarios/{uid} no banco, protegido pelas regras.
// Nada disso fica em sessionStorage: qualquer pessoa poderia editar a sessão
// antiga pelo DevTools e virar administrador.
//
// Uso:
//   import { Sessao, pronto } from "./js/sessao.js";
//   const sessao = await pronto;          // primeira resolução do Auth (pode ser null)
//   ...
// O guard.js também usa `pronto` para liberar/mascarar a página.
// ============================================================
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const PAPEIS_VALIDOS = new Set(["admin", "professor", "aluno"]);

let atual = null;
let primeiraResolucao = false;
let cancelarPerfil = null;
let resolverPronto;

export const pronto = new Promise((resolve) => { resolverPronto = resolve; });

function resolverPrimeira(sessao) {
  if (primeiraResolucao) return;
  primeiraResolucao = true;
  resolverPronto(sessao);
}

/** Lê o perfil autoritativo do usuário. Se não houver perfil, a conta não entra. */
export async function carregarPerfil(user) {
  if (!user) return null;
  const snap = await get(ref(db, `usuarios/${user.uid}`));
  if (!snap.exists()) return null;
  const p = snap.val() || {};
  if (!PAPEIS_VALIDOS.has(p.papel)) return null;

  return {
    uid: user.uid,
    usuario: user.email || "",
    email: user.email || "",
    papel: p.papel,
    nome: String(p.nome || user.email || "Usuário"),
    professorId: p.professorId || null,
    alunoId: p.alunoId || null,
    matricula: p.matricula ? String(p.matricula) : null,
  };
}

function aplicarPerfil(sessao) {
  atual = sessao;
  document.dispatchEvent(new CustomEvent("sessaomudada", { detail: sessao }));
}

// Uma única escuta inicial: quando ela dispara, `pronto` é resolvido.
onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      if (cancelarPerfil) { cancelarPerfil(); cancelarPerfil = null; }
      aplicarPerfil(null);
      resolverPrimeira(null);
      return;
    }

    const perfil = await carregarPerfil(user);
    if (!perfil) {
      // Conta sem perfil não tem papel: encerra a sessão para não ficar "meio logada".
      await signOut(auth);
      aplicarPerfil(null);
      resolverPrimeira(null);
      return;
    }

    aplicarPerfil(perfil);
    resolverPrimeira(perfil);

    // Se o administrador mudar o papel/vínculos, recarrega para aplicar o guard
    // nas páginas já abertas. As regras do banco já bloqueiam na hora.
    if (cancelarPerfil) { cancelarPerfil(); cancelarPerfil = null; }
    let papelAnterior = perfil.papel;
    cancelarPerfil = onValue(ref(db, `usuarios/${user.uid}`), (snap) => {
      const p = snap.val() || {};
      const papelAtual = PAPEIS_VALIDOS.has(p.papel) ? p.papel : null;
      if (!papelAtual) { signOut(auth).catch(() => {}); return; }
      if (papelAtual !== papelAnterior) { papelAnterior = papelAtual; location.reload(); }
      else if (atual) {
        aplicarPerfil({
          ...atual,
          nome: String(p.nome || atual.nome),
          professorId: p.professorId || null,
          alunoId: p.alunoId || null,
          matricula: p.matricula ? String(p.matricula) : null,
        });
      }
    }, () => { /* falha de leitura: a regra já impede acesso; mantém o perfil atual */ });
  } catch (erro) {
    console.error("Falha ao carregar a sessão:", erro);
    aplicarPerfil(null);
    resolverPrimeira(null);
  }
}, (erro) => {
  console.error("Falha no Firebase Auth:", erro);
  aplicarPerfil(null);
  resolverPrimeira(null);
});

/** Login com e-mail/senha do Firebase Auth. Nunca aceita senha fixa do código. */
export async function entrar(email, senha) {
  const credencial = await signInWithEmailAndPassword(
    auth,
    String(email ?? "").trim().toLowerCase(),
    String(senha ?? "")
  );
  const perfil = await carregarPerfil(credencial.user);
  if (!perfil) {
    await signOut(auth);
    throw new Error("Este usuário não tem perfil cadastrado. Procure o administrador.");
  }
  aplicarPerfil(perfil);
  resolverPrimeira(perfil);
  return perfil;
}

export const Sessao = {
  /** Sessão atual (null antes do `pronto` ou quando não há login). */
  obter: () => atual,

  /** true se houver sessão e o papel estiver na lista (sem lista: qualquer papel). */
  pode(papeis = []) {
    const lista = Array.isArray(papeis) ? papeis : String(papeis).split(",").map((p) => p.trim());
    return !!atual && (lista.length === 0 || lista.includes(atual.papel));
  },

  entrar,
  carregarPerfil,

  async sair() {
    try { await signOut(auth); } catch (erro) { console.error(erro); }
    location.replace("login.html");
  },
};
