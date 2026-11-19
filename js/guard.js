// ============================================================
// GUARD — bloqueia a página até o Firebase Auth responder.
//
// Não há mais login "imaginário" nem sessão em sessionStorage. A sessão é a
// do Firebase Auth (token) e o papel vem de usuarios/{uid} no banco, protegido
// pelas regras. Este arquivo é um script clássico só para poder ler os
// atributos da própria tag <script> no <head>; a lógica real está em
// js/sessao.js.
//
// Uso:
//   <script src="js/guard.js" data-papeis="admin"></script>
//   <script src="js/guard.js" data-papeis="admin,professor"></script>
//   <script src="js/guard.js"></script>             → basta estar autenticado
//   <script src="js/guard.js" data-livre></script>  → login (não exige sessão)
// ============================================================
(function () {
  const tag = document.currentScript;
  const livre = !!tag?.hasAttribute("data-livre");
  const papeis = (tag?.dataset.papeis || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const root = document.documentElement;
  root.hidden = true;                       // não deixa o conteúdo protegido aparecer
  root.style.visibility = "hidden";         // reforço para CSS que sobrescreve [hidden]

  function mostrar() {
    root.hidden = false;
    root.style.visibility = "";
  }

  import("./js/sessao.js")
    .then(async ({ Sessao, pronto }) => {
      const sessao = await pronto;           // primeira decisão do Auth (user ou null)

      if (!livre) {
        if (!sessao) { location.replace("login.html"); return; }
        if (papeis.length && !Sessao.pode(papeis)) {
          location.replace("index.html?negado=1");
          return;
        }
      }
      mostrar();
    })
    .catch((erro) => {
      console.error("Não foi possível iniciar a autenticação:", erro);
      if (!livre) { location.replace("login.html?erro=auth"); return; }
      mostrar();
    });
})();
