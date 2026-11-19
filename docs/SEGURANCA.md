# Parte 1 — Segurança do Catraca Inteligente

Esta é a primeira parte de segurança: **autenticação real + autorização no banco**.
Antes, qualquer pessoa podia abrir o DevTools, trocar o JSON da sessão e virar
administrador; também havia senhas fixas no código e uma página pública (`seed.html`)
que gravava no banco. Tudo isso foi removido.

## O que mudou

| Antes (inseguro) | Agora |
|---|---|
| `admin/admin123`, `professor/prof123`, `aluno123` no código | Senhas só no Firebase Auth; nada é fixo no front-end |
| Sessão em `sessionStorage` editável | Identidade vem do token do Firebase Auth (`js/sessao.js`) |
| Papel vinculado à sessão do navegador | Papel lido de `usuarios/{uid}` no banco, protegido por regras |
| `seed.html` público gravava no banco | Arquivo removido |
| Telas administrativas confiavam só no `guard.js` | Regras do Realtime Database bloqueiam escrita por papel |
| Vários `innerHTML` com dados do banco sem escape | Dados escapados com `esc()` antes de entrar no HTML |

## Configuração obrigatória no console do Firebase

### 1. Ativar o login

1. Console do Firebase → **Authentication** → **Sign-in method**.
2. Ative o provedor **E-mail/Senha**.
3. Em **Authentication → Settings → Authorized domains**, mantenha apenas os
   domínios onde o sistema vai rodar (localhost para desenvolvimento).

### 2. Aplicar as regras do Realtime Database

1. Console do Firebase → **Realtime Database** → aba **Rules**.
2. Cole o conteúdo de [`database.rules.json`](../database.rules.json) e publique.
3. As regras negam leitura/escrita por padrão e liberam:
   - leitura: qualquer usuário autenticado **com perfil** em `usuarios/{uid}`;
   - escrita em `salas`, `alunos`, `professores`, `disciplinas`, `turmas` e
     `alunos_disciplinas`: **somente admin**;
   - escrita em `logs_acesso`: admin ou professor (a catraca web);
   - leitura de `logs_acesso` e de `usuarios`: somente admin (cada usuário lê
     o próprio perfil).

> Se o console mostrar aviso sobre regras públicas, confirme que a colagem
> substituiu as regras antigas — não pode sobrar `.read: true` / `.write: true`.

### 3. Criar as contas e os perfis

Para **cada** pessoa (admin, professor, aluno):

1. **Authentication → Users → Add user**: informe e-mail e senha, copie o **UID**.
2. **Realtime Database → Regras de dados**: crie o nó `usuarios/<UID>` com:

```json
{
  "papel": "admin",
  "nome": "Administrador",
  "email": "admin@escola.com"
}
```

Papéis válidos: `admin`, `professor`, `aluno` (as regras recusam qualquer outro
valor). O sistema ignora a conta se o perfil estiver ausente ou inválido.

Para professor, inclua o vínculo com o cadastro (`professores/{professorId}`):

```json
{
  "papel": "professor",
  "nome": "Prof. Ana",
  "email": "ana@escola.com",
  "professorId": "<id do nó em professores>"
}
```

Para aluno, inclua a matrícula usada pela catraca (`alunos/{alunoId}`):

```json
{
  "papel": "aluno",
  "nome": "João Silva",
  "email": "2024001@escola.com",
  "alunoId": "<id do nó em alunos>",
  "matricula": "2024001"
}
```

O **e-mail do Firebase Auth não precisa ser o mesmo e-mail do cadastro** de
professor; o vínculo é feito por `professorId` / `alunoId`. Para aluno, a
matrícula usada na tela "Minhas aulas" vem de `usuarios/{uid}.matricula`.

**Bootstrapping do primeiro admin:** crie o usuário no Auth e, com as regras já
publicadas, crie o nó `usuarios/<UID>` pelo próprio console do Firebase (o
console não é limitado pelas regras). Depois é só usar a interface.

## Como verificar

- Abra `login.html` sem estar logado: as páginas protegidas redirecionam para ele.
- Tente entrar com uma conta Auth sem `usuarios/{uid}`: o sistema encerra a sessão.
- Tente escrever em `salas.json` via REST **sem** token: o Firebase responde
  `Permission denied`.
- Entre como professor: os botões de alocação/edição não aparecem e as regras
  recusam a escrita mesmo que algum script tente.

## Limitações conhecidas (próximas partes)

- **ESP32 / catraca física:** as regras exigem token. As consultas REST descritas
  no README com `<DATABASE_URL>/...json` sem autenticação **não funcionam mais**.
  Use um token de ID do Firebase Auth ou, melhor, um Cloud Function/backend que
  faça a decisão da catraca com uma conta de serviço.
- **`EXIGIR_AULA` em `js/auth.js`:** hoje qualquer aluno ativo é liberado mesmo
  sem aula marcada. É uma decisão de regra de negócio; mude para `true` quando
  todos os alunos estiverem vinculados a disciplinas.
- **Dados biométricos:** `faceDescriptor` fica legível para qualquer usuário
  autenticado com perfil. Ideal: mover para local restrito ou criptografar.
- **CDN (face-api.js / three.js):** os scripts vêm de CDN com versão fixada, mas
  sem SRI. Para produção, hospede os arquivos localmente com `integrity`.
- **Criação de contas:** com E-mail/Senha ativado, qualquer pessoa pode criar uma
  conta no Auth, mas sem `usuarios/{uid}` ela não lê nem escreve nada e é
  deslogada pelo app. Se isso virar spam, use funções de bloqueio do Auth.
- **Regras são a autoridade:** esconder botões no front-end é só usabilidade;
  quem garante o acesso é o par `.read`/`.write` no banco.
