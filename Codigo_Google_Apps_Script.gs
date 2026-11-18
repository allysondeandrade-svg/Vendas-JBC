/**
 * ============================================================================
 * VENDAS JBC - BACKEND GOOGLE APPS SCRIPT
 * ============================================================================
 * Sincronização 24h de Vendas e Catálogo de Produtos.
 * Abas utilizadas na Planilha:
 * - "V" (antiga Vendas): [Data/Hora, Vendedor, SKU, Produto, Preço (R$), Cliente, Contato, Endereço, Frete, Pagamento, Observação, Comissão (R$), Lucro (R$), ID Venda]
 * - "Produtos": [SKU, Produto, Preço Venda (R$), Custo (R$), Preço Base (R$), Categoria, Estoque, ID]
 */

const SHEET_NAMES = {
  SALES: "V", // Nome da aba de vendas
  PRODUCTS: "Produtos"
};

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAll";
    if (action === "ping") {
      return createJsonResponse({ status: "success", message: "Conexão ativa 24h com Vendas JBC!" });
    }
    var prods = readProductsFromSheet();
    var sales = readSalesFromSheet();
    return createJsonResponse({ status: "success", products: prods, sales: sales });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "Dados não enviados" });
    }
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === "ping") {
      return createJsonResponse({ status: "success", message: "Conexão com Google Sheets ativa!" });
    }

    if (action === "addSale") {
      var sale = payload.sale || payload;
      var sheet = getSalesSheet();
      var dataHora = sale.dateString || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

      // Se houver 2 ou mais produtos anotados na venda, cria uma linha para cada produto com SKU e Preço individuais
      if (sale.itens && Array.isArray(sale.itens) && sale.itens.length > 0) {
        var count = sale.itens.length;
        for (var idx = count - 1; idx >= 0; idx--) {
          var item = sale.itens[idx];
          var itemSku = String(item.sku || "").trim();
          var itemProduto = String(item.produto || sale.produto || "").trim();
          
          // Se o produto veio no formato "SKU - Nome", separa se o SKU estiver vazio
          if (!itemSku && itemProduto.indexOf(" - ") !== -1) {
            var parts = itemProduto.split(" - ");
            itemSku = parts[0].trim();
            itemProduto = parts.slice(1).join(" - ").trim();
          }

          var itemPreco = (typeof item.preco === "number") 
            ? item.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : (item.preco || "0,00");

          var itemComissao = "0,00";
          var itemLucro = "0,00";
          if (typeof item.basePrice === "number" && typeof item.preco === "number") {
            itemComissao = (item.preco - item.basePrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          if (typeof item.basePrice === "number" && typeof item.cost === "number") {
            itemLucro = (item.basePrice - item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }

          sheet.insertRowBefore(2);
          sheet.getRange(2, 1, 1, 14).setValues([[
            dataHora,
            sale.vendedor || "",
            itemSku,
            itemProduto,
            itemPreco,
            sale.cliente || "",
            sale.contato || "",
            sale.endereco || "",
            (idx === 0) ? (sale.frete || "") : "Incluso",
            sale.pagamento || "",
            (count > 1 ? ("Item " + (idx + 1) + "/" + count + " - " + (sale.observacao || "")) : (sale.observacao || "")),
            itemComissao !== "0,00" ? itemComissao : (sale.comissao || "0,00"),
            itemLucro !== "0,00" ? itemLucro : (sale.lucro || "0,00"),
            (sale.id || ("sale-" + new Date().getTime())) + (count > 1 ? ("-" + (idx + 1)) : "")
          ]]);
        }
      } else {
        var singleSku = String(sale.sku || "").trim();
        var singleProduto = String(sale.produto || "").trim();
        if (!singleSku && singleProduto.indexOf(" - ") !== -1) {
          var pParts = singleProduto.split(" - ");
          singleSku = pParts[0].trim();
          singleProduto = pParts.slice(1).join(" - ").trim();
        }

        sheet.insertRowBefore(2);
        sheet.getRange(2, 1, 1, 14).setValues([[
          dataHora,
          sale.vendedor || "",
          singleSku,
          singleProduto,
          sale.preco || "0,00",
          sale.cliente || "",
          sale.contato || "",
          sale.endereco || "",
          sale.frete || "",
          sale.pagamento || "",
          sale.observacao || "",
          sale.comissao || "0,00",
          sale.lucro || "0,00",
          sale.id || ("sale-" + new Date().getTime())
        ]]);
      }
      return createJsonResponse({ status: "success", message: "Venda gravada com sucesso na aba V!" });
    }

    if (action === "editSale") {
      var editData = payload.sale || payload;
      var editSheet = getSalesSheet();
      var dataValues = editSheet.getDataRange().getValues();
      var idIndex = editSheet.getLastColumn() - 1; // Última coluna é o ID

      for (var i = 1; i < dataValues.length; i++) {
        var rowId = String(dataValues[i][idIndex] || dataValues[i][12] || dataValues[i][13] || "");
        if (rowId === String(editData.id)) {
          var rowNum = i + 1;
          var numCols = editSheet.getLastColumn();
          if (numCols >= 14) {
            editSheet.getRange(rowNum, 1, 1, 14).setValues([[
              editData.dateString || String(dataValues[i][0]),
              editData.vendedor || "",
              editData.sku || String(dataValues[i][2] || ""),
              editData.produto || "",
              editData.preco || "0,00",
              editData.cliente || "",
              editData.contato || "",
              editData.endereco || "",
              editData.frete || "",
              editData.pagamento || "",
              editData.observacao || "",
              editData.comissao || "0,00",
              editData.lucro || "0,00",
              editData.id
            ]]);
          } else {
            editSheet.getRange(rowNum, 1, 1, 13).setValues([[
              editData.dateString || String(dataValues[i][0]),
              editData.vendedor || "",
              editData.produto || "",
              editData.preco || "0,00",
              editData.cliente || "",
              editData.contato || "",
              editData.endereco || "",
              editData.frete || "",
              editData.pagamento || "",
              editData.observacao || "",
              editData.comissao || "0,00",
              editData.lucro || "0,00",
              editData.id
            ]]);
          }
          return createJsonResponse({ status: "success", message: "Venda editada!" });
        }
      }
      return createJsonResponse({ status: "error", message: "Venda não encontrada" });
    }

    if (action === "deleteSale") {
      var delId = String(payload.id || (payload.data && payload.data.id) || "");
      var delSheet = getSalesSheet();
      var dValues = delSheet.getDataRange().getValues();
      var colIdx = delSheet.getLastColumn() - 1;

      for (var d = 1; d < dValues.length; d++) {
        var curId = String(dValues[d][colIdx] || dValues[d][12] || dValues[d][13] || "");
        if (curId === delId) {
          delSheet.deleteRow(d + 1);
          return createJsonResponse({ status: "success", message: "Venda excluída da aba V!" });
        }
      }
      return createJsonResponse({ status: "error", message: "Venda não encontrada" });
    }

    // Upsert individual de Produto
    if (action === "saveProduct") {
      var pData = payload.data || payload.product || payload;
      upsertSingleProduct(pData);
      return createJsonResponse({ status: "success", message: "Produto salvo com sucesso!" });
    }

    // Salvar Lote de Produtos
    if (action === "saveProducts") {
      var prodList = payload.products || [];
      var pSheet = getProductsSheet();
      var lRow = pSheet.getLastRow();
      if (lRow > 1) {
        pSheet.getRange(2, 1, lRow - 1, Math.max(pSheet.getLastColumn(), 8)).clearContent();
      }
      if (prodList.length > 0) {
        var pRows = prodList.map(function(p, idx) {
          return [
            p.sku || ("SKU-" + (idx + 1)),
            p.name || p.product || "",
            p.price || "0,00",
            p.cost || "",
            p.basePrice || p.price || "0,00",
            p.category || "Geral",
            (p.stock !== undefined && p.stock !== null) ? p.stock : "",
            p.id || p.sku || ("p-" + (idx + 1))
          ];
        });
        pSheet.getRange(2, 1, pRows.length, 8).setValues(pRows);
      }
      return createJsonResponse({ status: "success", message: prodList.length + " produtos salvos na aba Produtos!" });
    }

    // Excluir Produto
    if (action === "deleteProduct") {
      var prodInfo = payload.data || payload;
      deleteProductFromSheet(prodInfo);
      return createJsonResponse({ status: "success", message: "Produto excluído!" });
    }

    return createJsonResponse({ status: "error", message: "Ação não reconhecida: " + action });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

// Localiza ou cria a aba de Vendas ("V" ou "Vendas")
function getSalesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.SALES) || ss.getSheetByName("Vendas") || ss.getSheetByName("vendas");
  var headers = [
    "Data/Hora", "Vendedor", "SKU", "Produto", "Preço (R$)", 
    "Cliente", "Contato", "Endereço", "Frete", 
    "Pagamento", "Observação", "Comissão (R$)", "Lucro (R$)", "ID Venda"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SALES);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  } else {
    // Se a aba existir com 13 colunas antigas (sem SKU), adiciona a coluna SKU
    var currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
    if (currentHeaders.indexOf("sku") === -1 && currentHeaders.length <= 13) {
      sheet.insertColumnAfter(2); // Insere após Vendedor
      sheet.getRange(1, 3).setValue("SKU");
      formatHeaderRow(sheet, sheet.getLastColumn());
    }
  }
  return sheet;
}

// Localiza ou cria a aba Produtos
function getProductsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.PRODUCTS);
  var headers = ["SKU", "Produto", "Preço Venda (R$)", "Custo (R$)", "Preço Base (R$)", "Categoria", "Estoque", "ID"];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.PRODUCTS);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function formatHeaderRow(sheet, numCols) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight("bold");
  range.setBackground("#5925dc");
  range.setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

function readProductsFromSheet() {
  var sheet = getProductsSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0].map(function(h) { return String(h || "").toLowerCase().trim(); });
  var idxSku = headers.indexOf("sku");
  var idxProd = headers.findIndex(function(h) { return h === "produto" || h.indexOf("nome") !== -1 || h.indexOf("prod") !== -1; });
  var idxPreco = headers.findIndex(function(h) { return h.indexOf("preco") !== -1 || h.indexOf("preço") !== -1 || h.indexOf("valor") !== -1; });
  var idxCusto = headers.indexOf("custo");
  var idxBase = headers.findIndex(function(h) { return h.indexOf("base") !== -1; });
  var idxCat = headers.findIndex(function(h) { return h.indexOf("cat") !== -1; });
  var idxEstoque = headers.findIndex(function(h) { return h.indexOf("estoque") !== -1 || h.indexOf("stock") !== -1; });
  var idxId = headers.indexOf("id");

  var prods = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var skuVal = idxSku !== -1 ? String(row[idxSku] || "").trim() : "";
    var nameVal = idxProd !== -1 ? String(row[idxProd] || "").trim() : String(row[1] || "").trim();
    if (!nameVal && !skuVal) continue;

    var precoVal = idxPreco !== -1 && row[idxPreco] !== "" ? String(row[idxPreco]) : "0,00";
    var custoVal = idxCusto !== -1 && row[idxCusto] !== "" ? String(row[idxCusto]) : "";
    var baseVal = idxBase !== -1 && row[idxBase] !== "" ? String(row[idxBase]) : precoVal;
    var catVal = idxCat !== -1 && row[idxCat] ? String(row[idxCat]) : "Geral";
    var stockVal = idxEstoque !== -1 && row[idxEstoque] !== undefined ? String(row[idxEstoque]) : "";
    var idVal = idxId !== -1 && row[idxId] ? String(row[idxId]).trim() : (skuVal || ("prod-" + i));

    prods.push({
      id: idVal,
      sku: skuVal,
      name: nameVal,
      product: nameVal,
      price: precoVal,
      cost: custoVal,
      basePrice: baseVal,
      category: catVal,
      stock: stockVal
    });
  }
  return prods;
}

function upsertSingleProduct(prod) {
  var sheet = getProductsSheet();
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return String(h || "").toLowerCase().trim(); });

  var idxSku = headers.indexOf("sku") !== -1 ? headers.indexOf("sku") : 0;
  var idxProd = headers.findIndex(function(h) { return h === "produto" || h.indexOf("nome") !== -1; });
  var idxPreco = headers.findIndex(function(h) { return h.indexOf("preco") !== -1 || h.indexOf("preço") !== -1; });
  var idxCusto = headers.indexOf("custo");
  var idxBase = headers.findIndex(function(h) { return h.indexOf("base") !== -1; });
  var idxCat = headers.findIndex(function(h) { return h.indexOf("cat") !== -1; });
  var idxEstoque = headers.findIndex(function(h) { return h.indexOf("estoque") !== -1; });
  var idxId = headers.indexOf("id");

  var targetId = String(prod.id || "").trim();
  var targetSku = String(prod.sku || "").toUpperCase().trim();
  var targetName = String(prod.name || prod.product || "").toLowerCase().trim();

  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    var rId = idxId !== -1 ? String(values[i][idxId]).trim() : "";
    var rSku = idxSku !== -1 ? String(values[i][idxSku]).toUpperCase().trim() : "";
    var rName = idxProd !== -1 ? String(values[i][idxProd]).toLowerCase().trim() : "";

    if ((targetId && rId === targetId) || (targetSku && rSku === targetSku) || (targetName && rName === targetName)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    if (idxSku !== -1 && prod.sku) sheet.getRange(rowIndex, idxSku + 1).setValue(prod.sku);
    if (idxProd !== -1 && (prod.name || prod.product)) sheet.getRange(rowIndex, idxProd + 1).setValue(prod.name || prod.product);
    if (idxPreco !== -1 && prod.price !== undefined) sheet.getRange(rowIndex, idxPreco + 1).setValue(prod.price);
    if (idxCusto !== -1 && prod.cost !== undefined) sheet.getRange(rowIndex, idxCusto + 1).setValue(prod.cost);
    if (idxBase !== -1 && prod.basePrice !== undefined) sheet.getRange(rowIndex, idxBase + 1).setValue(prod.basePrice);
    if (idxCat !== -1 && prod.category) sheet.getRange(rowIndex, idxCat + 1).setValue(prod.category);
    if (idxEstoque !== -1 && prod.stock !== undefined) sheet.getRange(rowIndex, idxEstoque + 1).setValue(prod.stock);
  } else {
    sheet.appendRow([
      prod.sku || "",
      prod.name || prod.product || "",
      prod.price || "0,00",
      prod.cost || "",
      prod.basePrice || prod.price || "0,00",
      prod.category || "Geral",
      (prod.stock !== undefined && prod.stock !== null) ? prod.stock : "",
      prod.id || prod.sku || ("prod-" + Date.now())
    ]);
  }
}

function deleteProductFromSheet(prodInfo) {
  var sheet = getProductsSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  var id = String((prodInfo && prodInfo.id) || "").trim();
  var sku = String((prodInfo && (prodInfo.sku || prodInfo.id)) || "").toUpperCase().trim();

  var headers = values[0].map(function(h) { return String(h || "").toLowerCase().trim(); });
  var idxId = headers.indexOf("id");
  var idxSku = headers.indexOf("sku");

  for (var i = 1; i < values.length; i++) {
    var rId = idxId !== -1 ? String(values[i][idxId]).trim() : "";
    var rSku = idxSku !== -1 ? String(values[i][idxSku]).toUpperCase().trim() : "";
    if ((id && rId === id) || (sku && rSku === sku)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function readSalesFromSheet() {
  var sheet = getSalesSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0].map(function(h) { return String(h || "").toLowerCase().trim(); });
  var hasSkuCol = headers.indexOf("sku") !== -1;
  var colId = values[0].length - 1;

  var sales = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0] && !row[1] && !row[2]) continue;

    var rawDate = row[0];
    var dateFormatted = "";
    if (Object.prototype.toString.call(rawDate) === "[object Date]" || rawDate instanceof Date) {
      dateFormatted = Utilities.formatDate(rawDate, Session.getScriptTimeZone() || "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
    } else {
      dateFormatted = String(rawDate || "");
    }

    var vendedor = String(row[1] || "");
    var sku = hasSkuCol ? String(row[2] || "") : "";
    var produto = hasSkuCol ? String(row[3] || "") : String(row[2] || "");
    var preco = hasSkuCol ? String(row[4] || "0,00") : String(row[3] || "0,00");
    var cliente = hasSkuCol ? String(row[5] || "") : String(row[4] || "");
    var contato = hasSkuCol ? String(row[6] || "") : String(row[5] || "");
    var endereco = hasSkuCol ? String(row[7] || "") : String(row[6] || "");
    var frete = hasSkuCol ? String(row[8] || "") : String(row[7] || "");
    var pagamento = hasSkuCol ? String(row[9] || "") : String(row[8] || "");
    var observacao = hasSkuCol ? String(row[10] || "") : String(row[9] || "");
    var comissao = hasSkuCol ? String(row[11] || "0,00") : String(row[10] || "0,00");
    var lucro = hasSkuCol ? String(row[12] || "0,00") : String(row[11] || "0,00");
    var saleId = String(row[colId] || ("sale-" + i));

    sales.push({
      id: saleId,
      dateString: dateFormatted,
      vendedor: vendedor,
      sku: sku,
      produto: produto,
      preco: preco,
      cliente: cliente,
      contato: contato,
      endereco: endereco,
      frete: frete,
      pagamento: pagamento,
      observacao: observacao,
      comissao: comissao,
      lucro: lucro
    });
  }
  return sales;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}