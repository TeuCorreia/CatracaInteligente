// ============================================================
// LOGIN IMAGINÁRIO (demo) — controle de acesso por perfil, 100% no navegador.
//
// ATENÇÃO: usuários e senhas ficam visíveis no código. Serve só para demonstrar
// a navegação por perfil; NÃO é segurança de verdade (isso exigiria backend ou
// Firebase Auth + regras do banco).
//
// Páginas protegidas (no <head>):
//   <script src="js/guard.js" data-papeis="admin"></script>
//   <script src="js/guard.js" data-papeis="admin,professor"></script>
//   <script src="js/guard.js"></script>            → basta estar logado
//   <script src="js/guard.js" data-livre></script> → só expõe window.Sessao (ex.: login)
// ============================================================
(function () {
  const KEY = "catraca_sessao";
  const USUARIOS = [
    { usuario: "admin",     senha: "admin123", papel: "admin",     nome: "Administrador" },
    { usuario: "professor", senha: "prof123",  papel: "professor", nome: "Prof. Ana" },
  ];

  const Sessao = {
    obter() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } },

    entrar(usuario, senha) {
      const nome = String(usuario).trim().toLowerCase();
      const u = USUARIOS.find((x) => x.usuario === nome && x.senha === senha);
      if (!u) return null;
      const sessao = { usuario: u.usuario, papel: u.papel, nome: u.nome };
      try { sessionStorage.setItem(KEY, JSON.stringify(sessao)); } catch { /* sem armazenamento */ }
      return sessao;
    },

    /** Guarda uma sessão já validada (login por matrícula/e-mail, feito em js/identidade.js). */
    definir(sessao) {
      try { sessionStorage.setItem(KEY, JSON.stringify(sessao)); } catch { /* sem armazenamento */ }
      return sessao;
    },

    sair() {
      try { sessionStorage.removeItem(KEY); } catch { /* ignora */ }
      location.replace("login.html");
    },

    /** true se há sessão e (sem lista) qualquer perfil serve, ou o perfil está na lista. */
    pode(papeis = []) {
      const s = this.obter();
      return !!s && (papeis.length === 0 || papeis.includes(s.papel));
    },
  };
  window.Sessao = Sessao;

  const tag = document.currentScript;
  if (!tag || tag.hasAttribute("data-livre")) return;

  const papeis = (tag.dataset.papeis || "").split(",").map((p) => p.trim()).filter(Boolean);
  const destino = !Sessao.obter() ? "login.html" : !Sessao.pode(papeis) ? "index.html?negado=1" : null;
  if (destino) {
    document.documentElement.hidden = true; // não deixa o conteúdo protegido aparecer antes do redirecionamento
    location.replace(destino);
  }
})();
