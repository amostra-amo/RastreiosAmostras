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


// ============================================================
// PRESENÇA DO USUÁRIO — ONLINE / OFFLINE
// ============================================================
const PRESENCA_API = "https://rastreio-amostras-backend-production.up.railway.app";
const PRESENCA_INTERVALO = 20000;
let intervaloPresenca = null;
let presencaFinalizada = false;

// ============================================================
// SESSÃO DO USUÁRIO
// ============================================================

function obterUsuarioLogado() {
    return (
        sessionStorage.getItem("usuarioLogado") ||
        localStorage.getItem("usuarioLogado") ||
        ""
    );
}

function obterCodigoVendedor() {
    return (
        sessionStorage.getItem("codigoVendedor") ||
        localStorage.getItem("codigoVendedor") ||
        ""
    );
}

function obterAcessoTotal() {

    return (
        sessionStorage.getItem("acessoTotal") ||
        localStorage.getItem("acessoTotal") ||
        "false"
    );
}

function obterAcessoAdministrativo() {
    return (
        sessionStorage.getItem("acessoAdministrativo") ||
        localStorage.getItem("acessoAdministrativo") ||
        "false"
    );
}

async function enviarPresencaOnline() {
    const usuario = String(obterUsuarioLogado()).trim().toLowerCase();
    if (!usuario || presencaFinalizada) return;
    try {
        await fetch(`${PRESENCA_API}/presenca/online`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({usuario}), cache:"no-store", keepalive:true });
    } catch (erro) { console.warn("⚠️ Não foi possível registrar presença:", erro); }
}

function iniciarPresenca() {
    if (intervaloPresenca) clearInterval(intervaloPresenca);
    presencaFinalizada = false;
    enviarPresencaOnline();
    intervaloPresenca = setInterval(enviarPresencaOnline, PRESENCA_INTERVALO);
}

function encerrarPresenca() {
    if (presencaFinalizada) return;
    presencaFinalizada = true;
    if (intervaloPresenca) { clearInterval(intervaloPresenca); intervaloPresenca = null; }
    const usuario = String(obterUsuarioLogado()).trim().toLowerCase();
    if (!usuario) return;
    const dados = JSON.stringify({usuario});
    try {
        const blob = new Blob([dados], {type:"application/json"});
        if (navigator.sendBeacon) {
            navigator.sendBeacon(`${PRESENCA_API}/presenca/offline`, blob);
        } else {
            fetch(`${PRESENCA_API}/presenca/offline`, {method:"POST",headers:{"Content-Type":"application/json"},body:dados,keepalive:true}).catch(()=>{});
        }
    } catch (erro) { console.warn("⚠️ Não foi possível registrar saída:", erro); }
}

// ================= CONFIG =================
const API_URL = "https://rastreio-amostras-backend-production.up.railway.app/permissoes";

// cache
let cachePermissoes = null;

// ================= LOADING =================
function mostrarLoading() {
    document.body.classList.add("loading");
}

function esconderLoading() {
    document.body.classList.remove("loading");
}

// ================= API =================
async function obterPermissoes() {
    if (cachePermissoes) return cachePermissoes;

    try {
        console.log("🔄 Buscando permissões do backend...");

        const res = await fetch(API_URL + "?t=" + Date.now()); // 🔥 evita cache

        if (!res.ok) {
            throw new Error("Erro HTTP: " + res.status);
        }

        const data = await res.json();

        console.log("✅ Permissões carregadas:", data);

        // ================= 🔥 CONTROLE DE VERSÃO =================
// ================= CONTROLE DE VERSÃO =================

const versaoLocal =
    localStorage.getItem("versaoPermissoes");

const usuario =
    sessionStorage.getItem("usuarioLogado") ||
    localStorage.getItem("usuarioLogado");

if (
    versaoLocal &&
    data.versao &&
    String(versaoLocal) !== String(data.versao)
) {

    console.log(
        "🔄 Permissões foram atualizadas no servidor.",
        "Usuário:",
        usuario,
        "Versão local:",
        versaoLocal,
        "Versão servidor:",
        data.versao
    );

    // IMPORTANTE:
    // Não fazer logout.
    // O usuário continua logado e recebe
    // as permissões novas imediatamente.
}


// ========================================================
// SALVAR NOVA VERSÃO
// ========================================================

if (data.versao) {

    localStorage.setItem(
        "versaoPermissoes",
        data.versao
    );
}

        // ========================================================

        cachePermissoes = data;
        return data;

    } catch (e) {
        console.warn("⚠️ Backend indisponível, usando fallback local");

        const local = localStorage.getItem("permissoes");

        if (local) {
            const parsed = JSON.parse(local);
            cachePermissoes = parsed;
            return parsed;
        }

        return { usuarios: {} };
    }
}

async function obterPermissoesAtualizadas() {

    try {

        console.log(
            "🔄 Buscando permissões ATUAIS do Railway..."
        );


        const res = await fetch(
            API_URL + "?t=" + Date.now(),
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
                `Erro HTTP ${res.status}`
            );

        }


        const data =
            await res.json();


        console.log(
            "✅ Permissões atuais recebidas:",
            data
        );


        cachePermissoes = data;


        if (data.versao) {

            localStorage.setItem(
                "versaoPermissoes",
                String(data.versao)
            );

        }


        return data;


    } catch (e) {

        console.error(
            "❌ Erro ao buscar permissões atuais:",
            e
        );

        throw e;

    }

}
async function salvarPermissoes(data) {

    console.log("💾 Enviando permissões para o backend...");
    console.log("📦 Dados enviados:", data);

    try {

        const res = await fetch(
            API_URL + "?t=" + Date.now(),
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + (sessionStorage.getItem('app_session_token') || localStorage.getItem('app_session_token') || ''),
                    "Cache-Control": "no-cache"
                },

                body: JSON.stringify(data)
            }
        );


        let resposta = {};

        try {
            resposta = await res.json();
        } catch {
            resposta = {};
        }


        console.log(
            "📡 Resposta do backend:",
            res.status,
            resposta
        );


        if (!res.ok) {

            throw new Error(
                resposta.detail ||
                resposta.erro ||
                `Erro HTTP ${res.status}`
            );

        }


        if (resposta.ok !== true) {

            throw new Error(
                "O backend não confirmou o salvamento das permissões."
            );

        }


        console.log(
            "✅ Permissões salvas no Railway com sucesso."
        );


        // =====================================================
        // LIMPA TODOS OS CACHES LOCAIS
        // =====================================================

        cachePermissoes = null;

        localStorage.removeItem("permissoes");
        localStorage.removeItem("versaoPermissoes");


        // NÃO guardar "data" no cache.
        // Na próxima consulta vamos buscar
        // novamente o que realmente está no Railway.


        return true;


    } catch (e) {

        console.error(
            "❌ NÃO FOI POSSÍVEL SALVAR PERMISSÕES:",
            e
        );


        throw e;

    }

}

// ================= PERMISSÃO =================

// ================= PERMISSÃO =================

async function temPermissaoTela(usuario, tela) {

    const user =
        String(usuario || "")
            .trim()
            .toLowerCase();

    const telaNormalizada =
        String(tela || "")
            .trim()
            .toLowerCase();

    console.log("=================================");
    console.log("🔐 VERIFICANDO PERMISSÃO");
    console.log("Usuário:", user);
    console.log("Tela:", telaNormalizada);
    console.log("=================================");

    // =====================================================
    // RASTREIO
    // =====================================================

    if (telaNormalizada === "rastreio_amostra") {

        console.log(
            "✅ Rastreio liberado pela regra geral."
        );

        return true;
    }

    // =====================================================
    // SUPER ADMIN
    // =====================================================

    if (user === "v.santos") {

        console.log(
            "👑 SUPER ADMIN"
        );

        return true;
    }

    // =====================================================
    // CÓDIGO DO VENDEDOR
    // =====================================================

    const codigoVendedor =
        String(obterCodigoVendedor() || "")
            .trim()
            .toUpperCase();

    console.log(
        "🏷️ Código do vendedor:",
        codigoVendedor
    );

    // =====================================================
    // ACESSO TOTAL
    // =====================================================

    const acessoTotal =
        obterAcessoTotal() === "true";

    if (acessoTotal) {

        console.log(
            "✅ Usuário possui acesso total."
        );

        return true;
    }

    // =====================================================
    // ACESSO ADMINISTRATIVO
    // =====================================================

    const acessoAdministrativo =
        obterAcessoAdministrativo() === "true";

    if (
        telaNormalizada === "admin" &&
        acessoAdministrativo
    ) {

        console.log(
            "🛡️ Usuário possui acesso administrativo."
        );

        return true;
    }

    // =====================================================
    // BUSCAR PERMISSÕES ATUAIS
    // =====================================================

    const permissoes =
        await obterPermissoesAtualizadas();

    // =====================================================
    // LOCALIZAR USUÁRIO
    // =====================================================

    const config =
        permissoes?.usuarios?.[user];

    console.log(
        "👤 Configuração encontrada:",
        config
    );

    if (!config) {

        console.warn(
            "❌ Usuário não encontrado nas permissões:",
            user
        );

        return false;
    }

    // =====================================================
    // TELAS
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

    console.log(
        "📋 Telas permitidas:",
        telasNormalizadas
    );

    // =====================================================
    // ACESSO TOTAL "*"
    // =====================================================

    if (
        telasNormalizadas.includes("*")
    ) {

        console.log(
            "✅ Permissão total (*)"
        );

        return true;
    }

    // =====================================================
    // VERIFICAR TELA
    // =====================================================

    const permitido =
        telasNormalizadas.includes(
            telaNormalizada
        );

    console.log(
        "🔐 Resultado:",
        permitido
    );

    return permitido;
}

// ================= MENU =================
// ================= MENU =================
// ================= MENU =================
async function controlarMenu() {

    const usuario =
    obterUsuarioLogado();

    const botoes =
        document.querySelectorAll("[data-tela]");


    console.log(
        "👤 Controlando menu para:",
        usuario
    );


    // =====================================================
    // 1. COLOCAR CARDS EM CARREGAMENTO
    // =====================================================

    botoes.forEach(btn => {

        const tela =
            btn.dataset.tela;


        if (tela === "rastreio_amostra") {

            btn.classList.remove(
                "aguardando-permissao"
            );

            btn.classList.remove(
                "desativado"
            );

            return;
        }


        btn.classList.add(
            "aguardando-permissao"
        );

        btn.classList.remove(
            "desativado"
        );


        const descricao =
            btn.querySelector(
                ".card-description"
            );


        if (descricao) {

            descricao.dataset.textoOriginal =
                descricao.textContent.trim();

            descricao.textContent =
                "Aguardando sistema";
        }


        const arrow =
            btn.querySelector(
                ".card-arrow"
            );


        if (arrow) {

            arrow.classList.add(
                "loading-icon"
            );

            arrow.textContent = "↻";
        }

    });


    // =====================================================
    // 2. BUSCAR PERMISSÕES UMA ÚNICA VEZ
    // =====================================================

    let permissoes;

    try {

        permissoes =
            await obterPermissoesAtualizadas();

    } catch (erro) {

        console.error(
            "❌ Não foi possível carregar permissões:",
            erro
        );


        botoes.forEach(btn => {

            if (
                btn.dataset.tela ===
                "rastreio_amostra"
            ) {
                return;
            }

            btn.classList.remove(
                "aguardando-permissao"
            );

            btn.classList.add(
                "desativado"
            );

            const descricao =
                btn.querySelector(
                    ".card-description"
                );

            if (descricao) {

                descricao.textContent =
                    "Acesso indisponível";
            }

        });


        return;
    }


    // =====================================================
    // 3. NORMALIZAR USUÁRIO
    // =====================================================

    const user =
        String(usuario || "")
            .trim()
            .toLowerCase();


    console.log(
        "🔐 Permissões carregadas para:",
        user
    );


    // =====================================================
    // 4. CONFIGURAÇÃO DO USUÁRIO
    // =====================================================

    const config =
        permissoes?.usuarios?.[user] || {};


    const telas =
        Array.isArray(config.telas)
            ? config.telas.map(
                tela =>
                    String(tela)
                        .trim()
                        .toLowerCase()
            )
            : [];


    console.log(
        "📋 Telas permitidas:",
        telas
    );


    // =====================================================
    // 5. ACESSO TOTAL
    // =====================================================

    const acessoTotal =
    user === "v.santos" ||
    obterAcessoTotal() === "true" ||
    telas.includes("*");

const acessoAdministrativo =
    obterAcessoAdministrativo() === "true";


    // =====================================================
    // 6. APLICAR PERMISSÕES
    // =====================================================

    botoes.forEach(btn => {

        const tela =
            String(btn.dataset.tela || "")
                .trim()
                .toLowerCase();


        // Rastreio sempre liberado
        let permitido =
            tela === "rastreio_amostra";


        // =================================================
// ADMIN / ACESSO TOTAL
// =================================================

if (acessoTotal) {

    permitido = true;

}


// =================================================
// ACESSO ADMINISTRATIVO
// =================================================

else if (
    tela === "admin" &&
    acessoAdministrativo
) {

    permitido = true;

}


// =================================================
// PERMISSÕES NORMAIS
// =================================================

else if (!permitido) {

    permitido =
        telas.includes(tela);

}


        console.log(
            `🔐 ${tela}:`,
            permitido
        );


        // =================================================
        // REMOVE LOADING
        // =================================================

        btn.classList.remove(
            "aguardando-permissao"
        );


        // =================================================
        // RESTAURA DESCRIÇÃO
        // =================================================

        const descricao =
            btn.querySelector(
                ".card-description"
            );


        if (
            descricao &&
            descricao.dataset.textoOriginal
        ) {

            descricao.textContent =
                descricao.dataset.textoOriginal;

        }


        // =================================================
        // RESTAURA SETA
        // =================================================

        const arrow =
            btn.querySelector(
                ".card-arrow"
            );


        if (arrow) {

            arrow.classList.remove(
                "loading-icon"
            );

            arrow.textContent =
                permitido
                    ? "→"
                    : "🔒";

        }


        // =================================================
        // APLICA ESTADO
        // =================================================

        if (permitido) {

            btn.classList.remove(
                "desativado"
            );

        } else {

            btn.classList.add(
                "desativado"
            );

        }

    });

}

// ================= NAVEGAÇÃO =================
function protegerNavegacao() {

    const usuario =
        sessionStorage.getItem("usuarioLogado") ||
        localStorage.getItem("usuarioLogado");

    const botoes =
        document.querySelectorAll("[data-tela]");

    botoes.forEach(btn => {

        btn.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();

                const tela =
                    btn.dataset.tela;

                const link =
                    btn.dataset.link;

                const permitido =
                    await temPermissaoTela(
                        usuario,
                        tela
                    );

                if (!permitido) {

                    alert(
                        "Usuário sem permissão para acessar essa aba"
                    );

                    return;
                }

                if (link) {

                    window.location.href =
                        link;
                }
            }
        );
    });
}

// ================= PROTEÇÃO DE PÁGINA =================
// ================= PROTEÇÃO DE PÁGINA =================
async function protegerPagina() {

    const usuario = obterUsuarioLogado();

    const codigoVendedor =
        String(obterCodigoVendedor() || "")
            .trim()
            .toUpperCase();

    const acessoAdministrativo =
        obterAcessoAdministrativo() === "true";

    const acessoTotal =
        obterAcessoTotal() === "true";

    const telaAtual =
        window.location.pathname
            .split("/")
            .pop()
            .replace(".html", "")
            .toLowerCase();

    console.log("=================================");
    console.log("🔐 PROTEÇÃO DE PÁGINA");
    console.log("📍 Tela:", telaAtual);
    console.log("👤 Usuário:", usuario);
    console.log("🏷️ Código vendedor:", codigoVendedor);
    console.log("🛡️ Acesso administrativo:", acessoAdministrativo);
    console.log("👑 Acesso total:", acessoTotal);
    console.log("=================================");


    // =====================================================
    // TELA INICIAL
    // =====================================================

    if (telaAtual === "tela_inicio") {
        return;
    }


    // =====================================================
    // ADMIN
    // =====================================================

    if (telaAtual === "admin") {


        // Usuário com acesso administrativo
        if (acessoAdministrativo) {

            console.log(
                "🛡️ Acesso administrativo autorizado."
            );

            return;
        }


        // Usuário com acesso total
        if (acessoTotal) {

            console.log(
                "👑 Acesso total autorizado para Admin."
            );

            return;
        }


        // Permissão cadastrada no Railway
        try {

            const permitido =
                await temPermissaoTela(
                    usuario,
                    "admin"
                );

            console.log(
                "🔐 Permissão Admin no Railway:",
                permitido
            );


            if (permitido) {

                console.log(
                    "✅ Admin autorizado pelas permissões do Railway."
                );

                return;
            }

        } catch (erro) {

            console.error(
                "❌ Erro ao verificar permissão do Admin:",
                erro
            );

        }


        // Se chegou aqui, realmente não possui acesso
        console.warn(
            "🚫 ACESSO ADMIN NEGADO."
        );

        alert(
            "Você não tem acesso ao painel administrativo."
        );

        window.location.href =
            "tela_inicio.html";

        return;
    }


    // =====================================================
    // DEMAIS TELAS
    // =====================================================

    const permitido =
        await temPermissaoTela(
            usuario,
            telaAtual
        );

    console.log(
        "🔐 Permissão:",
        permitido
    );


    if (!permitido) {

        alert(
            "Você não tem acesso a essa página."
        );

        window.location.href =
            "tela_inicio.html";
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {

    iniciarPresenca();

    if (window.__initPermissoesExecutado) {
        return;
    }

    window.__initPermissoesExecutado = true;

    mostrarLoading();

    try {

        const telaAtual =
            window.location.pathname
                .split("/")
                .pop()
                .replace(".html", "")
                .toLowerCase();

        console.log("=================================");
        console.log("🔐 INICIALIZAÇÃO DO SISTEMA");
        console.log("📍 Tela atual:", telaAtual);
        console.log("👤 Usuário:", obterUsuarioLogado());
        console.log("🏷️ Código vendedor:", obterCodigoVendedor());
        console.log("=================================");


        // =====================================================
        // ADMIN
        // =====================================================

        if (telaAtual === "admin") {

            console.log(
                "🛡️ Página Admin detectada."
            );

            console.log(
                "➡️ A validação será feita exclusivamente pelo admin.js."
            );

            return;
        }


        // =====================================================
        // TELA NORMAL
        // =====================================================

        await controlarMenu();

        protegerNavegacao();

        await protegerPagina();


    } catch (e) {

        console.error(
            "❌ Erro geral:",
            e
        );

    } finally {

        esconderLoading();

    }

});
// ================= ACESSIBILIDADE =================

document.querySelectorAll("[data-tela]").forEach(btn => {

    btn.setAttribute("tabindex", "0");

    btn.addEventListener("keydown", e => {

        if (e.key === "Enter" || e.key === " ") {

            e.preventDefault();

            btn.click();
        }

    });

});

document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("fade-in");
});
window.addEventListener("pagehide", encerrarPresenca);
window.addEventListener("beforeunload", encerrarPresenca);
// ============================================================
// LOGOUT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const btnLogout =
        document.getElementById("btnLogout");

    if (!btnLogout) return;

    btnLogout.addEventListener("click", () => {

        // ================================================
        // ENCERRAR PRESENÇA
        // ================================================

        encerrarPresenca();


        // ================================================
        // LIMPAR DADOS DE LOGIN
        // ================================================

        localStorage.removeItem("usuarioLogado");
        localStorage.removeItem("codigoVendedor");
        localStorage.removeItem("acessoTotal");
        localStorage.removeItem("acessoAdministrativo");
        localStorage.removeItem("manterConectado");
        localStorage.removeItem("app_session_token");
        sessionStorage.removeItem("app_session_token");


        sessionStorage.removeItem("usuarioLogado");
        sessionStorage.removeItem("codigoVendedor");
        sessionStorage.removeItem("acessoTotal");
        sessionStorage.removeItem("acessoAdministrativo");


        // ================================================
        // VOLTAR PARA LOGIN
        // ================================================

        window.location.href = "index.html";

    });

});