# Catraca Inteligente — Base do Projeto (Parte 1)

Este é o esqueleto inicial do sistema. A ideia é que cada integrante já comece
a trabalhar em cima desta estrutura, sem precisar decidir "como organizar as
coisas" — isso já está feito. Foco de vocês agora: preencher os `TODO`
espalhados pelo código.

## Como executar o projeto

Para executar o projeto localmente, siga os passos abaixo.

### 1. Instale o Live Server

No VS Code, abra a aba de extensões (`Ctrl + Shift + X`) e procure por:

**Live Server**

Instale a extensão para conseguir executar as páginas HTML do projeto localmente.

### 2. Instale o Node.js

Caso ainda não tenha o Node.js instalado no computador, baixe e instale pelo site oficial:

https://nodejs.org/

Após a instalação, abra o terminal e verifique:

##bash
node -v
npm -v

### 3. Instale as dependências do projeto

Abra o terminal na pasta do projeto e execute: (`npm install`)

Depois, instale o Firebase: (`npm install firebase`)

### 4. Execute o projeto

Abra o arquivo: (`index.html`) e rode o Live Server

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

## Forma de trabalhar em equipe

A divisão por pessoa continua existindo (cada um com suas áreas de atuação),
mas a forma de distribuir as tarefas ficou mais flexível: as tarefas vão existir
na lista/quadro e quem quiser fazer, faz — sem dono fixo, o time se organiza
diretamente conforme a vontade de cada integrante.

## O que cada pessoa faz a partir daqui

| Pessoa | Arquivo(s) | Já está pronto | O que falta (TODO) |
|---|---|---|---|
| **Murilo** | `js/salas.js`, `admin-salas.html` | Criar, listar e remover salas | Implementar edição (update) e validar campos |
| **Davi** | `js/turmas.js`, `professor.html` | Ler salas do Murilo, criar alocação de turma | Trocar campos de texto livre por selects de disciplina/professor reais |
| **Isaque** | `js/logs.js`, `aluno.html` | Registrar log de acesso | Implementar listener em tempo real (`escutarTurma`) e exibir disciplina/sala/módulo/andar de verdade |
| **Emerson** | `js/auth.js` | Verificação básica se aluno existe | Vincular aluno → turma do dia/horário, decidir junto com Davi como isso vai funcionar |
| **Anthony** | `js/facial-recognition.js` | Estrutura pronta pra receber a implementação | Integrar o face-api.js (webcam + reconhecimento) e conectar com o fluxo de verificação/log |
| **Mateus** | Projeto como um todo | — | Acompanhar todo mundo, revisar PRs/commits, manter o README atualizado, cuidar da coerência entre as partes |
| **Gabriel** | Cadastro facial / integração com o modelo | — | Parte 2: cadastro facial dos alunos (descritores em `alunos/{id}/faceDescriptor`) e apoio na integração com o face-api.js |

## Parte 2 — Reconhecimento Facial na Catraca

Objetivo: substituir a matrícula digitada manualmente em `aluno.html` pelo
reconhecimento facial do aluno, usando uma biblioteca/serviço dedicado.

Com a decisão tomada de usar o **face-api.js**, o caminho atual é o fluxo
100% web — câmera no navegador, sem backend Python.

### Decisão técnica (definida: face-api.js)

- **face-api.js** — **decisão atual: o Face API será utilizado**. Roda 100% no
  navegador, integra direto com o front web atual, sem backend extra.
  Substitui a matrícula manual pelo reconhecimento ao abrir a webcam.
- **YOLO / serviço Python** (OpenCV, face_recognition): mais robusto para
  produção, mas exige FastAPI/Flask rodando e uma rota `POST /reconhecer`
  que devolva `{ matricula }`.

### Estrutura sugerida

```
projeto/
├── aluno.html               → adiciona botão "Reconhecer rosto" (câmera)
└── js/
    └── facial-recognition.js → implementa reconhecerRosto() (Anthony)

# Alternativa (ainda em avaliação): YOLO / serviço Python
backend/
├── main.py                  → API /reconhecer (Gabriel)
└── cadastro_facial/         → fotos de referência por matrícula
```

### Divisão de trabalho (Parte 2)

| Pessoa | Tarefa |
|---|---|
| **Anthony** | Implementar `reconhecerRosto()` em `js/facial-recognition.js` (webcam + face-api.js) |
| **Gabriel** | Cadastro facial dos alunos (fotos → descritores salvos em `alunos/{id}/faceDescriptor`) e integração com o face-api.js |
| **Isaque** | Integrar o resultado do reconhecimento na tela `aluno.html` (chamar `verificarAcesso(matricula)` com a matrícula detectada) |
| **Emerson** | Garantir que `verificarAcesso` retorne `matricula` reconhecida → log com `status` correto |
| **Davi** | Validar o fluxo: professor aloca turma e o aluno só entra se estiver ativo |
| **Murilo** | Manter CRUD de salas estável |
| **Mateus** | Coordenar, revisar e manter a documentação |

### Fluxo esperado

```
Câmera → reconhecerRosto() → matrícula detectada
      → verificarAcesso(matricula) → ativo? liberado : negado
      → log em logs_acesso + tela atualizada em tempo real
```

## Fluxo de dependência (quem depende de quem)

```
Murilo (salas) → Davi (turmas usam salas) → Emerson (auth usa turmas) → Isaque (tela mostra resultado do auth)
                                                                              ↑
                                                            Anthony (substitui a matrícula manual pelo reconhecimento facial)
```

Ou seja: dá pra todo mundo trabalhar em paralelo desde já, porque cada parte
já tem uma versão "rascunho" funcionando (dados fake/manuais) — vocês vão
substituindo aos poucos pela versão de verdade.
<<<<<<< Updated upstream
=======

## Estrutura atual (login, salas automáticas e prédio 3D)

**Segurança (Parte 1):** login com **Firebase Auth** e papel lido de `usuarios/{uid}`.
Não existem mais senhas fixas, sessão em `sessionStorage` nem página `seed.html`.
Você **precisa** aplicar as regras em `database.rules.json` no console do Firebase —
o passo a passo está em [`docs/SEGURANCA.md`](docs/SEGURANCA.md).

```
login.html, index.html          → entrada e menu por perfil
admin-salas.html                → cadastro de salas (só a capacidade; número/andar/módulo automáticos)
planta3d.html                   → prédio 3D (por fora / translúcido / por andar) + reservas
css/   style.css (base e temas), admin-salas.css, predio3d.css
js/
├── theme.js, util.js           → tema claro/escuro e utilitários
├── sessao.js                   → sessão real (Firebase Auth + perfil no banco)
├── guard.js                    → espera o Auth e bloqueia páginas por perfil
├── salas.js, reservas.js       → salas (Firebase + numeração automática) e aulas reservadas
├── admin-salas.js              → tela de cadastro de salas
└── predio3d/                   → app (estado/interação), predio (geometria), cena, painel,
                                  mobilia, pessoas, recursos (materiais e lotes), config
database.rules.json             → regras do Realtime Database (colar no console)
docs/SEGURANCA.md               → configuração de contas, perfis e regras
```
Numeração: cada andar comporta 10 salas (101–110, 201–210…); ao encher, nasce um andar novo.

## Turmas, alunos e conflitos (base do reconhecimento facial com ESP32)

**Logins:** contas criadas no Firebase Auth (e-mail + senha), com perfil em
`usuarios/{uid}` (`admin`, `professor` ou `aluno`). Veja `docs/SEGURANCA.md`.

**Modelo** (cada aluno ↔ turma ↔ aula):
```
alunos/{alunoId}                      = { nome, matricula, faceId, ativo }
disciplinas/{discId}                  = { nome, professorId, alunoIds: [alunoId...] }   ← a TURMA (fonte da verdade)
alunos_disciplinas/{alunoId}/{discId} = true                                             ← ÍNDICE derivado (para o ESP32)
turmas/{turmaId}                      = { disciplinaId, salaId, data, horario, horarioFim, professorId, ... }   ← uma AULA marcada
```
- Quem **aloca** é o administrador: no prédio 3D ele escolhe a sala, o **professor**, a **turma dele** (ou "sem turma"), o assunto e o horário; os alunos da turma ficam ligados à aula. O professor só visualiza ("Suas aulas", ★ na sala, planta 2D).
- **Conflitos** (`js/conflitos.js`): a reserva é recusada se o professor ou algum aluno da turma já tem outra aula no mesmo horário; a tela **Turmas e conflitos** (`minhas-turmas.html`) lista os choques e o admin corrige (mudar horário/sala ou liberar a aula).
- O índice `alunos_disciplinas` é gravado junto com cada turma (`js/disciplinas.js`) e pode ser conferido/reconstruído em **Turmas e conflitos → Vínculos para a catraca**.

**Como o ESP32 deve decidir a entrada** (mesma lógica de `aulaDoAlunoAgora` em `js/academico.js`, usada por `js/auth.js`):
1. aluno reconhecido → `GET <DATABASE_URL>/alunos.json?orderBy="faceId"&equalTo="<faceId>"` (ou por `matricula`) → `alunoId`, `ativo`
2. `GET <DATABASE_URL>/alunos_disciplinas/<alunoId>.json` → ids das turmas do aluno
3. `GET <DATABASE_URL>/turmas.json?orderBy="data"&equalTo="AAAA-MM-DD"` → aulas de hoje; ficar com as de `disciplinaId` ∈ passo 2 e comparar `horario`/`horarioFim` com a hora atual (aceita-se chegar até 30 min antes)

⚠️ Com as regras da Parte 1, essas URLs **sem token** são recusadas (`Permission denied`). O firmware precisa enviar um token do Firebase Auth ou, preferencialmente, chamar um backend/Cloud Function que decida a entrada com conta de serviço. Veja `docs/SEGURANCA.md`.

As regras em `database.rules.json` já incluem os índices necessários (`.indexOn` em `alunos.matricula`, `alunos.faceId` e `turmas.data`). Não substitua o arquivo por um só com índices: isso reabriria o banco.
>>>>>>> Stashed changes
