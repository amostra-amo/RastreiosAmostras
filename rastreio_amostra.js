/* =========================================================
   CONSOLE EM PRODUÇÃO
   As mensagens de depuração ficam desligadas para os usuários.
   Para ver de novo (suporte), abra a página com ?debug=1
   ou rode no console: localStorage.setItem("debugRastreio", "1")
========================================================= */

(function prepararConsole() {
    let modoDebug = false;

    try {
        modoDebug =
            new URLSearchParams(window.location.search).has("debug") ||
            localStorage.getItem("debugRastreio") === "1";
    } catch (erro) {
        modoDebug = false;
    }

    if (modoDebug) return;

    try {
        console.log(
            "%cAtenção",
            "color:#dc2626;font-size:22px;font-weight:bold;"
        );
        console.log(
            "%cEsta área é destinada a desenvolvedores. Não cole aqui códigos enviados por terceiros: isso pode dar acesso à sua conta.",
            "font-size:13px;"
        );
    } catch (erro) {}

    const silencioso = function () {};

    ["log", "info", "debug", "table", "group", "groupCollapsed", "groupEnd", "warn", "trace", "dir"]
        .forEach(metodo => {
            try {
                console[metodo] = silencioso;
            } catch (erro) {}
        });
})();


/* =========================================================
   SESSÃO NAS CHAMADAS AO BACKEND
   Endpoints protegidos (permissões, usuários, presença)
   exigem o login. Este trecho anexa o token da sessão
   automaticamente, sem precisar mudar cada chamada.
========================================================= */

(function anexarSessaoNasChamadas() {
    if (window.__fetchComSessao) return;
    window.__fetchComSessao = true;

    const BACKEND = "https://rastreio-amostras-backend-production.up.railway.app";
    const PROTEGIDOS = /\/(permissoes|vendedores|usuarios)(\/|\?|$)|\/presenca(\?|$)/;
    const fetchOriginal = window.fetch.bind(window);

    window.fetch = function (recurso, opcoes = {}) {
        try {
            const url = typeof recurso === "string" ? recurso : (recurso && recurso.url) || "";

            if (url.startsWith(BACKEND) && PROTEGIDOS.test(url.slice(BACKEND.length))) {
                const token =
                    sessionStorage.getItem("app_session_token") ||
                    localStorage.getItem("app_session_token") ||
                    "";

                if (token) {
                    const headers = new Headers(
                        opcoes.headers ||
                        (recurso instanceof Request ? recurso.headers : undefined)
                    );

                    if (!headers.has("Authorization")) {
                        headers.set("Authorization", "Bearer " + token);
                    }

                    opcoes = { ...opcoes, headers };
                }
            }
        } catch (erro) {}

        return fetchOriginal(recurso, opcoes);
    };
})();


/* =========================================================
   CONFIG
========================================================= */

const url =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7og0_9fNfXHoINFiE-s75rCPc-RIqAFLwcl8dQqMvEKXimWrMfgQz30QxPKul8_1Cf8RB4YSoizJy/pub?gid=0&single=true&output=csv";

/* =========================================================
   PERMISSÕES
   AGORA VÊM DO RAILWAY
========================================================= */

const API_PERMISSOES =
    "https://rastreio-amostras-backend-production.up.railway.app/permissoes";

let permissoes = {
    usuarios: {}
};


async function carregarPermissoes() {

    try {

        console.log(
            "🔄 Buscando permissões atualizadas do Railway..."
        );


        const resposta =
            await fetch(
                API_PERMISSOES + "?t=" + Date.now()
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP: " +
                resposta.status
            );

        }


        permissoes =
            await resposta.json();


        console.log(
            "✅ Permissões carregadas do Railway:",
            permissoes
        );


        return permissoes;


    } catch (erro) {

        console.error(
            "❌ Erro ao carregar permissões do Railway:",
            erro
        );


        /*
           Se o Railway estiver indisponível,
           tenta usar o cache local.
        */

        try {

            const local =
                localStorage.getItem(
                    "permissoes"
                );


            if (local) {

                permissoes =
                    JSON.parse(local);


                console.warn(
                    "⚠️ Usando permissões locais como fallback."
                );

            }

        } catch (erroLocal) {

            console.error(
                "❌ Erro ao carregar permissões locais:",
                erroLocal
            );

        }


        return permissoes;

    }

}


/* =========================================================
   ESTADO
========================================================= */

let dados = [];
let dadosVendedora = [];
let csvCarregado = false;
let situacoesSelecionadas = [];

/* =========================================================
   CORREIOS - STATUS AUTOMÁTICO
   A planilha continua fornecendo os dados comerciais, mas
   a situação/rastreamento passa a vir da API do backend.
========================================================= */

const API_CORREIOS =
    "https://rastreio-amostras-backend-production.up.railway.app/rastreio-correios";

const statusCorreios = new Map();

const CACHE_ENTREGUES_KEY =
    "rastreiosCorreiosEntregues";

const CACHE_STATUS_CORREIOS_KEY =
    "rastreiosCorreiosStatus";

const CONCORRENCIA_CORREIOS = 8;

function lerCacheJSON(chave, padrao) {
    try {
        const valor = localStorage.getItem(chave);
        return valor ? JSON.parse(valor) : padrao;
    } catch (erro) {
        console.warn("Cache inválido:", chave, erro);
        return padrao;
    }
}

function salvarCacheJSON(chave, valor) {
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
    } catch (erro) {
        console.warn("Não foi possível salvar cache:", chave, erro);
    }
}

function obterCodigosEntreguesCache() {
    return new Set(lerCacheJSON(CACHE_ENTREGUES_KEY, []));
}

function marcarComoEntregue(codigo) {
    const codigos = obterCodigosEntreguesCache();
    codigos.add(String(codigo).trim().toUpperCase());
    salvarCacheJSON(CACHE_ENTREGUES_KEY, [...codigos]);
}

function normalizarCodigoRastreio(codigo) {
    return String(codigo || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

function obterStatusLocal(codigo) {
    return statusCorreios.get(
        normalizarCodigoRastreio(codigo)
    ) || null;
}

function statusParaSituacao(status) {
    const texto = normalizar(
        `${status?.codigoEvento || status?.codigo || ""} ${status?.status || ""} ${status?.descricao || ""}`
    );

    // "Objeto entregue ao remetente" contém "ENTREGUE", mas significa
    // devolução/retorno. Por isso, retorno tem prioridade sobre entrega.
    if (
        texto.includes("ENTREGUE AO REMETENTE") ||
        texto.includes("DEVOLVIDO AO REMETENTE") ||
        texto.includes("DEVOLVIDA AO REMETENTE") ||
        texto.includes("DEVOLUCAO AO REMETENTE") ||
        texto.includes("DEVOLUÇÃO AO REMETENTE") ||
        texto.includes("RETORNADO AO REMETENTE") ||
        texto.includes("RETORNOU AO REMETENTE") ||
        texto.includes("DEVOLVIDO") ||
        texto.includes("DEVOLVIDA") ||
        texto.includes("DEVOLUCAO") ||
        texto.includes("DEVOLUÇÃO") ||
        texto.includes("RETORN")
    ) {
        return "RETORN";
    }

    if (texto.includes("ENTREGUE")) {
        return "ENTREGUE";
    }

    return "PENDENTE";
}

function statusAguardandoRetirada(status) {
    const texto = normalizar(
        `${status?.status || ""} ${status?.descricao || ""}`
    );
    return texto.includes("AGUARDANDO RETIRADA");
}

function descricaoStatusCorreios(status) {
    if (!status) return "Consultando Correios...";
    return status.descricao || status.status || "Atualização do objeto";
}

function dataStatusCorreios(status) {
    const valor = status?.data;

    if (!valor) return "";

    const texto = String(valor).trim();

    // Aceita datas no formato ISO:
    // 2026-12-12T13:10:00
    // 2026-12-12T13:10:00.000
    // 2026-12-12 13:10:00
    const matchISO = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
    );

    if (matchISO) {
        const [, ano, mes, dia, hora, minuto] = matchISO;

        return `${dia} - ${mes} - ${ano} | ${hora}:${minuto}h`;
    }

    // Caso a API já envie no formato brasileiro:
    // 12/12/2026 13:10:00
    const matchBR = texto.match(
        /^(\d{2})[\/-](\d{2})[\/-](\d{4})[\sT]+(\d{2}):(\d{2})/
    );

    if (matchBR) {
        const [, dia, mes, ano, hora, minuto] = matchBR;

        return `${dia}-${mes}-${ano} | ${hora}:${minuto}h`;
    }

    // Caso venha somente a data:
    // 12/12/2026
    const somenteData = texto.match(
        /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/
    );

    if (somenteData) {
        const [, dia, mes, ano] = somenteData;

        return `${dia}-${mes}-${ano}`;
    }

    // Se aparecer algum formato inesperado, mantém o valor original
    // para não esconder a informação.
    return texto;
}

async function buscarResumoCorreios(codigo) {
    const codigoNormalizado = normalizarCodigoRastreio(codigo);

    if (!codigoNormalizado || codigoNormalizado === "NÃO INFORMADO") {
        return null;
    }

    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 20000);

    let resposta;

    try {
        resposta = await fetch(
            `${API_CORREIOS}/${encodeURIComponent(codigoNormalizado)}/resumo?t=${Date.now()}`,
            {
                cache: "no-store",
                signal: controlador.signal
            }
        );
    } finally {
        clearTimeout(timeout);
    }

    if (!resposta.ok) {
        throw new Error(`Correios HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!dados?.sucesso || !dados?.resumo) {
        throw new Error(
            dados?.mensagem || "API dos Correios não retornou resumo."
        );
    }

    return dados.resumo;
}

async function executarComConcorrencia(itens, limite, tarefa) {
    let indice = 0;

    async function trabalhador() {
        while (true) {
            const atual = indice++;
            if (atual >= itens.length) return;
            await tarefa(itens[atual], atual);
        }
    }

    const trabalhadores = Array.from(
        { length: Math.min(limite, itens.length) },
        () => trabalhador()
    );

    await Promise.all(trabalhadores);
}

function horaAgoraCurta() {
    return new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function mostrarRastreiosAtualizadosTopbar() {
    definirStatusAtualizacaoTopbar(
        "concluido",
        "Rastreios atualizados",
        `Última verificação ${horaAgoraCurta()}`,
        100
    );
}

async function carregarStatusCorreios(opcoes = {}) {
    // mostrarProgresso = true somente quando o usuário clica no status
    // da topbar. Na abertura da página e na atualização automática, os
    // códigos já conhecidos são atualizados em silêncio.
    const mostrarProgresso = opcoes.mostrarProgresso === true;

    const grupos = agruparPorRastreio(dadosVendedora);
    const codigos = [
        ...new Set(
            grupos
                .map(grupo => normalizarCodigoRastreio(grupo?.[0]?.[1]))
                .filter(codigo => codigo && codigo !== "NÃO INFORMADO")
        )
    ];

    if (!codigos.length) {
        console.log("ℹ️ Nenhum código de rastreio encontrado.");
        iniciarProgressoCorreiosTopbar(0);
        return;
    }

    const cacheStatus = lerCacheJSON(CACHE_STATUS_CORREIOS_KEY, {});
    const entreguesCache = obterCodigosEntreguesCache();

    // Preenche a tela na hora com o último status conhecido.
    codigos.forEach(codigo => {
        if (cacheStatus[codigo]) {
            statusCorreios.set(codigo, cacheStatus[codigo]);
        }
    });

    // Entregue não muda mais: não consulta de novo.
    // Só pendentes, retornados e códigos novos vão para a API.
    const aConsultar = codigos.filter(codigo => {
        const status = cacheStatus[codigo];
        if (status?.situacao === "ENTREGUE") return false;
        if (!status && entreguesCache.has(codigo)) return false;
        return true;
    });

    // Códigos que nunca foram consultados neste navegador: só eles
    // aparecem na barra de progresso (exceto em atualização manual).
    const novos = new Set(
        aConsultar.filter(codigo => !cacheStatus[codigo])
    );

    // Mostra o andamento sempre que houver pendentes/retornados sendo
    // conferidos, para o usuário saber que a página está trabalhando.
    const totalVisivel = aConsultar.length;

    if (totalVisivel > 0) {
        iniciarProgressoCorreiosTopbar(totalVisivel, "Atualizando pendentes...");
    } else {
        mostrarRastreiosAtualizadosTopbar();
    }

    // Mostra os status do cache imediatamente.
    filtrar();
    atualizarNotificacoes();

    console.log(
        `📦 Correios: ${codigos.length} rastreios; ${codigos.length - aConsultar.length} entregues (sem consulta); ${aConsultar.length} serão atualizados (${novos.size} novos).`
    );

    if (!aConsultar.length) {
        return;
    }

    let concluidos = 0;

    // Redesenhar os 925 cards é o que trava a página. Só redesenha
    // quando algum status realmente mudou, e no máximo a cada 4 s.
    let houveMudanca = false;
    let ultimoRedesenho = Date.now();

    function assinaturaStatus(status) {
        return status
            ? `${status.situacao}|${status.descricao}|${status.data}`
            : "";
    }

    function redesenharSeNecessario(forcar = false) {
        if (!houveMudanca) return;
        if (!forcar && Date.now() - ultimoRedesenho < 4000) return;
        houveMudanca = false;
        ultimoRedesenho = Date.now();
        filtrar();
        atualizarNotificacoes();
    }

    await executarComConcorrencia(
        aConsultar,
        CONCORRENCIA_CORREIOS,
        async codigo => {
            let erroConsulta = false;

            try {
                const resumo = await buscarResumoCorreios(codigo);
                const situacao = statusParaSituacao(resumo);

                const status = {
                    ...resumo,
                    situacao,
                    aguardandoRetirada: statusAguardandoRetirada(resumo),
                    atualizadoEm: new Date().toISOString()
                };

                if (assinaturaStatus(statusCorreios.get(codigo)) !== assinaturaStatus(status)) {
                    houveMudanca = true;
                }

                statusCorreios.set(codigo, status);
                cacheStatus[codigo] = status;

                if (situacao === "ENTREGUE") {
                    marcarComoEntregue(codigo);
                }

            } catch (erro) {
                erroConsulta = true;
                console.warn(`⚠️ Falha ao consultar ${codigo}:`, erro);

                if (!statusCorreios.has(codigo)) {
                    houveMudanca = true;
                    statusCorreios.set(codigo, {
                        situacao: "PENDENTE",
                        status: "NÃO FOI POSSÍVEL CONSULTAR",
                        descricao: "Status dos Correios indisponível no momento.",
                        erro: true
                    });
                }
            } finally {
                concluidos++;

                registrarProgressoCorreiosTopbar(erroConsulta);

                redesenharSeNecessario(concluidos === aConsultar.length);

                // Salva o cache aos poucos, para não perder o que já foi
                // consultado se a página for fechada.
                if (concluidos % 20 === 0 || concluidos === aConsultar.length) {
                    salvarCacheJSON(CACHE_STATUS_CORREIOS_KEY, cacheStatus);
                }

                if (concluidos % 25 === 0 || concluidos === aConsultar.length) {
                    console.log(
                        `📦 Correios: ${concluidos}/${aConsultar.length} consultas concluídas.`
                    );
                }
            }
        }
    );

    salvarCacheJSON(CACHE_STATUS_CORREIOS_KEY, cacheStatus);
}

function obterSituacaoLinha(linha) {
    const codigo = normalizarCodigoRastreio(linha?.[1]);
    const status = obterStatusLocal(codigo);

    if (status) {
        return status.situacao || statusParaSituacao(status);
    }

    // Enquanto a API ainda carrega, não usa mais a coluna 26 da planilha.
    return "PENDENTE";
}

function obterDescricaoLinha(linha) {
    const codigo = normalizarCodigoRastreio(linha?.[1]);
    if (!codigo) return "Nota emitida · aguardando código de rastreio";
    const status = obterStatusLocal(codigo);

    if (status) return descricaoStatusCorreios(status);
    return "Consultando Correios...";
}

function obterDataStatusLinha(linha) {
    const codigo = normalizarCodigoRastreio(linha?.[1]);
    const status = obterStatusLocal(codigo);
    return dataStatusCorreios(status);
}

function linhaAguardandoRetirada(linha) {
    const codigo = normalizarCodigoRastreio(linha?.[1]);
    return statusAguardandoRetirada(obterStatusLocal(codigo));
}

let tipoBusca = {
    value: "nota"
};


/* =========================================================
   ELEMENTOS
========================================================= */

const sistema = document.getElementById("sistema");

const campoBusca = document.getElementById("filtroBusca");
const resultado = document.getElementById("resultado");

const contador = document.getElementById("contador");
const boasVindas = document.getElementById("boasVindas");

const overlay = document.getElementById("overlayDetalhes");
const conteudoDetalhes =
    document.getElementById("conteudoDetalhes");

const overlayRastreioCorreios =
    document.getElementById("overlayRastreioCorreios");
const conteudoRastreioCorreios =
    document.getElementById("conteudoRastreioCorreios");

const btnAjudaSuporte =
    document.getElementById("btnAjudaSuporte");

const btnTipoBusca =
    document.getElementById("btnTipoBusca");

const menuTipoBusca =
    document.getElementById("menuTipoBusca");

const labelTipoBusca =
    document.getElementById("labelTipoBusca");

const btnAnalises =
    document.getElementById("btnAnalises");

const btnNotificacoes =
    document.getElementById("btnNotificacoes");

const contadorNotificacoes =
    document.getElementById("contadorNotificacoes");

const overlayNotificacoes =
    document.getElementById("overlayNotificacoes");

const listaNotificacoes =
    document.getElementById("listaNotificacoes");


/* =========================================================
   TOPBAR - ATUALIZAÇÃO E RELÓGIO
========================================================= */

const statusAtualizacaoTopbar =
    document.getElementById("statusAtualizacaoTopbar");

const statusAtualizacaoTexto =
    document.getElementById("statusAtualizacaoTexto");

const statusAtualizacaoContagem =
    document.getElementById("statusAtualizacaoContagem");

const statusAtualizacaoBarraProgresso =
    document.getElementById("statusAtualizacaoBarraProgresso");

const statusAtualizacaoIcone =
    document.getElementById("statusAtualizacaoIcone");

const relogioHora =
    document.getElementById("relogioHora");

const relogioData =
    document.getElementById("relogioData");

let progressoCorreiosTopbar = {
    total: 0,
    concluidos: 0,
    erros: 0
};

let atualizacaoCorreiosEmAndamento = null;

async function atualizarRastreiosAgora(manual = false) {
    // Evita duas atualizações simultâneas se o usuário clicar várias vezes.
    if (atualizacaoCorreiosEmAndamento) {
        return atualizacaoCorreiosEmAndamento;
    }

    atualizacaoCorreiosEmAndamento = (async () => {
        try {
            await carregarStatusCorreios({ mostrarProgresso: manual === true });
            filtrar();
            atualizarNotificacoes();
        } catch (erro) {
            console.warn("⚠️ Não foi possível atualizar os status dos Correios:", erro);
            definirStatusAtualizacaoTopbar(
                "erro",
                "Não foi possível atualizar",
                "Tente novamente em instantes",
                0
            );
        } finally {
            atualizacaoCorreiosEmAndamento = null;
        }
    })();

    return atualizacaoCorreiosEmAndamento;
}

function atualizarRelogioTopbar() {
    if (!relogioHora || !relogioData) return;

    const agora = new Date();

    relogioHora.textContent = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    relogioData.textContent = agora.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function iniciarRelogioTopbar() {
    atualizarRelogioTopbar();
    setInterval(atualizarRelogioTopbar, 1000);
}

function definirStatusAtualizacaoTopbar(
    estado,
    texto,
    contagem,
    percentual = null
) {
    if (!statusAtualizacaoTopbar) return;

    statusAtualizacaoTopbar.classList.remove(
        "atualizando",
        "concluido",
        "erro"
    );

    if (estado) {
        statusAtualizacaoTopbar.classList.add(estado);
    }

    if (statusAtualizacaoTexto) {
        statusAtualizacaoTexto.textContent = texto;
    }

    if (statusAtualizacaoContagem) {
        statusAtualizacaoContagem.textContent = contagem;
    }

    if (statusAtualizacaoIcone) {
        statusAtualizacaoIcone.textContent =
            estado === "concluido"
                ? "✓"
                : estado === "erro"
                    ? "!"
                    : "↻";
    }

    if (statusAtualizacaoBarraProgresso && percentual !== null) {
        const valor = Math.max(0, Math.min(100, percentual));
        statusAtualizacaoBarraProgresso.style.width = `${valor}%`;
    }
}

function iniciarProgressoCorreiosTopbar(total, textoAndamento = "Atualizando rastreios...") {
    progressoCorreiosTopbar = {
        total: Number(total) || 0,
        concluidos: 0,
        erros: 0,
        texto: textoAndamento
    };

    if (!total) {
        definirStatusAtualizacaoTopbar(
            "concluido",
            "Rastreios atualizados",
            "Nenhum código para consultar",
            100
        );
        return;
    }

    definirStatusAtualizacaoTopbar(
        "atualizando",
        textoAndamento,
        `0 de ${total}`,
        0
    );
}

function registrarProgressoCorreiosTopbar(erro = false) {
    progressoCorreiosTopbar.concluidos++;

    if (erro) {
        progressoCorreiosTopbar.erros++;
    }

    const { total, concluidos, erros } = progressoCorreiosTopbar;
    const percentual = total
        ? Math.round((concluidos / total) * 100)
        : 100;

    if (concluidos >= total) {
        const texto = erros > 0
            ? "Atualização concluída com avisos"
            : "Rastreios atualizados";

        const hora = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const detalhe = erros > 0
            ? `${erros} de ${total} com falha • ${hora}`
            : `Última verificação ${hora}`;

        definirStatusAtualizacaoTopbar(
            erros > 0 ? "erro" : "concluido",
            texto,
            detalhe,
            100
        );
        return;
    }

    definirStatusAtualizacaoTopbar(
        "atualizando",
        progressoCorreiosTopbar.texto || "Atualizando rastreios...",
        `${concluidos} de ${total} • ${percentual}%`,
        percentual
    );
}

iniciarRelogioTopbar();


/* =========================================================
   NOVA PESQUISA RETRÁTIL
   (abrir/fechar do painel e do overlay é controlado pelo
   script no final do rastreio_amostra.html)
========================================================= */


/* =========================================================
   DADOS DO LOGIN
========================================================= */

const dadosSalvos =
    sessionStorage.getItem("dadosFiltrados") ||
    localStorage.getItem("dadosFiltrados");

const usuarioLogado =
    sessionStorage.getItem("usuarioLogado") ||
    localStorage.getItem("usuarioLogado") ||
    "";

const acessoTotal =
    (
        sessionStorage.getItem("acessoTotal") ||
        localStorage.getItem("acessoTotal") ||
        "false"
    ) === "true";


if (!dadosSalvos) {
    window.location.href = "index.html";
}


try {

    dadosVendedora = JSON.parse(dadosSalvos);

} catch (erro) {

    console.error(
        "Erro ao interpretar dadosFiltrados:",
        erro
    );

    localStorage.clear();
    window.location.href = "index.html";
}


/* =========================================================
   PERMISSÕES VISUAIS
========================================================= */

window.exibirCliente = true;
window.exibirRepresentante = true;
window.isAdmin = acessoTotal;

// Linha "Vendedor:" nos cards: acesso total (v.santos) e
// usuários com código de vendedor ADMIN1.
const codigoVendedorSessao = String(
    sessionStorage.getItem("codigoVendedor") ||
    localStorage.getItem("codigoVendedor") ||
    ""
).trim().toUpperCase();

window.exibirVendedor =
    acessoTotal || codigoVendedorSessao === "ADMIN1";


/* =========================================================
   INICIALIZA BUSCA
========================================================= */

if (campoBusca) {
    campoBusca.value = "";
}


/* =========================================================
   NOME DO VENDEDOR
========================================================= */

const usuarioOriginal =
    String(usuarioLogado || "")
        .trim()
        .toUpperCase();


const codigoVendedorLogado =
    usuarioOriginal.includes("-")
        ? usuarioOriginal.split("-").pop().trim()
        : usuarioOriginal;


const vendedorPlanilha =
    dadosVendedora.find(linha => {

        const codigoPlanilha =
            String(linha[22] || "")
                .trim()
                .toUpperCase();

        return codigoPlanilha === codigoVendedorLogado;

    });


const nomeVendedorLogado =
    String(
        vendedorPlanilha?.[23] || ""
    ).trim() ||
    codigoVendedorLogado;




const nomeCompleto =
    sessionStorage.getItem("nomeCompleto") ||
    localStorage.getItem("nomeCompleto") ||
    nomeVendedorLogado;

if (boasVindas) {

    boasVindas.innerHTML =
        `${saudacaoPorHorario()}
        <strong>${nomeCompleto}</strong>
        <br>
        ${
            acessoTotal
                ? "Acesso total liberado."
                : "Abaixo, seus envios."
        }`;

}


/* =========================================================
   SUPERVISÃO
========================================================= */

async function aplicarFiltroSupervisao() {

    try {

        /* =================================================
           USUÁRIO LOGADO
        ================================================= */

        const usuario =
    String(
        sessionStorage.getItem("usuarioLogado") ||
        localStorage.getItem("usuarioLogado") ||
        ""
    )
    .trim()
    .toLowerCase();


        console.log(
            "================================="
        );

        console.log(
            "🔎 APLICANDO FILTRO DE SUPERVISÃO"
        );

        console.log(
            "Usuário:",
            usuario
        );

        console.log(
            "================================="
        );


        /* =================================================
           GARANTE PERMISSÕES ATUALIZADAS
        ================================================= */

        await carregarPermissoes();


        /* =================================================
           CONFIGURAÇÃO DO USUÁRIO
        ================================================= */

        const usuarioConfig =
            permissoes
                ?.usuarios
                ?.[usuario];


        console.log(
            "Configuração do usuário:",
            usuarioConfig
        );


        /* =================================================
           COORDENADORAS
        ================================================= */

        const coordenadores = [
            "jsantos"
        ];


        if (
            coordenadores.includes(usuario)
        ) {

            console.log(
                "👑 USUÁRIO COORDENADOR:",
                usuario
            );


            const respostaCSV =
                await fetch(url);


            const texto =
                await respostaCSV.text();


            const parseado =
                Papa.parse(
                    texto,
                    {
                        skipEmptyLines: true
                    }
                );


            const linhas =
                parseado.data;


            dadosVendedora =
                linhas.filter(
                    (linha, index) => {

                        if (index === 0) {
                            return false;
                        }


                        const codigoVendedor =
                            String(
                                linha[22] || ""
                            )
                            .trim()
                            .toUpperCase();


                        return codigoVendedor
                            .startsWith("V");

                    }
                );


            console.log(
                "👑 Coordenadora - total de rastreios:",
                dadosVendedora.length
            );


            return;

        }


        /* =================================================
           SEM PERMISSÃO DE SUPERVISÃO
        ================================================= */

        if (
            !usuarioConfig?.supervisao ||
            !Array.isArray(
                usuarioConfig.supervisao
            ) ||
            usuarioConfig.supervisao.length === 0
        ) {

            console.log(
                "ℹ️ Usuário sem acesso especial de supervisão."
            );

            return;

        }


        /* =================================================
           CÓDIGOS DE SUPERVISÃO PERMITIDOS
        ================================================= */

        const codigosPermitidos =
            usuarioConfig.supervisao
                .map(
                    codigo =>
                        String(codigo)
                            .trim()
                            .toUpperCase()
                );


        console.log(
            "🔐 Códigos de supervisão permitidos:",
            codigosPermitidos
        );


        /* =================================================
           CARREGAR PLANILHA
        ================================================= */

        const respostaCSV =
            await fetch(url);


        const texto =
            await respostaCSV.text();


        const parseado =
            Papa.parse(
                texto,
                {
                    skipEmptyLines: true
                }
            );


        const linhas =
            parseado.data;


        /* =================================================
           FILTRAR PEDIDOS
        ================================================= */

        dadosVendedora =
            linhas.filter(
                (linha, index) => {

                    /*
                       Ignora cabeçalho
                    */

                    if (index === 0) {
                        return false;
                    }


                    /*
                       Coluna 22 =
                       código do vendedor
                    */

                    const codigoVendedor =
                        String(
                            linha[22] || ""
                        )
                        .trim()
                        .toUpperCase();


                    /*
                       Verifica se o vendedor
                       pertence a algum grupo
                       permitido.
                    */

                    const permitido =
                        codigosPermitidos.some(
                            codigo =>
                                codigoVendedor
                                    .startsWith(
                                        codigo
                                    )
                        );


                    return permitido;

                }
            );


        console.log(
            "================================="
        );

        console.log(
            "📊 FILTRO DE SUPERVISÃO FINALIZADO"
        );

        console.log(
            "Códigos:",
            codigosPermitidos
        );

        console.log(
            "Total de pedidos encontrados:",
            dadosVendedora.length
        );

        console.log(
            "================================="
        );

    } catch (erro) {

        console.error(
            "❌ Erro ao aplicar filtro de supervisão:",
            erro
        );

    }

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

(async () => {

    await carregarPermissoes();

    await aplicarFiltroSupervisao();

    aplicarTemaEMarca(
        acessoTotal,
        dadosVendedora
    );

    await controlarMenu(
        usuarioLogado
    );

    configurarNavegacaoSidebar();
    configurarBotoesSidebar();
    atualizarPerfilSidebar();

    controlarAnalytics(
        usuarioLogado
    );

    // Renderiza os rastreios imediatamente.
    // A consulta aos Correios acontece em segundo plano para que uma
    // indisponibilidade/latência da API nunca impeça a tela de abrir.
    filtrar();
    atualizarNotificacoes();

    atualizarRastreiosAgora()
        .then(() => {
            console.log("✅ Status dos Correios carregados em segundo plano.");
        });

})();


/* =========================================================
   PERMISSÕES
========================================================= */

function temPermissaoTela(usuario, tela) {

    const user =
        String(usuario || "")
            .trim()
            .toLowerCase();

    const telaNormalizada =
        String(tela || "")
            .trim()
            .toLowerCase();


    // =====================================================
    // RASTREIO
    // =====================================================

    if (telaNormalizada === "rastreio_amostra") {
        return true;
    }


    // =====================================================
    // SUPER ADMIN
    // =====================================================

    if (user === "v.santos") {
        return true;
    }


    // =====================================================
    // ACESSO TOTAL
    // =====================================================

    const acessoTotal =
        localStorage.getItem("acessoTotal") === "true" ||
        sessionStorage.getItem("acessoTotal") === "true";

    if (acessoTotal) {
        return true;
    }


    // =====================================================
    // CONFIGURAÇÃO DO USUÁRIO
    // =====================================================

    const config =
        permissoes?.usuarios?.[user];

    if (!config) {
        return false;
    }


    // =====================================================
    // TELAS PERMITIDAS
    // =====================================================

    const telas =
        Array.isArray(config.telas)
            ? config.telas
            : [];


    const telasNormalizadas =
        telas.map(
            t =>
                String(t)
                    .trim()
                    .toLowerCase()
        );


    // =====================================================
    // ACESSO TOTAL PELO ADMIN
    // =====================================================

    if (telasNormalizadas.includes("*")) {
        return true;
    }


    // =====================================================
    // VERIFICAR TELA
    // =====================================================

    return telasNormalizadas.includes(
        telaNormalizada
    );
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatarAmostraDetalhe(i) {

    const tipo =
        normalizar(i[17] || "");


    if (tipo.includes("CARTELA")) {

        return `${i[16]} - ${i[15]}`;

    }


    return `${i[16]} - ${i[17]} - ${i[15]}`;

}


/* =========================================================
   MENU DE TIPO DE BUSCA
========================================================= */

function atualizarItemAtivoMenu() {

    if (!menuTipoBusca) return;


    menuTipoBusca
        .querySelectorAll(".menu-item")
        .forEach(item => {

            item.classList.toggle(
                "ativo",
                item.dataset.tipo ===
                    tipoBusca.value
            );

        });

}


/* =========================================================
   PEDIDOS PENDENTES
========================================================= */

function obterPedidosPendentes() {

    const mapa = new Map();


    dadosVendedora.forEach(l => {

        const situacao =
            obterSituacaoLinha(l);


        if (!situacao.includes("PENDENTE")) {
            return;
        }


        const nota = l[0];


        if (!mapa.has(nota)) {
            mapa.set(nota, l);
        }

    });


    return [...mapa.values()];

}


/* =========================================================
   TIPO DE BUSCA PADRÃO
========================================================= */

(function initTipoBuscaPadrao() {

    if (tipoBusca) {
        tipoBusca.value = "nota";
    }


    if (labelTipoBusca) {
        labelTipoBusca.innerText =
            "Nota Fiscal";
    }


    if (campoBusca) {
        campoBusca.placeholder =
            "Digite a nota";
    }

})();


function atualizarPlaceholderBusca() {

    const placeholders = {

        nota: "Digite a nota",

        pedido: "Digite o Pedido",

        cliente: "Digite o Cliente",

        representante:
            "Digite o Representante"

    };


    if (!campoBusca) return;


    const tipo =
        tipoBusca.value;


    campoBusca.placeholder =
        placeholders[tipo] ||
        "Digite para buscar";

}


/* =========================================================
   ATUALIZA MENU DE BUSCA
========================================================= */

function atualizarMenuTipoBusca() {

    if (!menuTipoBusca) return;


    const itemRepresentante =
        menuTipoBusca.querySelector(
            '.menu-item[data-tipo="representante"]'
        );


    if (!itemRepresentante) return;


    if (window.exibirRepresentante) {

        itemRepresentante
            .classList
            .remove("oculto");

    } else {

        itemRepresentante
            .classList
            .add("oculto");


        if (
            tipoBusca.value ===
            "representante"
        ) {

            tipoBusca.value =
                "nota";


            labelTipoBusca.innerText =
                "Nota Fiscal";


            atualizarPlaceholderBusca();

        }

    }


    atualizarItemAtivoMenu();

}


/* =========================================================
   TIPO DE BUSCA
========================================================= */

if (btnTipoBusca) {

    btnTipoBusca.onclick = function (e) {

        e.stopPropagation();


        if (menuTipoBusca) {

            menuTipoBusca
                .classList
                .toggle("oculto");

        }


        atualizarItemAtivoMenu();

    };

}


/* =========================================================
   SELEÇÃO DO TIPO DE BUSCA
========================================================= */

if (menuTipoBusca) {

    menuTipoBusca
        .querySelectorAll(".menu-item")
        .forEach(item => {

            item.onclick = function () {

                const tipo =
                    item.dataset.tipo;


                tipoBusca.value =
                    tipo;


                const textoItem =
                    item.querySelector(
                        "span:not(.menu-icone)"
                    );

                labelTipoBusca.innerText =
                    textoItem
                        ? textoItem.innerText.trim()
                        : item.innerText.trim();


                atualizarPlaceholderBusca();


                if (campoBusca) {
                    campoBusca.value = "";
                }


                filtrar();


                atualizarItemAtivoMenu();


                menuTipoBusca
                    .classList
                    .add("oculto");


                /*
                   Mantém o foco no campo após
                   escolher o tipo.
                */
                if (campoBusca) {
                    campoBusca.focus();
                }

            };

        });

}


/* =========================================================
   CLIQUE FORA
========================================================= */

document.addEventListener(
    "click",
    function (e) {

        /*
           Menu de tipo de pesquisa
        */

        const dentroBusca =
            e.target.closest(
                ".campo-busca-wrapper"
            );


        if (!dentroBusca) {

            if (menuTipoBusca) {
                menuTipoBusca
                    .classList
                    .add("oculto");
            }

        }

    }
);


/* =========================================================
   ESC FECHA A PESQUISA
========================================================= */

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key !== "Escape") {
            return;
        }


        /*
           Fecha menu de tipos
        */

        if (menuTipoBusca) {

            menuTipoBusca
                .classList
                .add("oculto");

        }

    }
);


/* =========================================================
   TEMA E MARCA
========================================================= */

function aplicarTemaEMarca(
    acessoTotal,
    dadosVendedora
) {

    console.log(
        "Aplicando tema..."
    );


    const logo =
        document.getElementById(
            "logoMarcaBox"
        );


    const usuarioAtual =
    (
        sessionStorage.getItem("usuarioLogado") ||
        localStorage.getItem("usuarioLogado") ||
        ""
    )
    .trim()
    .toLowerCase();


    /*
       JSANTOS
    */

    if (usuarioAtual === "jsantos") {

        document.body.className = "";

        document.body.classList.add(
            "tema-quatrok"
        );


        if (logo) {

            logo.src =
                "/Imagens/4k BRANCO.png";

        }


        window.marcaLogada =
            "QUATROK";


        console.log(
            "🎨 Tema QUATROK aplicado para JSANTOS"
        );


        return;

    }


    /*
       ACESSO TOTAL
    */

    if (acessoTotal) {

        document.body.className = "";

        document.body.classList.add(
            "tema-direto"
        );


        if (logo) {

            logo.src =
                "/Imagens/Logo - Grupo 4k - Branco.png";

        }


        window.marcaLogada =
            "DIRETO";


        return;

    }


    /*
       SEM DADOS
    */

    if (!dadosVendedora.length) {

        document.body.className = "";

        document.body.classList.add(
            "tema-direto"
        );


        if (logo) {

            logo.src =
                "/Imagens/Logo - Grupo 4k - Branco.png";

        }


        window.marcaLogada =
            "DIRETO";


        return;

    }


    /*
       MARCA DA PLANILHA
    */

    const marca =
        (dadosVendedora[0][24] || "")
            .trim()
            .toUpperCase();


    document.body.className = "";


    if (marca.includes("QUATROK")) {

        document.body.classList.add(
            "tema-quatrok"
        );


        window.marcaLogada =
            "QUATROK";


        if (logo) {

            logo.src =
                "/Imagens/4k têxtil novo branco.png";

        }

    }

    else if (marca.includes("LUARA")) {

        document.body.classList.add(
            "tema-luara"
        );


        window.marcaLogada =
            "LUARA";


        if (logo) {

            logo.src =
                "/Imagens/logo luara textil em branco.png";

        }

    }

    else {

        document.body.classList.add(
            "tema-direto"
        );


        window.marcaLogada =
            "DIRETO";


        if (logo) {

            logo.src =
                "/Imagens/logo-direto.png";

        }

    }


    console.log(
        "DADOS VENDEDORA AQUI:",
        dadosVendedora
    );


    console.log(
        "MARCA:",
        dadosVendedora?.[0]?.[24]
    );

}


/* =========================================================
   UTIL
========================================================= */

function saudacaoPorHorario() {

    const h =
        new Date().getHours();


    if (h < 12) {
        return "Bom dia,";
    }


    if (h < 18) {
        return "Boa tarde,";
    }


    return "Boa noite,";

}


function hashSimples(str) {

    let h = 0;


    for (
        let i = 0;
        i < str.length;
        i++
    ) {

        h =
            (h << 5) -
            h +
            str.charCodeAt(i);


        h |= 0;

    }


    return h >>> 0;

}


const HASH_ADM =
    3872595084;


/* =========================================================
   ORDENAÇÃO
========================================================= */

function normalizarTextoOrdenacao(txt) {

    if (!txt) return "";


    const descricao =
        txt.replace(
            /^.*?-\s*.*?-\s*/,
            ""
        );


    return descricao
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toUpperCase();

}


function normalizar(v) {

    return v
        ?.toString()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\uFE0F/g,
            ""
        )
        .replace(
            /⚠/g,
            ""
        )
        .trim()
        .toUpperCase();

}


function parseDataBR(data) {

    if (!data) {
        return new Date(0);
    }


    const [
        dia,
        mes,
        ano
    ] = data.split("/");


    return new Date(
        ano,
        mes - 1,
        dia
    );

}


/* =========================================================
   SCROLL
========================================================= */

function travarScroll() {

    document.body.style.overflow =
        "hidden";

}


function liberarScroll() {

    document.body.style.overflow =
        "";

}


/* =========================================================
   NAVEGAÇÃO ENTRE NOTIFICAÇÕES E DETALHES
========================================================= */

let detalhesVeioDeNotificacoes = false;
let cardSelecionadoKey = null;


/* =========================================================
   NOTIFICAÇÕES
========================================================= */

function atualizarNotificacoes() {

    if (
        !btnNotificacoes ||
        !contadorNotificacoes
    ) {
        return;
    }


    const pendentes =
        dadosVendedora.filter(
            l => obterSituacaoLinha(l) === "PENDENTE"
        );


    const grupos =
        agruparPorRastreio(
            pendentes
        );


    contadorNotificacoes.innerText =
        grupos.length;


    const deveMostrarBotao =
        window.marcaLogada === "LUARA" ||
        grupos.length > 0;


    btnNotificacoes
        .classList
        .toggle(
            "oculto",
            !deveMostrarBotao
        );


    if (!listaNotificacoes) {
        return;
    }


    if (!grupos.length) {

        listaNotificacoes.innerHTML =
            "<p style='text-align:center'>Nenhuma notificação no momento.</p>";

        return;

    }


    listaNotificacoes.innerHTML = "";


    grupos.forEach(grupo => {

        const l = grupo[0];


        const notasUnicas =
            [
                ...new Set(
                    grupo.map(i => i[0])
                )
            ];


        const labelNota =
            notasUnicas.length === 1
                ? "Nota"
                : "Notas";


        const situacaoTexto =
            escaparHTML(obterDescricaoLinha(l));


        const div =
            document.createElement(
                "div"
            );


        let classeAlerta = "";


        if (
            situacaoTexto.includes(
                "AGUARDANDO RETIRADA"
            )
        ) {

            classeAlerta =
                "alerta-retirada";

        }


        div.className =
            `notificacao-item ${classeAlerta}`;


        div.innerHTML = `
            <strong>${labelNota}:</strong>
            ${notasUnicas.join(", ")}
            <br>

            <strong>Cliente:</strong>
            ${l[19]}
            <br>

            <strong>Situação:</strong>
            ${escaparHTML(obterDescricaoLinha(l))}
        `;


        div.onclick = () => {

            detalhesVeioDeNotificacoes = true;

            fecharNotificacoes();

            abrirDetalhes(grupo);

        };


        listaNotificacoes
            .appendChild(div);

    });

}


function mostrarAlerta(
    mensagem,
    tempo = 3000
) {

    const alerta =
        document.getElementById(
            "alertaTela"
        );


    if (!alerta) return;


    alerta.innerText =
        mensagem;


    alerta.classList.add(
        "show"
    );


    alerta.classList.remove(
        "oculto"
    );


    setTimeout(() => {

        alerta.classList.remove(
            "show"
        );


        setTimeout(() => {

            alerta.classList.add(
                "oculto"
            );

        }, 300);

    }, tempo);

}


/* =========================================================
   BOTÃO NOTIFICAÇÕES
========================================================= */

if (btnNotificacoes) {

    btnNotificacoes.onclick =
        function (e) {

            e.stopPropagation();


            const aberto =
                overlayNotificacoes
                    ?.classList
                    .contains("show");


            if (aberto) {

                fecharNotificacoes();

                return;

            }


            overlayNotificacoes
                .classList
                .remove("oculto");


            overlayNotificacoes
                .classList
                .add("show");


            const painelNotif =
                overlayNotificacoes
                    ?.querySelector(
                        ".painel-detalhes"
                    );


            if (painelNotif) {

                painelNotif
                    .classList
                    .add(
                        "modo-legenda"
                    );

            }


            travarScroll();

        };

}


document.addEventListener(
    "click",
    function (e) {

        if (!overlayNotificacoes) {
            return;
        }


        const clicouDentro =
            e.target.closest(
                "#overlayNotificacoes, #overlayDetalhes, #btnNotificacoes"
            );


        if (
            !clicouDentro &&
            overlayNotificacoes
                .classList
                .contains("show")
        ) {

            fecharNotificacoes();

        }

    }
);


function fecharNotificacoes() {

    if (!overlayNotificacoes) {
        return;
    }


    overlayNotificacoes
        .classList
        .add("oculto");


    overlayNotificacoes
        .classList
        .remove("show");


    const painel =
        overlayNotificacoes
            ?.querySelector(
                ".painel-detalhes"
            );


    if (painel) {

        painel.classList.remove(
            "modo-legenda"
        );

    }


    liberarScroll();

}


/* =========================================================
   FILTRO
========================================================= */

if (campoBusca) {

    campoBusca.oninput =
        function () {

            const temBusca =
                campoBusca.value
                    .trim()
                    .length > 5;


            document.body.classList.toggle(
                "modo-busca",
                temBusca
            );


            filtrar();

        };

}


/* =========================================================
   LIMPAR PESQUISA (BOTÃO "X")
========================================================= */

const btnLimparBusca =
    document.getElementById("btnLimparBusca");

if (btnLimparBusca && campoBusca) {

    btnLimparBusca.addEventListener(
        "click",
        function (e) {

            e.stopPropagation();

            campoBusca.value = "";

            document.body.classList.remove(
                "modo-busca"
            );

            filtrar();

            campoBusca.focus();

        }
    );

}


function filtrar() {

    let lista =
        [...dadosVendedora];


    const termo =
        campoBusca
            ? campoBusca.value.trim()
            : "";


    if (termo) {

        const tipo =
            tipoBusca.value;


        const termoNormalizado =
            normalizar(termo);


        lista =
            lista.filter(l => {

                switch (tipo) {

                    case "nota":

                        return normalizar(
                            l[0]
                        ).includes(
                            termoNormalizado
                        );


                    case "pedido":

                        return normalizar(
                            l[14]
                        ).includes(
                            termoNormalizado
                        );


                    case "cliente":

                        return normalizar(
                            l[18] || ""
                        ).includes(
                            termoNormalizado
                        );


                    case "representante":

                        return normalizar(
                            l[20]
                        ).includes(
                            termoNormalizado
                        );


                    default:

                        return false;

                }

            });

    }


    if (
        situacoesSelecionadas.length > 0
    ) {

        lista =
            lista.filter(l => {

                const situacao =
                    obterSituacaoLinha(l);


                return situacoesSelecionadas
                    .some(status => {

                        if (
                            status ===
                            "ENTREGUE"
                        ) {

                            return situacao
                                .includes(
                                    "ENTREGUE"
                                );

                        }


                        if (
                            status ===
                            "RETORN"
                        ) {

                            return (
                                situacao.includes(
                                    "RETORN"
                                ) ||
                                situacao.includes(
                                    "DEVOL"
                                )
                            );

                        }


                        if (
                            status ===
                            "PENDENTE"
                        ) {

                            return situacao
                                .includes(
                                    "PENDENTE"
                                );

                        }


                        return false;

                    });

            });

    }


    renderizar(lista);

    atualizarCardsDashboard();

}


/* =========================================================
   DASHBOARD
========================================================= */

function atualizarCardsDashboard() {

    let entregue = 0;
    let pendente = 0;
    let retornado = 0;


    // =====================================================
    // CONTADORES DOS ÚLTIMOS 30 DIAS
    // =====================================================

    let entreguesUltimos30Dias = 0;
    let pendentesUltimos30Dias = 0;
    let retornadosUltimos30Dias = 0;


    const grupos =
        agruparPorRastreio(
            dadosVendedora
        );


    // =====================================================
    // DATA ATUAL
    // =====================================================

    const hoje =
        new Date();

    hoje.setHours(
        0, 0, 0, 0
    );


    // =====================================================
    // DATA DE 30 DIAS ATRÁS
    // =====================================================

    const trintaDiasAtras =
        new Date(hoje);

    trintaDiasAtras.setDate(
        hoje.getDate() - 29
    );


    grupos.forEach(grupo => {

        const linha =
            grupo[0];

        const situacao =
            obterSituacaoLinha(linha);


        if (
            situacao.includes(
                "PENDENTE"
            )
        ) {

            pendente++;

        }

        else if (
            situacao.includes(
                "ENTREGUE"
            )
        ) {

            entregue++;

        }

        else if (
            situacao.includes(
                "RETORN"
            ) ||
            situacao.includes(
                "DEVOL"
            )
        ) {

            retornado++;

        }


        // =================================================
        // VERIFICA SE ESTÁ NOS ÚLTIMOS 30 DIAS
        // =================================================

        const dataPostagem =
            parseDataBR(
                linha[5]
            );


        if (
            dataPostagem &&
            dataPostagem >= trintaDiasAtras &&
            dataPostagem <= hoje
        ) {

            if (
                situacao.includes(
                    "PENDENTE"
                )
            ) {

                pendentesUltimos30Dias++;

            }

            else if (
                situacao.includes(
                    "ENTREGUE"
                )
            ) {

                entreguesUltimos30Dias++;

            }

            else if (
                situacao.includes(
                    "RETORN"
                ) ||
                situacao.includes(
                    "DEVOL"
                )
            ) {

                retornadosUltimos30Dias++;

            }

        }

    });


    const elPendentes =
        document.getElementById(
            "totalPendentes"
        );


    const elEntregues =
        document.getElementById(
            "totalEntregues"
        );


    const elRetornados =
        document.getElementById(
            "totalRetornados"
        );


    const elTotal =
        document.getElementById(
            "totalGeral"
        );


    if (elPendentes) {
        elPendentes.innerText =
            pendente;
    }


    if (elEntregues) {
        elEntregues.innerText =
            entregue;
    }


    if (elRetornados) {
        elRetornados.innerText =
            retornado;
    }


    if (elTotal) {

        elTotal.innerText =
            grupos.length;

    }


    // =====================================================
    // ATUALIZA OS ÚLTIMOS 30 DIAS
    // =====================================================

    const elEnviosExtra =
        document.getElementById(
            "enviosUltimos30Dias"
        );

    const elEntreguesExtra =
        document.getElementById(
            "entreguesUltimos30Dias"
        );

    const elPendentesExtra =
        document.getElementById(
            "pendentesUltimos30Dias"
        );

    const elRetornadosExtra =
        document.getElementById(
            "retornadosUltimos30Dias"
        );


    if (elEnviosExtra) {
        elEnviosExtra.innerText =
            `${contarEnviosUltimos30Dias(grupos)} nos últimos 30 dias`;
    }


    if (elEntreguesExtra) {
        elEntreguesExtra.innerText =
            `${entreguesUltimos30Dias} nos últimos 30 dias`;
    }


    if (elPendentesExtra) {
        elPendentesExtra.innerText =
            `${pendentesUltimos30Dias} nos últimos 30 dias`;
    }


    if (elRetornadosExtra) {
        elRetornadosExtra.innerText =
            `${retornadosUltimos30Dias} nos últimos 30 dias`;
    }

}


/* =========================================================
   ÚLTIMOS 30 DIAS - TOTAL DE ENVIOS
========================================================= */

function contarEnviosUltimos30Dias(grupos) {

    const hoje =
        new Date();

    hoje.setHours(
        0, 0, 0, 0
    );


    const trintaDiasAtras =
        new Date(hoje);

    trintaDiasAtras.setDate(
        hoje.getDate() - 29
    );


    let total = 0;


    grupos.forEach(grupo => {

        const linha =
            grupo[0];

        const dataPostagem =
            parseDataBR(
                linha[5]
            );


        if (
            dataPostagem &&
            dataPostagem >= trintaDiasAtras &&
            dataPostagem <= hoje
        ) {

            total++;

        }

    });


    return total;

}


/* =========================================================
   CARDS DE STATUS
========================================================= */

document
    .querySelectorAll(".card-status")
    .forEach(card => {

        card.addEventListener(
            "click",
            () => {

                const status =
                    card.dataset.status;


                if (
                    status === "TOTAL"
                ) {

                    situacoesSelecionadas =
                        [];


                    document
                        .querySelectorAll(
                            ".card-status"
                        )
                        .forEach(c =>
                            c.classList.remove(
                                "ativo"
                            )
                        );


                    card.classList.add(
                        "ativo"
                    );

                }

                else {

                    situacoesSelecionadas =
                        [status];


                    document
                        .querySelectorAll(
                            ".card-status"
                        )
                        .forEach(c =>
                            c.classList.remove(
                                "ativo"
                            )
                        );


                    card.classList.add(
                        "ativo"
                    );

                }


                filtrar();

                atualizarCardsDashboard();

            }
        );

    });


/* =========================================================
   AGRUPAR
========================================================= */

function agruparPorRastreio(lista) {

    const mapa = {};


    lista.forEach(l => {

        const rastreio =
            l[1] ||
            "SEM_RASTREIO";


        if (!mapa[rastreio]) {

            mapa[rastreio] = [];

        }


        mapa[rastreio].push(l);

    });


    return Object.values(mapa);

}


/* =========================================================
   RENDER
========================================================= */

/* =========================================================
   LOGO SVG SEDEX
========================================================= */

let contadorSvgSedex = 0;

function criarLogoSedex(classe = "icone-envio") {

    contadorSvgSedex++;

    const gradienteId =
        `sedexBlue_${contadorSvgSedex}`;

    return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 420 120"
            class="${classe}"
            role="img"
            aria-label="SEDEX"
        >

            <defs>
                <linearGradient
                    id="${gradienteId}"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#003B7A"
                    />

                    <stop
                        offset="100%"
                        stop-color="#0066B3"
                    />
                </linearGradient>
            </defs>

            <!-- Linha superior -->
            <path
                d="M25 27
                   C85 10 145 10 205 27
                   C265 44 325 44 395 22"
                fill="none"
                stroke="#003B7A"
                stroke-width="8"
                stroke-linecap="round"
            />

            <!-- Linha inferior -->
            <path
                d="M25 93
                   C85 76 145 76 205 93
                   C265 110 325 110 395 88"
                fill="none"
                stroke="#0066B3"
                stroke-width="8"
                stroke-linecap="round"
            />

            <!-- Movimento -->
            <path
                d="M42 60
                   L75 42
                   L62 60
                   L75 78
                   Z"
                fill="#0066B3"
            />

            <!-- Texto SEDEX -->
            <text
                x="88"
                y="78"
                font-family="Arial, Helvetica, sans-serif"
                font-size="58"
                font-weight="900"
                font-style="italic"
                letter-spacing="-3"
                fill="url(#${gradienteId})"
            >
                SEDEX
            </text>

            <!-- Linha inferior da marca -->
            <path
                d="M95 88
                   H350"
                fill="none"
                stroke="#003B7A"
                stroke-width="4"
                stroke-linecap="round"
            />

        </svg>
    `;
}

function renderizar(lista) {

    if (!resultado) return;


    resultado.innerHTML = "";


    let grupos =
        agruparPorRastreio(lista);


    grupos.sort((a, b) => {

        const situacaoA =
            obterDescricaoLinha(a[0]);


        const situacaoB =
            obterDescricaoLinha(b[0]);


        const prioridadeA =
            situacaoA.includes(
                "AGUARDANDO RETIRADA"
            )
                ? 0
                : 1;


        const prioridadeB =
            situacaoB.includes(
                "AGUARDANDO RETIRADA"
            )
                ? 0
                : 1;


        if (
            prioridadeA !==
            prioridadeB
        ) {

            return (
                prioridadeA -
                prioridadeB
            );

        }


        const dataA =
            Math.max(
                ...a.map(
                    i =>
                        parseDataBR(i[5])
                )
            );


        const dataB =
            Math.max(
                ...b.map(
                    i =>
                        parseDataBR(i[5])
                )
            );


        return dataB - dataA;

    });


    grupos.forEach(grupo => {

        const l = grupo[0];


        const notasUnicas =
            [
                ...new Set(
                    grupo.map(
                        i => i[0]
                    )
                )
            ];


        const pedidosUnicos =
            [
                ...new Set(
                    grupo.map(
                        i => i[14]
                    )
                )
            ];


        const rastreio =
            String(l[1] || "Não informado").replace(/[^0-9A-Za-zÀ-ÿ ]/g, "");


        const labelNota =
            notasUnicas.length === 1
                ? "Nota"
                : "Notas";


        const labelPedido =
            pedidosUnicos.length === 1
                ? "Pedido"
                : "Pedidos";


        const tipoEnvio =
            normalizar(
                l[2] || ""
            );


        let iconeEnvio = "";


        if (
            tipoEnvio.includes(
                "SEDEX PAG"
            )
        ) {

            iconeEnvio =
                `<img src="/Imagens/sedexcobrar.png"
                 class="icone-envio"
                 alt="SEDEX PAG. ENTREGA">`;

        }

        else if (
            tipoEnvio.includes(
                "SEDEX"
            )
        ) {

            iconeEnvio =
                `<img src="/Imagens/sedex.png"
                 class="icone-envio"
                 alt="SEDEX">`;

        }

        else if (
            tipoEnvio.includes(
                "PAC"
            )
        ) {

            iconeEnvio =
                `<img src="/Imagens/pac.png"
                 class="icone-envio"
                 alt="PAC">`;

        }


        const codigoCliente =
            escaparHTML(l[18] || "-");


        const nomeCliente =
            escaparHTML(l[19] || l[7] || "-");


        const numeroRepresentante =
            escaparHTML(l[20] || "-");


        const nomeRepresentante =
            escaparHTML(l[21] || "-");


        const card =
            document.createElement(
                "div"
            );


        const situacao =
            obterSituacaoLinha(l);


        const situacaoTexto =
            escaparHTML(obterDescricaoLinha(l));


        const dataStatus =
            obterDataStatusLinha(l);



        let faixaHTML = "";


        if (
            situacao.includes(
                "ENTREGUE"
            ) &&
            dataStatus
        ) {

            faixaHTML = `
                <div class="faixa-status entregue">
                    <span>ENTREGUE</span>
                    <small>${dataStatus}</small>
                </div>
            `;

        }

        else if (
            situacao.includes(
                "RETORN"
            ) ||
            situacao.includes(
                "DEVOL"
            )
        ) {

            faixaHTML = `
                <div class="faixa-status retornou">
                    <span>RETORNOU</span>
                    <small>${dataStatus || ""}</small>
                </div>
            `;

        }

        else if (
            situacao.includes(
                "PENDENTE"
            )
        ) {

            faixaHTML = `
                <div class="faixa-status pendente">
                    <span>PENDENTE</span>
                </div>
            `;

        }


        const temAlertaRetirada =
            situacaoTexto.includes(
                "AGUARDANDO RETIRADA"
            );


        let classeStatus =
            "outro";


        if (
            situacao.includes(
                "ENTREGUE"
            )
        ) {

            classeStatus =
                "entregue";

        }

        else if (
            situacao.includes(
                "PENDENTE"
            )
        ) {

            classeStatus =
                "pendente";

        }

        else if (
            situacao.includes(
                "RETORN"
            ) ||
            situacao.includes(
                "DEVOL"
            )
        ) {

            classeStatus =
                "retornado";

        }


        card.className =
            `card ${classeStatus}`;

        card.dataset.cardKey =
            obterChaveCard(grupo);

        card.onclick = () => {
            marcarCardSelecionado(grupo);
            abrirDetalhes(grupo);
        };


        const codigoVendedorCard =
            escaparHTML(l[22] || "-");


        const nomeVendedorCard =
            escaparHTML(l[23] || "-");


        card.innerHTML = `

            ${faixaHTML}

            ${iconeEnvio}

            ${
                temAlertaRetirada
                    ? `<div class="alerta-retirada">
                         📦⛔
                       </div>`
                    : ""
            }

            <div class="linhacard">

                <div class="linha-info">

                    <strong>
                        ${labelNota}:
                    </strong>

                    <span>
                        ${notasUnicas.map(escaparHTML).join(" / ")}
                    </span>

                </div>


                <div class="linha-info">

                    <strong>
                        ${labelPedido}:
                    </strong>

                    <span>
                        ${pedidosUnicos.map(escaparHTML).join(" / ")}
                    </span>

                </div>


                <br>


                ${
                    window.exibirVendedor
                        ? `
                            <div class="card-vendedor">

                                <strong>
                                    Vendedor:
                                </strong>

                                ${codigoVendedorCard}
                                -
                                ${nomeVendedorCard}

                            </div>
                          `
                        : ""
                }


                <div class="cardcliente">

                    ${
                        window.exibirCliente
                            ? `
                                <strong>
                                    Cliente:
                                </strong>
                                ${nomeCliente}
                                <br>
                              `
                            : ""
                    }

                </div>


                <div class="cardrepresentante">

                    ${
                        window.exibirRepresentante
                            ? `
                                <span class="linha-representante">

                                    <strong>
                                        Representante:
                                    </strong>

                                    ${nomeRepresentante}

                                </span>

                                <br><br>
                              `
                            : ""
                    }

                </div>


                <div class="cardsituacao">

                    <strong>
                        Situação:
                    </strong>

                    <span class="situacao ${
                        temAlertaRetirada
                            ? "aguardando-retirada"
                            : ""
                    }">

                        ${situacaoTexto}

                    </span>

                </div>


                <div class="linha-info">

                    <strong>
                        Itens:
                    </strong>

                    <span>
                        ${grupo.length}
                    </span>

                </div>

            </div>
        `;


        resultado.appendChild(card);

    });

    reaplicarCardSelecionado();

}


/* =========================================================
   CARD SELECIONADO
========================================================= */

function obterChaveCard(grupo) {

    if (!grupo || !grupo.length) {
        return null;
    }

    const primeiro = grupo[0];
    const rastreio = normalizarCodigoRastreio(primeiro[1] || "");

    if (rastreio) {
        return `rastreio:${rastreio}`;
    }

    return `nota:${primeiro[0] || ""}|pedido:${primeiro[14] || ""}`;
}

function marcarCardSelecionado(grupo) {

    cardSelecionadoKey = obterChaveCard(grupo);

    document
        .querySelectorAll("#resultado .card")
        .forEach(card => {
            card.classList.toggle(
                "selecionado",
                card.dataset.cardKey === cardSelecionadoKey
            );
        });
}

function reaplicarCardSelecionado() {

    if (!cardSelecionadoKey) {
        return;
    }

    document
        .querySelectorAll("#resultado .card")
        .forEach(card => {
            card.classList.toggle(
                "selecionado",
                card.dataset.cardKey === cardSelecionadoKey
            );
        });
}


/* =========================================================
   DETALHES
========================================================= */

function abrirDetalhes(grupo) {

    grupo.sort((a, b) => {

        return (
            prioridadeDescricao(a[17]) -
            prioridadeDescricao(b[17])
        );

    });


    const l = grupo[0];


    const notasUnicas =
        [
            ...new Set(
                grupo.map(
                    i => i[0]
                )
            )
        ];


    const pedidosUnicos =
        [
            ...new Set(
                grupo.map(
                    i => i[14]
                )
            )
        ];


    const labelNota =
        notasUnicas.length === 1
            ? "Nota Fiscal"
            : "Notas Fiscais";


    const labelPedido =
        pedidosUnicos.length === 1
            ? "Pedido"
            : "Pedidos";


    const tipoEnvio =
        normalizar(
            l[2] || ""
        );


    let iconeEnvioDetalhes = "";


    if (
        tipoEnvio.includes(
            "SEDEX PAG"
        )
    ) {

        iconeEnvioDetalhes =
            `<img
                src="/Imagens/sedexcobrar.png"
                class="icone-envio-detalhes"
                alt="SEDEX PAG. ENTREGA"
            >`;

    }

    else if (
        tipoEnvio.includes(
            "SEDEX"
        )
    ) {

        iconeEnvioDetalhes =
            `<img
                src="/Imagens/sedex.png"
                class="icone-envio-detalhes"
                alt="SEDEX"
            >`;

    }

    else if (
        tipoEnvio.includes(
            "PAC"
        )
    ) {

        iconeEnvioDetalhes =
            `<img
                src="/Imagens/pac.png"
                class="icone-envio-detalhes"
                alt="PAC"
            >`;

    }


    const uf =
        escaparHTML(l[11] || "-");


    const estado =
        escaparHTML(l[12] || "-");


    const codigoCliente =
        escaparHTML(l[18] || "-");


    const nomeCliente =
        escaparHTML(l[19] || l[7] || "-");


    const numeroRepresentante =
        escaparHTML(l[20] || "-");


    const nomeRepresentante =
        escaparHTML(l[21] || "-");


    const rastreio =
        String(l[1] || "Não informado").replace(/[^0-9A-Za-zÀ-ÿ ]/g, "");


    const temScroll =
        grupo.length > 2;


    conteudoDetalhes.innerHTML = `

        <div class="detalhes-centro">

            ${
                detalhesVeioDeNotificacoes
                    ? `
                        <button
                            type="button"
                            class="btn-voltar-notificacoes"
                            onclick="voltarParaNotificacoes()"
                        >
                            <span aria-hidden="true">←</span>
                            Voltar
                        </button>
                      `
                    : ""
            }

            ${iconeEnvioDetalhes}

            <h3>
                Detalhes
            </h3>


            <div class="linha-dupla">

                <span>

                    <strong>
                        ${labelNota}:
                    </strong>

                    ${notasUnicas.map(escaparHTML).join(" / ")}

                </span>


                <span>

                    <strong>
                        ${labelPedido}:
                    </strong>

                    ${pedidosUnicos.map(escaparHTML).join(" / ")}

                </span>

            </div>


            <div class="linha-rastreio-central">

                <strong>
                    Rastreio:
                </strong>

                <span>
                    ${rastreio}
                </span>

                ${
                    rastreio !==
                    "Não informado"
                        ? `
                            <button
                                onclick="rastrearCorreios('${rastreio}')"
                            >
                                📦 Rastrear
                            </button>
                          `
                        : ""
                }

            </div>


            ${
                window.exibirCliente
                    ? `
                        <p>

                            <strong>
                                Cliente:
                            </strong>

                            ${codigoCliente}
                            -
                            ${nomeCliente}

                        </p>
                      `
                    : ""
            }


            ${
                window.exibirRepresentante
                    ? `
                        <p class="linha-representante">

                            <strong>
                                Representante:
                            </strong>

                            ${numeroRepresentante}
                            -
                            ${nomeRepresentante}

                        </p>
                      `
                    : ""
            }


            ${
                window.exibirCliente
                    ? `
                        <p>

                            <strong>
                                Localização:
                            </strong>

                            ${uf}
                            /
                            ${estado}

                        </p>
                      `
                    : ""
            }


            <p>

                <strong>
                    Situação:
                </strong>

                <span class="situacao ${
                    linhaAguardandoRetirada(l)
                        ? "aguardando-retirada"
                        : ""
                }">

                    ${escaparHTML(obterDescricaoLinha(l))}

                </span>

            </p>


            <div class="linha-dupla">

                <span>
                    <strong>
                        Postagem:
                    </strong>

                    ${l[5] || "-"}
                </span>


                <span>
                    <strong>
                        Prazo:
                    </strong>

                    ${l[13] || "-"}
                </span>

            </div>


            <hr>


            <div class="amenv">

                <strong>
                    Amostras Enviadas
                </strong>

            </div>


            <ul class="lista-itens ${
                temScroll
                    ? "lista-scroll"
                    : ""
            }">

                ${
                    [...grupo]
                        .sort((a, b) => {

                            const p =
                                prioridadeDescricao(
                                    a[17]
                                ) -
                                prioridadeDescricao(
                                    b[17]
                                );


                            if (p !== 0) {
                                return p;
                            }


                            const da =
                                normalizarTextoOrdenacao(
                                    a[15]
                                );


                            const db =
                                normalizarTextoOrdenacao(
                                    b[15]
                                );


                            return da.localeCompare(
                                db,
                                "pt-BR"
                            );

                        })
                        .map(
                            i =>
                                `<li>
                                    ${escaparHTML(formatarAmostraDetalhe(i))}
                                </li>`
                        )
                        .join("")
                }

            </ul>

        </div>

    `;


    const painel =
        overlay.querySelector(
            ".painel-detalhes"
        );


    if (painel) {

        painel.style.animation =
            "none";


        painel.offsetHeight;


        painel.style.animation =
            "";

    }


    // Sempre abre no topo, com o botão fechar no cabeçalho
    conteudoDetalhes.scrollTop = 0;
    posicionarFecharDetalhes();


    overlay.classList.add(
        "show"
    );


    overlay.classList.remove(
        "oculto"
    );


    travarScroll();

}


/* =========================================================
   PRIORIDADE
========================================================= */

function prioridadeDescricao(texto) {

    const t =
        normalizar(
            texto || ""
        );


    if (
        t.includes("PILOTAGEM")
    ) {
        return 1;
    }


    if (
        t.includes("BANDEIRA")
    ) {
        return 2;
    }


    if (
        t.includes("CARTELA")
    ) {
        return 3;
    }


    return 99;

}


function voltarParaNotificacoes() {

    detalhesVeioDeNotificacoes = false;

    if (overlay) {
        overlay.classList.remove("show");
        overlay.classList.add("oculto");
    }

    if (overlayNotificacoes) {
        overlayNotificacoes.classList.remove("oculto");
        overlayNotificacoes.classList.add("show");

        const painelNotif =
            overlayNotificacoes.querySelector(".painel-detalhes");

        if (painelNotif) {
            painelNotif.classList.add("modo-legenda");
        }
    }

    travarScroll();

}


/* =========================================================
   FECHAR DETALHES
========================================================= */

/* O botão fechar fica no cabeçalho e sobe junto ao rolar */
function posicionarFecharDetalhes() {
    const botao = overlay?.querySelector(".painel-detalhes .fechar");
    if (!botao || !conteudoDetalhes) return;
    botao.style.transform = `translateY(${-conteudoDetalhes.scrollTop}px)`;
}

if (conteudoDetalhes) {
    conteudoDetalhes.addEventListener("scroll", posicionarFecharDetalhes, { passive: true });
}

function fecharDetalhes() {

    detalhesVeioDeNotificacoes = false;

    const painel =
        overlay.querySelector(
            ".painel-detalhes"
        );


    if (!painel) {
        return;
    }


    painel.classList.add(
        "saindo"
    );


    setTimeout(() => {

        overlay.classList.remove(
            "show"
        );


        overlay.classList.add(
            "oculto"
        );


        painel.classList.remove(
            "saindo"
        );


        liberarScroll();

    }, 300);

}


if (overlay) {

    overlay.addEventListener(
        "click",
        function (e) {

            if (
                e.target === overlay
            ) {

                fecharDetalhes();

            }

        }
    );

}

if (overlayRastreioCorreios) {
    overlayRastreioCorreios.addEventListener("click", function (e) {
        if (e.target === overlayRastreioCorreios) {
            fecharModalRastreioCorreios();
        }
    });
}


document.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "Escape" &&
            overlayRastreioCorreios &&
            overlayRastreioCorreios.classList.contains("show")
        ) {
            fecharModalRastreioCorreios();
            return;
        }

        if (
            e.key === "Escape" &&
            overlay &&
            overlay.classList.contains(
                "show"
            )
        ) {

            fecharDetalhes();

        }

    }
);


/* =========================================================
   RASTREIO CORREIOS
========================================================= */

function formatarDataEventoCorreios(data) {
    if (!data) return "";

    try {
        const valor = new Date(data);
        if (Number.isNaN(valor.getTime())) return data;

        return valor.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    } catch {
        return data;
    }
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function montarTimelineCorreios(objeto) {
    const eventos = Array.isArray(objeto?.eventos)
        ? objeto.eventos
        : [];

    if (!eventos.length) {
        return `
            <div class="rastreio-sem-eventos">
                Nenhum evento de movimentação foi retornado pelos Correios.
            </div>
        `;
    }

    return `
        <div class="timeline-correios">
            ${eventos.map((evento, indice) => {
                const unidade = evento?.unidade || {};
const endereco = unidade?.endereco || {};

const nomeAgencia =
    unidade?.nome ||
    unidade?.descricao ||
    "";

const logradouro =
    endereco?.logradouro ||
    endereco?.rua ||
    endereco?.nomeLogradouro ||
    "";

const numero = endereco?.numero || "";
const complemento = endereco?.complemento || "";
const bairro = endereco?.bairro || "";
const cep = endereco?.cep || "";
const cidade = endereco?.cidade || "";
const uf = endereco?.uf || "";

const enderecoCompleto = [
    logradouro,
    numero,
    complemento,
    bairro,
    cep,
    [cidade, uf].filter(Boolean).join(" / ")
].filter(Boolean).join(", ");

const local = [
    nomeAgencia,
    enderecoCompleto
].filter(Boolean).join(" — ");

                const descricao =
                    evento?.descricao ||
                    evento?.tipo ||
                    "Atualização do objeto";

                const data =
                    evento?.dtHrCriado ||
                    evento?.dtHrFim ||
                    "";

                return `
                    <div class="timeline-evento ${indice === 0 ? "atual" : ""}">
                        <div class="timeline-ponto"></div>
                        ${indice < eventos.length - 1 ? '<div class="timeline-linha"></div>' : ""}
                        <div class="timeline-conteudo">
                            <div class="timeline-data">
                                ${escaparHTML(formatarDataEventoCorreios(data))}
                            </div>
                            <div class="timeline-descricao">
                                ${escaparHTML(descricao)}
                            </div>
                            ${local ? `<div class="timeline-local">📍 ${escaparHTML(local)}</div>` : ""}
                            ${evento?.codigoEvento ? `<div class="timeline-codigo">Código do evento: ${escaparHTML(evento.codigoEvento)}</div>` : ""}
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function abrirModalRastreioCorreios() {
    if (!overlayRastreioCorreios) return;

    overlayRastreioCorreios.classList.remove("oculto");
    overlayRastreioCorreios.classList.add("show");
    document.body.classList.add("modal-rastreio-aberto");
}

function fecharModalRastreioCorreios() {
    if (!overlayRastreioCorreios) return;

    overlayRastreioCorreios.classList.remove("show");
    overlayRastreioCorreios.classList.add("oculto");
    document.body.classList.remove("modal-rastreio-aberto");
}

async function rastrearCorreios(codigo) {
    const codigoNormalizado = normalizarCodigoRastreio(codigo);

    if (!codigoNormalizado || codigoNormalizado === "NÃO INFORMADO") {
        return;
    }

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(codigoNormalizado).catch(() => {});
    }

    abrirModalRastreioCorreios();

    if (!conteudoRastreioCorreios) return;

    conteudoRastreioCorreios.innerHTML = `
        <div class="rastreio-modal-cabecalho">
            <div>
                <span class="rastreio-modal-kicker">RASTREAMENTO CORREIOS</span>
                <h2>Histórico do objeto</h2>
                <span class="rastreio-modal-codigo">${escaparHTML(codigoNormalizado)}</span>
            </div>
            <button type="button" class="rastreio-modal-fechar" onclick="fecharModalRastreioCorreios()" aria-label="Fechar">✕</button>
        </div>
        <div class="rastreio-carregando">
            <span class="rastreio-spinner"></span>
            Consultando histórico completo nos Correios...
        </div>
    `;

    try {
        const controlador = new AbortController();
        const timeout = setTimeout(() => controlador.abort(), 20000);

        let resposta;
        try {
            resposta = await fetch(
                `${API_CORREIOS}/${encodeURIComponent(codigoNormalizado)}?t=${Date.now()}`,
                { cache: "no-store", signal: controlador.signal }
            );
        } finally {
            clearTimeout(timeout);
        }

        if (!resposta.ok) {
            throw new Error(`Correios HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();

        if (!dados?.sucesso || !dados?.dados) {
            throw new Error(
                dados?.mensagem || "Não foi possível obter o histórico do objeto."
            );
        }

        const objeto = dados.dados?.objetos?.[0];
        const eventos = Array.isArray(objeto?.eventos) ? objeto.eventos : [];
        const ultimo = eventos[0] || {};

        const resumo = {
            status: ultimo?.descricao || "ATUALIZAÇÃO",
            descricao: ultimo?.descricao || "Atualização do objeto",
            codigoEvento: ultimo?.codigoEvento || ultimo?.codigo || "",
            data: ultimo?.dtHrCriado || ultimo?.dtHrFim || "",
            local: (() => {
    const unidade = ultimo?.unidade || {};
    const endereco = unidade?.endereco || {};

    const nomeAgencia =
        unidade?.nome ||
        unidade?.descricao ||
        "";

    const enderecoCompleto = [
        endereco?.logradouro ||
            endereco?.rua ||
            endereco?.nomeLogradouro ||
            "",
        endereco?.numero || "",
        endereco?.complemento || "",
        endereco?.bairro || "",
        endereco?.cep || "",
        [endereco?.cidade, endereco?.uf]
            .filter(Boolean)
            .join(" / ")
    ].filter(Boolean).join(", ");

    return [nomeAgencia, enderecoCompleto]
        .filter(Boolean)
        .join(" — ");
})(),
            previsao: objeto?.dtPrevista || "",
            situacao: statusParaSituacao({
                codigoEvento: ultimo?.codigoEvento || ultimo?.codigo || "",
                status: ultimo?.descricao || "",
                descricao: ultimo?.descricao || ""
            })
        };

        const statusAtualizado = {
            ...resumo,
            aguardandoRetirada: statusAguardandoRetirada(resumo),
            atualizadoEm: new Date().toISOString()
        };

        statusCorreios.set(codigoNormalizado, statusAtualizado);

        const cacheStatus = lerCacheJSON(CACHE_STATUS_CORREIOS_KEY, {});
        cacheStatus[codigoNormalizado] = statusAtualizado;
        salvarCacheJSON(CACHE_STATUS_CORREIOS_KEY, cacheStatus);

        if (resumo.situacao === "ENTREGUE") {
            marcarComoEntregue(codigoNormalizado);
        }

        conteudoRastreioCorreios.innerHTML = `
            <div class="rastreio-modal-cabecalho">
                <div>
                    <span class="rastreio-modal-kicker">RASTREAMENTO CORREIOS</span>
                    <h2>Histórico do objeto</h2>
                    <span class="rastreio-modal-codigo">${escaparHTML(codigoNormalizado)}</span>
                </div>
                <button type="button" class="rastreio-modal-fechar" onclick="fecharModalRastreioCorreios()" aria-label="Fechar">✕</button>
            </div>

            <div class="rastreio-resumo-api ${resumo.situacao === "RETORN" ? "rastreio-resumo-retorno" : resumo.situacao === "ENTREGUE" ? "rastreio-resumo-entregue" : ""}">
                <div class="rastreio-resumo-status">
                    <span class="rastreio-resumo-label">Situação atual</span>
                    <strong>${escaparHTML(resumo.status)}</strong>
                </div>
                ${resumo.local ? `<div><strong>Local:</strong> ${escaparHTML(resumo.local)}</div>` : ""}
                ${resumo.data ? `<div><strong>Última atualização:</strong> ${escaparHTML(formatarDataEventoCorreios(resumo.data))}</div>` : ""}
                ${resumo.previsao ? `<div><strong>Previsão:</strong> ${escaparHTML(formatarDataEventoCorreios(resumo.previsao))}</div>` : ""}
            </div>

            ${montarTimelineCorreios(objeto)}
        `;

        // Atualiza o card imediatamente com o mesmo status consultado no modal.
        filtrar();
    } catch (erro) {
        console.error("❌ Erro ao consultar histórico dos Correios:", erro);

        const mensagem = erro?.name === "AbortError"
            ? "A consulta aos Correios demorou mais que o esperado."
            : (erro?.message || "Erro desconhecido");

        conteudoRastreioCorreios.innerHTML = `
            <div class="rastreio-modal-cabecalho">
                <div>
                    <span class="rastreio-modal-kicker">RASTREAMENTO CORREIOS</span>
                    <h2>Histórico do objeto</h2>
                    <span class="rastreio-modal-codigo">${escaparHTML(codigoNormalizado)}</span>
                </div>
                <button type="button" class="rastreio-modal-fechar" onclick="fecharModalRastreioCorreios()" aria-label="Fechar">✕</button>
            </div>
            <div class="rastreio-erro">
                <strong>Não foi possível consultar o rastreamento.</strong>
                <span>${escaparHTML(mensagem)}</span>
                <button type="button" onclick="rastrearCorreios('${codigoNormalizado}')">Tentar novamente</button>
            </div>
        `;
    }
}

/* =========================================================
   ATUALIZAÇÃO AUTOMÁTICA DOS RASTREIOS ATIVOS
   Executa a cada 15 minutos, respeitando o cache local de entregues.
========================================================= */

setInterval(async () => {
    if (document.hidden) return;
    if (atualizacaoCorreiosEmAndamento) return;

    try {
        await carregarStatusCorreios();
        filtrar();
        atualizarNotificacoes();
    } catch (erro) {
        console.warn("⚠️ Atualização automática dos Correios falhou:", erro);
    }
}, 15 * 60 * 1000);


/* =========================================================
   CONTROLE DO MENU
========================================================= */

async function controlarMenu(usuario) {

    const botoes = document.querySelectorAll(".menu-btn");
    const usuarioNormalizado = String(usuario || "").trim().toLowerCase();

    for (const btn of botoes) {

        const tela = String(btn.dataset.tela || "").trim().toLowerCase();
        const permitido = temPermissaoTela(usuarioNormalizado, tela);

        if (!permitido) {
            btn.classList.add("desativado");
            btn.setAttribute("aria-hidden", "true");
            btn.setAttribute("tabindex", "-1");
            continue;
        }

        btn.classList.remove("desativado");
        btn.setAttribute("aria-hidden", "false");
        btn.removeAttribute("tabindex");
    }
}


/* =========================================================
   PERFIL DA SIDEBAR
   Nome da pessoa + código de vendedora
========================================================= */

function atualizarPerfilSidebar() {

    const nomeEl =
        document.getElementById("sidebarVideoUserName");

    const codigoEl =
        document.getElementById("sidebarVideoUserCode");

    const avatarEl =
        document.getElementById("sidebarVideoAvatar");

    if (!nomeEl || !codigoEl) return;

    const nome =
        String(
            nomeCompleto ||
            usuarioLogado ||
            "Usuário"
        ).trim();

    const codigo =
        String(
            codigoVendedorLogado ||
            localStorage.getItem("codigoVendedor") ||
            sessionStorage.getItem("codigoVendedor") ||
            ""
        ).trim().toUpperCase();

    nomeEl.textContent = nome;
    codigoEl.textContent = codigo
        ? `Vendedor: ${codigo}`
        : "Vendedora";

    if (avatarEl) {
        avatarEl.textContent =
            nome.charAt(0).toUpperCase() || "U";
    }
}


/* =========================================================
   ANALYTICS
========================================================= */

function controlarAnalytics(usuario) {

    const btn =
        document.getElementById(
            "btnAnalytics"
        );


    if (!btn) return;


    const temAcesso =
        temPermissao(
            usuario,
            permissoes.analytics
        );


    btn.classList.toggle(
        "oculto",
        !temAcesso
    );

}


/* =========================================================
   SIDEBAR
========================================================= */

function definirEstadoMenuSidebar(aberto) {

    const sidebar = document.querySelector(".sidebar");
    const overlaySidebar = document.querySelector(".overlay-sidebar");
    const trigger = document.getElementById("btnMenuSidebarTopbar");
    const panel = document.querySelector(".sidebar-video-panel");

    if (!sidebar) return;

    sidebar.classList.toggle("ativa", aberto);

    // Impede rolagem da página enquanto o menu lateral está aberto.
    document.documentElement.classList.toggle("menu-sidebar-aberto", aberto);
    document.body.classList.toggle("menu-sidebar-aberto", aberto);

    if (overlaySidebar) {
        overlaySidebar.classList.toggle("ativo", aberto);
    }

    if (trigger) {
        trigger.setAttribute("aria-expanded", aberto ? "true" : "false");
        trigger.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
        trigger.setAttribute("title", aberto ? "Fechar menu" : "Abrir menu");
    }

    if (panel) {
        panel.setAttribute("aria-hidden", aberto ? "false" : "true");
    }
}


function toggleMenu() {

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    definirEstadoMenuSidebar(!sidebar.classList.contains("ativa"));
}


document.addEventListener("click", function (e) {

    const sidebar = document.querySelector(".sidebar");
    const trigger = document.getElementById("btnMenuSidebarTopbar");
    const overlaySidebar = document.querySelector(".overlay-sidebar");

    if (!sidebar) return;

    if (trigger && trigger.contains(e.target)) {
        return;
    }

    if (sidebar.contains(e.target)) {
        return;
    }

    if (overlaySidebar && overlaySidebar.contains(e.target)) {
        definirEstadoMenuSidebar(false);
        return;
    }

    if (sidebar.classList.contains("ativa")) {
        definirEstadoMenuSidebar(false);
    }
});


/* =========================================================
   LOGOUT
========================================================= */

function executarLogout() {

    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch (erro) {
        console.warn("Não foi possível limpar o armazenamento:", erro);
    }

    window.location.replace("index.html");
}


function configurarBotoesSidebar() {

    const btnLogout = document.getElementById("btnLogout");
    const btnLogoutRail = document.getElementById("btnLogoutRail");

    if (btnLogout) {
        btnLogout.onclick = executarLogout;
    }

    if (btnLogoutRail) {
        btnLogoutRail.onclick = executarLogout;
    }
}


/* =========================================================
   NAVEGAÇÃO DOS ATALHOS DA BARRA ESTREITA
========================================================= */

function configurarNavegacaoSidebar() {

    const botoes = document.querySelectorAll(".menu-btn");

    botoes.forEach(btn => {

        if (btn.dataset.sidebarNavegacaoConfigurada === "true") {
            return;
        }

        btn.addEventListener("click", function (event) {

            if (btn.classList.contains("desativado")) {
                event.preventDefault();
                return;
            }

            const destino = btn.dataset.link;
            if (!destino) return;

            definirEstadoMenuSidebar(false);
            window.location.href = destino;
        });

        btn.dataset.sidebarNavegacaoConfigurada = "true";
    });
}


configurarBotoesSidebar();
configurarNavegacaoSidebar();


/* =========================================================
   MARCAÇÃO DA PÁGINA ATUAL
========================================================= */

const links =
    document.querySelectorAll(
        ".menu-btn"
    );


links.forEach(link => {

    if (
        link.href ===
        window.location.href
    ) {

        link.classList.add(
            "ativo"
        );

    }

});


const botoes =
    document.querySelectorAll(
        ".menu-btn"
    );


const paginaAtual =
    window.location.pathname;


botoes.forEach(btn => {

    if (

        (
            paginaAtual.includes(
                "rastreio_amostra.html"
            ) &&
            btn.textContent.includes(
                "Rastreio Amostras"
            )
        )

        ||

        (
            paginaAtual.includes(
                "analytics.html"
            ) &&
            btn.textContent.includes(
                "Análises de Amostras"
            )
        )

        ||

        (
            paginaAtual.includes(
                "retornos.html"
            ) &&
            btn.textContent.includes(
                "Retorno de Amostras"
            )
        )

        ||

        (
            paginaAtual.includes(
                "dash.html"
            ) &&
            btn.textContent.includes(
                "Dashboard"
            )
        )

    ) {

        btn.classList.add(
            "ativo"
        );

    }

});


/* =========================================================
   LOGOUT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const btnLogout =
            document.getElementById(
                "btnLogout"
            );


        if (!btnLogout) {
            return;
        }


        btnLogout.addEventListener(
            "click",
            () => {

                localStorage.clear();

                sessionStorage.clear();

                window.location.href =
                    "index.html";

            }
        );

    }
);

/* =========================================================
   FEEDBACK DAS VENDEDORAS
   Envia nota (1-5) + comentário para uma planilha Google
   via Google Apps Script. Cole a URL do Apps Script abaixo.
========================================================= */

(function () {

    const FEEDBACK_URL = "COLE_AQUI_A_URL_DO_APPS_SCRIPT";
    const CHAVE_PENDENTES = "feedbacksPendentes";

    const textosNota = {
        1: "😞 Ruim",
        2: "😕 Poderia ser melhor",
        3: "😐 Regular",
        4: "🙂 Bom",
        5: "🤩 Excelente"
    };

    const el = (id) => document.getElementById(id);

    const overlay = el("overlayFeedback");
    const btnAbrir = el("btnFeedback");
    const btnFechar = el("fbFechar");
    const btnEnviar = el("fbEnviar");
    const estrelas = Array.from(document.querySelectorAll(".fb-estrela"));
    const notaTexto = el("fbNotaTexto");
    const comentario = el("fbComentario");
    const contador = el("fbContador");
    const erro = el("fbErro");
    const formulario = el("fbFormulario");
    const sucesso = el("fbSucesso");

    if (!overlay || !btnAbrir) return;

    let notaAtual = 0;

    function pintarEstrelas(ate) {
        estrelas.forEach((e) => {
            const n = Number(e.dataset.nota);
            e.classList.toggle("ativa", n <= ate);
            e.setAttribute("aria-checked", String(n === notaAtual));
        });
    }

    function definirNota(n) {
        notaAtual = n;
        pintarEstrelas(n);
        notaTexto.textContent = textosNota[n] || "Toque nas estrelas para avaliar";
        btnEnviar.disabled = n === 0;
    }

    function abrir() {
        definirNota(0);
        comentario.value = "";
        contador.textContent = "0";
        erro.classList.add("oculto");
        formulario.classList.remove("oculto");
        sucesso.classList.add("oculto");
        btnEnviar.textContent = "Enviar feedback";
        overlay.classList.remove("oculto");
        overlay.setAttribute("aria-hidden", "false");
    }

    function fechar() {
        overlay.classList.add("oculto");
        overlay.setAttribute("aria-hidden", "true");
    }

    function lerStorage(chave) {
        return sessionStorage.getItem(chave) || localStorage.getItem(chave) || "";
    }

    function montarPayload() {
        return {
            dataHora: new Date().toLocaleString("pt-BR"),
            nome: String(
                (typeof nomeCompleto !== "undefined" && nomeCompleto) ||
                (typeof nomeVendedorLogado !== "undefined" && nomeVendedorLogado) ||
                lerStorage("nomeCompleto")
            ).trim(),
            usuario: String(
                (typeof usuarioOriginal !== "undefined" && usuarioOriginal) ||
                lerStorage("usuarioLogado")
            ).trim(),
            codigo: String(
                (typeof codigoVendedorLogado !== "undefined" && codigoVendedorLogado) ||
                lerStorage("codigoVendedor")
            ).trim(),
            nota: notaAtual,
            comentario: comentario.value.trim(),
            pagina: location.pathname.split("/").pop() || "rastreio_amostra.html"
        };
    }

    async function postar(payload) {
        // text/plain evita o "preflight" de CORS no Apps Script
        await fetch(FEEDBACK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
    }

    function lerPendentes() {
        try { return JSON.parse(localStorage.getItem(CHAVE_PENDENTES) || "[]"); }
        catch (e) { return []; }
    }

    function guardarPendente(payload) {
        const lista = lerPendentes();
        lista.push(payload);
        localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(lista));
    }

    async function reenviarPendentes() {
        if (FEEDBACK_URL.startsWith("COLE_AQUI")) return;
        const lista = lerPendentes();
        if (!lista.length) return;
        const restantes = [];
        for (const p of lista) {
            try { await postar(p); } catch (e) { restantes.push(p); }
        }
        localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(restantes));
    }

    async function enviar() {
        if (!notaAtual) return;

        const payload = montarPayload();
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Enviando...";
        erro.classList.add("oculto");

        try {
            if (FEEDBACK_URL.startsWith("COLE_AQUI")) {
                throw new Error("URL do Apps Script não configurada");
            }
            await postar(payload);
        } catch (e) {
            console.warn("Feedback não enviado agora, ficou pendente:", e);
            guardarPendente(payload);
        }

        formulario.classList.add("oculto");
        sucesso.classList.remove("oculto");
        setTimeout(fechar, 1800);
    }

    // eventos
    btnAbrir.addEventListener("click", abrir);
    btnFechar.addEventListener("click", fechar);
    btnEnviar.addEventListener("click", enviar);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fechar();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.classList.contains("oculto")) fechar();
    });

    estrelas.forEach((e) => {
        const n = Number(e.dataset.nota);
        e.addEventListener("click", () => definirNota(n));
        e.addEventListener("mouseenter", () => pintarEstrelas(n));
        e.addEventListener("mouseleave", () => pintarEstrelas(notaAtual));
    });

    comentario.addEventListener("input", () => {
        contador.textContent = String(comentario.value.length);
    });

    reenviarPendentes();

})();


/* =========================================================
   SIDEBAR FECHADA — rótulos dos ícones
   Troca o "title" nativo por um rótulo estilizado (CSS).
========================================================= */

(function () {
    document.querySelectorAll(".sidebar-video-rail-btn[title]").forEach((btn) => {
        const texto = btn.getAttribute("title");
        btn.setAttribute("data-tooltip", texto);
        if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", texto);
        btn.removeAttribute("title");
    });
})();

/* =========================================================
   CONSULTA DE FRETE CORREIOS
========================================================= */

(function () {
    const API_FRETE =
        "https://rastreio-amostras-backend-production.up.railway.app/cotacao-frete";

    const botao = document.getElementById("btnConsultaFrete");
    const overlay = document.getElementById("overlayConsultaFrete");
    const conteudo = document.getElementById("conteudoConsultaFrete");

    if (!botao || !overlay || !conteudo) return;

    function abrirModal() {
        overlay.classList.remove("oculto");
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-rastreio-aberto");
    }

    function fecharModal() {
        overlay.classList.remove("show");
        overlay.classList.add("oculto");
        overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-rastreio-aberto");
    }

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatarPreco(valor) {
        if (valor === undefined || valor === null || valor === "") {
            return "Não informado";
        }

        const numero = Number(
            String(valor).replace(/\./g, "").replace(",", ".")
        );

        if (!Number.isFinite(numero)) {
            return String(valor);
        }

        return numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function montarFormulario() {
        conteudo.innerHTML = `
            <div class="rastreio-modal-cabecalho">
                <div>
                    <span class="rastreio-modal-kicker">
                        CORREIOS
                    </span>
                    <h2 id="tituloModalFrete">
                        Consulta de frete
                    </h2>
                    <span class="rastreio-modal-codigo">
                        Calcule o preço e o prazo de entrega
                    </span>
                </div>

                <button
                    type="button"
                    class="rastreio-modal-fechar"
                    id="fecharConsultaFrete"
                    aria-label="Fechar"
                >✕</button>
            </div>

            <div class="frete-corpo-layout">
                <section class="frete-coluna-formulario" aria-label="Dados para cotação">
            <form id="formConsultaFrete" class="frete-formulario">
                <label>
                    CEP de origem
                    <input
                        name="cepOrigem"
                        inputmode="numeric"
                        maxlength="9"
                        placeholder="00000-000"
                        required
                    >
                </label>

                <label>
                    CEP de destino
                    <input
                        name="cepDestino"
                        inputmode="numeric"
                        maxlength="9"
                        placeholder="00000-000"
                        required
                    >
                </label>

                <div class="frete-campos-duplos frete-itens-envio">
                    <label>
                        Tipo de material
                        <select id="tipoMaterialFrete" required>
                            <option value="pilotagem">Pilotagem</option>
                            <option value="bandeira">Bandeira</option>
                            <option value="cartela">Cartela de cores</option>
                            <option value="brinde">Brinde</option>
                        </select>
                    </label>

                    <label>
                        Quantidade
                        <input id="quantidadeMaterialFrete" type="number" min="1" step="1" value="1" required>
                    </label>
                </div>

                <div class="frete-resumo-calculo" id="resumoCalculoFrete" aria-live="polite">
                    <div><span>Peso total</span><strong id="pesoCalculadoFrete">0,50 kg</strong></div>
                    <div><span>Dimensões calculadas</span><strong id="dimensoesCalculadasFrete">7 × 15 × 25 cm</strong></div>
                    <small>Peso e altura ajustados pela quantidade. Largura e comprimento permanecem fixos.</small>
                </div>

                <input name="pesoGramas" id="pesoGramasFrete" type="hidden" value="500">
                <input name="comprimento" id="comprimentoFrete" type="hidden" value="25">
                <input name="largura" id="larguraFrete" type="hidden" value="15">
                <input name="altura" id="alturaFrete" type="hidden" value="7">

                <div id="freteErro" class="rastreio-erro" hidden></div>

                <button
                    id="btnCalcularFrete"
                    class="frete-calcular"
                    type="submit"
                >
                    Consultar PAC e SEDEX
                </button>
            </form>
                </section>
                <section class="frete-coluna-resultados" aria-label="Resultados da cotação">
                    <div class="frete-resultados-titulo">
                        <span class="rastreio-modal-kicker">COMPARATIVO</span>
                        <h3>Preços e prazos</h3>
                        <p>Os valores de PAC e SEDEX aparecerão aqui.</p>
                    </div>
                    <div id="resultadoConsultaFrete" class="frete-resultados-container" aria-live="polite"></div>
                </section>
            </div>

        `;

        document.getElementById("fecharConsultaFrete")
            .addEventListener("click", fecharModal);

        document.getElementById("formConsultaFrete")
            .addEventListener("submit", consultarFrete);

        const tipoMaterial = document.getElementById("tipoMaterialFrete");
        const quantidadeMaterial = document.getElementById("quantidadeMaterialFrete");
        const regrasMateriais = {
            pilotagem: { pesoGramas: 500, altura: 7, largura: 15, comprimento: 25, aumentoAltura: 7 },
            bandeira: { pesoGramas: 80, altura: 5, largura: 10, comprimento: 26, aumentoAltura: 2 },
            cartela: { pesoGramas: 120, altura: 5, largura: 10, comprimento: 25, aumentoAltura: 2 },
            brinde: { pesoGramas: 200, altura: 5, largura: 10, comprimento: 15, aumentoAltura: 2 }
        };

        function atualizarCalculoFrete() {
            const regra = regrasMateriais[tipoMaterial.value] || regrasMateriais.pilotagem;
            const quantidade = Math.max(1, Math.floor(Number(quantidadeMaterial.value) || 1));
            const pesoTotalGramas = regra.pesoGramas * quantidade;
            const alturaTotal = regra.altura + (quantidade - 1) * regra.aumentoAltura;

            document.getElementById("pesoGramasFrete").value = pesoTotalGramas;
            document.getElementById("comprimentoFrete").value = regra.comprimento;
            document.getElementById("larguraFrete").value = regra.largura;
            document.getElementById("alturaFrete").value = alturaTotal;
            document.getElementById("pesoCalculadoFrete").textContent =
                (pesoTotalGramas / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg";
            document.getElementById("dimensoesCalculadasFrete").textContent =
                `${alturaTotal} × ${regra.largura} × ${regra.comprimento} cm`;
        }

        tipoMaterial.addEventListener("change", atualizarCalculoFrete);
        quantidadeMaterial.addEventListener("input", atualizarCalculoFrete);
        atualizarCalculoFrete();
    }

    function montarResultado(nome, item) {
        if (!item || item.erro) {
            return `
                <article class="frete-resultado-card">
                    <h3>${escapar(nome)}</h3>
                    <p>Não foi possível consultar esta modalidade.</p>
                </article>
            `;
        }

        const preco = item.preco || {};
        const prazo = item.prazo || {};

        return `
            <article class="frete-resultado-card frete-resultado-${String(nome).toLowerCase()}">
                <h3>${escapar(nome)}</h3>

                <div class="frete-preco">
                    ${escapar(formatarPreco(preco.pcFinal))}
                </div>

                <div class="frete-detalhe">
                    <span>Prazo estimado</span>
                    <strong>
                        ${
                            Number.isFinite(Number(prazo.prazoEntrega))
                                ? `${escapar(prazo.prazoEntrega)} dia(s)`
                                : "Não informado"
                        }
                    </strong>
                </div>

                ${
                    prazo.dataMaxima
                        ? `<div class="frete-data">Data máxima: ${escapar(
                            new Date(prazo.dataMaxima).toLocaleDateString("pt-BR")
                        )}</div>`
                        : ""
                }

                <div class="frete-observacao">
                    Prazo e preço sujeitos às condições da postagem.
                </div>
            </article>
        `;
    }

    async function consultarFrete(evento) {
        evento.preventDefault();

        const formulario = document.getElementById("formConsultaFrete");
        const botaoCalcular = document.getElementById("btnCalcularFrete");
        const erro = document.getElementById("freteErro");
        const resultado = document.getElementById("resultadoConsultaFrete");

        const dadosFormulario = new FormData(formulario);
        const dados = Object.fromEntries(dadosFormulario.entries());

        dados.cepOrigem = dados.cepOrigem.replace(/\D/g, "");
        dados.cepDestino = dados.cepDestino.replace(/\D/g, "");

        dados.pesoGramas = Number(dados.pesoGramas);
        dados.comprimento = Number(dados.comprimento);
        dados.largura = Number(dados.largura);
        dados.altura = Number(dados.altura);

        erro.hidden = true;
        resultado.innerHTML = "";

        botaoCalcular.disabled = true;
        botaoCalcular.textContent = "Consultando Correios...";

        try {
            const resposta = await fetch(API_FRETE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(dados)
            });

            const retorno = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    retorno.detail || "Falha ao consultar o frete."
                );
            }

            const resultados = retorno.resultados || {};

            resultado.innerHTML = `
                <div class="frete-resultados">
                    ${montarResultado("PAC", resultados.PAC)}
                    ${montarResultado("SEDEX", resultados.SEDEX)}
                </div>
            `;

            // Mantém os resultados na coluna direita do modal, sem exigir rolagem.
            const painelFrete = overlay.querySelector(".painel-consulta-frete");
            if (painelFrete) painelFrete.scrollTop = 0;
        } catch (falha) {
            erro.textContent =
                falha.message || "Não foi possível consultar os Correios.";
            erro.hidden = false;
        } finally {
            botaoCalcular.disabled = false;
            botaoCalcular.textContent = "Consultar PAC e SEDEX";
        }
    }

    function abrirConsultaFrete(evento) {
        if (evento) evento.preventDefault();
        montarFormulario();
        abrirModal();
    }

    botao.addEventListener("click", abrirConsultaFrete);

    const botaoRailFrete = document.getElementById("btnConsultaFreteRail");
    if (botaoRailFrete) {
        botaoRailFrete.addEventListener("click", abrirConsultaFrete);
    }

    overlay.addEventListener("click", (evento) => {
        if (evento.target === overlay) fecharModal();
    });

    document.addEventListener("keydown", (evento) => {
        if (
            evento.key === "Escape" &&
            overlay.classList.contains("show")
        ) {
            fecharModal();
        }
    });
})();