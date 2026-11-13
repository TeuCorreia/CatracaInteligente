// ============================================================
// IDENTIDADE (demo) — login de aluno e de professor ligado ao cadastro do banco
//
//   aluno      → usuário = matrícula cadastrada   · senha de demonstração "aluno123"
//   professor  → usuário = e-mail cadastrado      · senha de demonstração "prof123"
//
// ATENÇÃO: a senha é única e fixa só para demonstrar o fluxo; NÃO é segurança.
// Em produção o login deve usar Firebase Auth (e-mail/senha) ou o reconhecimento facial.
// ============================================================
import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const SENHA_ALUNO = "aluno123";
export const SENHA_PROFESSOR = "prof123";

const lista = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));

/**
 * Liga uma conta de demonstração ao professor cadastrado de mesmo nome (ex.: "Prof. Ana"), para que ela
 * enxergue só as turmas dele. Devolve o id, ou null se não houver exatamente um professor com esse nome.
 */
export async function professorIdPorNome(nome) {
  const chave = String(nome).trim().toLowerCase();
  const iguais = lista((await get(ref(db, "professores"))).val()).filter((p) => String(p.nome).trim().toLowerCase() === chave);
  return iguais.length === 1 ? iguais[0].id : null;
}

/**
 * Tenta entrar como aluno (matrícula) ou professor (e-mail) cadastrados.
 * @returns { sessao } em caso de sucesso, ou { erro } com a mensagem para o usuário; null se o texto não parece nenhum dos dois.
 */
export async function entrarPeloCadastro(usuario, senha) {
  const chave = String(usuario).trim().toLowerCase();

  if (/^\d+$/.test(chave)) {
    const aluno = lista((await get(ref(db, "alunos"))).val()).find((a) => String(a.matricula).trim() === chave);
    if (!aluno || senha !== SENHA_ALUNO) return { erro: "Matrícula ou senha incorretas." };
    if (aluno.ativo !== true) return { erro: "Matrícula inativa. Procure a secretaria." };
    return { sessao: { usuario: chave, papel: "aluno", nome: aluno.nome, alunoId: aluno.id, matricula: chave } };
  }

  if (chave.includes("@")) {
    const prof = lista((await get(ref(db, "professores"))).val()).find((p) => String(p.email).trim().toLowerCase() === chave);
    if (!prof || senha !== SENHA_PROFESSOR) return { erro: "E-mail ou senha incorretos." };
    return { sessao: { usuario: chave, papel: "professor", nome: prof.nome, professorId: prof.id } };
  }
  return null;
}
