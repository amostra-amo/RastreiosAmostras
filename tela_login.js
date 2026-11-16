document.addEventListener("DOMContentLoaded", function () {

    // ============================================================
    // VERIFICAR LOGIN PERSISTENTE
    // ============================================================

    const usuarioPersistente =
        localStorage.getItem("usuarioLogado");

    const manterConectadoPersistente =
        localStorage.getItem("manterConectado");

    if (
        usuarioPersistente &&
        manterConectadoPersistente === "true"
    ) {

        console.log(
            "Login persistente encontrado:",
            usuarioPersistente
        );

        window.location.href =
            "tela_inicio.html";

        return;
    }


    // ============================================================
    // ELEMENTOS DO LOGIN
    // ============================================================

    const formLogin = document.getElementById("formLogin");
    const erroLogin = document.getElementById("erroLogin");
    const manterConectado =
        document.getElementById("manterConectado");
// ============================================================
// CADASTRO DE NOVA CONTA
// ============================================================

const btnCriarConta =
    document.getElementById("btnCriarConta");

const areaCadastro =
    document.getElementById("areaCadastro");

const etapaCadastro1 =
    document.getElementById("etapaCadastro1");

const etapaCadastro2 =
    document.getElementById("etapaCadastro2");

const btnValidarCadastro =
    document.getElementById("btnValidarCadastro");

const btnFinalizarCadastro =
    document.getElementById("btnFinalizarCadastro");

const btnVoltarLogin =
    document.getElementById("btnVoltarLogin");

const erroCadastro =
    document.getElementById("erroCadastro");
const separadorLogin =
    document.querySelector(".separador-login");

const painelLogoQuatroK =
    document.getElementById("painelLogoQuatroK");
let cadastroToken = null;
    const usuariosFullAccess = ["v.santos"];

    // ============================================================
// GERENCIAMENTO DA SESSÃO
// ============================================================

function limparSessaoLogin() {

    // Remove login persistente
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("codigoVendedor");
    localStorage.removeItem("acessoTotal");
    localStorage.removeItem("acessoAdministrativo");
    localStorage.removeItem("manterConectado");
    localStorage.removeItem("nomeCompleto");

    // Remove login da sessão atual
    sessionStorage.removeItem("usuarioLogado");
    sessionStorage.removeItem("codigoVendedor");
    sessionStorage.removeItem("nomeCompleto");
    sessionStorage.removeItem("acessoTotal");
    sessionStorage.removeItem("acessoAdministrativo");
    sessionStorage.removeItem("app_session_token");
localStorage.removeItem("app_session_token");
}


function salvarSessaoLogin(
    usuario,
    codigo,
    nomeCompleto,
    acessoTotal,
    acessoAdministrativo,
    manterConectado
) {

    // Primeiro limpa qualquer login anterior
    limparSessaoLogin();


    // ========================================================
    // MANTER CONECTADO
    // ========================================================

    if (manterConectado) {

        localStorage.setItem(
            "usuarioLogado",
            usuario
        );

        localStorage.setItem(
    "nomeCompleto",
    nomeCompleto || ""
);

        localStorage.setItem(
            "acessoTotal",
            String(acessoTotal)
        );

        localStorage.setItem(
            "acessoAdministrativo",
            String(acessoAdministrativo)
        );

        localStorage.setItem(
            "codigoVendedor",
            String(codigo || "").trim().toUpperCase()
        );

        localStorage.setItem(
            "manterConectado",
            "true"
        );

    }

    // ========================================================
    // APENAS DURANTE A SESSÃO
    // ========================================================

    else {

        sessionStorage.setItem(
            "usuarioLogado",
            usuario
        );

        sessionStorage.setItem(
    "nomeCompleto",
    nomeCompleto || ""
);

        sessionStorage.setItem(
            "acessoTotal",
            String(acessoTotal)
        );

        sessionStorage.setItem(
            "acessoAdministrativo",
            String(acessoAdministrativo)
        );

        sessionStorage.setItem(
            "codigoVendedor",
            String(codigo || "").trim().toUpperCase()
        );

    }

}

    // ============================================================
    // PLANILHA
    // ============================================================

    const urlCSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7og0_9fNfXHoINFiE-s75rCPc-RIqAFLwcl8dQqMvEKXimWrMfgQz30QxPKul8_1Cf8RB4YSoizJy/pub?gid=0&single=true&output=csv";


    // ============================================================
    // LOGIN NORMAL - PROTHEUS
    // ============================================================

    formLogin.addEventListener("submit", async function (e) {

        e.preventDefault();


        const usuario =
            document.getElementById("usuarioLogin").value.trim();


        const senha =
            document.getElementById("senhaLogin").value.trim();


        erroLogin.innerText =
            "Validando login...";


        const acessoTotal =
            usuariosFullAccess.includes(
                usuario.toLowerCase()
            );


        try {

            const resposta = await fetch(
                "https://rastreio-amostras-backend-production.up.railway.app/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: usuario,
                        password: senha
                    })
                }
            );


            let data = {};

let codigo = null;

let nomeCompleto = usuario;


try {

    data = await resposta.json();

    // A sessao e armazenada somente apos salvarSessaoLogin().

    codigo = data?.seller_code || null;

    nomeCompleto =
        data?.nome_completo ||
        data?.seller_name ||
        usuario;

} catch {

    codigo = null;

}

const codigoNormalizado =
    normalizarCodigo(codigo).toUpperCase();

const acessoAdministrativo = false;

const acessoADMIN1 =
    codigoNormalizado === "ADMIN1";

    console.log("================================");
console.log("RESULTADO DO LOGIN");
console.log("Usuário:", usuario);
console.log("Código retornado pelo backend:", codigo);
console.log("Código normalizado:", codigoNormalizado);
console.log("Acesso total:", acessoTotal);
console.log("Acesso administrativo:", acessoAdministrativo);
console.log("Status HTTP:", resposta.status);
console.log("Resposta backend:", data);
console.log("================================");

            // ====================================================
            // ERRO 401
            // ====================================================

            if (resposta.status === 401) {

                erroLogin.innerText =
                    "Usuário ou senha inválidos.";

                return;
            }


            // ====================================================
            // ERRO 404
            // ====================================================

   if (
    resposta.status === 409 &&
    !acessoTotal &&
    !acessoAdministrativo
) {

    erroLogin.innerText =
        data?.detail ||
        "Usuário válido no Protheus, mas ainda não possui cadastro. Clique em 'Criar nova conta'.";

    return;
}


            // ====================================================
            // CARREGAR PLANILHA
            // ====================================================

            erroLogin.innerText =
                "Carregando pedidos...";


            Papa.parse(
                urlCSV,
                {

                    download: true,

                    skipEmptyLines: true,


                    complete: function (res) {

                        const dados =
                            res.data.slice(1);


                        let dadosFiltrados = [];


                        // ====================================================
                        // ACESSO TOTAL
                        // ====================================================

if (acessoTotal) {

    dadosFiltrados = dados;

}
else if (acessoADMIN1) {

    // ADMIN1 pode entrar na tela inicial
    // mesmo sem possuir registros na planilha.
    //
    // IMPORTANTE:
    // isso NÃO dá acesso ao Admin.
    // O acesso ao Admin continuará sendo
    // controlado exclusivamente pelas permissões.

    dadosFiltrados = [];

}
else {

    dadosFiltrados =
        dados.filter(
            function (linha) {

                return (
                    normalizarCodigo(
                        linha[22]
                    ) ===
                    normalizarCodigo(
                        codigo
                    )
                );

            }
        );

}


                        // ====================================================
                        // NENHUM REGISTRO
                        // ====================================================

if (
    !acessoTotal &&
    !acessoAdministrativo &&
    !acessoADMIN1 &&
    dadosFiltrados.length === 0
) {

    erroLogin.innerText =
        "Nenhum registro encontrado para este vendedor.";

    return;
}


                        // ====================================================
                        // SALVAR DADOS
                        // ====================================================

// ====================================================
// SALVAR RASTREIOS
// ====================================================

const dadosRastreios =
    JSON.stringify(dadosFiltrados);


if (
    manterConectado &&
    manterConectado.checked
) {

    // Login persistente
    localStorage.setItem(
        "dadosFiltrados",
        dadosRastreios
    );

    // Garante que não exista uma versão antiga
    // dos rastreios na sessão temporária
    sessionStorage.removeItem(
        "dadosFiltrados"
    );

} else {

    // Login somente durante esta sessão
    sessionStorage.setItem(
        "dadosFiltrados",
        dadosRastreios
    );

    // IMPORTANTE:
    // Remove qualquer rastreio antigo que tenha
    // ficado salvo de um login persistente anterior.
    localStorage.removeItem(
        "dadosFiltrados"
    );

}


                        // ============================================================
// SALVAR SESSÃO
// ============================================================

salvarSessaoLogin(
    usuario,
    codigo,
    nomeCompleto,
    acessoTotal,
    acessoAdministrativo,
    manterConectado &&
    manterConectado.checked
);

// Salvar apos a limpeza feita por salvarSessaoLogin().
if (!data?.app_session_token) {
    console.error("Login sem app_session_token: confira a versao do backend no Railway.");
    erroLogin.innerText = "Sessão não recebida do servidor. Contate o administrador.";
    return;
}
sessionStorage.setItem("app_session_token", data.app_session_token);
localStorage.setItem("app_session_token", data.app_session_token);

                        // ====================================================
                        // REDIRECIONAMENTO
                        // ====================================================

                        window.location.href =
                            "tela_inicio.html";

                    },


                    error: function (erro) {

                        console.error(
                            "Erro ao carregar planilha:",
                            erro
                        );


                        erroLogin.innerText =
                            "Erro ao carregar planilha.";

                    }

                }
            );

        }


        // ========================================================
        // ERRO DE CONEXÃO COM BACKEND
        // ========================================================

        catch (erro) {

            console.error(
                "Erro no login:",
                erro
            );


            erroLogin.innerText =
                "Servidor indisponível. Utilize o acesso por código de vendedor.";

        }

    });
    // ============================================================
// CADASTRO DE NOVA CONTA
// ============================================================

// ------------------------------------------------------------
// ABRIR TELA DE CADASTRO
// ------------------------------------------------------------

if (btnCriarConta) {

    btnCriarConta.addEventListener(
        "click",
        function () {

            // ------------------------------------------------
            // ESCONDER LOGIN
            // ------------------------------------------------

            formLogin.style.display = "none";

            separadorLogin.style.display = "none";

            painelLogoQuatroK.style.display = "none";


            // ------------------------------------------------
            // PREPARAR CADASTRO
            // ------------------------------------------------

            areaCadastro.style.display = "block";


            // força o navegador a reconhecer o display
            requestAnimationFrame(function () {

                requestAnimationFrame(function () {

                    areaCadastro.classList.add(
                        "cadastro-aberto"
                    );

                });

            });


            // ------------------------------------------------
            // COMEÇAR NA ETAPA 1
            // ------------------------------------------------

            etapaCadastro1.style.display =
                "block";

            etapaCadastro2.style.display =
                "none";


            // ------------------------------------------------
            // LIMPAR MENSAGENS
            // ------------------------------------------------

            erroCadastro.innerText = "";

            erroCadastro.style.color = "";


            // ------------------------------------------------
            // LIMPAR TOKEN
            // ------------------------------------------------

            cadastroToken = null;


            // ------------------------------------------------
            // LIMPAR CAMPOS
            // ------------------------------------------------

            document.getElementById(
                "cadastroUsuario"
            ).value = "";

            document.getElementById(
                "cadastroSenha"
            ).value = "";

            document.getElementById(
                "cadastroCodigoVendedor"
            ).value = "";
            document.getElementById(
    "cadastroNomeCompleto"
).value = "";

document.getElementById(
    "cadastroEmail"
).value = "";

        }
    );

}


// ------------------------------------------------------------
// VOLTAR PARA LOGIN
// ------------------------------------------------------------

if (btnVoltarLogin) {

    btnVoltarLogin.addEventListener(
        "click",
        function () {

            // ------------------------------------------------
            // FECHAR ANIMAÇÃO
            // ------------------------------------------------

            areaCadastro.classList.remove(
                "cadastro-aberto"
            );


            // ------------------------------------------------
            // ESPERAR A ANIMAÇÃO TERMINAR
            // ------------------------------------------------

            setTimeout(function () {

                areaCadastro.style.display =
                    "none";


                // ------------------------------------------------
                // MOSTRAR LOGIN
                // ------------------------------------------------

                formLogin.style.display =
                    "flex";

                separadorLogin.style.display =
                    "";

                painelLogoQuatroK.style.display =
                    "";


                // ------------------------------------------------
                // RESETAR CADASTRO
                // ------------------------------------------------

                etapaCadastro1.style.display =
                    "block";

                etapaCadastro2.style.display =
                    "none";

                erroCadastro.innerText = "";

                erroCadastro.style.color = "";

                cadastroToken = null;


                document.getElementById(
                    "cadastroUsuario"
                ).value = "";

                document.getElementById(
                    "cadastroSenha"
                ).value = "";

                document.getElementById(
                    "cadastroCodigoVendedor"
                ).value = "";
                document.getElementById(
    "cadastroNomeCompleto"
).value = "";

document.getElementById(
    "cadastroEmail"
).value = "";


            }, 350);

        }
    );

}


// ------------------------------------------------------------
// VALIDAR USUÁRIO NO PROTHEUS
// ------------------------------------------------------------

if (btnValidarCadastro) {

    btnValidarCadastro.addEventListener(
        "click",
        async function () {

            const usuario =
                document
                    .getElementById(
                        "cadastroUsuario"
                    )
                    .value
                    .trim();

            const senha =
                document
                    .getElementById(
                        "cadastroSenha"
                    )
                    .value;


            // ------------------------------------------------
            // VALIDAÇÃO DOS CAMPOS
            // ------------------------------------------------

            if (!usuario || !senha) {

                erroCadastro.innerText =
                    "Informe o usuário e a senha do Protheus.";

                return;
            }


            erroCadastro.style.color = "";

            erroCadastro.innerText =
                "Validando usuário no Protheus...";

            btnValidarCadastro.disabled = true;


            try {

                const resposta = await fetch(
                    "https://rastreio-amostras-backend-production.up.railway.app/cadastro/validar",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            username: usuario,
                            password: senha
                        })
                    }
                );


                let data = {};

                try {

                    data =
                        await resposta.json();

                } catch {

                    data = {};

                }


                // --------------------------------------------
                // USUÁRIO JÁ CADASTRADO
                // --------------------------------------------

                if (resposta.status === 409) {

                    erroCadastro.innerText =
                        data.detail ||
                        "Este usuário já possui cadastro.";

                    btnValidarCadastro.disabled =
                        false;

                    return;
                }


                // --------------------------------------------
                // USUÁRIO OU SENHA INVÁLIDOS
                // --------------------------------------------

                if (resposta.status === 401) {

                    erroCadastro.innerText =
                        "Usuário ou senha inválidos.";

                    btnValidarCadastro.disabled =
                        false;

                    return;
                }


                // --------------------------------------------
                // OUTRO ERRO
                // --------------------------------------------

                if (!resposta.ok) {

                    erroCadastro.innerText =
                        data.detail ||
                        "Não foi possível validar o usuário.";

                    btnValidarCadastro.disabled =
                        false;

                    return;
                }


                // --------------------------------------------
                // SUCESSO
                // --------------------------------------------

                cadastroToken =
                    data.cadastro_token;


                if (!cadastroToken) {

                    erroCadastro.innerText =
                        "O servidor não retornou o token de cadastro.";

                    btnValidarCadastro.disabled =
                        false;

                    return;
                }


                // ------------------------------------------------
                // IMPORTANTE:
                // APAGAR A SENHA DA MEMÓRIA DA TELA
                // ------------------------------------------------

                document.getElementById(
                    "cadastroSenha"
                ).value = "";


                // --------------------------------------------
                // IR PARA ETAPA 2
                // --------------------------------------------

                etapaCadastro1.style.display =
                    "none";

                etapaCadastro2.style.display =
                    "block";


                erroCadastro.style.color =
                    "#80ff80";

                erroCadastro.innerText =
                    "Usuário validado. Informe seu código de vendedor.";

            }

            catch (erro) {

                console.error(
                    "Erro no cadastro:",
                    erro
                );

                erroCadastro.innerText =
                    "Servidor indisponível. Tente novamente.";

            }


            btnValidarCadastro.disabled =
                false;

        }
    );

}


// ------------------------------------------------------------
// FINALIZAR CADASTRO
// ------------------------------------------------------------

if (btnFinalizarCadastro) {

    btnFinalizarCadastro.addEventListener(
        "click",
        async function () {
            const nomeCompleto =
    document
        .getElementById(
            "cadastroNomeCompleto"
        )
        .value
        .trim();


const email =
    document
        .getElementById(
            "cadastroEmail"
        )
        .value
        .trim()
        .toLowerCase();


const codigo =
    document
        .getElementById(
            "cadastroCodigoVendedor"
        )
        .value
        .trim()
        .toUpperCase();


                    
            // --------------------------------------------
            // VERIFICAR TOKEN
            // --------------------------------------------

            if (!cadastroToken) {

                erroCadastro.innerText =
                    "O cadastro expirou. Comece novamente.";

                return;
            }


            // --------------------------------------------
            // VERIFICAR CÓDIGO
            // --------------------------------------------

            if (!codigo) {

                erroCadastro.innerText =
                    "Informe seu código de vendedor.";

                return;
            }


           // --------------------------------------------
// CÓDIGO COM EXATAMENTE 6 CARACTERES
// --------------------------------------------

if (
    !/^[A-Z0-9]{6}$/.test(codigo)
) {

    erroCadastro.innerText =
        "Código inválido. Informe exatamente 6 caracteres.";

    return;
}


            erroCadastro.style.color = "";

            erroCadastro.innerText =
                "Finalizando cadastro...";

            btnFinalizarCadastro.disabled =
                true;


            try {
                console.log("================================");
console.log("FINALIZANDO CADASTRO");
console.log("TOKEN:", cadastroToken);
console.log("CÓDIGO:", codigo);
console.log("================================");
                const resposta = await fetch(
                    "https://rastreio-amostras-backend-production.up.railway.app/cadastro/finalizar",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

    cadastro_token:
        cadastroToken,

    seller_code:
        codigo,

    nome_completo:
        nomeCompleto,

    email:
        email

})
                    }
                );


                let data = {};

                try {

                    data =
                        await resposta.json();

                } catch {

                    data = {};

                }


                // --------------------------------------------
                // CÓDIGO JÁ CADASTRADO
                // --------------------------------------------

                if (resposta.status === 409) {

                    erroCadastro.innerText =
                        data.detail ||
                        "Este código de vendedor já está cadastrado.";

                    btnFinalizarCadastro.disabled =
                        false;

                    return;
                }


                // --------------------------------------------
                // CADASTRO EXPIRADO
                // --------------------------------------------

                if (resposta.status === 400) {

                    erroCadastro.innerText =
                        data.detail ||
                        "Cadastro inválido ou expirado.";

                    btnFinalizarCadastro.disabled =
                        false;

                    return;
                }


                // --------------------------------------------
                // OUTRO ERRO
                // --------------------------------------------

                if (!resposta.ok) {

                    erroCadastro.innerText =
                        data.detail ||
                        "Não foi possível finalizar o cadastro.";

                    btnFinalizarCadastro.disabled =
                        false;

                    return;
                }


                // --------------------------------------------
                // SUCESSO
                // --------------------------------------------

                erroCadastro.style.color =
                    "#80ff80";

                erroCadastro.innerText =
                    "Cadastro realizado com sucesso!";


                cadastroToken =
                    null;


                // --------------------------------------------
                // LIMPAR CAMPOS
                // --------------------------------------------

                document.getElementById(
    "cadastroUsuario"
).value = "";

document.getElementById(
    "cadastroSenha"
).value = "";

document.getElementById(
    "cadastroNomeCompleto"
).value = "";

document.getElementById(
    "cadastroEmail"
).value = "";

document.getElementById(
    "cadastroCodigoVendedor"
).value = "";


                // --------------------------------------------
                // VOLTAR PARA LOGIN
                // --------------------------------------------

                setTimeout(
                    function () {

                        areaCadastro.style.display =
                            "none";

                        formLogin.style.display =
                            "flex";

                        etapaCadastro1.style.display =
                            "block";

                        etapaCadastro2.style.display =
                            "none";

                        erroCadastro.innerText =
                            "";

                        erroLogin.style.color =
                            "";

                        erroLogin.innerText =
                            "Cadastro realizado. Faça login.";

                        document.getElementById(
                            "usuarioLogin"
                        ).value =
                            data.seller_name || "";

                    },
                    800
                );

            }

            catch (erro) {

                console.error(
                    "Erro ao finalizar cadastro:",
                    erro
                );

                erroCadastro.innerText =
                    "Servidor indisponível. Tente novamente.";

            }


            btnFinalizarCadastro.disabled =
                false;

        }
    );

}

    // ============================================================
    // ACESSO POR CÓDIGO DE VENDEDOR
    // ============================================================

    const codigoInput =
        document.getElementById(
            "codigoVendedorLogin"
        );
        if (codigoInput) {
    codigoInput.addEventListener("input", function () {
        this.value = this.value.toUpperCase();
    });
}


    const btnCodigo =
        document.getElementById(
            "btnAcessarCodigo"
        );


    const erroCodigo =
        document.getElementById(
            "erroCodigoVendedor"
        );


    // ============================================================
    // VERIFICAR SE OS ELEMENTOS EXISTEM
    // ============================================================

    if (
        !codigoInput ||
        !btnCodigo ||
        !erroCodigo
    ) {

        console.error(
            "Elementos do modo contingência não encontrados."
        );

    }


    // ============================================================
    // BOTÃO DE ACESSO POR CÓDIGO
    // ============================================================

    else {

        btnCodigo.addEventListener(
            "click",
            function () {

                const codigoDigitado =
                  codigoInput.value.trim().toUpperCase();


                // ====================================================
                // VALIDAR CAMPO
                // ====================================================

                if (!codigoDigitado) {

                    erroCodigo.innerText =
                        "Digite o código do vendedor.";

                    return;
                }


                // ====================================================
                // LIMPAR MENSAGEM
                // ====================================================

                erroCodigo.style.color =
                    "";

                erroCodigo.innerText =
                    "Consultando vendedor...";


                btnCodigo.disabled = true;


                // ====================================================
                // CONSULTAR PLANILHA
                // ====================================================

                Papa.parse(
                    urlCSV,
                    {

                        download: true,

                        skipEmptyLines: true,


                        complete: function (res) {

                            console.log(
                                "================================="
                            );

                            console.log(
                                "MODO CONTINGÊNCIA"
                            );

                            console.log(
                                "================================="
                            );


                            // ==================================================
                            // VERIFICAR RETORNO
                            // ==================================================

                            console.log(
                                "Linhas recebidas:",
                                res.data.length
                            );


                            if (
                                !res.data ||
                                res.data.length <= 1
                            ) {

                                console.error(
                                    "A planilha não retornou registros."
                                );


                                erroCodigo.innerText =
                                    "A planilha não retornou dados.";


                                btnCodigo.disabled =
                                    false;


                                return;
                            }


                            // ==================================================
                            // CABEÇALHO
                            // ==================================================

                            console.log(
                                "Cabeçalho:",
                                res.data[0]
                            );


                            console.log(
                                "Quantidade de colunas:",
                                res.data[0].length
                            );


                            // ==================================================
                            // DADOS
                            // ==================================================

                            const dados =
                                res.data.slice(1);


                            console.log(
                                "Quantidade de registros:",
                                dados.length
                            );


                            console.log(
                                "Código digitado:",
                                codigoDigitado
                            );


                            console.log(
                                "Código normalizado:",
                                normalizarCodigo(
                                    codigoDigitado
                                )
                            );


                            // ==================================================
                            // DEBUG DA PRIMEIRA LINHA
                            // ==================================================

                            if (
                                dados.length > 0
                            ) {

                                console.log(
                                    "Primeira linha:",
                                    dados[0]
                                );


                                console.log(
                                    "Valor da coluna 22:",
                                    dados[0][22]
                                );

                            }


                            // ==================================================
                            // FILTRAR PELO CÓDIGO
                            //
                            // linha[22] = 23ª coluna
                            // ==================================================

                            const dadosFiltrados =
                                dados.filter(
                                    function (linha) {

                                        const codigoPlanilha =
                                            normalizarCodigo(
                                                linha[22]
                                            );


                                        const codigoInformado =
                                            normalizarCodigo(
                                                codigoDigitado
                                            );


                                        return (
                                            codigoPlanilha ===
                                            codigoInformado
                                        );

                                    }
                                );


                            // ==================================================
                            // RESULTADO
                            // ==================================================

                            console.log(
                                "Código pesquisado:",
                                normalizarCodigo(
                                    codigoDigitado
                                )
                            );


                            console.log(
                                "Registros encontrados:",
                                dadosFiltrados.length
                            );


                            // ==================================================
                            // CÓDIGO NÃO ENCONTRADO
                            // ==================================================

                            if (
                                dadosFiltrados.length === 0
                            ) {

                                console.warn(
                                    "Código não encontrado na coluna 23."
                                );


                                // ==============================================
                                // MOSTRAR ALGUNS CÓDIGOS PARA DEBUG
                                // ==============================================

                                console.log(
                                    "Exemplos encontrados na coluna 23:"
                                );


                                dados
                                    .slice(0, 10)
                                    .forEach(
                                        function (
                                            linha,
                                            indice
                                        ) {

                                            console.log(
                                                indice,
                                                "=>",
                                                linha[22]
                                            );

                                        }
                                    );


                                erroCodigo.innerText =
                                    "Código de vendedor não encontrado.";


                                btnCodigo.disabled =
                                    false;


                                return;
                            }


                            // ==================================================
                            // VENDEDOR ENCONTRADO
                            // ==================================================

                            console.log(
                                "================================="
                            );

                            console.log(
                                "VENDEDOR ENCONTRADO!"
                            );

                            console.log(
                                "Código:",
                                codigoDigitado
                            );

                            console.log(
                                "Rastreios encontrados:",
                                dadosFiltrados.length
                            );

                            console.log(
                                "================================="
                            );
                            


                            // ==================================================
                            // SALVAR RASTREIOS
                            // ==================================================

                            localStorage.setItem(
                                "dadosFiltrados",
                                JSON.stringify(
                                    dadosFiltrados
                                )
                            );


                            // ==================================================
                            // IDENTIFICAÇÃO DO USUÁRIO
                            // ==================================================

                            // ==================================================
// ACESSO POR CÓDIGO
// ==================================================

salvarSessaoLogin(
    "VENDEDOR-" +
    normalizarCodigo(
        codigoDigitado
    ),

    normalizarCodigo(
        codigoDigitado
    ),

    false,

    false,

    manterConectado &&
    manterConectado.checked
);


                            // ==================================================
                            // MENSAGEM
                            // ==================================================

                            erroCodigo.style.color =
                                "#80ff80";


                            erroCodigo.innerText =
                                "Vendedor encontrado. Carregando rastreios...";


                            // ==================================================
                            // REDIRECIONAMENTO
                            // ==================================================

                            setTimeout(
                                function () {

                                    window.location.href =
                                        "tela_inicio.html";

                                },
                                300
                            );

                        },


                        // ======================================================
                        // ERRO AO ACESSAR PLANILHA
                        // ======================================================

                        error: function (erro) {

                            console.error(
                                "Erro PapaParse:",
                                erro
                            );


                            erroCodigo.innerText =
                                "Não foi possível acessar a planilha.";


                            btnCodigo.disabled =
                                false;

                        }

                    }
                );

            }
        );


        // ============================================================
        // ENTER NO CAMPO DE CÓDIGO
        // ============================================================

        codigoInput.addEventListener(
            "keydown",
            function (e) {

                if (
                    e.key === "Enter"
                ) {

                    e.preventDefault();

                    btnCodigo.click();

                }

            }
        );

    }


    // ============================================================
    // NORMALIZAÇÃO DO CÓDIGO
    // ============================================================

    function normalizarCodigo(valor) {

        if (
            valor === null ||
            valor === undefined
        ) {

            return "";

        }


        return String(valor)
            .trim()
            .replace(/\s+/g, "")
            .replace(
                /^0+(?=\d)/,
                ""
            );

    }


    // ============================================================
    // MOSTRAR / OCULTAR SENHA
    // ============================================================

    const toggle =
        document.getElementById(
            "toggleSenha"
        );


    const senha =
        document.getElementById(
            "senhaLogin"
        );


    const eye =
        document.getElementById(
            "iconEye"
        );


    const eyeOff =
        document.getElementById(
            "iconEyeOff"
        );


    if (
        toggle &&
        senha &&
        eye &&
        eyeOff
    ) {

        toggle.addEventListener(
            "click",
            function () {

                const isPassword =
                    senha.type === "password";


                senha.type =
                    isPassword
                        ? "text"
                        : "password";


                eye.style.display =
                    isPassword
                        ? "none"
                        : "block";


                eyeOff.style.display =
                    isPassword
                        ? "block"
                        : "none";

            }
        );

    }

});