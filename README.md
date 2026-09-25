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

## Fluxo de dependência (quem depende de quem)

```
Murilo (salas) → Davi (turmas usam salas) → Emerson (auth usa turmas) → Isaque (tela mostra resultado do auth)
                                                                              ↑
                                                            Anthony (substitui a matrícula manual pelo reconhecimento facial)
```

Ou seja: dá pra todo mundo trabalhar em paralelo desde já, porque cada parte
já tem uma versão "rascunho" funcionando (dados fake/manuais) — vocês vão
substituindo aos poucos pela versão de verdade.
