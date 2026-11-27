/* =========================================================
   MENU LATERAL PADRÃO (mesmo visual do Relatório Consolidados)
   - Esconde o menu antigo da página (sem remover, para não quebrar
     scripts que ainda o procuram) e cria o menu novo.
   - O botão ☰ que já existe na página passa a abrir o menu novo.
   - "Sair do sistema" reaproveita o logout da própria página
     (#btnLogout), ou limpa a sessão e volta para o login.
   ========================================================= */
(function () {
    "use strict";
    if (window.__menu4k) return;
    window.__menu4k = true;
    document.documentElement.classList.add("usa-menu-4k");

    var PAGINAS = [
        ["tela_inicio.html", "⌂", "Início"],
        ["rastreio_amostra.html", "▣", "Rastreio Amostras"],
        ["rankprod.html", "▤", "RankProd"],
        ["retorno_amostras.html", "↩", "Retorno de Amostras"],
        ["consolidados.html", "◫", "Relatório Consolidados"],
        ["analytics.html", "◷", "Correios | Análises"]
    ];
    var GATILHOS = ".btn-menu, #btnToggleSidebar, .m4-abrir";

    function esc(t) {
        return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function usuario() {
        return sessionStorage.getItem("usuarioLogado") || localStorage.getItem("usuarioLogado") || "";
    }

    function podeVerAdmin() {
        var u = usuario().trim().toLowerCase();
        if (!u) return false;
        if (u === "v.santos") return true;
        try {
            var p = JSON.parse(localStorage.getItem("permissoes") || "{}");
            var cfg = (p.usuarios || {})[usuario()] || (p.usuarios || {})[u];
            var telas = (cfg && Array.isArray(cfg.telas) ? cfg.telas : []).map(function (t) {
                return String(t).trim().toLowerCase();
            });
            return telas.indexOf("admin") >= 0 || telas.indexOf("*") >= 0;
        } catch (e) { return false; }
    }

    function nomePagina() {
        var p = location.pathname.split("/").pop() || "tela_inicio.html";
        return p.toLowerCase();
    }

    function link(href, ico, texto, atual) {
        var ativo = atual === href;
        return '<a href="' + href + '"' + (ativo ? ' class="active" aria-current="page"' : "") + '>' +
            '<span class="m4-ico">' + ico + '</span><span>' + esc(texto) + '</span><span class="m4-arrow">›</span></a>';
    }

    function montar() {
        if (document.getElementById("menu4k")) return;
        var atual = nomePagina();
        var itens = PAGINAS.map(function (p) { return link(p[0], p[1], p[2], atual); }).join("");
        var admin = podeVerAdmin() ? (
            '<div class="m4-label m4-gap">ADMINISTRAÇÃO</div><nav class="m4-nav" aria-label="Administração">' +
            link("admin.html", "⚙", "Usuários e permissões", atual) +
            link("pacotes.html", "▦", "Pacotes (mesmo envio)", atual) + "</nav>") : "";
        var u = usuario();

        var aside = document.createElement("aside");
        aside.id = "menu4k";
        aside.className = "menu-4k";
        aside.setAttribute("aria-label", "Menu lateral");
        aside.innerHTML =
            '<div class="m4-head"><div class="m4-logo">4K<i></i></div>' +
            '<div class="m4-brand"><strong>GRUPO 4K</strong><small>Central de operações</small></div>' +
            '<button type="button" class="m4-close" aria-label="Fechar menu">×</button></div>' +
            '<div class="m4-label">MENU PRINCIPAL</div>' +
            '<nav class="m4-nav" aria-label="Navegação principal">' + itens + '</nav>' + admin +
            '<div class="m4-label m4-gap">SESSÃO</div>' +
            '<div class="m4-card"><div class="m4-card-head"><span class="m4-dot"></span>' +
            '<span class="m4-card-title">DADOS DO PROTHEUS</span></div>' +
            '<div class="m4-card-text">' + (u ? 'Conectado como <b>' + esc(u) + '</b><br>' : '') +
            'Informações atualizadas automaticamente.</div></div>' +
            '<div class="m4-bottom"><div class="m4-caption">GRUPO 4K · CENTRAL DE OPERAÇÕES</div>' +
            '<button type="button" class="m4-logout"><span class="m4-ico">⇥</span><span>Sair do sistema</span></button></div>';

        var sombra = document.createElement("div");
        sombra.className = "menu-4k-shade";
        document.body.appendChild(sombra);
        document.body.appendChild(aside);

        function abrir() { aside.classList.add("open"); sombra.classList.add("open"); }
        function fechar() { aside.classList.remove("open"); sombra.classList.remove("open"); }

        sombra.addEventListener("click", fechar);
        aside.querySelector(".m4-close").addEventListener("click", fechar);
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });

        aside.querySelector(".m4-logout").addEventListener("click", function () {
            var antigo = document.getElementById("btnLogout");
            if (antigo) { antigo.click(); return; }
            localStorage.clear(); sessionStorage.clear();
            location.href = "index.html";
        });

        // O ☰ da página abre o menu novo (fase de captura: o script antigo não roda).
        document.addEventListener("click", function (e) {
            var alvo = e.target && e.target.closest ? e.target.closest(GATILHOS) : null;
            if (!alvo) return;
            e.preventDefault(); e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            aside.classList.contains("open") ? fechar() : abrir();
        }, true);

        if (!document.querySelector(".btn-menu, #btnToggleSidebar")) {
            var b = document.createElement("button");
            b.type = "button"; b.className = "m4-abrir"; b.setAttribute("aria-label", "Abrir menu");
            b.textContent = "☰";
            document.body.appendChild(b);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
    else montar();
})();
