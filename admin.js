"use strict";

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const TELAS = [
    "rastreio_amostra",
    "rankprod",
    "retorno_amostras",
    "relatorio",
    "analytics",
    "admin"
];

const CODIGOS_SUPERVISAO = [
    "V00",
    "S50",
    "S55",
    "S00"
];

const NOMES_SUPERVISAO = {
    "V00": "R. Supervisão",
    "S50": "R. Televendas",
    "S00": "R. Loja",
    "S55": "R. Televendas 2"
};

const SIDEBAR_FECHADA = "sidebar-collapsed";

const USUARIO_ADMIN_PROTEGIDO = "v.santos";

let usuarioEditando = null;


/* =========================================================
   SISTEMA DE ALERTAS
========================================================= */

function inicializarSistemaAlertas() {

    let container =
        document.getElementById("sistemaAlertas");

    if (container) {
        return container;
    }

    container = document.createElement("div");

    container.id = "sistemaAlertas";
    container.className = "alertas-sistema";

    container.setAttribute(
        "aria-live",
        "polite"
    );

    container.setAttribute(
        "aria-atomic",
        "true"
    );

    document.body.appendChild(container);

    return container;
}


/* =========================================================
   MOSTRAR ALERTA
========================================================= */

function mostrarAlertaSistema({
    tipo = "info",
    titulo = "Informação",
    mensagem = "",
    duracao = 4500
} = {}) {

    const container =
        inicializarSistemaAlertas();

    if (!container) {
        return;
    }

    const configuracoes = {
        sucesso: {
            classe: "alerta-sucesso",
            icone: "✓",
            titulo: "Sucesso"
        },

        erro: {
            classe: "alerta-erro",
            icone: "!",
            titulo: "Erro"
        },

        aviso: {
            classe: "alerta-aviso",
            icone: "!",
            titulo: "Atenção"
        },

        info: {
            classe: "alerta-info",
            icone: "i",
            titulo: "Informação"
        }
    };

    const configuracao =
        configuracoes[tipo] ||
        configuracoes.info;

    const alerta =
        document.createElement("div");

    alerta.className =
        `alerta-sistema ${configuracao.classe}`;

    alerta.setAttribute(
        "role",
        "alert"
    );

    alerta.innerHTML = `
        <div class="alerta-icone">
            ${configuracao.icone}
        </div>

        <div class="alerta-conteudo">

            <strong class="alerta-titulo">
                ${escapeHtml(
                    titulo || configuracao.titulo
                )}
            </strong>

            <span class="alerta-mensagem">
                ${escapeHtml(mensagem)}
            </span>

        </div>

        <button
            type="button"
            class="alerta-fechar"
            aria-label="Fechar notificação"
            title="Fechar"
        >
            ×
        </button>
    `;

    container.appendChild(alerta);

    const botaoFechar =
        alerta.querySelector(
            ".alerta-fechar"
        );

    let removido = false;

    function removerAlerta() {

        if (removido) {
            return;
        }

        removido = true;

        alerta.classList.add("saindo");

        setTimeout(() => {
            alerta.remove();
        }, 220);
    }

    if (botaoFechar) {

        botaoFechar.addEventListener(
            "click",
            removerAlerta
        );
    }

    if (duracao > 0) {

        setTimeout(
            removerAlerta,
            duracao
        );
    }
}


/* =========================================================
   ATALHOS DOS ALERTAS
========================================================= */

function alertaSucesso(
    mensagem,
    titulo = "Operação concluída"
) {

    mostrarAlertaSistema({
        tipo: "sucesso",
        titulo,
        mensagem
    });
}


function alertaErro(
    mensagem,
    titulo = "Não foi possível concluir"
) {

    mostrarAlertaSistema({
        tipo: "erro",
        titulo,
        mensagem,
        duracao: 6000
    });
}


function alertaAviso(
    mensagem,
    titulo = "Atenção"
) {

    mostrarAlertaSistema({
        tipo: "aviso",
        titulo,
        mensagem
    });
}


function alertaInfo(
    mensagem,
    titulo = "Informação"
) {

    mostrarAlertaSistema({
        tipo: "info",
        titulo,
        mensagem
    });
}


/* =========================================================
   CONFIRMAÇÃO PERSONALIZADA
========================================================= */

function confirmarAcaoSistema({
    titulo = "Confirmar ação",
    mensagem = "Deseja realmente continuar?",
    textoCancelar = "Cancelar",
    textoConfirmar = "Confirmar"
} = {}) {

    return new Promise((resolve) => {

        const antigo =
            document.getElementById(
                "overlayConfirmacaoSistema"
            );

        if (antigo) {
            antigo.remove();
        }

        const overlay =
            document.createElement("div");

        overlay.id =
            "overlayConfirmacaoSistema";

        overlay.innerHTML = `
            <div
                class="caixa-confirmacao"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tituloConfirmacaoSistema"
            >

                <div class="confirmacao-cabecalho">

                    <div class="confirmacao-icone">
                        !
                    </div>

                    <h2
                        id="tituloConfirmacaoSistema"
                        class="confirmacao-titulo"
                    >
                        ${escapeHtml(titulo)}
                    </h2>

                </div>

                <div class="confirmacao-corpo">

                    <p class="confirmacao-mensagem">
                        ${escapeHtml(mensagem)}
                    </p>

                </div>

                <div class="confirmacao-acoes">

                    <button
                        type="button"
                        class="confirmacao-botao confirmacao-cancelar"
                        data-confirmacao="cancelar"
                    >
                        ${escapeHtml(textoCancelar)}
                    </button>

                    <button
                        type="button"
                        class="confirmacao-botao confirmacao-confirmar"
                        data-confirmacao="confirmar"
                    >
                        ${escapeHtml(textoConfirmar)}
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(overlay);

        const finalizar =
            (resultado) => {

                overlay.remove();

                document.removeEventListener(
                    "keydown",
                    tratarTecla
                );

                resolve(resultado);
            };

        const tratarTecla =
            (event) => {

                if (event.key === "Escape") {
                    finalizar(false);
                }

                if (event.key === "Enter") {
                    finalizar(true);
                }
            };

        const botaoCancelar =
            overlay.querySelector(
                '[data-confirmacao="cancelar"]'
            );

        const botaoConfirmar =
            overlay.querySelector(
                '[data-confirmacao="confirmar"]'
            );

        if (botaoCancelar) {

            botaoCancelar.addEventListener(
                "click",
                () => finalizar(false)
            );
        }

        if (botaoConfirmar) {

            botaoConfirmar.addEventListener(
                "click",
                () => finalizar(true)
            );
        }

        overlay.addEventListener(
            "click",
            function (event) {

                if (event.target === overlay) {
                    finalizar(false);
                }
            }
        );

        document.addEventListener(
            "keydown",
            tratarTecla
        );

        setTimeout(() => {

            if (botaoConfirmar) {
                botaoConfirmar.focus();
            }

        }, 50);
    });
}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function escapeHtml(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function normalizarTexto(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function obterUrlBaseAPI() {

    if (typeof API_URL !== "string") {

        throw new Error(
            "API_URL não está definida."
        );
    }

    return API_URL.replace(
        "/permissoes",
        ""
    );
}


function limparCachePermissoes() {

    try {

        if (
            typeof cachePermissoes !==
            "undefined"
        ) {

            cachePermissoes = null;
        }

    } catch (erro) {

        console.warn(
            "Não foi possível limpar cachePermissoes:",
            erro
        );
    }

    localStorage.removeItem(
        "permissoes"
    );
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatarNomeTela(tela) {

    const nomes = {

        rastreio_amostra:
            "Rastreio",

        rankprod:
            "RankProd",

        retorno_amostras:
            "Retornos",

        relatorio:
            "Relatório",

        analytics:
            "Analytics",

        admin:
            "Admin"
    };

    return nomes[tela] || tela;
}


/* =========================================================
   CONTROLE DE ACESSO
========================================================= */

async function verificarAcessoAdmin() {

    const usuario =
    sessionStorage.getItem("usuarioLogado") ||
    localStorage.getItem("usuarioLogado") ||
    "";

    if (!usuario) {

        window.location.href =
            "tela_inicio.html";

        return false;
    }

    if (
        typeof temPermissaoTela ===
        "function"
    ) {

        try {

            const possuiPermissao =
                await temPermissaoTela(
                    usuario,
                    "admin"
                );

            if (!possuiPermissao) {

                alertaErro(
                    "Seu usuário não possui permissão para acessar o painel administrativo.",
                    "Acesso restrito"
                );

                setTimeout(() => {

                    window.location.href =
                        "tela_inicio.html";

                }, 900);

                return false;
            }

        } catch (erro) {

            console.error(
                "Erro ao verificar permissão administrativa:",
                erro
            );

            alertaErro(
                "Não foi possível verificar suas permissões.",
                "Erro de autenticação"
            );

            setTimeout(() => {

                window.location.href =
                    "tela_inicio.html";

            }, 900);

            return false;
        }
    }

    return true;
}


/* =========================================================
   USUÁRIO LOGADO
========================================================= */

function inicializarUsuarioAdmin() {

    const usuario =
    sessionStorage.getItem("usuarioLogado") ||
    localStorage.getItem("usuarioLogado") ||
    "";

    const elementoUsuario =
        document.getElementById(
            "usuarioAdmin"
        );

    if (!elementoUsuario) {
        return;
    }

    elementoUsuario.textContent =
        usuario || "Administrador";
}


/* =========================================================
   SIDEBAR
========================================================= */

function atualizarEstadoSidebar(
    layout,
    button,
    fechada
) {

    if (!layout || !button) {
        return;
    }

    layout.classList.toggle(
        SIDEBAR_FECHADA,
        fechada
    );

    button.setAttribute(
        "aria-expanded",
        String(!fechada)
    );

    button.setAttribute(
        "aria-label",
        fechada
            ? "Mostrar menu lateral"
            : "Ocultar menu lateral"
    );

    button.setAttribute(
        "title",
        fechada
            ? "Mostrar menu lateral"
            : "Ocultar menu lateral"
    );

    const icon =
        button.querySelector(
            ".toggle-icon"
        );

    if (icon) {
        icon.textContent = "☰";
    }
}


function inicializarSidebar() {

    const layout =
        document.querySelector(
            ".app-layout"
        );

    const button =
        document.getElementById(
            "btnToggleSidebar"
        );

    if (!layout || !button) {

        return;
    }

    atualizarEstadoSidebar(
        layout,
        button,
        true
    );

    if (
        button.dataset.sidebarInicializada ===
        "true"
    ) {

        return;
    }

    button.dataset.sidebarInicializada =
        "true";

    button.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            const fechada =
                layout.classList.contains(
                    SIDEBAR_FECHADA
                );

            atualizarEstadoSidebar(
                layout,
                button,
                !fechada
            );
        }
    );
}


/* =========================================================
   PERMISSÕES ATIVAS
========================================================= */

function obterPermissoesAtivas(
    usuarioData
) {

    const permissoes = [];

    if (!usuarioData) {
        return permissoes;
    }

    const telas =
        Array.isArray(usuarioData.telas)
            ? usuarioData.telas
            : [];

    const supervisao =
        Array.isArray(usuarioData.supervisao)
            ? usuarioData.supervisao
            : [];


    if (telas.includes("*")) {

        TELAS.forEach((tela) => {

            permissoes.push({
                tipo: "tela",
                codigo: tela,
                nome: formatarNomeTela(tela)
            });

        });

    } else {

        telas.forEach((tela) => {

            if (TELAS.includes(tela)) {

                permissoes.push({
                    tipo: "tela",
                    codigo: tela,
                    nome: formatarNomeTela(tela)
                });
            }
        });
    }


    supervisao.forEach((codigo) => {

        if (
            CODIGOS_SUPERVISAO.includes(
                codigo
            )
        ) {

            permissoes.push({
                tipo: "supervisao",
                codigo,
                nome: NOMES_SUPERVISAO[codigo] || codigo
            });
        }
    });

    return permissoes;
}


/* =========================================================
   RESUMO DE PERMISSÕES
========================================================= */

function criarResumoPermissoes(
    usuarioData
) {

    const permissoes =
        obterPermissoesAtivas(
            usuarioData
        );

    if (!permissoes.length) {

        return `
            <div class="active-permissions">

                <div class="active-permissions-header">

                    <span class="active-permissions-label">
                        Permissões ativas
                    </span>

                </div>

                <span class="permission-active-empty">
                    Nenhuma permissão ativa
                </span>

            </div>
        `;
    }

    return `
        <div class="active-permissions">

            <div class="active-permissions-header">

                <span class="active-permissions-label">
                    Permissões ativas
                </span>

                <span class="active-permissions-count">
                    ${permissoes.length}
                </span>

            </div>

            <div class="active-permissions-list">

                ${permissoes
                    .map(
                        (permissao) => `
                            <span
                                class="active-permission-tag ${
                                    permissao.tipo ===
                                    "supervisao"
                                        ? "active-permission-supervisao"
                                        : ""
                                }"
                                title="${
                                    permissao.tipo ===
                                    "supervisao"
                                        ? "Permissão de supervisão"
                                        : "Permissão de tela"
                                }"
                            >

                                <span class="active-permission-check">
                                    ✓
                                </span>

                                ${escapeHtml(
                                    permissao.nome
                                )}

                            </span>
                        `
                    )
                    .join("")}

            </div>

        </div>
    `;
}


/* =========================================================
   PRESENÇA
========================================================= */

/*
 * A presença continua sendo consultada para que o
 * sistema mantenha a informação atualizada.
 *
 * Não existe painel ou card separado de presença.
 *
 * O status é mostrado somente na própria linha do usuário.
 */

async function obterPresencasUsuarios() {

    const res =
        await fetch(
            `${obterUrlBaseAPI()}/presenca?t=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            }
        );

    if (!res.ok) {

        throw new Error(
            `Erro ao carregar presença: ${res.status}`
        );
    }

    return await res.json();
}


function formatarUltimaAtividade(iso) {

    if (!iso) {
        return "Sem atividade";
    }

    const data =
        new Date(iso);

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "Sem atividade";
    }

    const segundos =
        Math.max(
            0,
            Math.floor(
                (
                    Date.now() -
                    data.getTime()
                ) / 1000
            )
        );

    if (segundos < 10) {
        return "agora";
    }

    if (segundos < 60) {
        return `há ${segundos}s`;
    }

    const minutos =
        Math.floor(
            segundos / 60
        );

    if (minutos < 60) {
        return `há ${minutos}min`;
    }

    const horas =
        Math.floor(
            minutos / 60
        );

    if (horas < 24) {
        return `há ${horas}h`;
    }

    return data.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function atualizarPresencaAdmin() {

    return obterPresencasUsuarios()

        .then((resposta) => {

            const presencas =
                resposta?.usuarios || {};


            /* =====================================================
               CONTADOR DE USUÁRIOS ONLINE
            ===================================================== */

            const totalOnline =
                Object.values(presencas)
                    .filter(
                        (dados) =>
                            Boolean(
                                dados?.online
                            )
                    )
                    .length;


            const indicador =
                document.getElementById(
                    "totalUsuariosOnline"
                );


            if (indicador) {

                indicador.textContent =
                    totalOnline;

            }


            /* =====================================================
               ATUALIZA STATUS DE CADA USUÁRIO
            ===================================================== */

            const linhas =
                Array.from(
                    document.querySelectorAll(
                        "#listaUsuarios tr[data-usuario-original]"
                    )
                );


            linhas.forEach((tr) => {

                const usuario =
                    tr.dataset.usuarioOriginal;


                const dados =
                    presencas[usuario] || {};


                const celula =
                    tr.querySelector(
                        ".col-presenca"
                    );


                if (!celula) {
                    return;
                }


                const online =
                    Boolean(
                        dados?.online
                    );


                celula.innerHTML = `

                    <span class="presenca-status ${
                        online
                            ? "online"
                            : "offline"
                    }">

                        <span class="presenca-ponto"></span>

                        ${
                            online
                                ? "Online"
                                : "Offline"
                        }

                    </span>

                    <span class="presenca-horario">

                        ${escapeHtml(
                            formatarUltimaAtividade(
                                dados?.ultimo_sinal
                            )
                        )}

                    </span>

                `;


                /*
                 * Guarda o estado no próprio elemento.
                 * Isso facilita a ordenação.
                 */

                tr.dataset.online =
                    online
                        ? "true"
                        : "false";

            });


            /* =====================================================
               ONLINE PRIMEIRO
            ===================================================== */

            const container =
                document.getElementById(
                    "listaUsuarios"
                );


            if (container) {

                const linhasUsuarios =
                    Array.from(
                        container.querySelectorAll(
                            "tr[data-usuario-original]"
                        )
                    );


                linhasUsuarios.sort(
                    (a, b) => {

                        const onlineA =
                            a.dataset.online ===
                            "true";

                        const onlineB =
                            b.dataset.online ===
                            "true";


                        /*
                         * Online vem primeiro.
                         */

                        if (
                            onlineA &&
                            !onlineB
                        ) {
                            return -1;
                        }


                        if (
                            !onlineA &&
                            onlineB
                        ) {
                            return 1;
                        }


                        /*
                         * Se os dois tiverem o mesmo
                         * estado, mantém a ordem atual.
                         */

                        return 0;

                    }
                );


                linhasUsuarios.forEach(
                    (linha) => {

                        container.appendChild(
                            linha
                        );

                    }
                );

            }

        })

        .catch((erro) => {

            console.warn(
                "Não foi possível atualizar presença:",
                erro
            );

        });

}


function iniciarMonitoramentoPresencaAdmin() {

    atualizarPresencaAdmin();

    if (
        window.__intervaloPresencaAdmin
    ) {

        clearInterval(
            window.__intervaloPresencaAdmin
        );
    }

    window.__intervaloPresencaAdmin =
        setInterval(
            atualizarPresencaAdmin,
            10000
        );
}


/* =========================================================
   CARREGAR USUÁRIOS
========================================================= */

async function carregarUI() {

    const container =
        document.getElementById(
            "listaUsuarios"
        );

    if (!container) {

        console.error(
            "Elemento #listaUsuarios não encontrado."
        );

        return;
    }

    container.innerHTML = "";

    try {

        const permissoes =
            await obterPermissoes();

        if (
            !permissoes ||
            !permissoes.usuarios
        ) {

            container.innerHTML = `
                <tr class="table-error-row">

                    <td colspan="5">

                        <div class="table-error">

                            <div class="table-error-icon">
                                !
                            </div>

                            <strong>
                                Não foi possível carregar as permissões
                            </strong>

                            <span>
                                Verifique a configuração do sistema.
                            </span>

                        </div>

                    </td>

                </tr>
            `;

            return;
        }


        const respostaVendedores =
            await fetch(
                `${obterUrlBaseAPI()}/vendedores`
            );

        if (!respostaVendedores.ok) {

            throw new Error(
                `Erro ao carregar vendedores: ${respostaVendedores.status}`
            );
        }

        const vendedores =
            await respostaVendedores.json();


        const usuariosRailway =
            vendedores.usuarios ||
            vendedores;


        const usuarios =
            new Set(
                Object.keys(
                    permissoes.usuarios
                )
            );

        Object.keys(
            usuariosRailway
        ).forEach((usuario) => {

            usuarios.add(usuario);

        });


        usuarios.forEach((usuario) => {

            const userData =
                permissoes.usuarios[usuario] || {
                    telas: [],
                    supervisao: []
                };


            const cadastroRailway =
                usuariosRailway[usuario] || {};

            const nomeCompleto =
    cadastroRailway.nome_completo ||
    cadastroRailway.nomeCompleto ||
    "";

const email =
    cadastroRailway.email ||
    "";

            const sellerCode =
                cadastroRailway.seller_code ||
                cadastroRailway.codigo_vendedor ||
                cadastroRailway.codigo ||
                cadastroRailway.sellerCode ||
                (
                    typeof cadastroRailway ===
                    "string"
                        ? cadastroRailway
                        : "-"
                );


            const tr =
                document.createElement("tr");


            tr.dataset.usuario =
                normalizarTexto(usuario);

            tr.dataset.usuarioOriginal =
                String(usuario);

            tr.dataset.codigo =
                normalizarTexto(
                    sellerCode
                );


            tr.innerHTML = `

              <td class="col-usuario">

    <div class="user-cell">

        <div class="user-avatar">
            ${escapeHtml(
                (
                    nomeCompleto ||
                    usuario
                )
                    .charAt(0)
                    .toUpperCase()
            )}
        </div>

        <div class="user-information">

            <strong>
                ${escapeHtml(
                    nomeCompleto ||
                    "Nome não informado"
                )}
            </strong>

            <small>
                Usuário: ${escapeHtml(usuario)}
            </small>

            <small>
                ${escapeHtml(
                    email ||
                    "E-mail não informado"
                )}
            </small>

        </div>

    </div>

</td>


                <td class="col-codigo">

                    <span class="seller-code">
                        ${escapeHtml(
                            sellerCode
                        )}
                    </span>

                </td>


                <td class="col-permissoes">

                    ${criarResumoPermissoes(
                        userData
                    )}

                    <div class="permission-list">

                        <div class="permission-group">

                            <span class="permission-group-label">
                                SUPERVISÃO
                            </span>

                            ${CODIGOS_SUPERVISAO
                                .map(
                                    (codigo) => `
                                        <label class="tag-supervisao">

                                            <input
                                                type="checkbox"
                                                data-supervisao="${escapeHtml(
                                                    usuario
                                                )}"
                                                value="${escapeHtml(
                                                    codigo
                                                )}"
                                                ${
                                                    userData
                                                        .supervisao
                                                        ?.includes(
                                                            codigo
                                                        )
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            <span class="tag-check"></span>

                                            ${escapeHtml(
    NOMES_SUPERVISAO[codigo] || codigo
)}

                                        </label>
                                    `
                                )
                                .join("")}

                        </div>


                        <div class="permission-group">

                            <span class="permission-group-label">
                                TELAS
                            </span>

                            ${TELAS
                                .map(
                                    (tela) => `
                                        <label class="tag-permissao">

                                            <input
                                                type="checkbox"
                                                data-usuario="${escapeHtml(
                                                    usuario
                                                )}"
                                                data-tela="${escapeHtml(
                                                    tela
                                                )}"
                                                ${
                                                    userData
                                                        .telas
                                                        ?.includes(
                                                            "*"
                                                        ) ||
                                                    userData
                                                        .telas
                                                        ?.includes(
                                                            tela
                                                        )
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            <span class="tag-check"></span>

                                            ${escapeHtml(
                                                formatarNomeTela(
                                                    tela
                                                )
                                            )}

                                        </label>
                                    `
                                )
                                .join("")}

                        </div>

                    </div>

                </td>


                <td class="col-presenca">

                    <span class="presenca-status offline">

                        <span class="presenca-ponto"></span>

                        Offline

                    </span>

                    <span class="presenca-horario">
                        Verificando...
                    </span>

                </td>


                <td class="col-acoes">

                    <button
                        type="button"
                        class="btn-editar"
                        data-acao="editar"
                        data-usuario="${escapeHtml(
                            usuario
                        )}"
                        title="Editar usuário"
                        aria-label="Editar usuário"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="btn-excluir"
                        data-acao="excluir"
                        data-usuario="${escapeHtml(
                            usuario
                        )}"
                        title="Excluir usuário"
                        aria-label="Excluir usuário"
                    >
                        🗑
                    </button>

                </td>

            `;

            container.appendChild(tr);
        });


        executarBuscaUsuarios();

    } catch (erro) {

        console.error(
            "Erro ao carregar painel administrativo:",
            erro
        );

        container.innerHTML = `
            <tr class="table-error-row">

                <td colspan="5">

                    <div class="table-error">

                        <div class="table-error-icon">
                            !
                        </div>

                        <strong>
                            Não foi possível carregar os usuários
                        </strong>

                        <span>
                            Verifique a conexão com o servidor.
                        </span>

                    </div>

                </td>

            </tr>
        `;

        const statusBusca =
            document.getElementById(
                "statusBuscaUsuarios"
            );

        if (statusBusca) {

            statusBusca.textContent =
                "Erro ao sincronizar dados";
        }
    }
}


/* =========================================================
   BUSCA
========================================================= */

function executarBuscaUsuarios() {

    const campoBusca =
        document.getElementById(
            "buscaUsuarios"
        );

    const container =
        document.getElementById(
            "listaUsuarios"
        );

    const statusBusca =
        document.getElementById(
            "statusBuscaUsuarios"
        );

    if (
        !campoBusca ||
        !container
    ) {
        return;
    }

    const termo =
        normalizarTexto(
            campoBusca.value
        );

    const linhas =
        container.querySelectorAll(
            "tr"
        );

    let encontrados = 0;

    linhas.forEach((linha) => {

        if (
            linha.classList.contains(
                "table-error-row"
            ) ||
            linha.querySelector(
                ".table-error"
            )
        ) {
            return;
        }

        const usuario =
            normalizarTexto(
                linha.dataset.usuario
            );

        const codigo =
            normalizarTexto(
                linha.dataset.codigo
            );

        const textoLinha =
            normalizarTexto(
                linha.textContent
            );

        const corresponde =
            !termo ||
            usuario.includes(termo) ||
            codigo.includes(termo) ||
            textoLinha.includes(termo);

        linha.classList.toggle(
            "usuario-oculto",
            !corresponde
        );

        if (corresponde) {
            encontrados++;
        }
    });


    if (statusBusca) {

        if (!termo) {

            statusBusca.textContent =
                "Dados sincronizados";

        } else if (encontrados === 0) {

            statusBusca.textContent =
                "Nenhum usuário encontrado";

        } else if (encontrados === 1) {

            statusBusca.textContent =
                "1 usuário encontrado";

        } else {

            statusBusca.textContent =
                `${encontrados} usuários encontrados`;
        }
    }


    const botaoLimpar =
        document.getElementById(
            "btnLimparBusca"
        );

    if (botaoLimpar) {

        botaoLimpar.classList.toggle(
            "is-visible",
            Boolean(termo)
        );
    }
}


/* =========================================================
   BUSCA - EVENTOS
========================================================= */

function inicializarBuscaUsuarios() {

    const campoBusca =
        document.getElementById(
            "buscaUsuarios"
        );

    const botaoLimpar =
        document.getElementById(
            "btnLimparBusca"
        );

    if (campoBusca) {

        campoBusca.addEventListener(
            "input",
            executarBuscaUsuarios
        );

        campoBusca.addEventListener(
            "search",
            executarBuscaUsuarios
        );
    }

    if (botaoLimpar) {

        botaoLimpar.addEventListener(
            "click",
            function () {

                if (!campoBusca) {
                    return;
                }

                campoBusca.value = "";

                executarBuscaUsuarios();

                campoBusca.focus();
            }
        );
    }
}


/* =========================================================
   SALVAR PERMISSÕES
========================================================= */

async function salvarPermissoesUI() {

    const checkboxes =
        document.querySelectorAll(
            "#listaUsuarios input[type='checkbox']"
        );

    const usuariosTemp = {};


    checkboxes.forEach((cb) => {

        if (cb.dataset.supervisao) {

            const usuario =
                cb.dataset.supervisao;

            if (!usuariosTemp[usuario]) {

                usuariosTemp[usuario] = {
                    telas: [],
                    supervisao: []
                };
            }

            if (cb.checked) {

                usuariosTemp[usuario]
                    .supervisao
                    .push(cb.value);
            }

            return;
        }


        const usuario =
            cb.dataset.usuario;

        const tela =
            cb.dataset.tela;

        if (
            !usuario ||
            !tela
        ) {
            return;
        }

        if (!usuariosTemp[usuario]) {

            usuariosTemp[usuario] = {
                telas: [],
                supervisao: []
            };
        }

        if (
            cb.checked &&
            !usuariosTemp[usuario]
                .telas
                .includes(tela)
        ) {

            usuariosTemp[usuario]
                .telas
                .push(tela);
        }
    });


    try {

        const permissoesAtuais =
            await obterPermissoes();

        const novaConfig = {
            ...permissoesAtuais,
            usuarios: usuariosTemp
        };

        await salvarPermissoes(
            novaConfig
        );

        limparCachePermissoes();

        await obterPermissoes();

        await carregarUI();

        alertaSucesso(
            "As permissões foram atualizadas com sucesso."
        );

    } catch (erro) {

        console.error(
            "Erro ao atualizar permissões:",
            erro
        );

        alertaErro(
            "Não foi possível salvar as permissões no servidor. A alteração não foi aplicada."
        );
    }
}


/* =========================================================
   ELEMENTOS DO MODAL
========================================================= */

function obterElementosModal() {

    return {

        modal:
            document.getElementById(
                "modalUsuario"
            ),

        campoNome:
            document.getElementById(
                "modalNomeUsuario"
            ),

        campoNomeCompleto:
            document.getElementById(
                "modalNomeCompleto"
            ),

        campoEmail:
            document.getElementById(
                "modalEmailUsuario"
            ),

        campoCodigo:
            document.getElementById(
                "modalCodigoVendedor"
            ),

        titulo:
            document.getElementById(
                "tituloModalUsuario"
            ),

        descricao:
            document.querySelector(
                "#modalUsuario .modal-header-text p"
            ),

        botaoSalvar:
            document.getElementById(
                "btnSalvarUsuario"
            )
    };
}


/* =========================================================
   ABRIR MODAL
========================================================= */

function abrirModalUsuario() {

    usuarioEditando = null;

    const elementos =
        obterElementosModal();

    if (!elementos.modal) {
        return;
    }

    elementos.modal.classList.remove(
        "oculto"
    );

    elementos.modal.setAttribute(
        "aria-hidden",
        "false"
    );


    if (elementos.campoNome) {

        elementos.campoNome.disabled =
            false;

        elementos.campoNome.value =
            "";
    }

    if (elementos.campoNomeCompleto) {

    elementos.campoNomeCompleto.disabled =
        false;

    elementos.campoNomeCompleto.value =
        "";
}


if (elementos.campoEmail) {

    elementos.campoEmail.disabled =
        false;

    elementos.campoEmail.value =
        "";
}

    if (elementos.campoCodigo) {

        elementos.campoCodigo.disabled =
            false;

        elementos.campoCodigo.value =
            "";
    }


    document
        .querySelectorAll(
            "#modalUsuario input[type='checkbox']"
        )
        .forEach((cb) => {

            cb.checked = false;
        });


    if (elementos.titulo) {

        elementos.titulo.textContent =
            "Novo usuário";
    }


    if (elementos.descricao) {

        elementos.descricao.textContent =
            "Cadastre um usuário e defina suas permissões.";
    }


    if (elementos.botaoSalvar) {

        elementos.botaoSalvar.innerHTML =
            "<span>✓</span> Criar usuário";
    }


    setTimeout(() => {

        if (elementos.campoNome) {
            elementos.campoNome.focus();
        }

    }, 50);
}


/* =========================================================
   FECHAR MODAL
========================================================= */

function fecharModalUsuario() {

    const elementos =
        obterElementosModal();

    if (elementos.modal) {

        elementos.modal.classList.add(
            "oculto"
        );

        elementos.modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    if (elementos.campoNome) {

        elementos.campoNome.value =
            "";

        elementos.campoNome.disabled =
            false;
    }

    if (elementos.campoNomeCompleto) {

    elementos.campoNomeCompleto.value =
        "";

    elementos.campoNomeCompleto.disabled =
        false;
}


if (elementos.campoEmail) {

    elementos.campoEmail.value =
        "";

    elementos.campoEmail.disabled =
        false;
}
    if (elementos.campoCodigo) {

        elementos.campoCodigo.value =
            "";

        elementos.campoCodigo.disabled =
            false;
    }


    document
        .querySelectorAll(
            "#modalUsuario input[type='checkbox']"
        )
        .forEach((cb) => {

            cb.checked = false;
        });


    usuarioEditando = null;


    if (elementos.titulo) {

        elementos.titulo.textContent =
            "Novo usuário";
    }


    if (elementos.descricao) {

        elementos.descricao.textContent =
            "Cadastre um usuário e defina suas permissões.";
    }


    if (elementos.botaoSalvar) {

        elementos.botaoSalvar.innerHTML =
            "<span>✓</span> Criar usuário";
    }
}


/* =========================================================
   CRIAR / EDITAR USUÁRIO
========================================================= */

async function salvarNovoUsuario() {

    const elementos =
        obterElementosModal();

    const nome =
        elementos.campoNome
            ? elementos.campoNome.value
                .trim()
                .toLowerCase()
            : "";

    const codigoVendedor =
        elementos.campoCodigo
            ? elementos.campoCodigo.value
                .trim()
                .toUpperCase()
            : "";
    const nomeCompleto =
    elementos.campoNomeCompleto
        ? elementos.campoNomeCompleto.value.trim()
        : "";

const email =
    elementos.campoEmail
        ? elementos.campoEmail.value.trim().toLowerCase()
        : "";

    if (!nome) {

        alertaAviso(
            "Digite um nome de usuário válido."
        );

        return;
    }


    if (!codigoVendedor) {

        alertaAviso(
            "Digite o código de vendedor."
        );

        return;
    }


    const modoEdicao =
        Boolean(usuarioEditando);

    const usuarioOriginal =
        usuarioEditando;


    const checkboxes =
        document.querySelectorAll(
            "#modalUsuario input[type='checkbox']"
        );

    const telasSelecionadas = [];


    checkboxes.forEach((cb) => {

        const ehSupervisao =
            cb.classList.contains(
                "chkSupervisao"
            ) ||
            CODIGOS_SUPERVISAO.includes(
                cb.value
            );

        if (
            cb.checked &&
            cb.value &&
            !ehSupervisao
        ) {

            if (
                !telasSelecionadas.includes(
                    cb.value
                )
            ) {

                telasSelecionadas.push(
                    cb.value
                );
            }
        }
    });


    const supervisao = [];


    document
        .querySelectorAll(
            "#modalUsuario .chkSupervisao"
        )
        .forEach((cb) => {

            if (
                cb.checked &&
                !supervisao.includes(
                    cb.value
                )
            ) {

                supervisao.push(
                    cb.value
                );
            }
        });


    try {

        const permissoes =
            await obterPermissoes();

        if (
            !permissoes ||
            !permissoes.usuarios
        ) {

            throw new Error(
                "Não foi possível carregar as permissões atuais."
            );
        }


        if (modoEdicao) {

            const respostaVendedor =
                await fetch(
                    `${obterUrlBaseAPI()}/vendedores/${encodeURIComponent(
                        usuarioOriginal
                    )}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
    seller_code:
        codigoVendedor,

    nome_completo:
        nomeCompleto,

    email:
        email
})
                    }
                );


            let resultadoVendedor = {};

            try {

                resultadoVendedor =
                    await respostaVendedor.json();

            } catch (erro) {

                console.warn(
                    "Resposta do vendedor não possui JSON válido.",
                    erro
                );
            }


            if (!respostaVendedor.ok) {

                throw new Error(
                    resultadoVendedor.detail ||
                    resultadoVendedor.erro ||
                    "Não foi possível alterar o código do vendedor."
                );
            }


            permissoes.usuarios[
                usuarioOriginal
            ] = {

                telas:
                    telasSelecionadas,

                supervisao:
                    supervisao
            };


            await salvarPermissoes(
                permissoes
            );

            limparCachePermissoes();

            fecharModalUsuario();

            await carregarUI();

            alertaSucesso(
                "O usuário foi atualizado com sucesso."
            );

            return;
        }


        if (
            permissoes.usuarios[nome]
        ) {

            alertaAviso(
                "O usuário informado já existe."
            );

            return;
        }


        const respostaVendedor =
            await fetch(
                `${obterUrlBaseAPI()}/vendedores`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
    usuario: nome,

    seller_code:
        codigoVendedor,

    nome_completo:
        nomeCompleto,

    email:
        email
})
                }
            );


        let resultadoVendedor = {};

        try {

            resultadoVendedor =
                await respostaVendedor.json();

        } catch (erro) {

            console.warn(
                "Resposta do vendedor não possui JSON válido.",
                erro
            );
        }


        if (!respostaVendedor.ok) {

            throw new Error(
                resultadoVendedor.detail ||
                resultadoVendedor.erro ||
                "Não foi possível cadastrar o vendedor."
            );
        }


        permissoes.usuarios[nome] = {

            telas:
                telasSelecionadas,

            supervisao:
                supervisao
        };


        await salvarPermissoes(
            permissoes
        );

        limparCachePermissoes();

        await carregarUI();

        fecharModalUsuario();

        alertaSucesso(
            "O usuário foi criado com sucesso."
        );

    } catch (erro) {

        console.error(
            "Erro ao criar/editar usuário:",
            erro
        );

        alertaErro(
            erro.message ||
            "Erro ao salvar o usuário."
        );
    }
}


/* =========================================================
   EDITAR USUÁRIO
========================================================= */

async function editarUsuario(usuario) {

    try {

        const permissoes =
            await obterPermissoes();

        const userData =
            permissoes.usuarios[
                usuario
            ] || {
                telas: [],
                supervisao: []
            };


        const resposta =
            await fetch(
                `${obterUrlBaseAPI()}/vendedores`
            );

        if (!resposta.ok) {

            throw new Error(
                `Erro ao carregar vendedores: ${resposta.status}`
            );
        }


        const vendedores =
            await resposta.json();

        const usuariosRailway =
            vendedores.usuarios ||
            vendedores;

        const cadastro =
            usuariosRailway[
                usuario
            ] || {};


        const codigo =
            cadastro.seller_code ||
            cadastro.codigo_vendedor ||
            cadastro.codigo ||
            cadastro.sellerCode ||
            "";

        const nomeCompleto =
    cadastro.nome_completo ||
    cadastro.nomeCompleto ||
    "";

const email =
    cadastro.email ||
    "";
        const elementos =
            obterElementosModal();


        if (elementos.campoNome) {

    elementos.campoNome.value =
        usuario;

    elementos.campoNome.disabled =
        true;
}


if (elementos.campoNomeCompleto) {

    elementos.campoNomeCompleto.value =
        nomeCompleto;

    elementos.campoNomeCompleto.disabled =
        false;
}


if (elementos.campoEmail) {

    elementos.campoEmail.value =
        email;

    elementos.campoEmail.disabled =
        false;
}


if (elementos.campoCodigo) {

    elementos.campoCodigo.value =
        codigo;

    elementos.campoCodigo.disabled =
        false;
}


        document
            .querySelectorAll(
                "#modalUsuario input[type='checkbox']"
            )
            .forEach((cb) => {

                if (
                    cb.classList.contains(
                        "chkSupervisao"
                    )
                ) {

                    cb.checked =
                        userData
                            .supervisao
                            ?.includes(
                                cb.value
                            ) ||
                        false;

                } else {

                    cb.checked =
                        userData
                            .telas
                            ?.includes("*") ||
                        userData
                            .telas
                            ?.includes(
                                cb.value
                            ) ||
                        false;
                }
            });


        usuarioEditando =
            usuario;


        if (elementos.titulo) {

            elementos.titulo.textContent =
                "Editar usuário";
        }


        if (elementos.descricao) {

            elementos.descricao.textContent =
                "Altere o nome completo, e-mail, código do vendedor e as permissões.";
        }


        if (elementos.botaoSalvar) {

            elementos.botaoSalvar.innerHTML =
                "<span>✓</span> Salvar alterações";
        }


        if (elementos.modal) {

            elementos.modal.classList.remove(
                "oculto"
            );

            elementos.modal.setAttribute(
                "aria-hidden",
                "false"
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao editar usuário:",
            erro
        );

        alertaErro(
            erro.message ||
            "Não foi possível carregar os dados do usuário."
        );
    }
}


/* =========================================================
   EXCLUIR USUÁRIO
========================================================= */

async function excluirUsuario(usuario) {

    const usuarioLogado =
    sessionStorage.getItem("usuarioLogado") ||
    localStorage.getItem("usuarioLogado") ||
    "";


    if (
        usuario === usuarioLogado
    ) {

        alertaAviso(
            "Você não pode excluir o próprio usuário."
        );

        return;
    }


    if (
        usuario ===
        USUARIO_ADMIN_PROTEGIDO
    ) {

        alertaAviso(
            "O usuário administrador principal é protegido."
        );

        return;
    }


    const confirmar =
        await confirmarAcaoSistema({

            titulo:
                "Excluir usuário",

            mensagem:
                `Deseja realmente excluir o usuário "${usuario}"?\n\n` +
                "O cadastro, o código de vendedor e as permissões serão removidos.",

            textoCancelar:
                "Cancelar",

            textoConfirmar:
                "Excluir"
        });


    if (!confirmar) {
        return;
    }


    try {

        const res =
            await fetch(
                `${obterUrlBaseAPI()}/usuarios/${encodeURIComponent(
                    usuario
                )}`,
                {
                    method: "DELETE"
                }
            );


        let data = {};

        try {

            data =
                await res.json();

        } catch (erro) {

            console.warn(
                "Resposta da exclusão não possui JSON válido.",
                erro
            );
        }


        if (
            !res.ok ||
            !data.ok
        ) {

            throw new Error(
                data.detail ||
                data.erro ||
                "Erro ao excluir usuário."
            );
        }


        limparCachePermissoes();

        await carregarUI();

        alertaSucesso(
            "O usuário foi excluído com sucesso."
        );

    } catch (erro) {

        console.error(
            "Erro ao excluir usuário:",
            erro
        );

        alertaErro(
            erro.message ||
            "Erro na requisição."
        );
    }
}


/* =========================================================
   EVENTOS DA TABELA
========================================================= */

function inicializarEventosTabela() {

    const container =
        document.getElementById(
            "listaUsuarios"
        );

    if (!container) {
        return;
    }

    if (
        container.dataset.eventosInicializados ===
        "true"
    ) {

        return;
    }

    container.dataset.eventosInicializados =
        "true";

    container.addEventListener(
        "click",
        function (event) {

            const botao =
                event.target.closest(
                    "button[data-acao]"
                );

            if (!botao) {
                return;
            }

            const usuario =
                botao.dataset.usuario;

            if (!usuario) {
                return;
            }

            const acao =
                botao.dataset.acao;

            if (acao === "editar") {

                editarUsuario(usuario);

                return;
            }

            if (acao === "excluir") {

                excluirUsuario(usuario);
            }
        }
    );
}


/* =========================================================
   ATUALIZAR RESUMO DE PERMISSÕES
========================================================= */

function atualizarResumoPermissoesLinha(
    linha
) {

    if (!linha) {
        return;
    }

    const resumo =
        linha.querySelector(
            ".active-permissions"
        );

    if (!resumo) {
        return;
    }

    const telas = [];

    linha
        .querySelectorAll(
            "input[data-tela]:checked"
        )
        .forEach((cb) => {

            if (cb.dataset.tela) {

                telas.push(
                    cb.dataset.tela
                );
            }
        });


    const supervisao = [];

    linha
        .querySelectorAll(
            "input[data-supervisao]:checked"
        )
        .forEach((cb) => {

            if (cb.value) {

                supervisao.push(
                    cb.value
                );
            }
        });


    const dadosTemporarios = {
        telas,
        supervisao
    };


    const novoResumo =
        criarResumoPermissoes(
            dadosTemporarios
        );

    resumo.outerHTML =
        novoResumo;
}


/* =========================================================
   EVENTOS DE CHECKBOX
========================================================= */

function inicializarEventosPermissoes() {

    document.addEventListener(
        "change",
        function (event) {

            const checkbox =
                event.target;

            if (
                !checkbox.matches(
                    "#listaUsuarios input[type='checkbox']"
                )
            ) {
                return;
            }

            const linha =
                checkbox.closest("tr");

            if (!linha) {
                return;
            }

            atualizarResumoPermissoesLinha(
                linha
            );
        }
    );
}


/* =========================================================
   EVENTOS DO MODAL
========================================================= */

function inicializarEventosModal() {

    const modal =
        document.getElementById(
            "modalUsuario"
        );

    const botaoNovo =
        document.getElementById(
            "btnNovoUsuario"
        );

    const botaoFechar =
        document.getElementById(
            "btnFecharModalUsuario"
        );

    const botaoCancelar =
        document.getElementById(
            "btnCancelarModalUsuario"
        );

    const botaoSalvar =
        document.getElementById(
            "btnSalvarUsuario"
        );

    const overlay =
        modal
            ? modal.querySelector(
                ".modal-overlay"
            )
            : null;


    if (botaoNovo) {

        botaoNovo.addEventListener(
            "click",
            abrirModalUsuario
        );
    }


    if (botaoFechar) {

        botaoFechar.addEventListener(
            "click",
            fecharModalUsuario
        );
    }


    if (botaoCancelar) {

        botaoCancelar.addEventListener(
            "click",
            fecharModalUsuario
        );
    }


    if (botaoSalvar) {

        botaoSalvar.addEventListener(
            "click",
            salvarNovoUsuario
        );
    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === overlay
                ) {

                    fecharModalUsuario();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape"
            ) {
                return;
            }

            if (
                modal &&
                !modal.classList.contains(
                    "oculto"
                )
            ) {

                fecharModalUsuario();
            }
        }
    );
}


/* =========================================================
   BOTÃO SALVAR PERMISSÕES
========================================================= */

function inicializarBotaoSalvarPermissoes() {

    const botao =
        document.getElementById(
            "btnSalvarPermissoes"
        );

    if (!botao) {
        return;
    }

    if (
        botao.dataset.eventoInicializado ===
        "true"
    ) {

        return;
    }

    botao.dataset.eventoInicializado =
        "true";

    botao.addEventListener(
        "click",
        salvarPermissoesUI
    );
}


/* =========================================================
   LINKS PLACEHOLDER
========================================================= */

function inicializarLinksPlaceholder() {

    const links =
        document.querySelectorAll(
            '.sidebar .menu-item[href="#"]'
        );

    links.forEach((link) => {

        if (
            link.classList.contains(
                "active"
            )
        ) {
            return;
        }

        if (
            link.dataset.placeholderInicializado ===
            "true"
        ) {
            return;
        }

        link.dataset.placeholderInicializado =
            "true";

        link.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                console.info(
                    `Módulo "${link.textContent.trim()}" ainda não possui uma página configurada.`
                );
            }
        );
    });
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function inicializarAdmin() {

    inicializarSistemaAlertas();


    const possuiAcesso =
        await verificarAcessoAdmin();

    if (!possuiAcesso) {
        return;
    }


    inicializarUsuarioAdmin();

    inicializarSidebar();

    inicializarBuscaUsuarios();

    inicializarEventosModal();

    inicializarBotaoSalvarPermissoes();

    inicializarEventosTabela();

    inicializarEventosPermissoes();

    inicializarLinksPlaceholder();


    await carregarUI();


    /*
     * A presença continua sendo atualizada,
     * porém somente dentro da tabela.
     */
    iniciarMonitoramentoPresencaAdmin();
}


/* =========================================================
   ADMIN — VISUAL 2026
   Complementa o admin.js sem mudar a lógica de salvar:
   - linhas compactas (só permissões ativas; opções ao editar)
   - aviso "Sem código cadastrado"
   - cartões de resumo com filtro
   - status em uma linha
   - ícones nas ações
   - barra fixa de alterações não salvas
   Para voltar ao visual anterior, apague este bloco inteiro
   (até o fim do (function(){...})) e o bloco VISUAL 2026 do admin.css.
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


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarAdmin
    );

} else {

    inicializarAdmin();
}