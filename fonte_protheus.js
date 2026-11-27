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

    // "Pacotes" (vincular notas do mesmo pacote): item discreto no menu
    // lateral, só para quem tem a tela Admin.
    async function botaoPacotes() {
        if (document.getElementById("menu-pacotes") || !/rastreio_amostra/.test(location.pathname)) return;
        if (!tokenSessao()) return;
        try {
            const r = await fetchAnterior(BACKEND + "/rastreios/vinculos", {
                cache: "no-store", headers: { Authorization: "Bearer " + tokenSessao() }
            });
            if (!r.ok) return;
        } catch (erro) { return; }

        const icone = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"></path><path d="M3 8l9 5 9-5M12 13v8"></path></svg>';
        const ir = evento => { evento.preventDefault(); evento.stopPropagation(); location.href = "pacotes.html"; };

        const trilho = document.querySelector(".sidebar-video-rail-nav");
        if (trilho) {
            const b = document.createElement("button");
            b.id = "menu-pacotes";
            b.type = "button";
            b.className = "sidebar-video-rail-btn";
            b.title = "Pacotes";
            b.setAttribute("aria-label", "Pacotes");
            b.innerHTML = icone;
            b.addEventListener("click", ir);
            trilho.appendChild(b);
        }

        const painel = document.querySelector(".sidebar-video-panel-nav");
        if (painel) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "sidebar-video-panel-item";
            b.innerHTML = `<span class="sidebar-video-icon">${icone}</span>
                <span class="sidebar-video-item-text"><strong>Pacotes</strong><small>Notas no mesmo pacote</small></span>
                <span class="sidebar-video-arrow">›</span>`;
            b.addEventListener("click", ir);
            painel.appendChild(b);
        }
    }

    // Os dados da tela de rastreio vêm do login (sessionStorage). Depois de
    // alterar um pacote, ou a cada 15 min, busca os dados novos e atualiza as
    // MESMAS notas do usuário (mesmo escopo do login). Recarrega 1x se mudou.
    async function atualizarDadosDaSessao() {
        if (!/rastreio_amostra/.test(location.pathname) || !tokenSessao() || !window.Papa) return;
        const armazenamento = sessionStorage.getItem("dadosFiltrados") ? sessionStorage
            : (localStorage.getItem("dadosFiltrados") ? localStorage : null);
        if (!armazenamento) return;
        const ultima = Number(sessionStorage.getItem("protheusAtualizadoEm") || 0);
        const alterado = sessionStorage.getItem("pacotesAlterados") === "1";
        if (!alterado && Date.now() - ultima < 15 * 60 * 1000) return;
        try {
            const atuais = JSON.parse(armazenamento.getItem("dadosFiltrados") || "[]");
            const notas = new Set(atuais.map(l => String(l[0] || "").trim()));
            const r = await fetchAnterior(ENDPOINT + "?t=" + Date.now(), {
                cache: "no-store", headers: { Authorization: "Bearer " + tokenSessao() }
            });
            if (!r.ok) return;
            const linhas = window.Papa.parse(await r.text(), { skipEmptyLines: true }).data.slice(1);
            const novas = linhas.filter(l => notas.has(String(l[0] || "").trim()));
            sessionStorage.setItem("protheusAtualizadoEm", String(Date.now()));
            sessionStorage.removeItem("pacotesAlterados");
            if (!novas.length) return;
            const assinatura = ls => JSON.stringify(ls.map(l => [l[0], l[1], l[5], l[13], l[14], l[15]]).sort());
            if (assinatura(novas) !== assinatura(atuais)) {
                armazenamento.setItem("dadosFiltrados", JSON.stringify(novas));
                console.log("[PROTHEUS] Dados atualizados; recarregando a tela.");
                location.reload();
            }
        } catch (erro) {
            console.warn("[PROTHEUS] Não foi possível atualizar os dados da sessão:", erro);
        }
    }

    instalarPapa();
    document.addEventListener("DOMContentLoaded", () => {
        instalarPapa(); selo(); botaoPacotes(); atualizarDadosDaSessao();
    });
    window.addEventListener("load", instalarPapa);
})();
