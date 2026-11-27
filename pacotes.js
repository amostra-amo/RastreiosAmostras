/* =========================================================
   PACOTES — notas que vão na mesma caixa
   1) busca a nota da etiqueta; 2) adiciona as outras notas.
   Vínculo nota -> nota, guardado no backend (só tela Admin).
========================================================= */
(function () {
    const API = "https://rastreio-amostras-backend-production.up.railway.app/rastreios/vinculos";

    const $ = id => document.getElementById(id);
    const formBusca = $("formBusca");
    const campoPrincipal = $("nfPrincipal");
    const btnBuscar = $("btnBuscar");
    const resumo = $("resumo");
    const passo2 = $("passo2");
    const campoChips = $("campoChips");
    const campoExtra = $("nfExtra");
    const avisoPacote = $("avisoPacote");
    const btnSalvar = $("btnSalvar");
    const btnCancelar = $("btnCancelar");
    const lista = $("lista");
    const filtro = $("filtro");
    const contagem = $("contagem");
    const toast = $("toast");

    let principal = null;     // dados da NF da etiqueta
    let extras = [];          // [{nf, info, estado: carregando|ok|ambar|erro, msg}]
    let pacotes = [];

    // ---------- utilidades ----------
    const token = () => sessionStorage.getItem("app_session_token") || localStorage.getItem("app_session_token") || "";
    const soDigitos = v => String(v || "").replace(/\D/g, "").replace(/^0+/, "");
    const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const dataBR = iso => {
        if (!iso) return "";
        const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
        return isNaN(d) ? "" : d.toLocaleDateString("pt-BR");
    };
    const dataHoraBR = iso => {
        const d = new Date(iso || "");
        return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    };

    function mostrarToast(texto) {
        toast.textContent = texto;
        toast.classList.add("visivel");
        clearTimeout(mostrarToast.t);
        mostrarToast.t = setTimeout(() => toast.classList.remove("visivel"), 2600);
    }

    async function api(caminho = "", opcoes = {}) {
        const resposta = await fetch(API + caminho, {
            ...opcoes,
            cache: "no-store",
            headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" }
        });
        let corpo = null;
        try { corpo = await resposta.json(); } catch (e) {}
        if (resposta.status === 401) throw Object.assign(new Error("Sua sessão expirou. Entre de novo no site."), { status: 401 });
        if (resposta.status === 403) throw Object.assign(new Error("Seu usuário não tem acesso a esta tela (Admin)."), { status: 403 });
        if (!resposta.ok) throw Object.assign(new Error((corpo && corpo.detail) || "Erro " + resposta.status), { status: resposta.status });
        return corpo;
    }

    // ---------- passo 1: NF da etiqueta ----------
    function etiquetasEnvio(info) {
        if (info.codigo) {
            return `
                <span class="etiqueta mono">${esc(info.codigo)}</span>
                ${info.servico ? `<span class="etiqueta">${esc(info.servico)}</span>` : ""}
                <span class="etiqueta verde">Postado ${esc(info.postado_em || "")}</span>`;
        }
        return `<span class="etiqueta ambar">Aguardando postagem</span>`;
    }

    function renderizarResumo() {
        if (!principal) { resumo.innerHTML = ""; return; }
        const i = principal;
        resumo.innerHTML = `
            <div class="resumo">
                <div class="resumo-topo">
                    <div>
                        <div class="resumo-nf">NF ${esc(i.nf)}${i.pedidos?.length ? " · pedido " + esc(i.pedidos.join(", ")) : ""}</div>
                        <div class="resumo-cliente">${esc(i.cliente || "Cliente não identificado")}</div>
                        <div class="resumo-detalhe">${esc([i.cidade, i.vendedora, i.emissao ? "emitida em " + dataBR(i.emissao) : ""].filter(Boolean).join(" · "))}</div>
                    </div>
                </div>
                <div class="etiquetas">${etiquetasEnvio(i)}</div>
            </div>
            ${!i.codigo ? `<div class="aviso ambar">Ainda sem código de rastreio. Pode montar o pacote agora: o código entra sozinho depois da postagem.</div>` : ""}`;
    }

    async function buscarPrincipal(evento) {
        evento?.preventDefault();
        const nf = soDigitos(campoPrincipal.value);
        if (!nf) { campoPrincipal.focus(); return; }
        btnBuscar.disabled = true;
        btnBuscar.textContent = "Buscando…";
        try {
            const info = await api("/nf/" + nf);
            if (info.vinculada_a) {
                principal = null;
                resumo.innerHTML = `<div class="aviso ambar">A NF ${esc(nf)} já está no pacote da NF <strong>${esc(info.vinculada_a)}</strong>. Busque pela nota da etiqueta.</div>`;
                passo2.classList.add("oculto");
                return;
            }
            principal = info;
            extras = (info.vinculadas || []).map(n => ({ nf: n, estado: "salva" }));
            renderizarResumo();
            renderizarChips();
            passo2.classList.remove("oculto");
            campoExtra.focus();
            (info.vinculadas || []).forEach(n => conferirExtra(n));
        } catch (erro) {
            principal = null;
            passo2.classList.add("oculto");
            resumo.innerHTML = `<div class="aviso erro">${esc(erro.message)}</div>`;
        } finally {
            btnBuscar.disabled = false;
            btnBuscar.textContent = "Buscar";
        }
    }

    // ---------- passo 2: notas extras ----------
    function renderizarChips() {
        campoChips.querySelectorAll(".chip").forEach(c => c.remove());
        extras.forEach((e, indice) => {
            const chip = document.createElement("span");
            chip.className = "chip" + (e.estado === "erro" ? " erro" : e.estado === "ambar" ? " ambar" : "");
            const detalhe =
                e.estado === "carregando" ? "conferindo…" :
                e.msg ? e.msg :
                e.info ? (e.info.cliente || "") : "";
            chip.innerHTML = `
                <span><strong>NF ${esc(e.nf)}</strong>${detalhe ? `<small>${esc(detalhe)}</small>` : ""}</span>
                <button type="button" aria-label="Tirar NF ${esc(e.nf)}" data-i="${indice}">✕</button>`;
            campoChips.insertBefore(chip, campoExtra);
        });
        atualizarBotao();
    }

    function atualizarBotao() {
        const novas = extras.filter(e => e.estado !== "salva");
        const temErro = extras.some(e => e.estado === "erro");
        const carregando = extras.some(e => e.estado === "carregando");
        btnSalvar.disabled = !principal || !novas.length || temErro || carregando;
        btnSalvar.textContent = novas.length > 1 ? `Salvar ${novas.length} notas no pacote` : "Salvar pacote";
        const outrosClientes = extras.filter(e => e.estado === "ambar").length;
        avisoPacote.innerHTML = temErro
            ? `<div class="aviso erro">Tire as notas marcadas em vermelho para salvar.</div>`
            : outrosClientes
                ? `<div class="aviso ambar">${outrosClientes === 1 ? "Uma nota é" : outrosClientes + " notas são"} de outro cliente. Confira antes de salvar.</div>`
                : "";
    }

    async function conferirExtra(nf) {
        const item = extras.find(e => e.nf === nf);
        if (!item) return;
        try {
            const info = await api("/nf/" + nf);
            item.info = info;
            if (item.estado === "salva") {
                item.msg = (info.cliente || "") + " · já no pacote";
            } else if (info.vinculada_a && info.vinculada_a !== principal.nf) {
                item.estado = "erro"; item.msg = "já está no pacote da NF " + info.vinculada_a;
            } else if ((info.vinculadas || []).length) {
                item.estado = "erro"; item.msg = "é nota de etiqueta de outro pacote";
            } else if (principal.cliente && info.cliente && info.cliente !== principal.cliente) {
                item.estado = "ambar"; item.msg = "outro cliente: " + info.cliente;
            } else {
                item.estado = "ok"; item.msg = "";
            }
        } catch (erro) {
            if (item.estado !== "salva") { item.estado = "erro"; item.msg = erro.status === 404 ? "não encontrada" : erro.message; }
        }
        renderizarChips();
    }

    function adicionarExtras(texto) {
        const numeros = String(texto || "").split(/[\s,;/]+/).map(soDigitos).filter(Boolean);
        numeros.forEach(nf => {
            if (nf === principal?.nf) { mostrarToast("Essa é a nota da etiqueta."); return; }
            if (extras.some(e => e.nf === nf)) return;
            extras.push({ nf, estado: "carregando" });
            conferirExtra(nf);
        });
        renderizarChips();
    }

    campoExtra.addEventListener("keydown", evento => {
        if (["Enter", ",", " ", "Tab"].includes(evento.key) && campoExtra.value.trim()) {
            evento.preventDefault();
            adicionarExtras(campoExtra.value);
            campoExtra.value = "";
        } else if (evento.key === "Backspace" && !campoExtra.value) {
            const ultima = [...extras].reverse().find(e => e.estado !== "salva");
            if (ultima) { extras = extras.filter(e => e !== ultima); renderizarChips(); }
        }
    });

    campoExtra.addEventListener("paste", evento => {
        evento.preventDefault();
        adicionarExtras((evento.clipboardData || window.clipboardData).getData("text"));
    });

    campoExtra.addEventListener("blur", () => {
        if (campoExtra.value.trim()) { adicionarExtras(campoExtra.value); campoExtra.value = ""; }
    });

    campoChips.addEventListener("click", async evento => {
        const botao = evento.target.closest("button[data-i]");
        if (!botao) { campoExtra.focus(); return; }
        const item = extras[Number(botao.dataset.i)];
        if (!item) return;
        if (item.estado === "salva") {
            botao.disabled = true;
            try {
                await api("/" + item.nf, { method: "DELETE" });
                mostrarToast(`NF ${item.nf} saiu do pacote.`);
                carregarLista();
            } catch (erro) { mostrarToast(erro.message); botao.disabled = false; return; }
        }
        extras = extras.filter(e => e !== item);
        renderizarChips();
    });

    btnSalvar.addEventListener("click", async () => {
        const novas = extras.filter(e => e.estado !== "salva").map(e => e.nf);
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando…";
        try {
            await api("", { method: "POST", body: JSON.stringify({ nf_principal: principal.nf, nfs: novas }) });
            mostrarToast(`Pacote da NF ${principal.nf} salvo.`);
            limpar();
            carregarLista();
        } catch (erro) {
            avisoPacote.innerHTML = `<div class="aviso erro">${esc(erro.message)}</div>`;
            atualizarBotao();
        }
    });

    function limpar() {
        principal = null;
        extras = [];
        campoPrincipal.value = "";
        resumo.innerHTML = "";
        avisoPacote.innerHTML = "";
        passo2.classList.add("oculto");
        renderizarChips();
        campoPrincipal.focus();
    }

    btnCancelar.addEventListener("click", limpar);
    formBusca.addEventListener("submit", buscarPrincipal);

    // ---------- lista ----------
    function renderizarLista() {
        const termo = filtro.value.trim().toUpperCase();
        const visiveis = pacotes.filter(p => !termo ||
            p.nf_principal.includes(termo) ||
            String(p.codigo || "").includes(termo) ||
            String(p.cliente || "").toUpperCase().includes(termo) ||
            p.nfs.some(n => n.nf.includes(termo)));

        contagem.textContent = pacotes.length ? `· ${pacotes.length}` : "";

        if (!visiveis.length) {
            lista.innerHTML = `<div class="vazio">${pacotes.length ? "Nenhum pacote encontrado." : "Nenhum pacote montado ainda.<br>Comece pela nota da etiqueta, aí em cima."}</div>`;
            return;
        }

        lista.innerHTML = visiveis.map(p => `
            <article class="pacote">
                <div>
                    <div class="pacote-nf">NF ${esc(p.nf_principal)} <span>etiqueta</span></div>
                    <div class="pacote-cliente">${esc([p.cliente, p.cidade].filter(Boolean).join(" · "))}</div>
                </div>
                <div class="pacote-direita">
                    <div class="etiquetas" style="justify-content:flex-end">${etiquetasEnvio(p)}</div>
                </div>
                <div class="vinculadas">
                    <span class="rotulo">Junto:</span>
                    ${p.nfs.map(n => `
                        <span class="nf-vinculada" title="${esc(n.usuario || "")} · ${esc(dataHoraBR(n.criado_em))}">
                            NF ${esc(n.nf)}
                            <button type="button" data-nf="${esc(n.nf)}" aria-label="Tirar NF ${esc(n.nf)} do pacote">✕</button>
                        </span>`).join("")}
                </div>
                <div class="pacote-meta">por ${esc(p.nfs[0]?.usuario || "—")} · ${esc(dataHoraBR(p.atualizado_em))}</div>
            </article>`).join("");
    }

    async function carregarLista() {
        try {
            pacotes = await api();
            renderizarLista();
        } catch (erro) {
            lista.innerHTML = `<div class="vazio">${esc(erro.message)}${erro.status === 401 ? `<br><a href="index.html">Entrar</a>` : ""}</div>`;
            if (erro.status === 401 || erro.status === 403) {
                campoPrincipal.disabled = true;
                btnBuscar.disabled = true;
            }
        }
    }

    lista.addEventListener("click", async evento => {
        const botao = evento.target.closest("button[data-nf]");
        if (!botao) return;
        botao.disabled = true;
        try {
            await api("/" + botao.dataset.nf, { method: "DELETE" });
            mostrarToast(`NF ${botao.dataset.nf} saiu do pacote.`);
            carregarLista();
        } catch (erro) {
            mostrarToast(erro.message);
            botao.disabled = false;
        }
    });

    filtro.addEventListener("input", renderizarLista);

    // ---------- início ----------
    if (!token()) {
        lista.innerHTML = `<div class="vazio">Entre no site primeiro.<br><a href="index.html">Ir para o login</a></div>`;
        campoPrincipal.disabled = true;
        btnBuscar.disabled = true;
    } else {
        carregarLista();
        campoPrincipal.focus();
    }
})();
