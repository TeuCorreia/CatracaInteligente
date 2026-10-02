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

## O que cada pessoa faz a partir daqui

| Pessoa | Arquivo(s) | Já está pronto | O que falta (TODO) |
|---|---|---|---|
| **Murilo** | `js/salas.js`, `admin-salas.html` | Criar, listar e remover salas | Implementar edição (update) e validar campos |
| **Davi** | `js/turmas.js`, `professor.html` | Ler salas do Murilo, criar alocação de turma | Trocar campos de texto livre por selects de disciplina/professor reais |
| **Isaque** | `js/logs.js`, `aluno.html` | Registrar log de acesso | Implementar listener em tempo real (`escutarTurma`) e exibir disciplina/sala/módulo/andar de verdade |
| **Emerson** | `js/auth.js` | Verificação básica se aluno existe | Vincular aluno → turma do dia/horário, decidir junto com Davi como isso vai funcionar |
| **Anthony** | `js/facial-recognition.js` | Estrutura pronta pra receber a implementação | Tudo — pesquisar face-api.js ou serviço Python e integrar |
| **Mateus** | Projeto como um todo | — | Acompanhar todo mundo, revisar PRs/commits, manter o README atualizado, cuidar da coerência entre as partes |
| **Gabriel** | Cadastro facial / integração com o modelo | — | Parte 2: cadastro facial dos alunos e apoio na integração do reconhecimento (YOLO/face-api.js) |

## Parte 2 — Reconhecimento Facial na Catraca

Objetivo: substituir a matrícula digitada manualmente em `aluno.html` pelo
reconhecimento facial do aluno, usando uma biblioteca/serviço dedicado.

### Decisão técnica (a definir em grupo)

- **face-api.js** (recomendado para este projeto): roda 100% no navegador,
  integra direto com o front web atual, sem backend extra. Substitui a matrícula
  manual pelo reconhecimento ao abrir a webcam.
- **YOLO / serviço Python** (OpenCV, face_recognition): mais robusto para
  produção, mas exige FastAPI/Flask rodando e uma rota `POST /reconhecer`
  que devolva `{ matricula }`.

### Estrutura sugerida

```
projeto/
├── aluno.html               → adiciona botão "Reconhecer rosto" (câmera)
└── js/
    └── facial-recognition.js → implementa reconhecerRosto() (Anthony)

# Se escolher Python:
backend/
├── main.py                  → API /reconhecer (Gabriel)
└── cadastro_facial/         → fotos de referência por matrícula
```

### Divisão de trabalho (Parte 2)

| Pessoa | Tarefa |
|---|---|
| **Anthony** | Implementar `reconhecerRosto()` em `js/facial-recognition.js` (webcam + face-api.js) |
| **Gabriel** | Cadastro facial dos alunos (fotos → descritores salvos em `alunos/{id}/faceDescriptor`) e/ou endpoint do serviço Python |
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
