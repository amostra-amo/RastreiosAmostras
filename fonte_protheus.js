/* =========================================================
   SITE TESTE — DADOS DIRETO DO PROTHEUS
   ---------------------------------------------------------
   Troca a planilha publicada no Google Sheets pelo endpoint
   do backend que monta as MESMAS colunas a partir do Protheus:
       GET /rastreios/protheus.csv   (exige login)
   Nenhuma tela precisa ser reescrita: login, rastreio,
   análises e supervisão continuam lendo "a planilha".
   Para voltar à planilha, basta remover este script do HTML.
========================================================= */
(function fonteProtheus() {
    if (window.__fonteProtheus) return;
    window.__fonteProtheus = true;

    const BACKEND = "https://rastreio-amostras-backend-production.up.railway.app";
    const ENDPOINT = BACKEND + "/rastreios/protheus.csv";
    const PLANILHA = "docs.google.com/spreadsheets";

    function tokenSessao() {
        return (
            window.__tokenSessaoLogin ||
            sessionStorage.getItem("app_session_token") ||
            localStorage.getItem("app_session_token") ||
            ""
        );
    }

    function urlDe(recurso) {
        return typeof recurso === "string" ? recurso : (recurso && recurso.url) || "";
    }

    const fetchAnterior = window.fetch.bind(window);

    window.fetch = async function (recurso, opcoes = {}) {
        const url = urlDe(recurso);

        // Planilha -> endpoint do Protheus
        if (url.includes(PLANILHA)) {
            return fetchAnterior(ENDPOINT + "?t=" + Date.now(), {
                cache: "no-store",
                headers: { Authorization: "Bearer " + tokenSessao() }
            });
        }

        const resposta = await fetchAnterior(recurso, opcoes);

        // No login, guarda o token assim que o backend responde,
        // porque a tela carrega "a planilha" antes de salvar a sessão.
        if (url.startsWith(BACKEND) && /\/login(\?|$)/.test(url.slice(BACKEND.length))) {
            try {
                const dados = await resposta.clone().json();
                if (dados && dados.app_session_token) {
                    window.__tokenSessaoLogin = dados.app_session_token;
                }
            } catch (erro) {}
        }

        return resposta;
    };

    function instalarPapa() {
        if (!window.Papa || window.Papa.__fonteProtheus) return;

        const parseOriginal = window.Papa.parse.bind(window.Papa);

        window.Papa.parse = function (entrada, config) {
            if (
                typeof entrada === "string" &&
                entrada.includes(PLANILHA) &&
                config && config.download
            ) {
                window.fetch(entrada)
                    .then(resposta => {
                        if (!resposta.ok) throw new Error("Protheus HTTP " + resposta.status);
                        return resposta.text();
                    })
                    .then(texto => {
                        const { download, ...resto } = config;
                        parseOriginal(texto, resto);
                    })
                    .catch(erro => {
                        console.error("[PROTHEUS] Falha ao carregar os dados:", erro);
                        if (typeof config.error === "function") config.error(erro);
                        else if (typeof config.complete === "function") {
                            config.complete({ data: [], errors: [erro], meta: {} });
                        }
                    });
                return;
            }
            return parseOriginal(entrada, config);
        };

        window.Papa.__fonteProtheus = true;
    }

    function selo() {
        if (document.getElementById("selo-fonte-protheus")) return;
        const el = document.createElement("div");
        el.id = "selo-fonte-protheus";
        el.textContent = "SITE TESTE · dados do Protheus";
        el.style.cssText =
            "position:fixed;right:12px;bottom:12px;z-index:99999;padding:6px 10px;" +
            "border-radius:999px;background:#0B1F3A;color:#fff;font:600 11px/1.2 system-ui,sans-serif;" +
            "letter-spacing:.02em;opacity:.85;pointer-events:none";
        document.body.appendChild(el);
    }

    instalarPapa();
    document.addEventListener("DOMContentLoaded", () => { instalarPapa(); selo(); });
    window.addEventListener("load", instalarPapa);
})();
