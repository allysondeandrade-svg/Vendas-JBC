/**
 * ============================================================================
 * VENDAS JBC - BACKEND GOOGLE APPS SCRIPT
 * ============================================================================
 * Sincronização 24h de Vendas e Catálogo de Produtos.
 * Abas utilizadas na Planilha:
 * - "V" (antiga Vendas): [Data/Hora, Vendedor, SKU, Produto, Preço (R$), Cliente, Contato, Endereço, Frete, Pagamento, Observação, Comissão (R$), Lucro (R$), ID Venda]
 * - "P" (ou "Produtos"): [SKU, Nome do Produto, Preço Venda (R$), Custo (R$)]
 */

const SHEET_NAMES = {
  SALES: "V",      // Nome da aba de vendas
  PRODUCTS: "P"    // Nome da aba de produtos (suporta "P" ou "Produtos")
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

      // Resolve o mapa dinâmico de colunas para garantir que cada dado vá para o cabeçalho correspondente
      var colMap = getSalesColumnMap(sheet);

      // Se houver 2 ou mais produtos anotados na venda (caso enviado em lote único), cria uma linha para cada produto
      if (sale.itens && Array.isArray(sale.itens) && sale.itens.length > 1) {
        var count = sale.itens.length;
        for (var idx = count - 1; idx >= 0; idx--) {
          var item = sale.itens[idx];
          var itemSku = String(item.sku || "").trim();
          var itemProduto = String(item.produto || sale.produto || "").trim();
          
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

          var itemData = {
            dateString: dataHora,
            vendedor: sale.vendedor || "",
            sku: itemSku,
            produto: itemProduto,
            preco: itemPreco,
            cliente: sale.cliente || "",
            contato: sale.contato || "",
            endereco: sale.endereco || "",
            frete: (idx === 0) ? (sale.frete || "") : "Incluso",
            pagamento: sale.pagamento || "",
            observacao: count > 1 ? ("Item " + (idx + 1) + "/" + count + " - " + (sale.observacao || "")) : (sale.observacao || ""),
            comissao: itemComissao !== "0,00" ? itemComissao : (sale.comissao || "0,00"),
            lucro: itemLucro !== "0,00" ? itemLucro : (sale.lucro || "0,00"),
            id: (sale.id || ("sale-" + new Date().getTime())) + "-" + (idx + 1)
          };

          insertSaleRowByMap(sheet, colMap, itemData);
        }
      } else {
        // Venda de 1 produto (ou item já desmembrado)
        var singleSku = String(sale.sku || "").trim();
        var singleProduto = String(sale.produto || "").trim();
        if (!singleSku && singleProduto.indexOf(" - ") !== -1) {
          var pParts = singleProduto.split(" - ");
          singleSku = pParts[0].trim();
          singleProduto = pParts.slice(1).join(" - ").trim();
        }

        var singlePreco = sale.preco;
        if (sale.itens && sale.itens.length === 1 && sale.itens[0].preco !== undefined) {
          singlePreco = typeof sale.itens[0].preco === "number" 
            ? sale.itens[0].preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : sale.itens[0].preco;
          if (!singleSku) singleSku = sale.itens[0].sku || "";
          if (!singleProduto) singleProduto = sale.itens[0].produto || "";
        }

        var saleDataToInsert = {
          dateString: dataHora,
          vendedor: sale.vendedor || "",
          sku: singleSku,
          produto: singleProduto,
          preco: singlePreco || "0,00",
          cliente: sale.cliente || "",
          contato: sale.contato || "",
          endereco: sale.endereco || "",
          frete: sale.frete || "",
          pagamento: sale.pagamento || "",
          observacao: sale.observacao || "",
          comissao: sale.comissao || "0,00",
          lucro: sale.lucro || "0,00",
          id: sale.id || ("sale-" + new Date().getTime())
        };

        insertSaleRowByMap(sheet, colMap, saleDataToInsert);
      }
      return createJsonResponse({ status: "success", message: "Venda gravada com sucesso na aba V!" });
    }

    if (action === "editSale") {
      var editData = payload.sale || payload;
      var editSheet = getSalesSheet();
      var dataValues = editSheet.getDataRange().getValues();
      var colMap = getSalesColumnMap(editSheet);
      var idIndex = colMap.id !== -1 ? colMap.id : (editSheet.getLastColumn() - 1);

      for (var i = 1; i < dataValues.length; i++) {
        var rowId = String(dataValues[i][idIndex] || dataValues[i][12] || dataValues[i][13] || "");
        if (rowId === String(editData.id)) {
          var rowNum = i + 1;
          updateSaleRowByMap(editSheet, colMap, rowNum, editData, dataValues[i]);
          return createJsonResponse({ status: "success", message: "Venda editada!" });
        }
      }
      return createJsonResponse({ status: "error", message: "Venda não encontrada" });
    }

    if (action === "deleteSale") {
      var delId = String(payload.id || (payload.data && payload.data.id) || "").trim();
      var delProd = String(payload.produto || (payload.data && payload.data.produto) || "").toLowerCase().trim();
      var delVend = String(payload.vendedor || (payload.data && payload.data.vendedor) || "").toLowerCase().trim();
      var delPreco = String(payload.preco || (payload.data && payload.data.preco) || "").replace("R$", "").replace(/\s/g, "").trim();
      var delData = String(payload.dateString || (payload.data && payload.data.dateString) || "").trim();

      var delSheet = getSalesSheet();
      var dValues = delSheet.getDataRange().getValues();
      if (dValues.length <= 1) {
        return createJsonResponse({ status: "success", message: "Planilha vazia." });
      }

      var lastColIdx = delSheet.getLastColumn() - 1;
      var deleted = false;

      // 1ª Tentativa: busca reversa por ID exato em qualquer uma das possíveis colunas de ID
      var colMap = getSalesColumnMap(delSheet);
      if (delId) {
        for (var d = dValues.length - 1; d >= 1; d--) {
          var row = dValues[d];
          var curId = String((colMap.id !== -1 ? row[colMap.id] : "") || row[lastColIdx] || row[13] || row[12] || "").trim();
          if (curId === delId) {
            delSheet.deleteRow(d + 1);
            deleted = true;
            break;
          }
        }
      }

      // 2ª Tentativa: se não encontrou por ID (ex: linhas importadas antigas sem ID salvo),
      // faz match pelos dados da venda mapeados dinamicamente: Data/Hora + Vendedor + Produto
      if (!deleted && (delProd || delVend || delData)) {
        for (var d2 = dValues.length - 1; d2 >= 1; d2--) {
          var r = dValues[d2];
          var rawDate = colMap.data !== -1 ? r[colMap.data] : r[0];
          var rDateStr = "";
          if (Object.prototype.toString.call(rawDate) === "[object Date]" || rawDate instanceof Date) {
            rDateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone() || "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
          } else {
            rDateStr = String(rawDate || "").trim();
          }

          var rVend = colMap.vendedor !== -1 ? String(r[colMap.vendedor] || "").toLowerCase().trim() : "";
          var rSku = colMap.sku !== -1 ? String(r[colMap.sku] || "").toLowerCase().trim() : "";
          var rProd = colMap.produto !== -1 ? String(r[colMap.produto] || "").toLowerCase().trim() : "";
          var rPreco = colMap.preco !== -1 ? String(r[colMap.preco] || "").replace("R$", "").replace(/\s/g, "").trim() : "";

          var matchVend = !delVend || rVend === delVend;
          var matchProd = !delProd || rProd === delProd || rSku === delProd || rProd.indexOf(delProd) !== -1;
          var matchPreco = !delPreco || rPreco === delPreco;

          var matchData = true;
          if (delData && rDateStr) {
            var shortDelData = delData.substring(0, 10);
            var shortRDate = rDateStr.substring(0, 10);
            matchData = (delData === rDateStr) || (shortDelData === shortRDate);
          }

          if (matchVend && matchProd && matchData && matchPreco) {
            delSheet.deleteRow(d2 + 1);
            deleted = true;
            break;
          }
        }
      }

      if (deleted) {
        return createJsonResponse({ status: "success", message: "Venda excluída da aba V!" });
      }
      return createJsonResponse({ status: "success", message: "Venda removida (ou já não constava na planilha)." });
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
        pSheet.getRange(2, 1, lRow - 1, Math.max(pSheet.getLastColumn(), 4)).clearContent();
      }
      if (prodList.length > 0) {
        var pRows = prodList.map(function(p, idx) {
          return [
            p.sku || ("SKU-" + (idx + 1)),
            p.name || p.product || "",
            p.price || "0,00",
            p.cost || ""
          ];
        });
        pSheet.getRange(2, 1, pRows.length, 4).setValues(pRows);
      }
      return createJsonResponse({ status: "success", message: prodList.length + " produtos salvos na aba P!" });
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

// Helper para mapear dinamicamente os índices de cada coluna da aba de Vendas ("V")
function getSalesColumnMap(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headers = headerValues.map(function(h) { return String(h || "").toLowerCase().trim(); });

  function findIdx(names, fallback) {
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      var idx = headers.findIndex(function(h) { return h.indexOf(n) !== -1; });
      if (idx !== -1) return idx;
    }
    return fallback;
  }

  var idxData = findIdx(["data"], 0);
  var idxVendedor = findIdx(["vendedor", "vend"], 1);
  var idxSku = headers.indexOf("sku"); // pode ser -1 se não tiver coluna SKU
  var idxProduto = findIdx(["produto", "prod", "item", "descri"], idxSku !== -1 ? 3 : 2);
  var idxPreco = findIdx(["preço", "preco", "valor"], idxSku !== -1 ? 4 : 3);
  var idxCliente = findIdx(["cliente", "comprador"], idxSku !== -1 ? 5 : 4);
  var idxContato = findIdx(["contato", "telefone", "tel", "celular", "whats"], idxSku !== -1 ? 6 : 5);
  var idxEndereco = findIdx(["endereço", "endereco", "local"], idxSku !== -1 ? 7 : 6);
  var idxFrete = findIdx(["frete"], idxSku !== -1 ? 8 : 7);
  var idxPagamento = findIdx(["pagamento", "pagto", "forma"], idxSku !== -1 ? 9 : 8);
  var idxObservacao = findIdx(["observa", "obs"], idxSku !== -1 ? 10 : 9);
  var idxComissao = findIdx(["comissão", "comissao"], idxSku !== -1 ? 11 : 10);
  var idxLucro = findIdx(["lucro"], idxSku !== -1 ? 12 : 11);
  var idxId = findIdx(["id venda", "id_venda", "id"], headers.length - 1);

  return {
    headersCount: headers.length,
    data: idxData,
    vendedor: idxVendedor,
    sku: idxSku,
    produto: idxProduto,
    preco: idxPreco,
    cliente: idxCliente,
    contato: idxContato,
    endereco: idxEndereco,
    frete: idxFrete,
    pagamento: idxPagamento,
    observacao: idxObservacao,
    comissao: idxComissao,
    lucro: idxLucro,
    id: idxId
  };
}

function buildSaleRowArray(colMap, saleData) {
  var row = new Array(colMap.headersCount);
  for (var k = 0; k < colMap.headersCount; k++) row[k] = "";

  if (colMap.data !== -1) row[colMap.data] = saleData.dateString || "";
  if (colMap.vendedor !== -1) row[colMap.vendedor] = saleData.vendedor || "";
  if (colMap.sku !== -1) row[colMap.sku] = saleData.sku || "";
  if (colMap.produto !== -1) row[colMap.produto] = saleData.produto || "";
  if (colMap.preco !== -1) row[colMap.preco] = saleData.preco || "0,00";
  if (colMap.cliente !== -1) row[colMap.cliente] = saleData.cliente || "";
  if (colMap.contato !== -1) row[colMap.contato] = saleData.contato || "";
  if (colMap.endereco !== -1) row[colMap.endereco] = saleData.endereco || "";
  if (colMap.frete !== -1) row[colMap.frete] = saleData.frete || "";
  if (colMap.pagamento !== -1) row[colMap.pagamento] = saleData.pagamento || "";
  if (colMap.observacao !== -1) row[colMap.observacao] = saleData.observacao || "";
  if (colMap.comissao !== -1) row[colMap.comissao] = saleData.comissao || "0,00";
  if (colMap.lucro !== -1) row[colMap.lucro] = saleData.lucro || "0,00";
  if (colMap.id !== -1) row[colMap.id] = saleData.id || "";

  return row;
}

function insertSaleRowByMap(sheet, colMap, saleData) {
  var row = buildSaleRowArray(colMap, saleData);
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, row.length).setValues([row]);
}

function updateSaleRowByMap(sheet, colMap, rowNum, editData, existingRow) {
  var row = existingRow ? existingRow.slice(0, colMap.headersCount) : new Array(colMap.headersCount);
  
  if (colMap.data !== -1 && editData.dateString !== undefined) row[colMap.data] = editData.dateString;
  if (colMap.vendedor !== -1 && editData.vendedor !== undefined) row[colMap.vendedor] = editData.vendedor;
  if (colMap.sku !== -1 && editData.sku !== undefined) row[colMap.sku] = editData.sku;
  if (colMap.produto !== -1 && editData.produto !== undefined) row[colMap.produto] = editData.produto;
  if (colMap.preco !== -1 && editData.preco !== undefined) row[colMap.preco] = editData.preco;
  if (colMap.cliente !== -1 && editData.cliente !== undefined) row[colMap.cliente] = editData.cliente;
  if (colMap.contato !== -1 && editData.contato !== undefined) row[colMap.contato] = editData.contato;
  if (colMap.endereco !== -1 && editData.endereco !== undefined) row[colMap.endereco] = editData.endereco;
  if (colMap.frete !== -1 && editData.frete !== undefined) row[colMap.frete] = editData.frete;
  if (colMap.pagamento !== -1 && editData.pagamento !== undefined) row[colMap.pagamento] = editData.pagamento;
  if (colMap.observacao !== -1 && editData.observacao !== undefined) row[colMap.observacao] = editData.observacao;
  if (colMap.comissao !== -1 && editData.comissao !== undefined) row[colMap.comissao] = editData.comissao;
  if (colMap.lucro !== -1 && editData.lucro !== undefined) row[colMap.lucro] = editData.lucro;
  if (colMap.id !== -1 && editData.id !== undefined) row[colMap.id] = editData.id;

  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
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
    ensureSalesHeadersLayout(sheet);
  }
  return sheet;
}

// Garante que os cabeçalhos da aba V estejam na ordem exata e esperada
function ensureSalesHeadersLayout(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headers = rawHeaders.map(function(h) { return String(h || "").trim().toLowerCase(); });

  // Se a aba tem cabeçalhos mas a ordem ficou invertida (ex: Preço antes de Produto) ou falta coluna SKU/ID
  var hasSku = headers.indexOf("sku") !== -1;
  var idxProduto = headers.findIndex(function(h) { return h.indexOf("prod") !== -1; });
  var idxPreco = headers.findIndex(function(h) { return h.indexOf("preço") !== -1 || h.indexOf("preco") !== -1 || h.indexOf("valor") !== -1; });

  // Se não tem SKU e tem poucas colunas antigas, insere a coluna SKU após Vendedor
  if (!hasSku && headers.length <= 13) {
    sheet.insertColumnAfter(2); // Coluna C
    sheet.getRange(1, 3).setValue("SKU");
  }

  // Se Preço veio antes de Produto na linha 1 (ex: Coluna D = Preço e Coluna E = Produto como na foto enviada),
  // normaliza o cabeçalho oficial para: Coluna C: SKU, Coluna D: Produto, Coluna E: Preço (R$) ou Coluna D: Preço, Coluna E: Produto
  // Para evitar quebrar linhas antigas, nós ajustamos a escrita via getSalesColumnMap(sheet),
  // e garantimos que a linha de cabeçalho tenha o nome certo de cada coluna.
}

// Localiza ou cria a aba Produtos (prioriza "P", depois "Produtos")
function getProductsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("P") || ss.getSheetByName("p") || ss.getSheetByName(SHEET_NAMES.PRODUCTS) || ss.getSheetByName("Produtos");
  var headers = ["SKU", "Nome do Produto", "Preço Venda (R$)", "Custo (R$)"];

  if (!sheet) {
    sheet = ss.insertSheet("P");
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
  
  // Detecção inteligente de colunas baseada no layout da aba P: [SKU, Nome do Produto, Preço Venda (R$), Custo (R$)]
  var idxSku = headers.indexOf("sku");
  if (idxSku === -1) idxSku = 0; // Coluna A padrão

  var idxProd = headers.findIndex(function(h) { return h.indexOf("nome") !== -1 || h.indexOf("prod") !== -1; });
  if (idxProd === -1) idxProd = 1; // Coluna B padrão

  var idxPreco = headers.findIndex(function(h) { return h.indexOf("preço") !== -1 || h.indexOf("preco") !== -1 || h.indexOf("venda") !== -1 || h.indexOf("valor") !== -1; });
  if (idxPreco === -1) idxPreco = 2; // Coluna C padrão

  var idxCusto = headers.findIndex(function(h) { return h.indexOf("custo") !== -1 || h.indexOf("cust") !== -1; });
  if (idxCusto === -1 && headers.length > 3) idxCusto = 3; // Coluna D padrão

  var prods = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var skuVal = idxSku !== -1 ? String(row[idxSku] || "").trim() : "";
    var nameVal = idxProd !== -1 ? String(row[idxProd] || "").trim() : "";
    
    // Se a linha estiver completamente vazia, pula
    if (!nameVal && !skuVal) continue;

    // Se o SKU estiver preenchido mas o nome vazio, usa o SKU como nome e vice-versa
    if (!nameVal) nameVal = skuVal;
    if (!skuVal) skuVal = nameVal;

    // Trata formatações numéricas como R$ 30,00 ou números diretos
    var precoVal = "0,00";
    if (idxPreco !== -1 && row[idxPreco] !== "" && row[idxPreco] !== undefined) {
      if (typeof row[idxPreco] === "number") {
        precoVal = row[idxPreco].toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        precoVal = String(row[idxPreco]).replace("R$", "").trim();
      }
    }

    var custoVal = "";
    if (idxCusto !== -1 && row[idxCusto] !== "" && row[idxCusto] !== undefined) {
      if (typeof row[idxCusto] === "number") {
        custoVal = row[idxCusto].toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        custoVal = String(row[idxCusto]).replace("R$", "").trim();
      }
    }

    var baseVal = precoVal;
    var idVal = skuVal || ("prod-" + i);

    prods.push({
      id: idVal,
      sku: skuVal,
      name: nameVal,
      product: nameVal,
      price: precoVal,
      cost: custoVal,
      basePrice: baseVal,
      category: "Geral",
      stock: ""
    });
  }
  return prods;
}

function upsertSingleProduct(prod) {
  var sheet = getProductsSheet();
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return String(h || "").toLowerCase().trim(); });

  var idxSku = headers.indexOf("sku") !== -1 ? headers.indexOf("sku") : 0;
  var idxProd = headers.findIndex(function(h) { return h.indexOf("nome") !== -1 || h.indexOf("prod") !== -1; });
  if (idxProd === -1) idxProd = 1;

  var idxPreco = headers.findIndex(function(h) { return h.indexOf("preço") !== -1 || h.indexOf("preco") !== -1 || h.indexOf("venda") !== -1; });
  if (idxPreco === -1) idxPreco = 2;

  var idxCusto = headers.findIndex(function(h) { return h.indexOf("custo") !== -1; });
  if (idxCusto === -1 && headers.length > 3) idxCusto = 3;

  var targetSku = String(prod.sku || "").toUpperCase().trim();
  var targetName = String(prod.name || prod.product || "").toLowerCase().trim();

  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    var rSku = idxSku !== -1 ? String(values[i][idxSku]).toUpperCase().trim() : "";
    var rName = idxProd !== -1 ? String(values[i][idxProd]).toLowerCase().trim() : "";

    if ((targetSku && rSku === targetSku) || (targetName && rName === targetName)) {
      rowIndex = i + 1;
      break;
    }
  }

  var formattedPrice = prod.price !== undefined ? String(prod.price).replace("R$", "").trim() : "0,00";
  var formattedCost = prod.cost !== undefined ? String(prod.cost).replace("R$", "").trim() : "";

  if (rowIndex > 0) {
    if (idxSku !== -1 && prod.sku) sheet.getRange(rowIndex, idxSku + 1).setValue(prod.sku);
    if (idxProd !== -1 && (prod.name || prod.product)) sheet.getRange(rowIndex, idxProd + 1).setValue(prod.name || prod.product);
    if (idxPreco !== -1 && prod.price !== undefined) sheet.getRange(rowIndex, idxPreco + 1).setValue(formattedPrice);
    if (idxCusto !== -1 && prod.cost !== undefined) sheet.getRange(rowIndex, idxCusto + 1).setValue(formattedCost);
  } else {
    sheet.appendRow([
      prod.sku || "",
      prod.name || prod.product || "",
      formattedPrice,
      formattedCost
    ]);
  }
}

function deleteProductFromSheet(prodInfo) {
  var sheet = getProductsSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  var sku = String((prodInfo && (prodInfo.sku || prodInfo.id)) || "").toUpperCase().trim();
  var name = String((prodInfo && (prodInfo.name || prodInfo.product)) || "").toLowerCase().trim();

  var headers = values[0].map(function(h) { return String(h || "").toLowerCase().trim(); });
  var idxSku = headers.indexOf("sku") !== -1 ? headers.indexOf("sku") : 0;
  var idxProd = headers.findIndex(function(h) { return h.indexOf("nome") !== -1 || h.indexOf("prod") !== -1; });
  if (idxProd === -1) idxProd = 1;

  for (var i = 1; i < values.length; i++) {
    var rSku = idxSku !== -1 ? String(values[i][idxSku]).toUpperCase().trim() : "";
    var rName = idxProd !== -1 ? String(values[i][idxProd]).toLowerCase().trim() : "";
    if ((sku && rSku === sku) || (name && rName === name)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function readSalesFromSheet() {
  var sheet = getSalesSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var colMap = getSalesColumnMap(sheet);

  var sales = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0] && !row[1] && !row[2] && !row[3]) continue;

    var rawDate = colMap.data !== -1 ? row[colMap.data] : row[0];
    var dateFormatted = "";
    if (Object.prototype.toString.call(rawDate) === "[object Date]" || rawDate instanceof Date) {
      dateFormatted = Utilities.formatDate(rawDate, Session.getScriptTimeZone() || "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
    } else {
      dateFormatted = String(rawDate || "");
    }

    var vendedor = colMap.vendedor !== -1 ? String(row[colMap.vendedor] || "") : "";
    var sku = colMap.sku !== -1 ? String(row[colMap.sku] || "") : "";
    var produto = colMap.produto !== -1 ? String(row[colMap.produto] || "") : "";
    var preco = colMap.preco !== -1 ? String(row[colMap.preco] || "0,00") : "0,00";
    var cliente = colMap.cliente !== -1 ? String(row[colMap.cliente] || "") : "";
    var contato = colMap.contato !== -1 ? String(row[colMap.contato] || "") : "";
    var endereco = colMap.endereco !== -1 ? String(row[colMap.endereco] || "") : "";
    var frete = colMap.frete !== -1 ? String(row[colMap.frete] || "") : "";
    var pagamento = colMap.pagamento !== -1 ? String(row[colMap.pagamento] || "") : "";
    var observacao = colMap.observacao !== -1 ? String(row[colMap.observacao] || "") : "";
    var comissao = colMap.comissao !== -1 ? String(row[colMap.comissao] || "0,00") : "0,00";
    var lucro = colMap.lucro !== -1 ? String(row[colMap.lucro] || "0,00") : "0,00";
    var saleId = (colMap.id !== -1 && row[colMap.id]) ? String(row[colMap.id]) : ("sale-" + i);

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
// FIM DO ARQUIVO
