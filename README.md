# Catraca Inteligente — Base do Projeto (Parte 1)

Este é o esqueleto inicial do sistema. A ideia é que cada integrante já comece
a trabalhar em cima desta estrutura, sem precisar decidir "como organizar as
coisas" — isso já está feito. Foco de vocês agora: preencher os `TODO`
espalhados pelo código.

## Como rodar o projeto localmente

Como o projeto usa módulos JavaScript (`type="module"`), não dá para abrir o
`index.html` direto no navegador (vai dar erro de CORS). Use um servidor local simples:

- **VS Code**: instale a extensão "Live Server" e clique em "Go Live"
- **ou**, no terminal, dentro da pasta do projeto: `python3 -m http.server 8000`
  e acesse `http://localhost:8000`

## Primeiro passo obrigatório: configurar o Firebase

1. Um de vocês cria o projeto em https://console.firebase.google.com
2. Ativa o **Realtime Database** (modo de teste por enquanto)
3. Registra um app Web e pega o objeto de configuração
4. Cola esse objeto em `js/firebase-config.js` (tem instruções detalhadas dentro do arquivo)
5. Compartilha as credenciais com o resto do grupo (mesmo projeto Firebase pra todos)

**Sem esse passo, nada no sistema funciona** — façam isso primeiro, antes de
qualquer um começar sua parte.

## Estrutura de pastas

```
projeto/
├── index.html            → menu inicial
├── admin-salas.html       → tela de cadastro de salas (Murilo)
├── professor.html         → tela do professor aloca turma/sala (Davi)
├── aluno.html              → tela de acesso do aluno / catraca (Isaque)
├── css/
│   └── style.css          → estilo compartilhado, não precisa mexer
└── js/
    ├── firebase-config.js → configuração central do Firebase (preencher 1x)
    ├── salas.js            → CRUD de salas (Murilo)
    ├── turmas.js            → alocação de turma/sala (Davi)
    ├── logs.js               → logs de acesso + listener tempo real (Isaque)
    ├── auth.js                → lógica de verificação de acesso (Emerson)
    └── facial-recognition.js  → reconhecimento facial (Anthony)
```

## O que cada pessoa faz a partir daqui

| Pessoa | Arquivo(s) | Já está pronto | O que falta (TODO) |
|---|---|---|---|
| **Murilo** | `js/salas.js`, `admin-salas.html` | Criar, listar e remover salas | Implementar edição (update) e validar campos |
| **Davi** | `js/turmas.js`, `professor.html` | Ler salas do Murilo, criar alocação de turma | Trocar campos de texto livre por selects de disciplina/professor reais |
| **Isaque** | `js/logs.js`, `aluno.html` | Registrar log de acesso | Implementar listener em tempo real (`escutarTurma`) e exibir disciplina/sala/módulo/andar de verdade |
| **Emerson** | `js/auth.js` | Verificação básica se aluno existe | Vincular aluno → turma do dia/horário, decidir junto com Davi como isso vai funcionar |
| **Anthony** | `js/facial-recognition.js` | Estrutura pronta pra receber a implementação | Tudo — pesquisar face-api.js ou serviço Python e integrar |
| **Mateus** | Projeto como um todo | — | Acompanhar todo mundo, revisar PRs/commits, manter o README atualizado, cuidar da coerência entre as partes |

## Fluxo de dependência (quem depende de quem)

```
Murilo (salas) → Davi (turmas usam salas) → Emerson (auth usa turmas) → Isaque (tela mostra resultado do auth)
                                                                              ↑
                                                            Anthony (substitui a matrícula manual pelo reconhecimento facial)
```

Ou seja: dá pra todo mundo trabalhar em paralelo desde já, porque cada parte
já tem uma versão "rascunho" funcionando (dados fake/manuais) — vocês vão
substituindo aos poucos pela versão de verdade.

## Sugestão de fluxo de trabalho em grupo

- Um branch por pessoa (ex: `murilo-salas`, `davi-turmas`) e dar merge na `main` conforme for testando
- Combinar um horário fixo por semana pra todo mundo testar o sistema junto e ver se as partes estão conversando direito
- Se travar em algo do Firebase, chamar o Mateus ou o Emerson antes de ficar muito tempo travado sozinho
