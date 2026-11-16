// ================= PERMISSÕES =================
const permissoes = {
    usuarios: {
        "v.santos": {
            telas: ["rastreio", "retorno"]
        },
        "admin": {
            telas: ["*"]
        }
    }
};


const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7og0_9fNfXHoINFiE-s75rCPc-RIqAFLwcl8dQqMvEKXimWrMfgQz30QxPKul8_1Cf8RB4YSoizJy/pub?gid=0&single=true&output=csv";

const tabela = document.getElementById("listaAnalises");

let dadosGlobais = [];
let scrollPosition = 0;
let ordemCrescente = false;

// 🔥 DEFINA AQUI A COLUNA REAL DO R$ ENVIOS
const COL_ENVIO = 6; // 👈 ALTERE PARA A COLUNA CORRETA
// 🔥 Define automaticamente a data fim como hoje
document.addEventListener("DOMContentLoaded", () => {

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    const hojeFormatado = `${ano}-${mes}-${dia}`;

    // Datas em branco por padrão: mostra todos os envios até que o usuário filtre.

});

Papa.parse(url, {
    download: true,
    skipEmptyLines: true,
    complete: res => {
        dadosGlobais = res.data.slice(1);
        renderizarTabela(dadosGlobais);
        iniciarConsultaDevolucoesCorreios();
    }
});

function renderizarTabela(dados) {

    tabela.innerHTML = "";

    let totalRastreios = 0;
    let totalValorGeral = 0;

    const grupos = {};

    dados.forEach(l => {
        const rastreio = l[1];
        if (!rastreio) return;

        if (!grupos[rastreio]) grupos[rastreio] = [];
        grupos[rastreio].push(l);
    });

    Object.values(grupos).forEach(grupo => {

        totalRastreios++;

        const l = grupo[0];

        const rastreio = l[1];
        const cliente = `${l[18]} - ${l[19]}`;
        const representante = `${l[20]} - ${l[21]}`;
        const vendedor = `${l[22]} - ${l[23]}`;

        // 🔵 LOCALIZAÇÃO FORMATADA CIDADE - UF
        const cidade = (l[11] || "").toUpperCase();
        const uf = (l[12] || "").toUpperCase();
        const localizacao = cidade && uf ? `${cidade} - ${uf}` : "";

const valorUnitario = converterValorBR(l[COL_ENVIO]);
      const dataFormatada = l[5] || ""; 

totalValorGeral += valorUnitario;


        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><input type="checkbox" class="check-item" data-rastreio="${rastreio}"></td>
            <td>${rastreio}</td>
            <td>${dataFormatada}</td>
            <td>${cliente}</td>
            <td>${representante}</td>
            <td>${vendedor}</td>
            <td>R$ ${valorUnitario.toFixed(2)}</td>
            <td class="btn-detalhes">🔎</td>
        `;
       
        const LIMITE_VALOR = document.getElementById("filtro100").checked ? 100 : Infinity; // altere aqui quando quiser

            if (valorUnitario > LIMITE_VALOR) {
                tr.classList.add("valor-destaque");
            }

        // 🔵 OBJETO COMPLETO DE DADOS
        const dadosDetalhes = {
            nota: l[0],
            pedido: l[14],
            cliente: cliente,
            representante: representante,
            vendedor: vendedor,
            localizacao: localizacao,
            
            postagem: l[27] || "",
            prazo: l[13] || "",
            valor: valorUnitario.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
}),

           amostras: grupo.map(g => {

    const codigo = g[17] || "";
    const descricao = g[15] || "";
    const quantidade = parseInt(g[16]) || 1;

    return `${quantidade} ${codigo} - ${descricao}`;

})
        };

        // 🔵 EVENT LISTENER PROFISSIONAL
        tr.querySelector(".btn-detalhes").addEventListener("click", () => {
            abrirDetalhes(dadosDetalhes);
        });

        tabela.appendChild(tr);
    });

    document.getElementById("totalRastreios").innerText = totalRastreios;

    document.getElementById("totalValor").innerText =
        totalValorGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    document.getElementById('totalClientesEnvios').textContent = new Set(Object.values(grupos).map(g => String(g[0][18] || g[0][19] || '').trim()).filter(Boolean)).size;
    desenharGraficosEnvios(dadosGlobais);
    // 🔵 Ordena automaticamente ao renderizar
    const thValor = document.querySelector(".th-sort");
    ordenarPorValor(thValor);
}



function converterDataBR(dataBR) {
    if (!dataBR) return null;

    const [dia, mes, ano] = dataBR.split("/");
    return new Date(ano, mes - 1, dia);
}

function converterValorBR(valor) {
    if (!valor) return 0;

    return parseFloat(
        valor
            .toString()
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
    ) || 0;
}

function abrirDetalhes(dados) {

    document.getElementById("detNota").innerText = dados.nota || "";
    document.getElementById("detPedido").innerText = dados.pedido || "";
    document.getElementById("detCliente").innerText = dados.cliente || "";
    document.getElementById("detRepresentante").innerText = dados.representante || "";
    document.getElementById("detLocalizacao").innerText = dados.localizacao || "";
    document.getElementById("detPostagem").innerText = dados.postagem || "";
    document.getElementById("detPrazo").innerText = dados.prazo || "";
    document.getElementById("detVendedor").innerText = dados.vendedor || "";

    const lista = document.getElementById("detAmostras");
    lista.innerHTML = "";

    if (dados.amostras && dados.amostras.length > 0) {
        dados.amostras.forEach(item => {
            const li = document.createElement("li");
            li.innerText = item;
            lista.appendChild(li);
        });
    }

    const modal = document.getElementById("modalDetalhes");

    // 🔒 Salva posição do scroll
    scrollPosition = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = "100%";

    modal.classList.add("ativo");
}

function fecharModal() {

    const modal = document.getElementById("modalDetalhes");

    modal.classList.remove("ativo");

    // 🔓 Restaura scroll original
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";

    window.scrollTo(0, scrollPosition);
}
const modal = document.getElementById("modalDetalhes");

modal.addEventListener("click", function(e) {

    // Se clicar no fundo (overlay) fecha
    if (e.target === modal) {
        fecharModal();
    }

});

document.addEventListener("keydown", function(e) {

    if (e.key === "Escape") {

        const modalDetalhes = document.getElementById("modalDetalhes");
        const submenuCentro = document.getElementById("submenuCentroCusto");

        // 🔹 Fecha modal de detalhes
        if (modalDetalhes.classList.contains("ativo")) {
            fecharModal();
            return;
        }

        // 🔹 Fecha submenu centro de custo
        if (submenuCentro.classList.contains("ativo")) {
            submenuCentro.classList.remove("ativo");
            return;
        }
    }

});

let logoBase64 = null;

function carregarLogo() {
    return new Promise((resolve, reject) => {

        if (logoBase64) {
            resolve();
            return;
        }

        const img = new Image();
        img.src = "/Imagens/4k BRANCO.png"; // 🔥 coloque aqui o caminho real da sua logo

        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            logoBase64 = canvas.toDataURL("image/png");
            resolve();
        };

        img.onerror = reject;
    });
}

async function gerarPDFSelecionados() {

    await carregarLogo(); // 🔥 garante que a logo carregou

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4");

    const checkboxes = document.querySelectorAll(".check-item:checked");

    if (checkboxes.length === 0) {
        alert("Selecione pelo menos um item.");
        return;
    }

    let totalGeral = 0;
    const corpoTabela = [];

    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;
    const dataInicioFormatada = formatarDataBR(dataInicio);
    const dataFimFormatada = formatarDataBR(dataFim);
    let baseDados = dadosGlobais;

    if (dataInicio && dataFim) {

        const inicio = converterDataISOparaLocal(dataInicio);
        const fim = converterDataISOparaLocal(dataFim);

        inicio.setHours(0,0,0,0);
        fim.setHours(23,59,59,999);

        baseDados = dadosGlobais.filter(l => {
            const dataPedido = converterDataBR(l[5]);
            if (!dataPedido) return false;
            return dataPedido >= inicio && dataPedido <= fim;
        });
    }

    checkboxes.forEach((checkbox) => {

        const rastreioSelecionado = checkbox.dataset.rastreio;

        const grupo = baseDados.filter(l => l[1] === rastreioSelecionado);
        if (grupo.length === 0) return;

        const l = grupo[0];

        const rastreio = l[1] || "";
        const tipoEnvio = l[2] || "";
        const nota = l[0] || "";
        const pedido = l[14] || "";

        const cliente = `${l[18] || ""} - ${l[19] || ""}`;
        const representante = `${l[20] || ""} - ${l[21] || ""}`;
        const vendedor = `${l[22] || ""} - ${l[23] || ""}`;

let descricaoCompleta = "";
let resumoItens = {};
let totalRastreio = converterValorBR(l[COL_ENVIO]);

grupo.forEach(g => {

    const descricaoOriginal = (g[17] || "").toUpperCase();
    const quantidade = parseInt(g[16]) || 1;

    // 🔎 Extrai apenas o tipo principal (primeira palavra)
    let tipo = descricaoOriginal.split(" ")[0];

    // 🔥 Padroniza manualmente casos importantes
    if (descricaoOriginal.includes("BANDEIRA")) tipo = "BANDEIRA";
    if (descricaoOriginal.includes("PILOTAGEM")) tipo = "PILOTAGEM";
    if (descricaoOriginal.includes("CARTELA")) tipo = "CARTELA";

    if (!resumoItens[tipo]) {
        resumoItens[tipo] = 0;
    }

    resumoItens[tipo] += quantidade;
});

// 🔥 Monta descrição final consolidada
descricaoCompleta = Object.entries(resumoItens)
    .map(([tipo, qtd]) => `${qtd} ${tipo}`)
    .join("\n");

// 🔥 Monta descrição final agrupada

        totalGeral += totalRastreio;

        corpoTabela.push([
            rastreio,
            tipoEnvio,
            nota,
            pedido,
            cliente,
            representante,
            vendedor,
            descricaoCompleta.trim(),
            totalRastreio.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            })
        ]);
    });

    // 🔥 AGORA SIM GERA A TABELA

    // ===== HEADER AZUL PADRÃO EMPRESA =====

// Faixa azul
doc.setFillColor(19, 51, 102); // Azul corporativo (ajuste se necessário)
doc.rect(0, 0, 297, 25, "F"); // largura A4 paisagem = 297mm

// Logo 4K (texto estilizado)
doc.addImage(logoBase64, "PNG", 10, 4, 20, 15);
doc.setTextColor(255, 255, 255);

// Título
doc.setFontSize(14);
doc.setFont(undefined, "normal");
doc.text("RELATÓRIO DE ENVIO DE AMOSTRAS", 35, 15);

// Subtítulo período
doc.setFontSize(8);
doc.text(
    `Período: ${
        dataInicioFormatada || "Todos os registros"
    } ${
        dataFimFormatada ? "até " + dataFimFormatada : ""
    }`,
    35,
    20
);

// Reset cor do texto
doc.setTextColor(0, 0, 0);

    doc.autoTable({
    startY: 35,

    head: [[
        "Rastreio",
        "Tipo Envio",
        "NF",
        "Pedido",
        "Cliente",
        "Representante",
        "Vendedor",
        "Descrição",
        "Valor"
    ]],

    body: corpoTabela,


    styles: {
        fontSize: 7,
        halign: "center",
        valign: "middle"
    },
    
    headStyles: {
        fillColor: [220, 226, 238],
        textColor: 0,
        fontStyle: "bold",
        halign: "center",
        overflow: "visible"
    },

columnStyles: {
    0: { cellWidth: 25, overflow: "hidden" },
    1: { cellWidth: 15, overflow: "hidden" },
    2: { cellWidth: 15, overflow: "hidden" },
    3: { cellWidth: 15, overflow: "hidden" },
    4: { cellWidth: 55, overflow: "hidden" },
    5: { cellWidth: 55, overflow: "hidden" },
    6: { cellWidth: 40, overflow: "hidden" },

    // 🔥 SOMENTE DESCRIÇÃO quebra linha
    7: { cellWidth: 35, overflow: "linebreak", valign: "top" },

    8: { cellWidth: 20, overflow: "hidden" }
},

    theme: "grid",
    margin: { left: 10, right: 10 }
});

const totalPages = doc.internal.getNumberOfPages();

for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
        `Página ${i} de ${totalPages}`,
        270,
        200,
        { align: "right" }
    );
}

    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(
        `TOTAL GERAL: ${totalGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        })}`,
        14,
        finalY
    );

    doc.save("Relatorio_Envio_Amostras_4K.pdf");
}



function selecionarTodosFiltrados(masterCheckbox) {

    const linhas = document.querySelectorAll("#listaAnalises tr");

    linhas.forEach(linha => {
        if (linha.style.display !== "none") {
            const checkbox = linha.querySelector("input[type='checkbox']");
            if (checkbox) {
                checkbox.checked = masterCheckbox.checked;
            }
        }
    });


}



function ordenarPorValor(th) {

    const tbody = document.getElementById("listaAnalises");
    const linhas = Array.from(tbody.querySelectorAll("tr"));

    linhas.sort((a, b) => {
        const valorA = extrairValor(a);
        const valorB = extrairValor(b);
        return ordemCrescente ? valorA - valorB : valorB - valorA;
    });

    ordemCrescente = !ordemCrescente;

    linhas.forEach(linha => tbody.appendChild(linha));

    // 🔵 Atualiza visual do ícone
    th.classList.remove("asc", "desc");

    if (ordemCrescente) {
        th.classList.add("desc"); // porque já alternou
    } else {
        th.classList.add("asc");
    }
}
function extrairValor(linha) {

    const colunaValor = linha.children[6];

    if (!colunaValor) return 0;

    return parseFloat(
        colunaValor.innerText
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
    ) || 0;
}

function aplicarFiltroValor() {

    const somenteAcima100 = document.getElementById("filtro100").checked;

    let base = dadosGlobais;

    // 🔵 Primeiro aplica filtro de data se existir
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;

    if (dataInicio && dataFim) {
        const inicio = converterDataISOparaLocal(dataInicio);
        const fim = converterDataISOparaLocal(dataFim);

        inicio.setHours(0,0,0,0);
        fim.setHours(23,59,59,999);

        base = base.filter(l => {
            const dataPedido = converterDataBR(l[5]);
            if (!dataPedido) return false;
            return dataPedido >= inicio && dataPedido <= fim;
        });
    }

    // 🔵 Depois aplica filtro de valor
    if (somenteAcima100) {
        base = base.filter(l => converterValorBR(l[COL_ENVIO]) > 100);
    }
    document.getElementById("checkTodos").checked = false;

    renderizarTabela(base);

    if (document.getElementById("submenuCentroCusto").classList.contains("ativo")) {
    gerarResumoCentroCusto();

}
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "";

    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

const tabelaScroll = document.querySelector(".tabela-scroll");
const thead = document.querySelector(".tabela-analises thead");

tabelaScroll.addEventListener("scroll", () => {
    if (tabelaScroll.scrollTop > 0) {
        thead.classList.add("sombra-ativa");
    } else {
        thead.classList.remove("sombra-ativa");
    }
});

function filtrarPorData() {

    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;

    // 🔥 RESET DO FILTRO DE VALOR
    document.getElementById("filtro100").checked = false;

    if (!dataInicio || !dataFim) {
        renderizarTabela(dadosGlobais);
        document.getElementById("checkTodos").checked = false;
        return;
    }

    const inicio = converterDataISOparaLocal(dataInicio);
    const fim = converterDataISOparaLocal(dataFim);

    inicio.setHours(0,0,0,0);
    fim.setHours(23,59,59,999);

    const filtrados = dadosGlobais.filter(l => {
        const dataPedido = converterDataBR(l[5]);
        if (!dataPedido) return false;

        return dataPedido >= inicio && dataPedido <= fim;
    });

    renderizarTabela(filtrados);

    // 🔄 Reset do checkbox master
    document.getElementById("checkTodos").checked = false;
}

function converterDataISOparaLocal(dataISO) {
    if (!dataISO) return null;

    const [ano, mes, dia] = dataISO.split("-");
    return new Date(ano, mes - 1, dia);
}

let modoResumoCentroCusto = 'envios';
function abrirResumoCentroCusto(modo = 'envios') {
    modoResumoCentroCusto = modo === 'devolucoes' ? 'devolucoes' : 'envios';
    document.getElementById('submenuCentroCusto')?.classList.toggle('modo-resumo-devolucoes', modoResumoCentroCusto === 'devolucoes');
    const titulo = document.getElementById('tituloResumoCentroCusto');
    const descricao = document.getElementById('descricaoResumoCentroCusto');
    if (titulo) titulo.textContent = modoResumoCentroCusto === 'devolucoes' ? 'Centro de custo · Devoluções' : 'Centro de custo · Envios';
    if (descricao) descricao.textContent = modoResumoCentroCusto === 'devolucoes'
        ? 'Somente devoluções identificadas pelos Correios, respeitando o mês e a pesquisa selecionados.'
        : 'Envios agrupados por rastreio, respeitando os filtros de data e valor.';
    gerarResumoCentroCusto();
    document.getElementById('submenuCentroCusto').classList.add('ativo');
}
function obterLinhasResumoCentroCusto() {
    if (modoResumoCentroCusto === 'devolucoes') {
        // A mesma lista usada no card de valor e na tabela de devoluções.
        return devolucoesVisiveis.map(d => ({ centro: String(d.grupo?.[0]?.[10] || 'Não informado').trim() || 'Não informado', valor: d.valor }));
    }
    const grupos = new Map();
    obterBaseAtualFiltrada().forEach(l => {
        const rastreio = String(l[1] || '').trim();
        if (rastreio && !grupos.has(rastreio)) grupos.set(rastreio, l);
    });
    return [...grupos.values()].map(l => ({ centro: String(l[10] || 'Não informado').trim() || 'Não informado', valor: converterValorBR(l[COL_ENVIO]) }));
}
function calcularResumoCentroCusto() {
    const resumo = new Map(); let totalGeral = 0;
    obterLinhasResumoCentroCusto().forEach(({centro, valor}) => {
        const v = Number(valor) || 0;
        resumo.set(centro, (resumo.get(centro) || 0) + v);
        totalGeral += v;
    });
    return { resumo: [...resumo.entries()].sort((a,b) => b[1]-a[1]), totalGeral };
}
function toggleResumoCentroCusto() {

    const submenu = document.getElementById("submenuCentroCusto");

    if (submenu.classList.contains("ativo")) {
        submenu.classList.remove("ativo");
        return;
    }

    gerarResumoCentroCusto();
    submenu.classList.add("ativo");
}
function obterBaseAtualFiltrada() {

    let base = dadosGlobais;

    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;
    const somenteAcima100 = document.getElementById("filtro100").checked;

    // 🔵 Filtro por data
    if (dataInicio && dataFim) {

        const inicio = converterDataISOparaLocal(dataInicio);
        const fim = converterDataISOparaLocal(dataFim);

        inicio.setHours(0,0,0,0);
        fim.setHours(23,59,59,999);

        base = base.filter(l => {
            const dataPedido = converterDataBR(l[5]);
            if (!dataPedido) return false;
            return dataPedido >= inicio && dataPedido <= fim;
        });
    }

    // 🔵 Filtro por valor
    if (somenteAcima100) {
        base = base.filter(l => converterValorBR(l[COL_ENVIO]) > 100);
    }

    return base;
}

function gerarResumoCentroCusto() {
    const tbody = document.getElementById('tabelaCentroCusto');
    if (!tbody) return;
    tbody.replaceChildren();
    const { resumo, totalGeral } = calcularResumoCentroCusto();
    const moeda = valor => valor.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    resumo.forEach(([centro, valor]) => {
        const tr = document.createElement('tr');
        const percentual = totalGeral ? (valor / totalGeral * 100).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) : '0,00';
        [centro, moeda(valor), percentual + '%'].forEach(texto => {
            const td = document.createElement('td'); td.textContent = texto; tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    const tr = document.createElement('tr'); tr.className = 'centro-total';
    ['TOTAL GERAL', moeda(totalGeral), resumo.length ? '100,00%' : '0,00%'].forEach(texto => {
        const td = document.createElement('td'); td.textContent = texto; tr.appendChild(td);
    });
    tbody.appendChild(tr);
}
function fecharModalCentro() {
    document.getElementById("modalCentroCusto").classList.remove("ativo");
}
function fecharCentroCusto() {
    document.getElementById("submenuCentroCusto").classList.remove("ativo");
}
const overlayCentro = document.getElementById("submenuCentroCusto");

overlayCentro.addEventListener("click", function(e) {

    if (e.target === overlayCentro) {
        fecharCentroCusto();
    }

});
async function gerarPDFCentroCusto() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const { resumo, totalGeral } = calcularResumoCentroCusto();
    const corpoTabela = resumo.map(([centro, total]) => [
        centro,
        total.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}),
        (totalGeral ? total / totalGeral * 100 : 0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + '%'
    ]);

    await carregarLogo(); // garante que a logo carregou

// =========================
// HEADER PADRÃO 4K
// =========================

// Faixa azul
doc.setFillColor(19, 51, 102);
doc.rect(0, 0, 210, 25, "F");

// Logo
doc.addImage(logoBase64, "PNG", 10, 4, 20, 15);

// Texto branco
doc.setTextColor(255, 255, 255);

// Título
doc.setFontSize(13);
doc.setFont(undefined, "normal");
doc.text("CUSTOS POR DEPARTAMENTOS", 35, 14);

// Período dinâmico
const dataInicio = document.getElementById("dataInicio").value;
const dataFim = document.getElementById("dataFim").value;

doc.setFontSize(8);
doc.text(
    `Período: ${
        dataInicio ? formatarDataBR(dataInicio) : "Todos os registros"
    } ${
        dataFim ? "até " + formatarDataBR(dataFim) : ""
    }`,
    35,
    19
);

// Reset cor texto
doc.setTextColor(0, 0, 0);

// Faixa cinza inferior
doc.setFillColor(230, 230, 230);
doc.rect(0, 25, 210, 5, "F");

    doc.autoTable({
    startY: 35,
    head: [["Centro de Custo", "Valor Total", "% Total"]],
    body: corpoTabela,
    theme: "grid",

    headStyles: {
        fillColor: [220, 226, 238],
        textColor: 0,
        fontStyle: "bold",
        halign: "center"
    },

    columnStyles: {
        1: { halign: "center" }, // Valor Total
        2: { halign: "center" }  // Percentual
    }
});

    const finalY = doc.lastAutoTable.finalY + 10;

   const textoTotal = `TOTAL GERAL: ${totalGeral.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
})}`;

    // Fundo cinza claro atrás do total
    doc.setFillColor(240, 240, 240);
    doc.rect(10, finalY - 6, 190, 10, "F");

    // Texto do total
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(textoTotal, 14, finalY);

    doc.save("Resumo_Centro_Custo_4K.pdf");
}

function filtrarPorRastreio() {
    const input = document.getElementById('inputRastreio');
    if (!input) return;
    const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const busca = normalizar(input.value.trim());
    document.querySelectorAll('#listaAnalises tr').forEach(linha => {
        linha.style.display = normalizar(linha.textContent).includes(busca) ? '' : 'none';
    });
}

function mostrarSecao(id) {

    // 🔹 Esconde todas as seções
    document.querySelectorAll(".secao").forEach(sec => {
        sec.classList.remove("ativa");
    });

    // 🔹 Mostra a seção clicada
    const secaoAtiva = document.getElementById(id);
    if (secaoAtiva) {
        secaoAtiva.classList.add("ativa");
    }

    // 🔹 Destaca botão ativo na sidebar
    document.querySelectorAll(".sidebar button").forEach(btn => {
        btn.classList.remove("ativo");
    });

    const botaoClicado = document.querySelector(
        `.sidebar button[onclick="mostrarSecao('${id}')"]`
    );

    if (botaoClicado) {
        botaoClicado.classList.add("ativo");
    }

    // 🔹 Fecha a sidebar (se estiver usando modo oculto)
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("ativa");

    const overlay = document.querySelector(".overlay-sidebar");
    if (overlay) overlay.classList.remove("ativo");
}
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("ativa");

    const overlay = document.querySelector(".overlay-sidebar");
    if (overlay) overlay.classList.toggle("ativo");
}

// fechar clicando fora
document.addEventListener("click", function(e) {
    const sidebar = document.querySelector(".sidebar");
    const btn = document.querySelector(".btn-menu");

    if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
        sidebar.classList.remove("ativa");

        const overlay = document.querySelector(".overlay-sidebar");
        if (overlay) overlay.classList.remove("ativo");
    }
});

// marcação de pagina ao clicar na barra lateral
const links = document.querySelectorAll(".menu-btn");

links.forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add("ativo");
    }
});
const botoes = document.querySelectorAll(".menu-btn");
const paginaAtual = window.location.pathname;

botoes.forEach(btn => {
    if (
        (paginaAtual.includes("analytics.html") && btn.textContent.includes(" Análises de Amostras")) ||
        (paginaAtual.includes("retornos.html") && btn.textContent.includes("Retorno de Amostras")) ||
        (paginaAtual.includes("dash.html") && btn.textContent.includes("Dashboard"))
    ) {
        btn.classList.add("ativo");
    }
});

// ================= LOGOUT =================
document.addEventListener("DOMContentLoaded", () => {
    const btnLogout = document.getElementById("btnLogout");

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {

            // 🔥 limpa tudo que você usa de sessão
            localStorage.clear();
            sessionStorage.clear();

            // 🔥 se você salva algo tipo "usuarioLogado"
            // localStorage.removeItem("usuario");

            // 🔥 redireciona
            window.location.href = "index.html";
        });
    }
});

// ================= PAINEL DE DEVOLUÇÕES =================
// Mesma origem de dados utilizada pela tabela de envios. Situação/status:
// coluna 25 = situação, 26 = status, 27 = data do status/postagem.
let modoAnalytics = 'envios';
let devolucoesVisiveis = [];
const moedaDevolucao = valor => Number(valor || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const textoSeguroDevolucao = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// A mesma rota de resumo e a mesma prioridade de retorno usadas no Rastreio.
const API_DEVOLUCOES_CORREIOS = 'https://rastreio-amostras-backend-production.up.railway.app/rastreio-correios';
const CACHE_DEVOLUCOES_CORREIOS = 'rastreiosCorreiosStatus';
const statusDevolucoesCorreios = new Map();
let consultaDevolucoesEmAndamento = false;
let consultaDevolucoesConcluida = false;
function normalizarTextoCorreios(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
function normalizarCodigoCorreios(v) { return String(v || '').trim().toUpperCase().replace(/\s+/g,''); }
function classificarDevolucaoCorreios(status) {
    const texto = normalizarTextoCorreios(`${status?.codigoEvento || status?.codigo || ''} ${status?.status || ''} ${status?.descricao || ''} ${status?.situacao || ''}`);
    if (/ENTREGUE AO REMETENTE|DEVOLVID[OA] AO REMETENTE|DEVOLUCAO AO REMETENTE|RETORNAD[OA] AO REMETENTE|RETORNOU AO REMETENTE|DEVOLVID[OA]|DEVOLUCAO|RETORN/.test(texto)) return 'RETORN';
    return normalizarTextoCorreios(status?.situacao) === 'RETORN' ? 'RETORN' : 'OUTRO';
}
function ehDevolucao(l) {
    const codigo = normalizarCodigoCorreios(l[1]);
    return codigo && classificarDevolucaoCorreios(statusDevolucoesCorreios.get(codigo)) === 'RETORN';
}
function atualizarAvisoDevolucoes(texto) {
    const el = document.getElementById('avisoDevolucao');
    if (el) el.textContent = texto;
    const topo = document.getElementById('statusCorreiosTopo');
    if (topo) {
        topo.classList.toggle('status-finalizado', /conclu[ií]da|conclu[ií]do/i.test(texto));
        topo.classList.toggle('status-falha', /erro|falha|nenhum c[oó]digo/i.test(texto));
    }
}
async function iniciarConsultaDevolucoesCorreios() {
    if (consultaDevolucoesEmAndamento) return;
    consultaDevolucoesEmAndamento = true;
    const codigos = [...new Set(dadosGlobais.map(l => normalizarCodigoCorreios(l[1])).filter(c => /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c)))];
    if (!codigos.length) { consultaDevolucoesEmAndamento = false; consultaDevolucoesConcluida = true; atualizarAvisoDevolucoes('Nenhum código de rastreio válido encontrado na planilha.'); renderizarDevolucoes(); return; }
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(CACHE_DEVOLUCOES_CORREIOS) || '{}') || {}; } catch (_) {}
    for (const codigo of codigos) if (cache[codigo]) statusDevolucoesCorreios.set(codigo, cache[codigo]);
    renderizarDevolucoes();
    atualizarAvisoDevolucoes(`Consultando Correios: 0/${codigos.length} rastreios. Resultados parciais.`);
    let indice = 0, concluidos = 0, falhas = 0;
    const trabalhadores = Array.from({length:Math.min(8,codigos.length)}, async () => {
        while (indice < codigos.length) {
            const codigo = codigos[indice++];
            try {
                const controlador = new AbortController();
                const temporizador = setTimeout(() => controlador.abort(), 20000);
                let resposta;
                try { resposta = await fetch(`${API_DEVOLUCOES_CORREIOS}/${encodeURIComponent(codigo)}/resumo`, {cache:'no-store',signal:controlador.signal}); }
                finally { clearTimeout(temporizador); }
                if (!resposta.ok) throw Error(`HTTP ${resposta.status}`);
                const dados = await resposta.json();
                if (!dados?.sucesso || !dados?.resumo) throw Error('Resumo não disponível');
                const status = {...dados.resumo, situacao:classificarDevolucaoCorreios(dados.resumo)};
                statusDevolucoesCorreios.set(codigo,status);
                cache[codigo] = status;
            } catch (erro) { falhas++; console.warn('Correios',codigo,erro); }
            concluidos++;
            if (concluidos % 5 === 0 || concluidos === codigos.length) {
                atualizarAvisoDevolucoes(`Correios: ${concluidos}/${codigos.length} consultados${falhas ? ` · ${falhas} falhas` : ''}`);
                renderizarDevolucoes();
            }
        }
    });
    await Promise.all(trabalhadores);
    try { localStorage.setItem(CACHE_DEVOLUCOES_CORREIOS,JSON.stringify(cache)); } catch (_) {}
    consultaDevolucoesConcluida = true;
    consultaDevolucoesEmAndamento = false;
    atualizarAvisoDevolucoes(`Consulta concluída: ${codigos.length - falhas}/${codigos.length} rastreios verificados nos Correios${falhas ? ` · ${falhas} falhas` : ''}`);
    renderizarDevolucoes();
}
function formatarDataDevolucao(valor) {
    if (!valor) return 'Não informada';
    const texto = String(valor);
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
    return texto;
}
function alternarAnalytics(modo) {
    modoAnalytics = modo;
    document.getElementById('painelEnviosAnalytics').hidden = modo !== 'envios';
    document.getElementById('painelDevolucoesAnalytics').hidden = modo !== 'devolucoes';
    document.getElementById('abaEnvios').classList.toggle('selecionada', modo === 'envios');
    document.getElementById('abaDevolucoes').classList.toggle('selecionada', modo === 'devolucoes');
    document.body.classList.toggle('modo-devolucoes', modo === 'devolucoes');
    document.querySelector('.titulo-sistema').textContent = modo === 'devolucoes' ? 'Análise | Devoluções de Amostras' : 'Análise | Envio de Amostras';
    if (modo === 'envios') desenharGraficosEnvios(dadosGlobais);
    if (modo === 'devolucoes') { renderizarDevolucoes(); if (!consultaDevolucoesEmAndamento && !consultaDevolucoesConcluida && dadosGlobais.length) iniciarConsultaDevolucoesCorreios(); }
}
let mesDevolucaoSelecionado = null;
const mesesDevolucaoPT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function chaveMesDevolucao(valor) {const m=String(valor||'').match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m ? `${m[3]}-${m[2]}` : '';}
function rotuloMesDevolucao(chave) {if(!chave)return '—';const [ano,mes]=chave.split('-');return `${mesesDevolucaoPT[Number(mes)-1]||'—'}/${ano.slice(-2)}`;}
function limparFiltroMesDevolucao(){mesDevolucaoSelecionado=null;renderizarDevolucoes();}
function selecionarMesDevolucao(chave){mesDevolucaoSelecionado=mesDevolucaoSelecionado===chave?null:chave;renderizarDevolucoes();}
function obterDevolucoes() {
    const grupos = new Map();
    dadosGlobais.filter(ehDevolucao).forEach(l => {
        const chave = String(l[1] || '').trim() || `NF:${l[0] || ''}|PED:${l[14] || ''}`;
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push(l);
    });
    return Array.from(grupos.values()).map(grupo => {
        const l = grupo[0];
        const correios = statusDevolucoesCorreios.get(normalizarCodigoCorreios(l[1])) || {};
        const dataStatus = formatarDataDevolucao(correios.data);
        return {grupo, rastreio:l[1] || '', pedido:l[14] || '', data:dataStatus,
            valor:converterValorBR(l[COL_ENVIO]), tipo: l[2] || 'Não informado',
            cliente:l[19] || 'Não informado', vendedor:l[23] || 'Não informado', codigoVendedor:l[22] || '', marca:l[24] || 'Não informada',
            nota:l[0] || '', situacao:correios.situacao || '', status:correios.descricao || correios.status || '',
            cidade:l[11] || '', uf:l[12] || '', representante:l[21] || '',
            dataEnvio:l[5] || ''};
    });
}
function renderizarDevolucoes() {
    const tbody = document.getElementById('listaDevolucoes'); if (!tbody) return;
    const busca = (document.getElementById('buscaDevolucoes')?.value || '').toLocaleLowerCase('pt-BR');
    const todos = obterDevolucoes().filter(d => [d.cliente,d.vendedor,d.codigoVendedor,d.marca,d.pedido,d.nota,d.rastreio,d.tipo].join(' ').toLocaleLowerCase('pt-BR').includes(busca));
    devolucoesVisiveis = todos.filter(d => !mesDevolucaoSelecionado || chaveMesDevolucao(d.data) === mesDevolucaoSelecionado);
    tbody.replaceChildren();let total = 0;
    devolucoesVisiveis.forEach((d,i) => {
        total += d.valor;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><span class="dash-month-pill">${textoSeguroDevolucao(rotuloMesDevolucao(chaveMesDevolucao(d.data)))}</span></td><td>${textoSeguroDevolucao(d.marca)}</td><td>${textoSeguroDevolucao(d.pedido)}</td><td>${textoSeguroDevolucao(d.nota)}</td><td>${textoSeguroDevolucao(d.cliente)}</td><td>${textoSeguroDevolucao([d.codigoVendedor,d.vendedor].filter(Boolean).join(' - '))}</td><td class="dash-cost">${moedaDevolucao(d.valor)}</td><td><button type="button" class="lupa-devolucao" aria-label="Ver detalhes da devolução" data-indice="${i}">🔎</button></td>`;
        tr.querySelector('button').addEventListener('click', () => abrirDetalhesDevolucao(i));tbody.appendChild(tr);
    });
    if (!devolucoesVisiveis.length) {const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=8;td.textContent=consultaDevolucoesConcluida ? 'Nenhuma devolução encontrada para os filtros selecionados.' : 'Consultando os Correios. Aguarde a atualização dos resultados...';tr.appendChild(td);tbody.appendChild(tr);}
    document.getElementById('totalDevolucoes').textContent = devolucoesVisiveis.length;
    document.getElementById('valorDevolucoes').textContent = moedaDevolucao(total);
    document.getElementById('clientesDevolucoes').textContent = new Set(devolucoesVisiveis.map(d=>d.cliente).filter(Boolean)).size.toLocaleString('pt-BR');
    const limpar=document.getElementById('limparFiltroMes');if(limpar)limpar.hidden=!mesDevolucaoSelecionado;
    desenharGraficosDevolucoes(todos);
}
function abrirDetalhesDevolucao(indice) {
    const d = devolucoesVisiveis[indice]; if (!d) return;
    const campos = [['Mês',rotuloMesDevolucao(chaveMesDevolucao(d.data))],['Marca',d.marca],['Pedido',d.pedido],['Nota fiscal',d.nota],['Cliente',d.cliente],['Vendedora',[d.codigoVendedor,d.vendedor].filter(Boolean).join(' - ')],['Custo',moedaDevolucao(d.valor)],['Rastreio',d.rastreio],['Data e horário da devolutiva',d.data || 'Não informados pelos Correios'],['Representante',d.representante],['Cidade - UF',[d.cidade,d.uf].filter(Boolean).join(' - ')],['Tipo de envio',d.tipo],['Data do envio',d.dataEnvio],['Situação',d.situacao],['Status dos Correios',d.status]];
    document.getElementById('camposDevolucao').innerHTML = campos.map(([titulo,valor]) => `<div class="campo"><span class="label">${textoSeguroDevolucao(titulo)}</span><span>${textoSeguroDevolucao(valor || '—')}</span></div>`).join('');
    const itens = document.getElementById('itensDevolucao');itens.replaceChildren();
    d.grupo.forEach(l => {const li=document.createElement('li');li.textContent=`${l[16] || 1} × ${l[17] || ''} — ${l[15] || ''}`;itens.appendChild(li);});
    document.getElementById('modalDevolucao').classList.add('ativo');
}
function fecharDetalhesDevolucao() { document.getElementById('modalDevolucao').classList.remove('ativo'); }
document.getElementById('modalDevolucao')?.addEventListener('click', e => {if(e.target.id === 'modalDevolucao') fecharDetalhesDevolucao();});
document.addEventListener('keydown',e=>{if(e.key==='Escape') fecharDetalhesDevolucao();});

// Gráficos sem dependências externas; o gráfico mensal também filtra a tabela.
function desenharGraficosDevolucoes(registros) {
  const mensal = new Map();
  registros.forEach(d => {const chave=chaveMesDevolucao(d.data);if(!chave)return;const item=mensal.get(chave)||{qtd:0,valor:0};item.qtd++;item.valor+=Number(d.valor)||0;mensal.set(chave,item);});
  const meses=[...mensal.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
  const areaMes=document.getElementById('graficoDevolucoes');
  if(areaMes){areaMes.replaceChildren();areaMes.classList.toggle('dash-chart-empty',!meses.length);
    if(!meses.length)areaMes.textContent='Os meses aparecerão quando os Correios informarem as datas das devoluções.';
    else {const max=Math.max(1,...meses.map(x=>x[1].qtd));meses.forEach(([chave,item])=>{
      const col=document.createElement('button');col.type='button';col.className='dash-bar-col dash-bar-button'+(mesDevolucaoSelecionado===chave?' selecionado':'');col.title=`Filtrar ${rotuloMesDevolucao(chave)}: ${item.qtd} devoluções`;col.setAttribute('aria-pressed',String(mesDevolucaoSelecionado===chave));col.onclick=()=>selecionarMesDevolucao(chave);
      const valor=document.createElement('strong');valor.textContent=item.qtd;const barra=document.createElement('div');barra.className='dash-bar';barra.style.height=`${Math.max(8,Math.round(item.qtd/max*145))}px`;const label=document.createElement('span');label.textContent=rotuloMesDevolucao(chave);col.append(valor,barra,label);areaMes.appendChild(col);
    });}
  }
  const areaValor=document.getElementById('graficoValorDevolucoes');if(!areaValor)return;
  areaValor.replaceChildren();areaValor.classList.toggle('dash-chart-empty',!meses.length);
  if(!meses.length){areaValor.textContent='Os valores mensais aparecerão conforme as devoluções forem identificadas.';return;}
  const valores=meses.map(x=>x[1].valor);const max=Math.max(1,...valores);const w=600,h=190,left=22,right=18,top=26,bottom=40;const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Evolução mensal dos valores dos envios devolvidos');
  const pts=meses.map(([chave,item],i)=>({x:left+(meses.length===1?.5:i/(meses.length-1))*(w-left-right),y:top+(1-item.valor/max)*(h-top-bottom),chave,valor:item.valor}));
  for(let i=0;i<3;i++){const y=top+i*(h-top-bottom)/2;const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:left,y1:y,x2:w-right,y2:y,stroke:'#e9edf4','stroke-dasharray':'4 5'}))line.setAttribute(k,v);svg.appendChild(line);}
  const poly=document.createElementNS(ns,'polyline');poly.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke','#b42332');poly.setAttribute('stroke-width','3.5');poly.setAttribute('stroke-linejoin','round');poly.setAttribute('stroke-linecap','round');svg.appendChild(poly);
  pts.forEach(p=>{const circle=document.createElementNS(ns,'circle');for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r:5,fill:'#fff',stroke:'#b42332','stroke-width':3}))circle.setAttribute(k,v);const title=document.createElementNS(ns,'title');title.textContent=`${rotuloMesDevolucao(p.chave)}: ${moedaDevolucao(p.valor)}`;circle.appendChild(title);svg.appendChild(circle);const label=document.createElementNS(ns,'text');label.setAttribute('x',p.x);label.setAttribute('y',h-12);label.setAttribute('text-anchor','middle');label.setAttribute('fill','#7b8797');label.setAttribute('font-size','13');label.textContent=rotuloMesDevolucao(p.chave);svg.appendChild(label);});areaValor.appendChild(svg);
}

// Painel executivo de Envios — mantém os filtros originais e adiciona interação mensal.
let mesEnviosSelecionado = null;
function obterDataEnvio(linha) {
  const d = converterDataBR(linha[5]);
  return d instanceof Date && !isNaN(d.getTime()) ? d : null;
}
function chaveMesEnvio(linha) {const d=obterDataEnvio(linha);return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : '';}
function dadosEnviosFiltrados() {
  const inicio=document.getElementById('dataInicio')?.value;
  const fim=document.getElementById('dataFim')?.value;
  const acima=document.getElementById('filtro100')?.checked;
  return dadosGlobais.filter(l=>{
    const d=obterDataEnvio(l);
    if(inicio && (!d || d < converterDataISOparaLocal(inicio))) return false;
    if(fim) {const limite=converterDataISOparaLocal(fim);limite.setHours(23,59,59,999);if(!d||d>limite)return false;}
    if(mesEnviosSelecionado && chaveMesEnvio(l)!==mesEnviosSelecionado)return false;
    if(acima && converterValorBR(l[COL_ENVIO])<=100)return false;
    return true;
  });
}
function atualizarPainelEnvios(){renderizarTabela(dadosEnviosFiltrados());filtrarPorRastreio();}
function selecionarMesEnvios(mes){mesEnviosSelecionado=mesEnviosSelecionado===mes?null:mes;atualizarPainelEnvios();}
function limparMesEnvios(){mesEnviosSelecionado=null;atualizarPainelEnvios();}
function limparDatasEnvios(){document.getElementById('dataInicio').value='';document.getElementById('dataFim').value='';mesEnviosSelecionado=null;atualizarPainelEnvios();}
// Sobrescreve apenas a aplicação de filtros, preservando os demais recursos da tabela.
filtrarPorData = function(){atualizarPainelEnvios();};
aplicarFiltroValor = function(){atualizarPainelEnvios();};
function desenharGraficosEnvios(registros) {
  const mensal=new Map(),grupos=new Map();
  registros.forEach(l=>{const codigo=String(l[1]||'').trim();if(codigo&&!grupos.has(codigo))grupos.set(codigo,l);});
  grupos.forEach(l=>{const chave=chaveMesEnvio(l);if(!chave)return;const item=mensal.get(chave)||{qtd:0,valor:0};item.qtd++;item.valor+=converterValorBR(l[COL_ENVIO]);mensal.set(chave,item);});
  const meses=[...mensal.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);
  const barras=document.getElementById('graficoEnvios');const linha=document.getElementById('graficoValorEnvios');if(!barras||!linha)return;
  barras.replaceChildren();linha.replaceChildren();
  document.getElementById('limparMesEnvios').hidden=!mesEnviosSelecionado;
  if(!meses.length){barras.textContent='Sem envios com data válida.';linha.textContent='Sem valores mensais disponíveis.';return;}
  const maxQtd=Math.max(1,...meses.map(x=>x[1].qtd));
  meses.forEach(([chave,item])=>{const btn=document.createElement('button');btn.type='button';btn.className='dash-bar-col dash-bar-button'+(mesEnviosSelecionado===chave?' selecionado':'');btn.title=`Filtrar ${rotuloMesDevolucao(chave)}: ${item.qtd} envios`;btn.setAttribute('aria-pressed',String(mesEnviosSelecionado===chave));btn.onclick=()=>selecionarMesEnvios(chave);const num=document.createElement('strong');num.textContent=item.qtd;const barra=document.createElement('div');barra.className='dash-bar';barra.style.height=`${Math.max(8,Math.round(item.qtd/maxQtd*145))}px`;const rotulo=document.createElement('span');rotulo.textContent=rotuloMesDevolucao(chave);btn.append(num,barra,rotulo);barras.appendChild(btn);});
  const w=600,h=190,left=25,right=20,top=24,bottom=40,ns='http://www.w3.org/2000/svg',maxValor=Math.max(1,...meses.map(x=>x[1].valor));
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Valor dos envios por mês');
  for(let i=0;i<3;i++){const y=top+i*(h-top-bottom)/2;const g=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:left,y1:y,x2:w-right,y2:y,stroke:'#e9edf4','stroke-dasharray':'4 5'}))g.setAttribute(k,v);svg.appendChild(g);}
  const pts=meses.map(([chave,item],i)=>({x:left+(meses.length===1?.5:i/(meses.length-1))*(w-left-right),y:top+(1-item.valor/maxValor)*(h-top-bottom),chave,valor:item.valor}));
  const poly=document.createElementNS(ns,'polyline');poly.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke','#2563a6');poly.setAttribute('stroke-width','3.5');svg.appendChild(poly);
  pts.forEach(p=>{const dot=document.createElementNS(ns,'circle');for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r:5,fill:'#fff',stroke:'#2563a6','stroke-width':3}))dot.setAttribute(k,v);const title=document.createElementNS(ns,'title');title.textContent=`${rotuloMesDevolucao(p.chave)}: ${moedaDevolucao(p.valor)}`;dot.appendChild(title);svg.appendChild(dot);const label=document.createElementNS(ns,'text');for(const [k,v] of Object.entries({x:p.x,y:h-12,'text-anchor':'middle',fill:'#7b8797','font-size':'13'}))label.setAttribute(k,v);label.textContent=rotuloMesDevolucao(p.chave);svg.appendChild(label);});linha.appendChild(svg);
}

// V5: gráfico alternável e centros de custo dinâmicos (sem alterar a consulta aos Correios).
const visualAnalytics={envios:{grafico:'envios',centro:'custos'},devolucoes:{grafico:'envios',centro:'custos'}};
function alterarGraficoAnalytics(modo, tipo){
 visualAnalytics[modo].grafico=tipo;
 visualAnalytics[modo].centro=tipo;
 atualizarVisuaisAnalytics(modo);
}

function dadosMensaisAnalytics(modo){
 const base=modo==='envios'?dadosEnviosFiltrados():devolucoesVisiveis;
 const grupos=new Map();
 if(modo==='envios')base.forEach(l=>{const chave=String(l[1]||'').trim()||`NF:${l[0]}|PED:${l[14]}`;if(!grupos.has(chave))grupos.set(chave,l);});
 const linhas=modo==='envios'?[...grupos.values()].map(l=>({mes:chaveMesEnvio(l),valor:converterValorBR(l[COL_ENVIO]),centro:String(l[10]||'Não informado').trim(),pedido:String(l[14]||'')})):base.map(d=>({mes:chaveMesDevolucao(d.data),valor:Number(d.valor)||0,centro:String(d.grupo?.[0]?.[10]||'Não informado').trim(),pedido:String(d.pedido||'')}));
 return linhas;
}
function atualizarVisuaisAnalytics(modo){
 const cap=modo==='envios'?'Envios':'Devolucoes',rotulo=modo==='envios'?'Envios':'Devoluções',state=visualAnalytics[modo],linhas=dadosMensaisAnalytics(modo);
 const chart=document.getElementById('graficoPrincipal'+cap),cc=document.getElementById('centroCustoPainel'+cap);if(!chart||!cc)return;
 const mensal=new Map();linhas.forEach(l=>{if(!l.mes)return;const v=mensal.get(l.mes)||{qtd:0,valor:0};v.qtd++;v.valor+=l.valor;mensal.set(l.mes,v);});
 const meses=[...mensal.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);
 const custo=state.grafico==='custos',selected=modo==='envios'?mesEnviosSelecionado:mesDevolucaoSelecionado;
 document.getElementById('tituloGrafico'+cap).textContent=custo?'Custos R$ por mês':rotulo+' por mês';
 [['botaoQtd'+cap,!custo],['botaoCusto'+cap,custo]].forEach(([id,active])=>document.getElementById(id)?.classList.toggle('ativo',active));
 chart.replaceChildren();chart.className=custo?'dash-chart-line dash-line-v5':'dash-chart-bars';
 if(!meses.length){chart.textContent='Sem dados mensais disponíveis para os filtros selecionados.';}else if(!custo){
  const max=Math.max(1,...meses.map(x=>x[1].qtd));meses.forEach(([mes,item])=>{const b=document.createElement('button');b.type='button';b.className='dash-bar-col dash-bar-button'+(selected===mes?' selecionado':'');b.setAttribute('aria-pressed',String(selected===mes));b.title='Filtrar '+rotuloMesDevolucao(mes);b.onclick=()=>modo==='envios'?selecionarMesEnvios(mes):selecionarMesDevolucao(mes);const num=document.createElement('strong');num.textContent=item.qtd;const bar=document.createElement('div');bar.className='dash-bar';bar.style.height=Math.max(8,Math.round(item.qtd/max*145))+'px';const label=document.createElement('span');label.textContent=rotuloMesDevolucao(mes);b.append(num,bar,label);chart.appendChild(b);});
 }else{
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),w=680,h=235,pad=65,max=Math.max(1,...meses.map(x=>x[1].valor));svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Evolução mensal de custos em reais');const points=meses.map(([m,v],i)=>({x:pad+(meses.length===1?.5:i/(meses.length-1))*(w-pad*2),y:36+(1-v.valor/max)*130,m,valor:v.valor}));
  const poly=document.createElementNS(ns,'polyline');poly.setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke',modo==='envios'?'#2563a6':'#b42332');poly.setAttribute('stroke-width','3');svg.appendChild(poly);
  points.forEach(p=>{const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r','5');circle.setAttribute('fill',modo==='envios'?'#2563a6':'#b42332');svg.appendChild(circle);const valor=document.createElementNS(ns,'text');valor.setAttribute('x',p.x);valor.setAttribute('y',Math.max(15,p.y-12));valor.setAttribute('text-anchor','middle');valor.setAttribute('font-size','11');valor.setAttribute('fill','#344054');valor.textContent=moedaDevolucao(p.valor);svg.appendChild(valor);const mes=document.createElementNS(ns,'text');mes.setAttribute('x',p.x);mes.setAttribute('y','218');mes.setAttribute('text-anchor','middle');mes.setAttribute('font-size','12');mes.setAttribute('fill','#667085');mes.textContent=rotuloMesDevolucao(p.m);svg.appendChild(mes);});chart.appendChild(svg);
 }
 const clear=document.getElementById('limparMes'+cap);if(clear)clear.hidden=!selected;
 const centros=new Map();linhas.filter(l=>!selected || l.mes===selected).forEach(l=>{const nome=l.centro||'Não informado',a=centros.get(nome)||{qtd:0,valor:0,pedidos:new Set()};a.valor+=l.valor;if(l.pedido)a.pedidos.add(l.pedido);else a.qtd++;centros.set(nome,a);});
 const dados=[...centros.entries()].sort((a,b)=>custo?b[1].valor-a[1].valor:(b[1].pedidos.size+b[1].qtd)-(a[1].pedidos.size+a[1].qtd));
 cc.replaceChildren();if(!dados.length){cc.textContent='Nenhum centro de custo para os filtros atuais.';return;}
 const maxCC=Math.max(1,...dados.map(x=>custo?x[1].valor:x[1].pedidos.size+x[1].qtd));
 dados.forEach(([nome,d])=>{const item=document.createElement('div');item.className='dash-cc-item';const top=document.createElement('div');top.className='dash-cc-top';const label=document.createElement('span');label.textContent=nome;const valor=document.createElement('strong');valor.textContent=custo?moedaDevolucao(d.valor):`${d.pedidos.size+d.qtd} pedidos`;top.append(label,valor);const track=document.createElement('div');track.className='dash-cc-track';const fill=document.createElement('div');fill.className='dash-cc-fill';fill.style.width=(100*(custo?d.valor:d.pedidos.size+d.qtd)/maxCC)+'%';track.appendChild(fill);const sub=document.createElement('small');sub.textContent=`${d.pedidos.size+d.qtd} pedidos · ${moedaDevolucao(d.valor)}`;item.append(top,track,sub);cc.appendChild(item);});
}
// Mantém os pontos de entrada originais, substituindo apenas a visualização dos gráficos.
desenharGraficosEnvios=function(){atualizarVisuaisAnalytics('envios');};
desenharGraficosDevolucoes=function(){atualizarVisuaisAnalytics('devolucoes');};
