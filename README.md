# Changelog

1. Foi adicionado o botão **Editar** no arquivo `admin-sala.html`:

        `<div class="lista-item">
          <span>Sala ${s.numero} — Módulo ${s.modulo}, ${s.andar}º andar (cap. ${s.capacidade})</span>
          <button data-id="${s.id}" class="btn-editar">Editar</button>  // foi adcionado essa linha de código
          <button data-id="${s.id}" class="btn-remover">Remover</button>
        </div>

        // botão editar junto com a mudança da box de "Nova Sala" para "Editando Sala.
        container.querySelectorAll(".btn-editar").forEach((btn) => {
          btn.addEventListener("click", () => {
            const sala = salas.find((s) => s.id === btn.dataset.id);

            if (!sala) return;

            salaEmEdicao = sala.id;

            document.getElementById("form-sala")
              .closest(".card")
              .querySelector("h2")
              .textContent = "Editando Sala";

            document.getElementById("numero").value = sala.numero;
            document.getElementById("modulo").value = sala.modulo;
            document.getElementById("andar").value = sala.andar;
            document.getElementById("capacidade").value = sala.capacidade;

            document.querySelector('#form-sala button[type="submit"]').textContent =
              "Salvar alterações";

            document.getElementById("numero").focus();
          });
        });

        // Fora da edição, mantém o cadastro original..
        if (salaEmEdicao === null) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const formulario = e.target;
        const botao = formulario.querySelector('button[type="submit"]');

        if (botao.disabled) return;

        const dadosNovos = {
            numero: document.getElementById("numero").value.trim(),
            modulo: document.getElementById("modulo").value.trim(),
            andar: Number(document.getElementById("andar").value),
            capacidade: Number(document.getElementById("capacidade").value),
        };

        botao.disabled = true;

        // Muda o título da box de "Editando Sala" para "Nova Sala" como estava anteriormente.
        try {
            await atualizarSala(salaEmEdicao, dadosNovos);

            document.getElementById("form-sala")
            .closest(".card")
            .querySelector("h2")
            .textContent = "Nova sala";

            salaEmEdicao = null;
            formulario.reset();
            botao.textContent = "Cadastrar sala";

            alert("Sala atualizada!");
        } catch (erro) {
            alert(erro.message);
        } finally {
            botao.disabled = false;
        }
        },`


2. Foi implementado a integração do botão de editar e a verificação de campo no arquivo `salas.js`:

        `// Implementação da edição de sala.
        export function atualizarSala(salaId, dadosNovos) {
            validarSala(dadosNovos);
            return update(ref(db, `salas/${salaId}`), dadosNovos);
        }  

        // Validar campos antes de salvar (ex: capacidade > 0,
        // não deixar número de sala em branco, etc.)

        function validarSala(dados) {
            if ("numero" in dados && !String(dados.numero ?? "").trim()) {
                throw new Error("Preencha o número da sala.");
            }

            if ("numero" in dados) {
            const numero = String(dados.numero ?? "").trim();

            if (!/^[0-9]+$/.test(numero)) {
                throw new Error("O número da sala deve conter apenas números.");
            }
        }

            if ("modulo" in dados && !String(dados.modulo ?? "").trim()) {
                throw new Error("Preencha o módulo.");
            }

            if ("andar" in dados) {
                const andar = String(dados.andar ?? "").trim();

                if (andar === "" || !Number.isInteger(Number(andar))) {
                throw new Error("Informe um andar inteiro.");
                }
            }

            if ("capacidade" in dados) {
                const capacidade = Number(dados.capacidade);

                if (!Number.isInteger(capacidade) || capacidade <= 0) {
                    throw new Error("A capacidade deve ser um inteiro maior que zero.");
                }
            }`

3. Foi ajustado a margem do botão "Editar" no arquivo `style.css`:

    `.btn-editar {
    margin-right: 8px;
    }`