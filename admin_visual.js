/* =========================================================
   ADMIN — VISUAL 2026
   Complementa o admin.js sem mudar a lógica de salvar:
   - linhas compactas (só permissões ativas; opções ao editar)
   - aviso "Sem código cadastrado"
   - cartões de resumo com filtro
   - status em uma linha
   - ícones nas ações
   - barra fixa de alterações não salvas
   Para voltar ao visual anterior, remova este arquivo e o
   admin_visual.css do admin.html.
========================================================= */

(function () {
    "use strict";

    const ICONES = {
        editar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        excluir: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
        permissoes: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
        usuarios: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
        online: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.6a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1"/></svg>',
        admin: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
        semAcesso: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>'
    };

    let filtroAtivo = "todos";


    /* ---------------- utilidades ---------------- */

    function esc(valor) {
        return typeof escapeHtml === "function"
            ? escapeHtml(valor)
            : String(valor ?? "").replace(/[&<>"']/g, c => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
            }[c]));
    }

    function linhasUsuarios() {
        return Array.from(
            document.querySelectorAll("#listaUsuarios tr[data-usuario-original]")
        );
    }

    // Quem tem código de vendedora já acessa o Rastreio,
    // mesmo sem nenhuma permissão extra marcada.
    function linhaTemCodigo(tr) {
        const codigo = String(tr.dataset.codigo || "").trim();
        return Boolean(codigo) && codigo !== "-";
    }

    function linhaTemPermissaoExtra(tr) {
        return Boolean(tr.querySelector("input[type='checkbox']:checked"));
    }

    function linhaTemAcesso(tr) {
        return linhaTemCodigo(tr) || linhaTemPermissaoExtra(tr);
    }

    // Vendedora sem permissões extras mostra "Rastreio · padrão";
    // "Sem código cadastrado" fica só para quem não tem código nem permissão.
    function ajustarResumoLinha(tr) {
        const resumo = tr.querySelector(".active-permissions");
        if (!resumo) return;

        if (!linhaTemPermissaoExtra(tr) && linhaTemCodigo(tr)) {
            resumo.innerHTML = `
                <span class="av-chip av-chip-padrao" title="Acesso padrão: toda vendedora com código acessa o Rastreio">
                    Rastreio · padrão
                </span>`;
        }
    }

    function linhaEhAdmin(tr) {
        return Boolean(tr.querySelector("input[data-tela='admin']:checked"));
    }

    function linhaAlterada(tr) {
        return Array.from(tr.querySelectorAll("input[type='checkbox']"))
            .some(cb => String(cb.checked) !== cb.dataset.inicial);
    }


    /* ---------------- 1 e 3: resumo compacto ---------------- */

    if (typeof window.criarResumoPermissoes === "function" &&
        typeof window.obterPermissoesAtivas === "function") {

        window.criarResumoPermissoes = function (usuarioData) {
            const permissoes = obterPermissoesAtivas(usuarioData);

            if (!permissoes.length) {
                return `
                    <div class="active-permissions av-resumo">
                        <span class="av-selo-sem-codigo" title="Sem código de vendedora cadastrado e sem permissões extras. Use o lápis (editar) para cadastrar o código.">
                            Sem código cadastrado
                        </span>
                    </div>`;
            }

            return `
                <div class="active-permissions av-resumo">
                    ${permissoes.map(p => `
                        <span class="av-chip ${p.tipo === "supervisao" ? "av-chip-supervisao" : "av-chip-tela"}"
                              title="${p.tipo === "supervisao" ? "Supervisão" : "Tela"}">
                            ${esc(p.nome)}
                        </span>`).join("")}
                </div>`;
        };
    }


    if (typeof window.atualizarResumoPermissoesLinha === "function") {
        const resumoOriginal = window.atualizarResumoPermissoesLinha;
        window.atualizarResumoPermissoesLinha = function (linha) {
            const resultado = resumoOriginal.apply(this, arguments);
            if (linha) ajustarResumoLinha(linha);
            return resultado;
        };
    }


    /* ---------------- ordem: código de vendedora A-Z ---------------- */

    function ordenarPorCodigo() {
        const container = document.getElementById("listaUsuarios");
        if (!container) return;

        const linhas = linhasUsuarios();
        const chave = tr => {
            // sem código vai para o fim
            const codigo = linhaTemCodigo(tr) ? String(tr.dataset.codigo).toUpperCase() : "\uffff";
            const nome = (tr.querySelector(".user-information strong")?.textContent || "").trim();
            return [codigo, nome];
        };

        const ordenadas = [...linhas].sort((a, b) => {
            const [ca, na] = chave(a);
            const [cb, nb] = chave(b);
            return ca.localeCompare(cb, "pt-BR", { numeric: true }) ||
                   na.localeCompare(nb, "pt-BR");
        });

        // Só mexe na tabela se a ordem mudou
        if (ordenadas.some((tr, i) => tr !== linhas[i])) {
            ordenadas.forEach(tr => container.appendChild(tr));
        }
    }


    /* ---------------- melhorias em cada linha ---------------- */

    function melhorarLinha(tr) {
        if (tr.dataset.avPronta === "true") return;
        tr.dataset.avPronta = "true";

        // Estado inicial de cada opção, para saber o que mudou
        tr.querySelectorAll("input[type='checkbox']").forEach(cb => {
            cb.dataset.inicial = String(cb.checked);
        });

        // Resumo no novo formato (o admin.js gerou com a função antiga
        // se este arquivo carregou depois da primeira renderização)
        if (typeof window.atualizarResumoPermissoesLinha === "function") {
            window.atualizarResumoPermissoesLinha(tr);
        }

        // Botão para mostrar/ocultar as opções de permissão
        const celula = tr.querySelector(".col-permissoes");
        if (celula && !celula.querySelector(".av-btn-permissoes")) {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "av-btn-permissoes";
            botao.innerHTML = `${ICONES.permissoes}<span>Alterar permissões</span>`;
            botao.addEventListener("click", () => {
                const editando = tr.classList.toggle("av-editando");
                botao.querySelector("span").textContent =
                    editando ? "Concluir" : "Alterar permissões";
            });
            celula.appendChild(botao);
        }

        // Ícones nas ações
        const editar = tr.querySelector(".btn-editar");
        const excluir = tr.querySelector(".btn-excluir");
        if (editar) editar.innerHTML = ICONES.editar;
        if (excluir) excluir.innerHTML = ICONES.excluir;

        // Esconde "E-mail não informado" (só polui a linha)
        tr.querySelectorAll(".user-information small").forEach(small => {
            if (/e-mail não informado/i.test(small.textContent)) {
                small.classList.add("av-oculto");
            }
            small.textContent = small.textContent.replace(/^\s*Usuário:\s*/i, "");
        });

        tr.querySelectorAll(".user-information strong").forEach(strong => {
            if (/nome não informado/i.test(strong.textContent)) {
                strong.classList.add("av-sem-nome");
            }
        });
    }


    /* ---------------- 5: status em uma linha ---------------- */

    function statusEmUmaLinha() {
        linhasUsuarios().forEach(tr => {
            const celula = tr.querySelector(".col-presenca");
            if (!celula) return;

            const online = tr.dataset.online === "true";
            const horario = (celula.querySelector(".presenca-horario")?.textContent || "").trim();

            let texto;
            if (online) {
                texto = "Online agora";
            } else if (!horario || /sem atividade|verificando/i.test(horario)) {
                texto = horario && /verificando/i.test(horario) ? "Verificando…" : "Sem registro";
            } else {
                texto = `Visto ${horario}`;
            }

            celula.innerHTML = `
                <span class="av-status ${online ? "online" : "offline"}">
                    <span class="av-status-ponto"></span>${esc(texto)}
                </span>`;
        });
    }


    /* ---------------- 2: cartões de resumo ---------------- */

    function garantirCartoes() {
        if (document.getElementById("avResumo")) return;

        const painel = document.querySelector(".users-panel");
        if (!painel) return;

        const bloco = document.createElement("section");
        bloco.id = "avResumo";
        bloco.className = "av-resumo-cards";
        bloco.innerHTML = [
            ["todos", "Usuários", "av-card-azul", ICONES.usuarios, "Mostrar todos"],
            ["online", "Online agora", "av-card-verde", ICONES.online, "Mostrar só quem está online"],
            ["admin", "Administradores", "av-card-roxo", ICONES.admin, "Mostrar quem tem acesso ao Admin"]
        ].map(([filtro, rotulo, cor, icone, dica]) => `
            <button type="button" class="av-card ${cor}" data-filtro="${filtro}" title="${dica}">
                <span class="av-card-texto">
                    <strong data-total="${filtro}">0</strong>
                    <span>${rotulo}</span>
                </span>
                <span class="av-card-icone">${icone}</span>
            </button>`).join("");

        painel.parentNode.insertBefore(bloco, painel);

        bloco.addEventListener("click", event => {
            const card = event.target.closest(".av-card");
            if (!card) return;
            const filtro = card.dataset.filtro;
            filtroAtivo = (filtroAtivo === filtro) ? "todos" : filtro;
            aplicarFiltro();
        });
    }

    function atualizarCartoes() {
        garantirCartoes();
        const linhas = linhasUsuarios();

        const totais = {
            "todos": linhas.length,
            "online": linhas.filter(tr => tr.dataset.online === "true").length,
            "admin": linhas.filter(linhaEhAdmin).length,
            "sem-acesso": linhas.filter(tr => !linhaTemAcesso(tr)).length
        };

        Object.entries(totais).forEach(([chave, valor]) => {
            const alvo = document.querySelector(`[data-total="${chave}"]`);
            if (alvo) alvo.textContent = valor;
        });
    }

    function aplicarFiltro() {
        linhasUsuarios().forEach(tr => {
            let mostrar = true;
            if (filtroAtivo === "online") mostrar = tr.dataset.online === "true";
            if (filtroAtivo === "admin") mostrar = linhaEhAdmin(tr);
            if (filtroAtivo === "sem-acesso") mostrar = !linhaTemAcesso(tr);
            tr.classList.toggle("av-filtro-oculto", !mostrar);
        });

        document.querySelectorAll("#avResumo .av-card").forEach(card => {
            card.classList.toggle(
                "ativo",
                filtroAtivo !== "todos" && card.dataset.filtro === filtroAtivo
            );
        });
    }


    /* ---------------- 7: barra de alterações ---------------- */

    function garantirBarra() {
        if (document.getElementById("avBarraAlteracoes")) return;

        const barra = document.createElement("div");
        barra.id = "avBarraAlteracoes";
        barra.className = "av-barra";
        barra.setAttribute("role", "status");
        barra.innerHTML = `
            <span class="av-barra-texto">
                <span class="av-barra-ponto"></span>
                <span id="avBarraContagem">Alterações não salvas</span>
            </span>
            <span class="av-barra-acoes">
                <button type="button" class="av-barra-descartar" id="avDescartar">Descartar</button>
                <button type="button" class="av-barra-salvar" id="avSalvar">Salvar alterações</button>
            </span>`;
        document.body.appendChild(barra);

        document.getElementById("avSalvar").addEventListener("click", () => {
            document.getElementById("btnSalvarPermissoes")?.click();
        });

        document.getElementById("avDescartar").addEventListener("click", () => {
            linhasUsuarios().forEach(tr => {
                tr.querySelectorAll("input[type='checkbox']").forEach(cb => {
                    cb.checked = cb.dataset.inicial === "true";
                });
                if (typeof window.atualizarResumoPermissoesLinha === "function") {
                    window.atualizarResumoPermissoesLinha(tr);
                }
            });
            atualizarBarra();
            atualizarCartoes();
            aplicarFiltro();
        });
    }

    function atualizarBarra() {
        garantirBarra();
        const alteradas = linhasUsuarios().filter(tr => {
            const mudou = linhaAlterada(tr);
            tr.classList.toggle("av-alterada", mudou);
            return mudou;
        });

        const barra = document.getElementById("avBarraAlteracoes");
        const contagem = document.getElementById("avBarraContagem");
        const n = alteradas.length;

        if (contagem) {
            contagem.textContent = n === 1
                ? "1 usuário com alterações não salvas"
                : `${n} usuários com alterações não salvas`;
        }

        barra.classList.toggle("visivel", n > 0);
        document.body.classList.toggle("av-tem-alteracoes", n > 0);
    }


    /* ---------------- ligação com o admin.js ---------------- */

    function aposCarregar() {
        linhasUsuarios().forEach(melhorarLinha);
        ordenarPorCodigo();
        statusEmUmaLinha();
        atualizarCartoes();
        aplicarFiltro();
        atualizarBarra();
    }

    if (typeof window.carregarUI === "function") {
        const carregarOriginal = window.carregarUI;
        window.carregarUI = async function (...args) {
            const resultado = await carregarOriginal.apply(this, args);
            aposCarregar();
            return resultado;
        };
    }

    if (typeof window.atualizarPresencaAdmin === "function") {
        const presencaOriginal = window.atualizarPresencaAdmin;
        window.atualizarPresencaAdmin = function (...args) {
            return Promise.resolve(presencaOriginal.apply(this, args)).then(resultado => {
                // a presença reordena por online; voltamos para código A-Z
                ordenarPorCodigo();
                statusEmUmaLinha();
                atualizarCartoes();
                aplicarFiltro();
                return resultado;
            });
        };
    }

    document.addEventListener("change", event => {
        if (!event.target.matches("#listaUsuarios input[type='checkbox']")) return;
        // o admin.js atualiza o resumo da linha; aqui só contamos
        setTimeout(() => {
            atualizarBarra();
            atualizarCartoes();
        }, 0);
    });

    window.addEventListener("beforeunload", event => {
        if (document.body.classList.contains("av-tem-alteracoes")) {
            event.preventDefault();
            event.returnValue = "";
        }
    });

    // Caso a tabela já tenha sido montada antes deste arquivo carregar
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(aposCarregar, 0);
    });
})();
