// ============================================================
// RECONHECIMENTO FACIAL — responsável: Anthony
// ============================================================
// Esta parte ainda é só um placeholder. Sugestão de caminho:
//   - face-api.js (roda no navegador, mais simples de integrar
//     com o front web que já existe aqui)
//   - ou um microsserviço Python à parte (OpenCV / face_recognition),
//     mais preciso, mas exige um backend adicional rodando
//
// Enquanto isso não está pronto, a tela do aluno (aluno.html) usa um
// campo de matrícula digitada manualmente pra simular o resultado do
// reconhecimento, então o resto do grupo não fica travado esperando
// essa parte.
//
// TODO (Anthony): implementar reconhecerRosto() de verdade, cadastro
// facial do aluno, e decidir onde essa etapa roda (no navegador ou
// em um serviço separado que devolve a matrícula reconhecida).
// ============================================================

export async function reconhecerRosto() {
  // Placeholder: no futuro, aqui a câmera captura o rosto,
  // compara com o cadastro facial e devolve a matrícula do aluno.
  throw new Error("reconhecerRosto() ainda não implementado — ver TODO (Anthony)");
}
