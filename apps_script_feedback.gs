// Cole este código em: Planilha Google > Extensões > Apps Script
// Depois: Implantar > Nova implantação > Tipo "App da Web"
//   Executar como: Eu
//   Quem tem acesso: Qualquer pessoa
// Copie a URL gerada e cole em FEEDBACK_URL no rastreio_amostra.js

function doPost(e) {
  const d = JSON.parse(e.postData.contents);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName("Feedback") || ss.insertSheet("Feedback");

  if (aba.getLastRow() === 0) {
    aba.appendRow(["Data/Hora", "Vendedora", "Código", "Usuário", "Nota", "Comentário", "Página"]);
    aba.setFrozenRows(1);
  }

  aba.appendRow([
    d.dataHora,
    limpar(d.nome),
    limpar(d.codigo),
    limpar(d.usuario),
    Number(d.nota),
    limpar(d.comentario),
    limpar(d.pagina)
  ]);

  return ContentService.createTextOutput("ok");
}

// Evita que um comentário começando com = + - @ vire fórmula na planilha
function limpar(v) {
  const s = String(v || "");
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
