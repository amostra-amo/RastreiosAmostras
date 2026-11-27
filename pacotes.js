/* =========================================================
   PACOTES COM VÁRIAS NOTAS
   Vincula notas fiscais extras ao código de rastreio do pacote.
   Dados guardados no backend (Railway); só a tela Admin altera.
========================================================= */
(function () {
    const API = "https://rastreio-amostras-backend-production.up.railway.app/rastreios/vinculos";
    const PADRAO_CODIGO = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

    const el = id => document.getElementById(id);
    const form = el("formVinculo");
    const campoCodigo = el("codigo");
    const campoNfs = el("nfs");
    const btnSalvar = el("btnSalvar");
    const conferencia = el("conferencia");
    const mensagem = el("mensagem");
    const lista = el("lista");
    const filtro = el("filtro");

    let pacotes = [];

    function token() {
        return sessionStorage.getItem("app_session_token") || localStorage.getItem("app_session_token") || "";
    }

    async function api(caminho = "", opcoes = {}) {
        const resposta = await fetch(API + caminho, {
            ...opcoes,
            cache: "no-store",
            headers: {
                "Authorization": "Bearer " + token(),
                "Content-Type": "application/json",
                ...(opcoes.headers || {})
            }
        });
        let corpo = null;
        try { corpo = await resposta.json(); } catch (erro) {}
        if (resposta.status === 401) {
            throw new Error("Sua sessão expirou. Entre de novo no site.");
        }
        if (resposta.status === 403) {
            throw new Error("Seu usuário não tem permissão para esta tela (Admin).");
        }
        if (!resposta.ok) {
            throw new Error((corpo && corpo.detail) || ("Erro " + resposta.status));
        }
        return corpo;
    }

    function escapar(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function dataHora(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }

    function avisar(texto, tipo) {
        mensagem.textContent = texto || "";
        mensagem.className = "mensagem" + (tipo ? " " + tipo : "");
    }

    function renderizar() {
        const termo = filtro.value.trim().toUpperCase();
        const visiveis = pacotes.filter(p =>
            !termo ||
            p.codigo.includes(termo) ||
            String(p.nf_etiqueta || "").includes(termo) ||
            p.nfs.some(n => n.nf.includes(termo))
        );

        if (!visiveis.length) {
            lista.innerHTML = `<div class="vazio">${pacotes.length ? "Nada encontrado." : "Nenhum pacote vinculado ainda."}</div>`;
            return;
        }

        lista.innerHTML = `
            <table>
                <thead>
                    <tr><th>Código</th><th>NF da etiqueta</th><th>Notas vinculadas</th></tr>
                </thead>
                <tbody>
                    ${visiveis.map(p => `
                        <tr>
                            <td class="codigo">${escapar(p.codigo)}</td>
                            <td>${escapar(p.nf_etiqueta || "—")}</td>
                            <td>
                                <div class="nfs">
                                    ${p.nfs.map(n => `
                                        <span class="nf" title="${escapar(n.usuario || "")} · ${escapar(dataHora(n.criado_em))}">
                                            ${escapar(n.nf)}
                                            <button class="remover" type="button" data-nf="${escapar(n.nf)}" aria-label="Remover NF ${escapar(n.nf)}">✕</button>
                                        </span>`).join("")}
                                </div>
                                <div class="quem">${escapar(p.nfs[0]?.usuario || "")} · ${escapar(dataHora(p.nfs[0]?.criado_em))}</div>
                            </td>
                        </tr>`).join("")}
                </tbody>
            </table>`;
    }

    async function carregar() {
        try {
            pacotes = await api();
            renderizar();
        } catch (erro) {
            lista.innerHTML = `<div class="vazio">${escapar(erro.message)}</div>`;
            btnSalvar.disabled = true;
        }
    }

    // Confere o código antes de vincular: NF da etiqueta e destinatário
    let temporizador = null;
    campoCodigo.addEventListener("input", () => {
        campoCodigo.value = campoCodigo.value.toUpperCase().replace(/\s/g, "");
        conferencia.textContent = "";
        clearTimeout(temporizador);
        const codigo = campoCodigo.value;
        if (!PADRAO_CODIGO.test(codigo)) return;
        temporizador = setTimeout(async () => {
            try {
                const info = await api("/codigo/" + encodeURIComponent(codigo));
                if (campoCodigo.value !== codigo) return;
                conferencia.innerHTML = info.nf_etiqueta
                    ? `Etiqueta: <strong>NF ${escapar(info.nf_etiqueta)}</strong> · ${escapar(info.destinatario)} · ${escapar(info.servico)} · postado em ${escapar(info.postado_em || "—")}`
                    : "Código ainda não encontrado na Pré-postagem (pode levar até 15 min após a postagem). Dá para vincular mesmo assim.";
            } catch (erro) {
                conferencia.textContent = erro.message;
            }
        }, 350);
    });

    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        const codigo = campoCodigo.value.trim().toUpperCase();
        const nfs = campoNfs.value.split(/[\s,;/]+/).map(n => n.replace(/\D/g, "")).filter(Boolean);

        if (!PADRAO_CODIGO.test(codigo)) {
            avisar("Código de rastreio inválido. Formato: AP000000000BR.", "erro");
            return;
        }
        if (!nfs.length) {
            avisar("Informe ao menos uma nota fiscal.", "erro");
            return;
        }

        btnSalvar.disabled = true;
        avisar("Salvando…");
        try {
            await api("", { method: "POST", body: JSON.stringify({ codigo, nfs }) });
            avisar(`NF ${nfs.join(", ")} vinculada(s) ao pacote ${codigo}.`, "ok");
            campoNfs.value = "";
            await carregar();
        } catch (erro) {
            avisar(erro.message, "erro");
        } finally {
            btnSalvar.disabled = false;
        }
    });

    lista.addEventListener("click", async evento => {
        const botao = evento.target.closest("button.remover");
        if (!botao) return;
        const nf = botao.dataset.nf;
        botao.disabled = true;
        try {
            await api("/" + encodeURIComponent(nf), { method: "DELETE" });
            avisar(`Vínculo da NF ${nf} removido.`, "ok");
            await carregar();
        } catch (erro) {
            avisar(erro.message, "erro");
            botao.disabled = false;
        }
    });

    filtro.addEventListener("input", renderizar);

    if (!token()) {
        lista.innerHTML = `<div class="vazio">Entre no site primeiro. <a href="index.html">Ir para o login</a></div>`;
        btnSalvar.disabled = true;
    } else {
        carregar();
    }
})();
