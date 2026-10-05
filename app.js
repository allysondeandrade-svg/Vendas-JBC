/**
 * REGISTRO DE VENDAS - MOBILE APP
 * Full application logic:
 * - Vendedores: Junior, Alexandre, Jeremias, Allyson, Johnathan
 * - Gestão de Vendedores (Criar, Editar, Excluir, Definir Padrão na aba Configurações)
 * - Vendas -> Histórico:
 *     1. Exportar Planilha (Excel/CSV)
 *     2. Filtrar por Data (Todos, Hoje, 7 Dias, Este Mês, Personalizado)
 *     3. Resultado e Ranking de cada vendedor por período (Vendas, Faturamento, Comissão, Lucro)
 * - Preço Base, Comissão = Preço - Preço Base, Lucro = Preço Base - Custo
 * - Alteração manual da comissão impacta em tempo real no Lucro
 * - Cadastro em massa por planilha e persistência offline
 * - Botão circular de compartilhar no WhatsApp
 */

// ============================================================================
// STORAGE KEYS & DEFAULT DATA
// ============================================================================
const STORAGE_KEYS = {
  SALES: 'app_vendas_records_v4',
  PRODUCTS: 'app_produtos_catalog_v4',
  SELLERS: 'app_vendedores_list_v4',
  CONFIG: 'app_settings_config_v4',
  THEME: 'app_theme_mode_v2',
  FRAME_MODE: 'app_frame_mode_v2'
};

const DEFAULT_WHATSAPP_TEMPLATE = 
`👤 *Vendedor:* {vendedor}
📦 *Produto:* {produto}
💰 *Preço:* {preco}
🤝 *Cliente:* {cliente}
📞 *Contato:* {contato}
📮 *CEP:* {cep}
📍 *Endereço:* {endereco}
🚚 *Frete:* {frete}
💳 *Pagamento:* {pagamento}
💲 *Total:* {total}
🚚 *Data da Entrega:* {data_entrega}
📝 *Observação:* {obs}
💼 *Comissão:* {comissao}
📈 *Lucro:* {lucro}
📅 *Data:* {data}`;

// Initial Sellers specified by user: Junior, Alexandre, Jeremias, Allyson, Johnathan
const INITIAL_SELLERS = [
  { id: 'v1', name: 'Junior', phone: '(11) 98888-1111', isDefault: true },
  { id: 'v2', name: 'Alexandre', phone: '(11) 98888-2222', isDefault: false },
  { id: 'v3', name: 'Jeremias', phone: '(11) 98888-3333', isDefault: false },
  { id: 'v4', name: 'Allyson', phone: '(11) 98888-4444', isDefault: false },
  { id: 'v5', name: 'Johnathan', phone: '(11) 98888-5555', isDefault: false }
];

const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'Smartphone Galaxy A15 128GB', price: '899,00', cost: '650,00', basePrice: '750,00', category: 'Smartphones' },
  { id: 'p2', name: 'Fone Bluetooth Pro Cancelamento', price: '149,90', cost: '55,00', basePrice: '100,00', category: 'Acessórios' },
  { id: 'p3', name: 'Smartwatch Ultra 49mm Esportivo', price: '219,00', cost: '100,00', basePrice: '160,00', category: 'Wearables' },
  { id: 'p4', name: 'Cabo USB-C Turbo Blindado 2m', price: '39,90', cost: '12,00', basePrice: '25,00', category: 'Cabos' },
  { id: 'p5', name: 'Mochila Executiva Impermeável', price: '189,00', cost: '85,00', basePrice: '130,00', category: 'Bolsas' }
];

// Realistic initial sales attributing across sellers and recent dates
const nowMs = Date.now();
const oneDayMs = 86400000;

function formatCustomDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const INITIAL_SALES = [
  {
    id: 'sale-1',
    vendedor: 'Junior',
    produto: 'Smartphone Galaxy A15 128GB',
    preco: '899,00',
    cliente: 'Marcos Vinícius',
    contato: '(11) 99123-4567',
    endereco: 'Rua Augusta, 500 - SP',
    frete: 'Grátis',
    pagamento: 'Pix',
    observacao: 'Entrega imediata',
    comissao: '149,00',
    lucro: '100,00',
    timestamp: nowMs - 1000 * 60 * 30, // 30 min ago (Hoje)
    dateString: formatCustomDate(nowMs - 1000 * 60 * 30)
  },
  {
    id: 'sale-2',
    vendedor: 'Alexandre',
    produto: 'Smartwatch Ultra 49mm Esportivo',
    preco: '219,00',
    cliente: 'Juliana Costa',
    contato: '(11) 98234-5678',
    endereco: 'Av. Paulista, 1000',
    frete: '15,00',
    pagamento: 'Cartão de Crédito',
    observacao: 'Cor: Laranja',
    comissao: '59,00',
    lucro: '60,00',
    timestamp: nowMs - 1000 * 60 * 180, // 3h ago (Hoje)
    dateString: formatCustomDate(nowMs - 1000 * 60 * 180)
  },
  {
    id: 'sale-3',
    vendedor: 'Jeremias',
    produto: 'Fone Bluetooth Pro Cancelamento',
    preco: '149,90',
    cliente: 'Rodrigo Alves',
    contato: '(21) 97345-6789',
    endereco: 'Copacabana - RJ',
    frete: '20,00',
    pagamento: 'Pix',
    observacao: 'Embalar para presente',
    comissao: '49,90',
    lucro: '45,00',
    timestamp: nowMs - oneDayMs * 1, // Ontem
    dateString: formatCustomDate(nowMs - oneDayMs * 1)
  },
  {
    id: 'sale-4',
    vendedor: 'Allyson',
    produto: 'Mochila Executiva Impermeável',
    preco: '189,00',
    cliente: 'Camila Santos',
    contato: '(31) 98456-7890',
    endereco: 'Belo Horizonte - MG',
    frete: 'Grátis',
    pagamento: 'Boleto',
    observacao: 'Preta',
    comissao: '59,00',
    lucro: '45,00',
    timestamp: nowMs - oneDayMs * 3, // 3 dias atrás
    dateString: formatCustomDate(nowMs - oneDayMs * 3)
  },
  {
    id: 'sale-5',
    vendedor: 'Johnathan',
    produto: 'Cabo USB-C Turbo Blindado 2m',
    preco: '39,90',
    cliente: 'Felipe Duarte',
    contato: '(41) 99567-8901',
    endereco: 'Curitiba - PR',
    frete: '10,00',
    pagamento: 'Dinheiro',
    observacao: 'Retirada na loja',
    comissao: '14,90',
    lucro: '13,00',
    timestamp: nowMs - oneDayMs * 5, // 5 dias atrás
    dateString: formatCustomDate(nowMs - oneDayMs * 5)
  },
  {
    id: 'sale-6',
    vendedor: 'Junior',
    produto: 'Fone Bluetooth Pro Cancelamento',
    preco: '149,90',
    cliente: 'Patricia Neves',
    contato: '(11) 97678-9012',
    endereco: 'Santana - SP',
    frete: 'Grátis',
    pagamento: 'Pix',
    observacao: 'Branco',
    comissao: '49,90',
    lucro: '45,00',
    timestamp: nowMs - oneDayMs * 12, // 12 dias atrás (Este mês)
    dateString: formatCustomDate(nowMs - oneDayMs * 12)
  }
];

// ============================================================================
// APP STATE
// ============================================================================
let appState = {
  sales: [],
  products: [],
  sellers: [],
  config: {
    vendedorPadrao: 'Junior',
    comissaoPadrao: 10,
    whatsTelefone: '',
    whatsMsgTemplate: DEFAULT_WHATSAPP_TEMPLATE,
    googleSheetUrl: 'https://script.google.com/macros/s/AKfycbyJZaNIi5mSaISu1wHyD1hZjrvWzsXL9jLCrnG8uchQCNKfBFZJyV3liD0qFwjugkRd/exec',
    autoSyncSheet: true
  },
  currentEditingProductId: null,
  currentEditingSellerId: null,
  pendingWhatsappMessage: '',
  pendingWhatsappPhone: '',
  parsedBulkProducts: [],
  currentCart: [],
  
  // Real-time calculation context for currently selected product
  currentSaleProductContext: {
    matchedProduct: null,
    basePrice: 0,
    cost: 0,
    isCommissionManuallyEdited: false
  },

  // History filtering state
  historyFilter: {
    dateRangeMode: 'all', // 'all', 'today', 'week', 'month', 'custom'
    dateStart: '',
    dateEnd: '',
    seller: 'all',
    searchQuery: ''
  }
};

// ============================================================================
// AUDIO SYNTHESIZER
// ============================================================================
const SoundEffects = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },
  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  },
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.06, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.16);
      });
    } catch (e) {}
  }
};

// ============================================================================
// DOM ELEMENTS REFERENCE
// ============================================================================
const DOM = {
  // Navigation Tabs
  tabBtnVendas: document.getElementById('tabBtnVendas'),
  tabBtnProdutos: document.getElementById('tabBtnProdutos'),
  tabBtnConfig: document.getElementById('tabBtnConfig'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  // Vendas Sub-nav
  subnavFormBtn: document.getElementById('subnavFormBtn'),
  subnavListBtn: document.getElementById('subnavListBtn'),
  salesFormSection: document.getElementById('salesFormSection'),
  salesHistorySection: document.getElementById('salesHistorySection'),
  salesCounter: document.getElementById('salesCounter'),
  
  // Sales Form Inputs
  salesForm: document.getElementById('salesForm'),
  inputVendedor: document.getElementById('inputVendedor'),
  vendedoresDatalist: document.getElementById('vendedoresDatalist'),
  inputProduto: document.getElementById('inputProduto'),
  productBaseInfoChip: document.getElementById('productBaseInfoChip'),
  inputPreco: document.getElementById('inputPreco'),
  inputQuantidade: document.getElementById('inputQuantidade'),
  btnAddCartItem: document.getElementById('btnAddCartItem'),
  cartItemsContainer: document.getElementById('cartItemsContainer'),
  emptyCartMsg: document.getElementById('emptyCartMsg'),
  inputPreco: document.getElementById('inputPreco'),
  inputCliente: document.getElementById('inputCliente'),
  inputDocumento: document.getElementById('inputDocumento'),
  rowDocumento: document.getElementById('row-documento'),
  inputContato: document.getElementById('inputContato'),
  inputEndereco: document.getElementById('inputEndereco'),
  inputFrete: document.getElementById('inputFrete'),
  inputTotal: document.getElementById('inputTotal'),
  inputDataEntrega: document.getElementById('inputDataEntrega'),
  inputPagamento: document.getElementById('inputPagamento'),
  inputObservacao: document.getElementById('inputObservacao'),
  inputComissao: document.getElementById('inputComissao'),
  inputLucro: document.getElementById('inputLucro'),
  hintComissao: document.getElementById('hintComissao'),
  hintLucro: document.getElementById('hintLucro'),
  checkEnviarGarantia: document.getElementById('checkEnviarGarantia'),
  garantiaPdfOffscreen: document.getElementById('garantiaPdfOffscreen'),
  produtosDatalist: document.getElementById('produtosDatalist'),
  btnClearForm: document.getElementById('btnClearForm'),
  btnCalcComissao: document.getElementById('btnCalcComissao'),
  btnCalcLucro: document.getElementById('btnCalcLucro'),
  
  // Sales History List & KPIs
  salesList: document.getElementById('salesList'),
  historySearchInput: document.getElementById('historySearchInput'),
  periodActiveBadge: document.getElementById('periodActiveBadge'),
  btnExportHistoryCSV: document.getElementById('btnExportHistoryCSV'),
  customDateContainer: document.getElementById('customDateContainer'),
  filterDateStart: document.getElementById('filterDateStart'),
  filterDateEnd: document.getElementById('filterDateEnd'),
  btnApplyDateFilter: document.getElementById('btnApplyDateFilter'),
  btnClearDateFilter: document.getElementById('btnClearDateFilter'),
  filterSellerSelect: document.getElementById('filterSellerSelect'),
  activeFilterIndicator: document.getElementById('activeFilterIndicator'),
  activeFilterText: document.getElementById('activeFilterText'),
  btnClearAllFilters: document.getElementById('btnClearAllFilters'),
  
  kpiTotalVendas: document.getElementById('kpiTotalVendas'),
  kpiFaturamento: document.getElementById('kpiFaturamento'),
  kpiComissao: document.getElementById('kpiComissao'),
  kpiLucro: document.getElementById('kpiLucro'),

  // Seller Performance Card
  sellerPerformanceCard: document.getElementById('sellerPerformanceCard'),
  btnTogglePerfTable: document.getElementById('btnTogglePerfTable'),
  perfToggleText: document.getElementById('perfToggleText'),
  perfArrowIcon: document.getElementById('perfArrowIcon'),
  sellerLeaderboardSummary: document.getElementById('sellerLeaderboardSummary'),
  sellerPerfTableWrap: document.getElementById('sellerPerfTableWrap'),
  sellerPerfTableBody: document.getElementById('sellerPerfTableBody'),
  
  // WhatsApp Action Button
  btnApenasWhatsapp: document.getElementById('btnApenasWhatsapp'),
  fabWhatsappBtn: document.getElementById('fabWhatsappBtn'),
  
  // WhatsApp Modal
  whatsappModalBackdrop: document.getElementById('whatsappModalBackdrop'),
  whatsappBottomSheet: document.getElementById('whatsappBottomSheet'),
  whatsappMessagePreview: document.getElementById('whatsappMessagePreview'),
  garantiaModalAttachment: document.getElementById('garantiaModalAttachment'),
  btnPreviewGarantiaModal: document.getElementById('btnPreviewGarantiaModal'),
  btnSendGarantiaDirectModal: document.getElementById('btnSendGarantiaDirectModal'),
  recipientText: document.getElementById('recipientText'),
  chatMessageTime: document.getElementById('chatMessageTime'),
  btnSendWhatsappDirect: document.getElementById('btnSendWhatsappDirect'),
  btnCopyWhatsappMessage: document.getElementById('btnCopyWhatsappMessage'),
  btnCloseWhatsappModal: document.getElementById('btnCloseWhatsappModal'),

  // Recibo e Termo de Garantia Modal
  garantiaModalBackdrop: document.getElementById('garantiaModalBackdrop'),
  garantiaDocumentRender: document.getElementById('garantiaDocumentRender'),
  btnCloseGarantiaModal: document.getElementById('btnCloseGarantiaModal'),
  btnDismissGarantiaModal: document.getElementById('btnDismissGarantiaModal'),
  btnPrintGarantiaDoc: document.getElementById('btnPrintGarantiaDoc'),
  btnDownloadGarantiaPDF: document.getElementById('btnDownloadGarantiaPDF'),
  btnShareGarantiaWhatsapp: document.getElementById('btnShareGarantiaWhatsapp'),
  
  // Products Management
  btnToggleNewProduct: document.getElementById('btnToggleNewProduct'),
  newProductCard: document.getElementById('newProductCard'),
  productFormTitle: document.getElementById('productFormTitle'),
  productForm: document.getElementById('productForm'),
  editProductId: document.getElementById('editProductId'),
  prodName: document.getElementById('prodName'),
  prodPrice: document.getElementById('prodPrice'),
  prodCost: document.getElementById('prodCost'),
  prodBasePrice: document.getElementById('prodBasePrice'),
  prodCategory: document.getElementById('prodCategory'),
  btnCancelProduct: document.getElementById('btnCancelProduct'),
  productsListGrid: document.getElementById('productsListGrid'),
  productSearchInput: document.getElementById('productSearchInput'),
  catalogCountBadge: document.getElementById('catalogCountBadge'),
  btnDownloadTemplate: document.getElementById('btnDownloadTemplate'),
  btnExportProductsCSV: document.getElementById('btnExportProductsCSV'),
  
  // Bulk Spreadsheet Import Modal
  btnOpenBulkImport: document.getElementById('btnOpenBulkImport'),
  bulkImportModalBackdrop: document.getElementById('bulkImportModalBackdrop'),
  btnCloseBulkModal: document.getElementById('btnCloseBulkModal'),
  btnCancelBulkModal: document.getElementById('btnCancelBulkModal'),
  tabUploadFileBtn: document.getElementById('tabUploadFileBtn'),
  tabPasteTextBtn: document.getElementById('tabPasteTextBtn'),
  panelUploadFile: document.getElementById('panelUploadFile'),
  panelPasteText: document.getElementById('panelPasteText'),
  fileDropzone: document.getElementById('fileDropzone'),
  bulkCsvFileInput: document.getElementById('bulkCsvFileInput'),
  selectedFileInfo: document.getElementById('selectedFileInfo'),
  selectedFileName: document.getElementById('selectedFileName'),
  btnRemoveFile: document.getElementById('btnRemoveFile'),
  bulkPasteTextarea: document.getElementById('bulkPasteTextarea'),
  btnProcessPastedText: document.getElementById('btnProcessPastedText'),
  btnDownloadSampleCSV: document.getElementById('btnDownloadSampleCSV'),
  bulkPreviewSection: document.getElementById('bulkPreviewSection'),
  parsedProductsCount: document.getElementById('parsedProductsCount'),
  bulkPreviewTableBody: document.getElementById('bulkPreviewTableBody'),
  btnConfirmBulkImport: document.getElementById('btnConfirmBulkImport'),
  
  // Database Metrics in Settings
  dbSalesCount: document.getElementById('dbSalesCount'),
  dbProductsCount: document.getElementById('dbProductsCount'),
  dbStorageBytes: document.getElementById('dbStorageBytes'),
  
  // Seller Management in Settings
  btnToggleNewSeller: document.getElementById('btnToggleNewSeller'),
  sellerFormCard: document.getElementById('sellerFormCard'),
  sellerFormTitle: document.getElementById('sellerFormTitle'),
  sellerForm: document.getElementById('sellerForm'),
  editSellerId: document.getElementById('editSellerId'),
  sellerNameInput: document.getElementById('sellerNameInput'),
  sellerPhoneInput: document.getElementById('sellerPhoneInput'),
  btnCancelSeller: document.getElementById('btnCancelSeller'),
  sellersListContainer: document.getElementById('sellersListContainer'),
  cfgVendedorPadraoSelect: document.getElementById('cfgVendedorPadraoSelect'),

  // Configs
  cfgComissaoPadrao: document.getElementById('cfgComissaoPadrao'),
  cfgWhatsTelefone: document.getElementById('cfgWhatsTelefone'),
  cfgWhatsMsg: document.getElementById('cfgWhatsMsg'),
  btnResetTemplate: document.getElementById('btnResetTemplate'),
  btnSalvarConfig: document.getElementById('btnSalvarConfig'),
  btnExportCSV: document.getElementById('btnExportCSV'),
  btnExportJSON: document.getElementById('btnExportJSON'),
  btnLoadSampleData: document.getElementById('btnLoadSampleData'),
  btnClearAllData: document.getElementById('btnClearAllData'),
  
  // Google Sheets Cloud Database
  googleSheetsCard: document.getElementById('googleSheetsCard'),
  sheetStatusPill: document.getElementById('sheetStatusPill'),
  sheetStatusDot: document.getElementById('sheetStatusDot'),
  sheetStatusText: document.getElementById('sheetStatusText'),
  cfgGoogleSheetUrl: document.getElementById('cfgGoogleSheetUrl'),
  btnTestGoogleSheets: document.getElementById('btnTestGoogleSheets'),
  btnSyncAllFromSheet: document.getElementById('btnSyncAllFromSheet'),
  btnPushProductsToSheet: document.getElementById('btnPushProductsToSheet'),
  btnOpenScriptGuideModal: document.getElementById('btnOpenScriptGuideModal'),
  cfgAutoSyncSheet: document.getElementById('cfgAutoSyncSheet'),
  btnSyncProductsSheetQuick: document.getElementById('btnSyncProductsSheetQuick'),

  // Google Apps Script Guide Modal
  appsScriptGuideModalBackdrop: document.getElementById('appsScriptGuideModalBackdrop'),
  appsScriptGuideModal: document.getElementById('appsScriptGuideModal'),
  btnCloseScriptGuideModal: document.getElementById('btnCloseScriptGuideModal'),
  btnCopyScriptCode: document.getElementById('btnCopyScriptCode'),
  appsScriptCodePre: document.getElementById('appsScriptCodePre'),
  btnDoneScriptGuide: document.getElementById('btnDoneScriptGuide'),
  
  // Device & Theme Utilities
  smartphoneFrame: document.getElementById('smartphoneFrame'),
  toggleDeviceFrameBtn: document.getElementById('toggleDeviceFrameBtn'),
  frameModeText: document.getElementById('frameModeText'),
  toggleThemeBtn: document.getElementById('toggleThemeBtn'),
  livePhoneTime: document.getElementById('livePhoneTime'),
  toastStack: document.getElementById('toastStack')
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  try {
    loadDataFromStorage();
    setupLiveClock();
    setupEventListeners();
    setupThemeAndFrame();
    
    // Sellers setup
    renderSellersList();
    renderSellersDatalist();
    renderSellersSelect();
    
    // Products & Sales setup
    renderProductsDatalist();
    renderProductsList();
    renderSalesHistory();
    updateDatabaseMetrics();
    applyDefaultSellerIfEmpty();
    updateGoogleSheetStatusUI();
    
    // Set default date
    if (DOM.inputDataEntrega) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      DOM.inputDataEntrega.value = `${yyyy}-${mm}-${dd}`;
    }

    // Auto-fetch from Google Sheets in background if URL is configured
    if (appState.config.googleSheetUrl && appState.config.autoSyncSheet) {
      fetchDataFromGoogleSheets(true);
    }
  } catch (err) {
    console.error('Erro na inicialização do aplicativo:', err);
  }
});

// ============================================================================
// DATA PERSISTENCE & STORAGE
// ============================================================================
function loadDataFromStorage() {
  try {
    const savedSales = localStorage.getItem(STORAGE_KEYS.SALES);
    appState.sales = savedSales ? JSON.parse(savedSales) : INITIAL_SALES;

    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    appState.products = savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS;

    const savedSellers = localStorage.getItem(STORAGE_KEYS.SELLERS);
    appState.sellers = savedSellers ? JSON.parse(savedSellers) : INITIAL_SELLERS;

    const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (savedConfig) {
      appState.config = Object.assign(appState.config, JSON.parse(savedConfig));
    }
  } catch (err) {
    console.warn('Erro ao carregar do localStorage, usando valores padrão.', err);
    appState.sales = INITIAL_SALES;
    appState.products = INITIAL_PRODUCTS;
    appState.sellers = INITIAL_SELLERS;
  }

  if (DOM.cfgComissaoPadrao) DOM.cfgComissaoPadrao.value = appState.config.comissaoPadrao || 10;
  if (DOM.cfgWhatsTelefone) DOM.cfgWhatsTelefone.value = appState.config.whatsTelefone || '';
  if (DOM.cfgWhatsMsg) DOM.cfgWhatsMsg.value = appState.config.whatsMsgTemplate || DEFAULT_WHATSAPP_TEMPLATE;
  if (DOM.cfgGoogleSheetUrl) DOM.cfgGoogleSheetUrl.value = appState.config.googleSheetUrl || '';
  if (DOM.cfgAutoSyncSheet) DOM.cfgAutoSyncSheet.checked = appState.config.autoSyncSheet !== false;
}

function saveSalesToStorage() {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(appState.sales));
  renderSalesHistory();
  updateDatabaseMetrics();
}

function saveProductsToStorage() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(appState.products));
  renderProductsDatalist();
  renderProductsList();
  updateDatabaseMetrics();

  // Permanently sync products to Google Sheets if configured
  if (appState.config.googleSheetUrl && appState.config.autoSyncSheet) {
    syncProductsToGoogleSheets(appState.products);
  }
}

function saveSellersToStorage() {
  localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(appState.sellers));
  renderSellersList();
  renderSellersDatalist();
  renderSellersSelect();
  renderSalesHistory();
}

function saveConfigToStorage() {
  if (DOM.cfgVendedorPadraoSelect) {
    appState.config.vendedorPadrao = DOM.cfgVendedorPadraoSelect.value.trim();
  }
  appState.config.comissaoPadrao = parseFloat(DOM.cfgComissaoPadrao.value) || 10;
  appState.config.whatsTelefone = DOM.cfgWhatsTelefone.value.trim();
  appState.config.whatsMsgTemplate = DOM.cfgWhatsMsg.value.trim() || DEFAULT_WHATSAPP_TEMPLATE;

  if (DOM.cfgGoogleSheetUrl) {
    appState.config.googleSheetUrl = DOM.cfgGoogleSheetUrl.value.trim();
  }
  if (DOM.cfgAutoSyncSheet) {
    appState.config.autoSyncSheet = DOM.cfgAutoSyncSheet.checked;
  }

  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(appState.config));
  showToast('Configurações salvas com sucesso!', 'success');
  SoundEffects.playPop();
  applyDefaultSellerIfEmpty();
  updateDatabaseMetrics();
  updateGoogleSheetStatusUI();
}

function updateDatabaseMetrics() {
  if (DOM.dbSalesCount) DOM.dbSalesCount.textContent = appState.sales.length;
  if (DOM.dbProductsCount) DOM.dbProductsCount.textContent = appState.products.length;
  if (DOM.catalogCountBadge) DOM.catalogCountBadge.textContent = `${appState.products.length} produtos`;

  try {
    const rawSales = localStorage.getItem(STORAGE_KEYS.SALES) || '';
    const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '';
    const rawSellers = localStorage.getItem(STORAGE_KEYS.SELLERS) || '';
    const rawConfig = localStorage.getItem(STORAGE_KEYS.CONFIG) || '';
    const totalBytes = (rawSales.length + rawProducts.length + rawSellers.length + rawConfig.length) * 2;
    const kb = (totalBytes / 1024).toFixed(1);
    if (DOM.dbStorageBytes) DOM.dbStorageBytes.textContent = `${kb} KB`;
  } catch (e) {
    if (DOM.dbStorageBytes) DOM.dbStorageBytes.textContent = '14 KB';
  }
}

function applyDefaultSellerIfEmpty() {
  // Find default seller from sellers list or config
  const defSeller = appState.sellers.find(s => s.isDefault);
  const defName = defSeller ? defSeller.name : (appState.config.vendedorPadrao || 'Junior');
  
  if (!DOM.inputVendedor.value.trim()) {
    DOM.inputVendedor.value = defName;
  }
}

// ============================================================================
// GESTÃO DE VENDEDORES (JUNIOR, ALEXANDRE, JEREMIAS, ALLYSON, JOHNATHAN)
// ============================================================================
function renderSellersList() {
  if (!DOM.sellersListContainer) return;

  DOM.sellersListContainer.innerHTML = appState.sellers.map(s => `
    <div class="seller-manage-item" data-seller-id="${s.id}">
      <div class="seller-item-left">
        <div class="seller-avatar-circle">${s.name.charAt(0).toUpperCase()}</div>
        <div class="seller-details-wrap">
          <h5>
            ${escapeHtml(s.name)}
            ${s.isDefault ? '<span class="default-seller-badge">Padrão</span>' : ''}
          </h5>
          ${s.phone ? `<span class="seller-phone-text">📱 ${escapeHtml(s.phone)}</span>` : '<span class="seller-phone-text">Sem telefone cadastrado</span>'}
        </div>
      </div>
      <div class="seller-item-actions">
        <button type="button" class="btn-star-default ${s.isDefault ? 'is-default' : ''}" title="${s.isDefault ? 'Vendedor Padrão Atual' : 'Definir como Vendedor Padrão'}" onclick="window.onSetDefaultSeller('${s.id}')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="${s.isDefault ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
        <button type="button" class="btn-icon-action" title="Editar vendedor" onclick="window.onEditSeller('${s.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button type="button" class="btn-icon-action delete-action" title="Excluir vendedor" onclick="window.onDeleteSeller('${s.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

function renderSellersDatalist() {
  if (DOM.vendedoresDatalist) {
    DOM.vendedoresDatalist.innerHTML = appState.sellers
      .map(s => `<option value="${escapeHtml(s.name)}">`)
      .join('');
  }
}

function renderSellersSelect() {
  // Update Settings default seller dropdown
  if (DOM.cfgVendedorPadraoSelect) {
    const currentDefault = appState.config.vendedorPadrao || 'Junior';
    DOM.cfgVendedorPadraoSelect.innerHTML = appState.sellers
      .map(s => `<option value="${escapeHtml(s.name)}" ${s.name === currentDefault ? 'selected' : ''}>${escapeHtml(s.name)}</option>`)
      .join('');
  }

  // Update History filter dropdown
  if (DOM.filterSellerSelect) {
    const currentSelected = appState.historyFilter.seller;
    DOM.filterSellerSelect.innerHTML = `
      <option value="all" ${currentSelected === 'all' ? 'selected' : ''}>Todos os Vendedores</option>
      ${appState.sellers.map(s => `
        <option value="${escapeHtml(s.name)}" ${currentSelected === s.name ? 'selected' : ''}>${escapeHtml(s.name)}</option>
      `).join('')}
    `;
  }
}

window.onSetDefaultSeller = function(sellerId) {
  const seller = appState.sellers.find(s => s.id === sellerId);
  if (!seller) return;

  appState.sellers.forEach(s => s.isDefault = (s.id === sellerId));
  appState.config.vendedorPadrao = seller.name;
  saveSellersToStorage();
  saveConfigToStorage();
  applyDefaultSellerIfEmpty();
  showToast(`Vendedor "${seller.name}" definido como padrão!`, 'success');
  SoundEffects.playPop();
};

window.onEditSeller = function(sellerId) {
  const seller = appState.sellers.find(s => s.id === sellerId);
  if (!seller) return;

  DOM.editSellerId.value = seller.id;
  DOM.sellerNameInput.value = seller.name;
  DOM.sellerPhoneInput.value = seller.phone || '';

  DOM.sellerFormTitle.textContent = `Editar Vendedor: ${seller.name}`;
  DOM.sellerFormCard.style.display = 'block';
  DOM.sellerNameInput.focus();
  SoundEffects.playPop();
};

window.onDeleteSeller = function(sellerId) {
  if (appState.sellers.length <= 1) {
    showToast('É necessário manter pelo menos 1 vendedor cadastrado.', 'error');
    return;
  }
  const seller = appState.sellers.find(s => s.id === sellerId);
  if (!seller) return;

  if (confirm(`Deseja realmente remover o vendedor "${seller.name}"?`)) {
    appState.sellers = appState.sellers.filter(s => s.id !== sellerId);
    if (seller.isDefault && appState.sellers.length > 0) {
      appState.sellers[0].isDefault = true;
      appState.config.vendedorPadrao = appState.sellers[0].name;
    }
    saveSellersToStorage();
    showToast('Vendedor removido.', 'info');
    SoundEffects.playPop();
  }
};

function handleSellerFormSubmit(e) {
  e.preventDefault();
  const id = DOM.editSellerId.value.trim();
  const name = DOM.sellerNameInput.value.trim();
  const phone = DOM.sellerPhoneInput.value.trim();

  if (!name) {
    showToast('O nome do vendedor é obrigatório.', 'error');
    return;
  }

  if (id) {
    // Update existing
    const idx = appState.sellers.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldName = appState.sellers[idx].name;
      appState.sellers[idx].name = name;
      appState.sellers[idx].phone = phone;
      if (appState.config.vendedorPadrao === oldName) {
        appState.config.vendedorPadrao = name;
      }
      showToast('Vendedor atualizado com sucesso!', 'success');
    }
  } else {
    // Add new
    const isFirst = appState.sellers.length === 0;
    const newSeller = {
      id: 'v-' + Date.now(),
      name,
      phone,
      isDefault: isFirst
    };
    appState.sellers.push(newSeller);
    showToast(`Vendedor "${name}" cadastrado com sucesso!`, 'success');
  }

  saveSellersToStorage();
  resetSellerForm();
  SoundEffects.playSuccess();
}

function resetSellerForm() {
  DOM.sellerForm.reset();
  DOM.editSellerId.value = '';
  DOM.sellerFormTitle.textContent = 'Cadastrar Novo Vendedor';
  DOM.sellerFormCard.style.display = 'none';
}

// ============================================================================
// FORM LOGIC: COMISSÃO & LUCRO DYNAMIC CALCULATIONS
// Formulas requested:
//   Comissão = Preço - Preço Base
//   Lucro = Preço Base - Custo
//   If Comissão is manually altered, it directly impacts Lucro:
//   Lucro = Preço - Custo - Comissão
// ============================================================================
function parsePriceNumber(str) {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  let clean = String(str).trim();
  if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  clean = clean.replace(/[^\d\.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function formatBRL(number) {
  return (typeof number === 'number' && !isNaN(number) ? number : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function findProductMatch(produtoStr) {
  if (!produtoStr) return null;
  const val = String(produtoStr).trim().toLowerCase();
  if (!val) return null;

  // 1. Exact match by name, SKU or formatted display "SKU - Name"
  let matched = appState.products.find(p => {
    const pName = (p.name || '').trim().toLowerCase();
    const pSku = (p.sku || '').trim().toLowerCase();
    const displayVal = pSku ? `${pSku} - ${pName}` : pName;
    return val === displayVal || val === pName || (pSku && val === pSku);
  });
  if (matched) return matched;

  // 2. Starts with / includes match
  matched = appState.products.find(p => {
    const pName = (p.name || '').trim().toLowerCase();
    const pSku = (p.sku || '').trim().toLowerCase();
    return (pName && (val.includes(pName) || pName.includes(val))) || (pSku && (val.startsWith(pSku) || val.includes(pSku)));
  });

  return matched || null;
}

function onProductInputChange(e) {
  const target = e ? e.target : document.querySelector('.input-produto');
  if (!target) return;
  const val = target.value.trim();
  const matched = findProductMatch(val);
  
  if (matched) {
    const row = target.closest('.product-entry');
    if (row) {
      const precoInput = row.querySelector('.input-preco');
      if (precoInput) {
        const numPreco = parsePriceNumber(matched.price);
        precoInput.value = formatBRL(numPreco);
      }
    }
  }
  
  appState.currentSaleProductContext.isCommissionManuallyEdited = false;
  recalculateTotals();
}

function recalculateFromProductRules() {
  recalculateTotals();
}

function onComissaoInputChange() {
  appState.currentSaleProductContext.isCommissionManuallyEdited = true;
  recalculateLucroFromCustomCommission();
}

function recalculateLucroFromCustomCommission() {
  const customComissao = parsePriceNumber(DOM.inputComissao ? DOM.inputComissao.value : '0');
  const items = getActiveProductsFromDOM();
  let totalPreco = 0;
  let totalBase = 0;
  let totalCusto = 0;

  items.forEach(item => {
    totalPreco += item.subtotal;
    totalBase += (item.basePrice * item.quantidade);
    totalCusto += (item.cost * item.quantidade);
  });

  let novoLucro = 0;
  if (totalCusto > 0 || totalPreco > 0) {
    novoLucro = (totalPreco - totalCusto) - customComissao;
  } else {
    novoLucro = totalPreco - customComissao;
  }

  if (DOM.inputLucro) DOM.inputLucro.value = formatBRL(novoLucro);
}

function resetToProductRules() {
  appState.currentSaleProductContext.isCommissionManuallyEdited = false;
  recalculateTotals();
  showToast('Valores restaurados pela fórmula automática!', 'info');
  SoundEffects.playPop();
}

function onSellingPriceInputChange() {
  recalculateTotals();
}

window.formatCurrencyInput = function(elem) {
  let v = elem.value.replace(/\D/g, '');
  if (v === '') {
    elem.value = '';
    if (elem.id === 'inputComissao') {
      onComissaoInputChange();
    } else {
      recalculateTotals();
    }
    return;
  }
  v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  elem.value = v;
  
  if (elem.classList.contains('input-preco') || elem.id === 'inputFrete') {
    recalculateTotals();
  } else if (elem.id === 'inputComissao') {
    onComissaoInputChange();
  }
};

window.calculateTotal = function() {
  if (typeof recalculateCartTotals === 'function') {
    recalculateCartTotals();
  }
};

window.formatAndSearchCEP = async function(elem) {
  let v = elem.value.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length > 5) {
    elem.value = v.slice(0, 5) + '-' + v.slice(5);
  } else {
    elem.value = v;
  }
  
  if (v.length === 8) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${v}/json/`);
      const data = await res.json();
      if (!data.erro && DOM.inputEndereco) {
        const addr = `${data.logradouro}, N - ${data.bairro}, ${data.localidade} - ${data.uf}`;
        DOM.inputEndereco.value = addr;
        DOM.inputEndereco.focus();
        const nIndex = addr.indexOf(', N -');
        if (nIndex !== -1) {
          DOM.inputEndereco.setSelectionRange(nIndex + 2, nIndex + 3);
        }
        showToast('Endereço encontrado! Substitua o "N" pelo número.', 'success');
        SoundEffects.playPop();
      } else {
        showToast('CEP não encontrado.', 'error');
      }
    } catch(e) {
      console.log('Erro CEP', e);
    }
  }
};

window.addEmptyProductRow = function() {
  const container = document.getElementById('productsContainer');
  const index = container.children.length;
  
  const newRow = document.createElement('div');
  newRow.className = 'product-entry';
  newRow.dataset.index = index;
  
  newRow.innerHTML = `
    <div class="form-row" id="row-produto-${index}">
      <label for="inputProduto_${index}" class="form-label">
        Produto<span class="required-star">*</span>
      </label>
      <div class="input-wrapper" style="display: flex; gap: 8px; align-items: center;">
        <input type="text" id="inputProduto_${index}" name="produto" class="form-input input-produto" placeholder="Ex: Fone Bluetooth" list="produtosDatalist">
        <button type="button" class="btn-remove-product" onclick="window.removeProductRow(this)" title="Remover este produto">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="form-row" id="row-preco-${index}">
      <label for="inputPreco_${index}" class="form-label">
        Preço<span class="required-star">*</span>
      </label>
      <div class="input-wrapper">
        <div class="prefix-input">
          <span class="currency-prefix">R$</span>
          <input type="tel" id="inputPreco_${index}" name="preco" class="form-input input-preco" placeholder="0,00" oninput="formatCurrencyInput(this)">
        </div>
      </div>
    </div>
  `;
  
  container.appendChild(newRow);
  
  // Attach datalist input event manually for new row
  const inputProduto = newRow.querySelector('.input-produto');
  inputProduto.addEventListener('input', onProductInputChange);
  inputProduto.addEventListener('change', onProductInputChange);
  
  const inputPreco = newRow.querySelector('.input-preco');
  inputPreco.addEventListener('input', onSellingPriceInputChange);
  
  SoundEffects.playPop();
};

window.removeProductRow = function(button) {
  const row = button.closest('.product-entry');
  row.remove();
  recalculateTotals();
  SoundEffects.playPop();
};

function getActiveProductsFromDOM() {
  const entries = document.querySelectorAll('.product-entry');
  const items = [];
  entries.forEach(entry => {
    const prodInput = entry.querySelector('.input-produto');
    const precoInput = entry.querySelector('.input-preco');
    const produto = prodInput ? prodInput.value.trim() : '';
    const preco = precoInput ? parsePriceNumber(precoInput.value) : 0;
    
    const matched = findProductMatch(produto);
    let basePrice = preco;
    let cost = 0;
    if (matched) {
      basePrice = parsePriceNumber(matched.basePrice !== undefined && matched.basePrice !== '' ? matched.basePrice : matched.price);
      cost = parsePriceNumber(matched.cost || '0');
    }

    if (produto) {
      items.push({
        produto,
        preco,
        quantidade: 1,
        subtotal: preco,
        basePrice,
        cost
      });
    }
  });
  return items;
}

function recalculateTotals() {
  const items = getActiveProductsFromDOM();
  let totalPreco = 0;
  let totalBase = 0;
  let totalCusto = 0;

  items.forEach(item => {
    totalPreco += item.subtotal;
    totalBase += (item.basePrice * item.quantidade);
    totalCusto += (item.cost * item.quantidade);
  });

  // Fórmulas solicitadas:
  // Lucro = Preço Base - Custo
  // Comissão = Preço - Preço Base
  let comissao = 0;
  let lucro = 0;

  if (items.length > 0) {
    comissao = totalPreco - totalBase;
    lucro = totalBase - totalCusto;
  }

  // Atualiza inputs se a comissão não foi editada manualmente
  if (!appState.currentSaleProductContext.isCommissionManuallyEdited) {
    if (DOM.inputComissao) DOM.inputComissao.value = formatBRL(comissao);
    if (DOM.inputLucro) DOM.inputLucro.value = formatBRL(lucro);
  }
  
  // Total da venda é subtotal dos itens + frete
  const frete = parsePriceNumber(DOM.inputFrete ? DOM.inputFrete.value : '0');
  if (DOM.inputTotal) DOM.inputTotal.value = formatBRL(totalPreco + frete);
}

function clearSalesForm() {
  DOM.salesForm.reset();
  const inputCEP = document.getElementById('inputCEP');
  if (inputCEP) inputCEP.value = '';
  const inputParcelas = document.getElementById('inputParcelas');
  if (inputParcelas) {
    inputParcelas.value = '';
    inputParcelas.style.display = 'none';
  }
  if (DOM.checkEnviarGarantia) {
    DOM.checkEnviarGarantia.checked = false;
  }
  if (DOM.rowDocumento) {
    DOM.rowDocumento.style.display = 'none';
  }
  if (DOM.inputDocumento) {
    DOM.inputDocumento.value = '';
  }
  applyDefaultSellerIfEmpty();
  
  // Remove extra product rows, keep only the first one
  const container = document.getElementById('productsContainer');
  if (container) {
    const entries = container.querySelectorAll('.product-entry');
    for (let i = 1; i < entries.length; i++) {
      entries[i].remove();
    }
    // clear the first one
    const firstProd = container.querySelector('.input-produto');
    const firstPreco = container.querySelector('.input-preco');
    if (firstProd) firstProd.value = '';
    if (firstPreco) firstPreco.value = '';
  }
  
  recalculateTotals();

  // Set default date for Data da Entrega (YYYY-MM-DD)
  if (DOM.inputDataEntrega) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    DOM.inputDataEntrega.value = `${yyyy}-${mm}-${dd}`;
  }

  clearValidationErrors();
  appState.currentSaleProductContext = {
    matchedProduct: null,
    basePrice: 0,
    cost: 0,
    isCommissionManuallyEdited: false
  };
  if (DOM.productBaseInfoChip) DOM.productBaseInfoChip.style.display = 'none';
  showToast('Formulário limpo.', 'info');
  SoundEffects.playPop();
}

function clearValidationErrors() {
  document.querySelectorAll('.form-row.has-error').forEach(row => {
    row.classList.remove('has-error');
    const fb = row.querySelector('.field-feedback');
    if (fb) fb.textContent = '';
  });
}

function validateSalesForm() {
  clearValidationErrors();
  let isValid = true;
  const errors = [];

  const vendedor = DOM.inputVendedor.value.trim();
  if (!vendedor) {
    const row = document.getElementById('row-vendedor');
    row.classList.add('has-error');
    row.querySelector('.field-feedback').textContent = 'O campo Vendedor é obrigatório.';
    isValid = false;
    errors.push('Vendedor');
  }

  const items = getActiveProductsFromDOM();
  
  if (items.length === 0) {
    isValid = false;
    errors.push('Produto');
    showToast('Informe o produto e o preço.', 'error');
  } else {
    // If we have at least one product, we still need to make sure the first row isn't empty if required, 
    // but the getActiveProductsFromDOM already returns only filled products.
  }

  if (!isValid && errors.length > 0 && errors[0] !== 'Adicione pelo menos 1 produto no carrinho') {
    showToast(`Preencha os campos obrigatórios (*): ${errors.join(', ')}`, 'error');
  }

  return isValid;
}

function handleSalesFormSubmit(e) {
  e.preventDefault();

  if (!validateSalesForm()) return;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const items = getActiveProductsFromDOM();

  const newSale = {
    id: appState.editingSaleId || ('sale-' + Date.now()),
    vendedor: DOM.inputVendedor.value.trim(),
    itens: items, // Save items array
    produto: items.map(item => item.produto).join(', '), // fallback text
    preco: formatBRL(items.reduce((acc, item) => acc + item.subtotal, 0)), // fallback text
    cliente: DOM.inputCliente.value.trim() || 'Não informado',
    documento: DOM.inputDocumento ? DOM.inputDocumento.value.trim() || 'Não informado' : 'Não informado',
    contato: DOM.inputContato.value.trim() || 'Não informado',
    cep: document.getElementById('inputCEP') ? document.getElementById('inputCEP').value.trim() || 'Não informado' : 'Não informado',
    endereco: DOM.inputEndereco.value.trim() || 'Não informado',
    frete: DOM.inputFrete.value.trim() || 'Não informado',
    total: DOM.inputTotal.value.trim() || '0,00',
    data_entrega: DOM.inputDataEntrega.value ? DOM.inputDataEntrega.value.split('-').reverse().join('/') : 'Não informada',
    pagamento: DOM.inputPagamento.value.trim() || 'Não informado',
    parcelas: document.getElementById('inputParcelas') ? document.getElementById('inputParcelas').value.trim() : '',
    observacao: DOM.inputObservacao.value.trim() || 'Nenhuma',
    comissao: DOM.inputComissao.value.trim() || '0,00',
    lucro: DOM.inputLucro.value.trim() || '0,00',
    enviarGarantia: DOM.checkEnviarGarantia ? DOM.checkEnviarGarantia.checked : false,
    timestamp: Date.now(),
    dateString: dateFormatted
  };

  if (appState.editingSaleId) {
    const idx = appState.sales.findIndex(s => s.id === appState.editingSaleId);
    if (idx !== -1) {
      newSale.timestamp = appState.sales[idx].timestamp; // Preserve order
      newSale.dateString = appState.sales[idx].dateString; // Preserve visual date
      appState.sales[idx] = newSale;
    }
    appState.editingSaleId = null;
    document.getElementById('btnSubmitForm').textContent = 'Registrar Venda 🚀';
    showToast('✨ Venda editada com sucesso!', 'success');

    if (appState.config.googleSheetUrl && appState.config.autoSyncSheet) {
      fetch(appState.config.googleSheetUrl, {
        method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'editSale', sale: newSale })
      }).catch(err => console.warn(err));
    }
  } else {
    appState.sales.unshift(newSale);
    if (appState.config.googleSheetUrl && appState.config.autoSyncSheet) {
      syncSaleToGoogleSheets(newSale);
    }
    showToast('✨ Venda registrada com sucesso!', 'success');
  }

  saveSalesToStorage();
  SoundEffects.playSuccess();

  setTimeout(() => {
    openWhatsappShareModal(newSale);
  }, 450);
}

// ============================================================================
// VENDAS -> HISTÓRICO: FILTRO DE DATA, RESULTADO POR VENDEDOR & EXPORTAÇÃO
// ============================================================================

// Returns filtered sales based on active date range, seller, and search text
function getFilteredSales() {
  const query = (DOM.historySearchInput ? DOM.historySearchInput.value : '').toLowerCase().trim();
  const selectedSeller = appState.historyFilter.seller;
  const mode = appState.historyFilter.dateRangeMode;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;
  const sevenDaysAgo = todayStart - 86400000 * 6;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let startTs = 0;
  let endTs = Infinity;

  if (mode === 'today') {
    startTs = todayStart;
    endTs = todayEnd;
  } else if (mode === 'week') {
    startTs = sevenDaysAgo;
    endTs = todayEnd;
  } else if (mode === 'month') {
    startTs = monthStart;
    endTs = todayEnd;
  } else if (mode === 'custom') {
    if (appState.historyFilter.dateStart) {
      startTs = new Date(appState.historyFilter.dateStart + 'T00:00:00').getTime();
    }
    if (appState.historyFilter.dateEnd) {
      endTs = new Date(appState.historyFilter.dateEnd + 'T23:59:59').getTime();
    }
  }

  return appState.sales.filter(sale => {
    // 1. Date filter
    const ts = sale.timestamp || 0;
    if (ts < startTs || ts > endTs) return false;

    // 2. Seller filter
    if (selectedSeller !== 'all') {
      if (!sale.vendedor || sale.vendedor.toLowerCase().trim() !== selectedSeller.toLowerCase().trim()) {
        return false;
      }
    }

    // 3. Search query
    if (query) {
      const matchVendedor = sale.vendedor && sale.vendedor.toLowerCase().includes(query);
      const matchProduto = sale.produto && sale.produto.toLowerCase().includes(query);
      const matchCliente = sale.cliente && sale.cliente.toLowerCase().includes(query);
      const matchPagamento = sale.pagamento && sale.pagamento.toLowerCase().includes(query);
      if (!matchVendedor && !matchProduto && !matchCliente && !matchPagamento) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Ordenar da mais recente para a mais antiga (decrescente)
    const getSaleTimestamp = (item) => {
      if (item.timestamp && typeof item.timestamp === 'number' && !isNaN(item.timestamp)) {
        return item.timestamp;
      }
      if (item.timestamp) {
        const parsed = Number(item.timestamp);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      // Tentar converter de dateString ou data_entrega (ex: DD/MM/AAAA ou DD/MM/AAAA HH:mm)
      const rawDate = item.dateString || item.data_entrega || '';
      if (rawDate) {
        const parts = rawDate.split(/[\/\s:-]/);
        if (parts.length >= 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10) < 100 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
          const hour = parts[3] ? parseInt(parts[3], 10) : 0;
          const min = parts[4] ? parseInt(parts[4], 10) : 0;
          const d = new Date(year, month, day, hour, min);
          if (!isNaN(d.getTime())) return d.getTime();
        }
      }
      return 0;
    };

    return getSaleTimestamp(b) - getSaleTimestamp(a);
  });
}

function renderSalesHistory() {
  const filteredSales = getFilteredSales();

  // Update Period active badge
  if (DOM.periodActiveBadge) {
    const mode = appState.historyFilter.dateRangeMode;
    const modeLabels = {
      all: 'Todo o Período',
      today: 'Hoje',
      week: 'Últimos 7 Dias',
      month: 'Este Mês',
      custom: 'Período Personalizado'
    };
    DOM.periodActiveBadge.textContent = modeLabels[mode] || 'Filtrado';
  }

  // Update Counters & KPIs
  DOM.salesCounter.textContent = appState.sales.length;
  DOM.kpiTotalVendas.textContent = filteredSales.length;

  let totalFaturamento = 0;
  let totalComissao = 0;
  let totalLucro = 0;

  filteredSales.forEach(s => {
    totalFaturamento += parsePriceNumber(s.preco);
    totalComissao += parsePriceNumber(s.comissao);
    totalLucro += parsePriceNumber(s.lucro);
  });

  DOM.kpiFaturamento.textContent = `R$ ${formatBRL(totalFaturamento)}`;
  DOM.kpiComissao.textContent = `R$ ${formatBRL(totalComissao)}`;
  DOM.kpiLucro.textContent = `R$ ${formatBRL(totalLucro)}`;

  // Render Result by Seller in this period
  renderSellerPerformance(filteredSales);

  // Active filter feedback pill
  if (DOM.activeFilterIndicator) {
    const isFiltered = appState.historyFilter.dateRangeMode !== 'all' || 
                       appState.historyFilter.seller !== 'all' || 
                       (DOM.historySearchInput && DOM.historySearchInput.value.trim().length > 0);

    if (isFiltered) {
      let filterDesc = [];
      if (appState.historyFilter.dateRangeMode !== 'all') filterDesc.push(`Data: ${DOM.periodActiveBadge.textContent}`);
      if (appState.historyFilter.seller !== 'all') filterDesc.push(`Vendedor: ${appState.historyFilter.seller}`);
      if (DOM.historySearchInput && DOM.historySearchInput.value.trim()) filterDesc.push(`Busca: "${DOM.historySearchInput.value.trim()}"`);
      
      DOM.activeFilterText.textContent = filterDesc.join(' | ');
      DOM.activeFilterIndicator.style.display = 'flex';
    } else {
      DOM.activeFilterIndicator.style.display = 'none';
    }
  }

  // Render sales list items
  if (filteredSales.length === 0) {
    DOM.salesList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Nenhuma venda encontrada para os filtros selecionados.</p>
        <button type="button" class="btn-clear-pill mt-2" onclick="window.onClearHistoryFilters()">Limpar Filtros</button>
      </div>
    `;
    return;
  }

  DOM.salesList.innerHTML = filteredSales.map(sale => {
    let dateShort = 'Recente';
    if (sale.timestamp) {
      const d = new Date(sale.timestamp);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      dateShort = `${dd}/${mm}`;
    } else if (sale.dateString) {
      const parts = sale.dateString.split(/[\/\s]/);
      if (parts.length >= 2) {
        dateShort = `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
      }
    }

    return `
    <div class="sale-item-card" data-sale-id="${sale.id}">
      <div class="sale-card-header">
        <div class="sale-card-product">${escapeHtml(sale.produto)}</div>
        <div class="sale-card-price">R$ ${escapeHtml(sale.preco)}</div>
      </div>
      
      <div class="sale-card-details">
        <span class="sale-tag">👤 <strong>${escapeHtml(sale.vendedor)}</strong></span>
        ${sale.cliente && sale.cliente !== 'Não informado' ? `<span class="sale-tag">🤝 ${escapeHtml(sale.cliente)}</span>` : ''}
        ${sale.pagamento && sale.pagamento !== 'Não informado' ? `<span class="sale-tag">💳 ${escapeHtml(sale.pagamento)}</span>` : ''}
        <span class="sale-tag" style="color: #f59e0b;">💼 Comiss: R$ ${escapeHtml(sale.comissao)}</span>
        <span class="sale-tag" style="color: var(--accent-blue);">📈 Lucro: R$ ${escapeHtml(sale.lucro)}</span>
      </div>

      <div class="sale-card-footer">
        <span class="sale-date-short">${dateShort}</span>
        <div class="sale-actions">
          <button type="button" class="btn-garantia-action" title="Visualizar / Enviar Garantia" onclick="window.openGarantiaFromSaleId('${sale.id}')">
            <span>Garantia</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
          <button type="button" class="btn-icon-action whatsapp-action" title="Reenviar pelo WhatsApp" onclick="window.onShareSaleFromList('${sale.id}')">
            <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
              <path d="M16 2.05c-7.7 0-13.95 6.25-13.95 13.95 0 2.47.65 4.87 1.88 7L2 30l7.21-1.89c2.06 1.12 4.38 1.71 6.79 1.71 7.7 0 13.95-6.25 13.95-13.95S23.7 2.05 16 2.05zm0 25.56c-2.12 0-4.18-.57-5.99-1.64l-.43-.25-4.45 1.17 1.19-4.34-.28-.44c-1.18-1.87-1.8-4.04-1.8-6.26 0-6.4 5.21-11.6 11.6-11.6 6.4 0 11.6 5.21 11.6 11.6 0 6.39-5.21 11.6-11.6 11.6zm6.36-8.69c-.35-.18-2.07-1.02-2.39-1.14-.32-.12-.55-.18-.78.18-.23.35-.9 1.14-1.1 1.38-.2.23-.41.26-.76.09-.35-.18-1.48-.55-2.82-1.74-1.04-.93-1.75-2.08-1.95-2.43-.2-.35-.02-.54.15-.71.16-.16.35-.41.52-.61.18-.2.23-.35.35-.58.12-.23.06-.44-.03-.61-.09-.18-.78-1.88-1.07-2.58-.28-.68-.57-.59-.78-.6-.2-.01-.44-.01-.67-.01-.23 0-.61.09-.93.44-.32.35-1.22 1.19-1.22 2.9 0 1.71 1.25 3.37 1.42 3.6.18.23 2.46 3.76 5.96 5.27.83.36 1.48.58 1.99.74.84.27 1.6.23 2.21.14.67-.1 2.07-.85 2.36-1.66.29-.82.29-1.52.2-1.66-.09-.15-.32-.24-.67-.41z"/>
            </svg>
          </button>
          <button type="button" class="btn-icon-action" title="Editar venda" onclick="window.onEditSale('${sale.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button type="button" class="btn-icon-action delete-action" title="Excluir venda" onclick="window.onDeleteSale('${sale.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// Computes and renders seller performance for the filtered period
function renderSellerPerformance(salesInPeriod) {
  if (!DOM.sellerLeaderboardSummary || !DOM.sellerPerfTableBody) return;

  // Aggregate stats per seller
  const statsMap = {};
  
  // Initialize with all registered sellers
  appState.sellers.forEach(s => {
    statsMap[s.name] = {
      name: s.name,
      salesCount: 0,
      totalRevenue: 0,
      totalCommission: 0,
      totalProfit: 0
    };
  });

  // Calculate from sales
  salesInPeriod.forEach(sale => {
    const vName = sale.vendedor || 'Desconhecido';
    if (!statsMap[vName]) {
      statsMap[vName] = {
        name: vName,
        salesCount: 0,
        totalRevenue: 0,
        totalCommission: 0,
        totalProfit: 0
      };
    }
    statsMap[vName].salesCount += 1;
    statsMap[vName].totalRevenue += parsePriceNumber(sale.preco);
    statsMap[vName].totalCommission += parsePriceNumber(sale.comissao);
    statsMap[vName].totalProfit += parsePriceNumber(sale.lucro);
  });

  // Convert to array and sort by totalRevenue descending
  const sortedSellers = Object.values(statsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const rankBadges = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º'];

  // Render leaderboard summary list
  DOM.sellerLeaderboardSummary.innerHTML = sortedSellers.map((s, idx) => {
    const isSelected = appState.historyFilter.seller === s.name;
    const badge = rankBadges[idx] || `${idx + 1}º`;
    return `
      <div class="seller-leader-row ${isSelected ? 'selected' : ''}" onclick="window.onFilterBySellerName('${escapeHtml(s.name)}')" title="Clique para filtrar apenas as vendas de ${escapeHtml(s.name)}">
        <div class="seller-row-left">
          <span class="rank-badge">${badge}</span>
          <div class="seller-mini-avatar">${s.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="seller-mini-name">${escapeHtml(s.name)}</div>
            <span class="seller-mini-sales-count">${s.salesCount} venda(s)</span>
          </div>
        </div>
        <div class="seller-row-right">
          <div class="seller-row-revenue">R$ ${formatBRL(s.totalRevenue)}</div>
          <div class="seller-row-comissao">Comiss: R$ ${formatBRL(s.totalCommission)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Render detailed table
  DOM.sellerPerfTableBody.innerHTML = sortedSellers.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td>${s.salesCount}</td>
      <td style="color: var(--primary); font-weight: 700;">R$ ${formatBRL(s.totalRevenue)}</td>
      <td style="color: #f59e0b; font-weight: 600;">R$ ${formatBRL(s.totalCommission)}</td>
      <td style="color: var(--accent-blue); font-weight: 600;">R$ ${formatBRL(s.totalProfit)}</td>
    </tr>
  `).join('');
}

// Função global para compartilhar venda a partir da lista do Histórico
window.onShareSaleFromList = function(saleId) {
  const sale = appState.sales.find(s => s.id === saleId);
  if (sale) {
    openWhatsappShareModal(sale);
  } else {
    showToast('Venda não encontrada.', 'error');
  }
};

window.onDeleteSale = async function(saleId) {
  if (confirm('Deseja realmente excluir esta venda do histórico?')) {
    appState.sales = appState.sales.filter(s => s.id !== saleId);
    saveSalesToStorage();
    renderSalesHistory();
    updateDatabaseMetrics();
    showToast('Venda excluída localmente.', 'info');
    SoundEffects.playPop();

    if (appState.config.googleSheetUrl && appState.config.autoSyncSheet) {
      try {
        const res = await fetch(appState.config.googleSheetUrl, {
          method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'deleteSale', id: saleId })
        });
        const result = await res.json();
        if (result && result.status === 'success') {
          showToast('☁️ Venda excluída da Planilha Google!', 'success');
        }
      } catch(err) {
        console.warn('Erro ao excluir do Google Sheets', err);
      }
    }
  }
};

window.onEditSale = function(saleId) {
  const sale = appState.sales.find(s => s.id === saleId);
  if (!sale) return;
  
  if (sale.data_entrega && sale.data_entrega !== 'Não informada') {
    const parts = sale.data_entrega.split('/');
    if (parts.length === 3) {
      DOM.inputDataEntrega.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  } else {
    DOM.inputDataEntrega.value = '';
  }

  DOM.inputVendedor.value = sale.vendedor;
  
  const container = document.getElementById('productsContainer');
  if (container) {
    container.innerHTML = '';
    let itemsToRender = sale.itens;
    if (!itemsToRender || itemsToRender.length === 0) {
      itemsToRender = [{ produto: sale.produto, preco: parsePriceNumber(sale.preco) }];
    }
    itemsToRender.forEach((item, index) => {
      window.addEmptyProductRow();
      const entries = container.querySelectorAll('.product-entry');
      const latestEntry = entries[entries.length - 1];
      if (latestEntry) {
        // Se era do carrinho antigo, tem item.produto com '1x ' na frente, mas para retrocompatibilidade deixamos assim
        const prodName = typeof item === 'object' ? item.produto : item; 
        const prodPreco = typeof item === 'object' ? item.preco : 0;
        latestEntry.querySelector('.input-produto').value = prodName;
        latestEntry.querySelector('.input-preco').value = typeof prodPreco === 'number' ? formatBRL(prodPreco) : prodPreco.toString().replace('R$ ', '');
      }
    });
  }
  DOM.inputCliente.value = sale.cliente !== 'Não informado' ? sale.cliente : '';
  if (DOM.inputDocumento) DOM.inputDocumento.value = sale.documento && sale.documento !== 'Não informado' ? sale.documento : '';
  DOM.inputContato.value = sale.contato !== 'Não informado' ? sale.contato : '';
  if (DOM.inputCEP) DOM.inputCEP.value = sale.cep && sale.cep !== 'Não informado' ? sale.cep : '';
  DOM.inputEndereco.value = sale.endereco !== 'Não informado' ? sale.endereco : '';
  DOM.inputFrete.value = sale.frete !== 'Não informado' ? sale.frete.replace('R$ ', '') : '';
  DOM.inputPagamento.value = sale.pagamento !== 'Não informado' ? sale.pagamento : '';
  if (DOM.checkEnviarGarantia) {
    DOM.checkEnviarGarantia.checked = Boolean(sale.enviarGarantia);
    if (DOM.rowDocumento) DOM.rowDocumento.style.display = sale.enviarGarantia ? 'grid' : 'none';
  }
  const inputParcelas = document.getElementById('inputParcelas');
  if (inputParcelas) {
    if (sale.parcelas) {
      inputParcelas.value = sale.parcelas;
      inputParcelas.style.display = 'block';
    } else {
      inputParcelas.value = '';
      inputParcelas.style.display = sale.pagamento.toLowerCase().includes('crédito') ? 'block' : 'none';
    }
  }
  DOM.inputObservacao.value = sale.observacao !== 'Nenhuma' ? sale.observacao : '';
  DOM.inputComissao.value = sale.comissao.replace('R$ ', '');
  DOM.inputTotal.value = sale.total.replace('R$ ', '');
  
  appState.editingSaleId = saleId;
  const submitBtn = document.getElementById('btnSalvarVenda') || document.getElementById('btnSubmitForm');
  if (submitBtn) {
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Salvar Alterações da Venda
    `;
  }
  
  // Troca para a aba de Vendas e sub-aba de formulário
  switchTab('tab-vendas');
  showSalesForm();

  showToast('✏️ Editando venda. Faça as alterações no formulário e clique em salvar.', 'info');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.onFilterBySellerName = function(sellerName) {
  if (appState.historyFilter.seller === sellerName) {
    // Toggle off
    appState.historyFilter.seller = 'all';
  } else {
    appState.historyFilter.seller = sellerName;
  }
  if (DOM.filterSellerSelect) {
    DOM.filterSellerSelect.value = appState.historyFilter.seller;
  }
  renderSalesHistory();
  SoundEffects.playPop();
};

window.onClearHistoryFilters = function() {
  appState.historyFilter.dateRangeMode = 'all';
  appState.historyFilter.dateStart = '';
  appState.historyFilter.dateEnd = '';
  appState.historyFilter.seller = 'all';
  if (DOM.historySearchInput) DOM.historySearchInput.value = '';
  if (DOM.filterSellerSelect) DOM.filterSellerSelect.value = 'all';
  if (DOM.filterDateStart) DOM.filterDateStart.value = '';
  if (DOM.filterDateEnd) DOM.filterDateEnd.value = '';
  if (DOM.customDateContainer) DOM.customDateContainer.style.display = 'none';

  // Reset preset pills
  document.querySelectorAll('.date-preset-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-range') === 'all');
  });

  renderSalesHistory();
  showToast('Filtros restaurados.', 'info');
  SoundEffects.playPop();
};

// Export the currently filtered sales list to CSV / Excel
function exportFilteredHistoryToCSV() {
  const filteredSales = getFilteredSales();

  if (filteredSales.length === 0) {
    showToast('Nenhuma venda no período selecionado para exportar.', 'error');
    return;
  }

  const headers = ['Data', 'Vendedor', 'Produto', 'Preço Venda (R$)', 'Cliente', 'Contato', 'Endereço', 'Frete', 'Pagamento', 'Observação', 'Comissão (R$)', 'Lucro Loja (R$)'];
  
  const rows = [];
  filteredSales.forEach(s => {
    if (s.itens && Array.isArray(s.itens) && s.itens.length > 0) {
      const totalItens = s.itens.length;
      s.itens.forEach((it, idx) => {
        const itemPreco = (typeof it.preco === 'number') ? formatBRL(it.preco) : (it.preco || s.preco || '0,00');
        let itemComissao = '0,00';
        let itemLucro = '0,00';
        if (typeof it.basePrice === 'number' && typeof it.preco === 'number') {
          itemComissao = formatBRL(it.preco - it.basePrice);
        }
        if (typeof it.basePrice === 'number' && typeof it.cost === 'number') {
          itemLucro = formatBRL(it.basePrice - it.cost);
        }

        rows.push([
          `"${s.dateString || ''}"`,
          `"${s.vendedor || ''}"`,
          `"${it.produto || s.produto || ''}"`,
          `"${itemPreco}"`,
          `"${s.cliente || ''}"`,
          `"${s.contato || ''}"`,
          `"${s.endereco || ''}"`,
          `"${idx === 0 ? (s.frete || '') : 'Incluso'}"`,
          `"${s.pagamento || ''}"`,
          `"${totalItens > 1 ? `Item ${idx + 1}/${totalItens} - ` : ''}${s.observacao || ''}"`,
          `"${itemComissao !== '0,00' ? itemComissao : (s.comissao || '0,00')}"`,
          `"${itemLucro !== '0,00' ? itemLucro : (s.lucro || '0,00')}"`
        ]);
      });
    } else {
      rows.push([
        `"${s.dateString || ''}"`,
        `"${s.vendedor || ''}"`,
        `"${s.produto || ''}"`,
        `"${s.preco || ''}"`,
        `"${s.cliente || ''}"`,
        `"${s.contato || ''}"`,
        `"${s.endereco || ''}"`,
        `"${s.frete || ''}"`,
        `"${s.pagamento || ''}"`,
        `"${s.observacao || ''}"`,
        `"${s.comissao || ''}"`,
        `"${s.lucro || ''}"`
      ]);
    }
  });

  const mode = appState.historyFilter.dateRangeMode;
  const sellerTag = appState.historyFilter.seller !== 'all' ? `_${appState.historyFilter.seller}` : '';
  const filename = `vendas_${mode}${sellerTag}_${new Date().toISOString().slice(0, 10)}.csv`;

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Planilha com ${filteredSales.length} venda(s) exportada!`, 'success');
}

// ============================================================================
// WHATSAPP FAB & SHARING LOGIC
// ============================================================================
function generateWhatsappMessage(saleData) {
  // Extract items list
  let itensStr = '';
  if (saleData.itens && saleData.itens.length > 0) {
    itensStr = saleData.itens.map(item => {
      // Strip SKU prefix if present (e.g., "SKU123 - Nome do Produto")
      let nomeProduto = item.produto;
      if (nomeProduto.includes(' - ')) {
        nomeProduto = nomeProduto.split(' - ').slice(1).join(' - ');
      }
      const pPreco = typeof item.preco === 'number' ? formatBRL(item.preco) : String(item.preco).replace('R$ ', '');
      return `${nomeProduto.trim()} R$ ${pPreco}`;
    }).join('\n');
  } else {
    // fallback if old sale
    let nomeProduto = saleData.produto;
    if (nomeProduto.includes(' - ')) {
      nomeProduto = nomeProduto.split(' - ').slice(1).join(' - ');
    }
    const pPreco = String(saleData.preco).replace('R$ ', '');
    itensStr = `${nomeProduto.trim()} R$ ${pPreco}`;
  }

  // Format delivery date
  let dataEntregaFormatada = saleData.data_entrega;
  if (dataEntregaFormatada && dataEntregaFormatada !== 'Não informada') {
    // If it's dd/mm/yyyy, convert to Date object to get day of week
    const parts = dataEntregaFormatada.split('/');
    if (parts.length === 3) {
      const dt = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!isNaN(dt.getTime())) {
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const diaNome = diasSemana[dt.getDay()];
        dataEntregaFormatada = `${parts[0]}/${parts[1]} ${diaNome}`;
      }
    }
  }

  // Format CEP (no hyphens)
  let cepLimpado = saleData.cep;
  if (cepLimpado && cepLimpado !== 'Não informado') {
    cepLimpado = cepLimpado.replace(/\D/g, '');
  }

  let pagamentoInfo = saleData.pagamento !== 'Não informado' ? saleData.pagamento : '';
  if (saleData.parcelas && saleData.parcelas.trim()) {
     const pStr = saleData.parcelas.trim().toLowerCase();
     const numParcelas = parseInt(pStr.replace(/\D/g, ''), 10);
     if (!isNaN(numParcelas) && numParcelas > 0) {
        const totalNum = parsePriceNumber(saleData.total);
        const valorParcela = totalNum / numParcelas;
        pagamentoInfo += ` em ${numParcelas}x de R$ ${formatBRL(valorParcela)}`;
     } else {
        pagamentoInfo += ` ${saleData.parcelas.trim()}`;
     }
  }

  const finalLines = [];
  
  if (saleData.cliente !== 'Não informado' || saleData.contato !== 'Não informado') {
    let clientLine = [];
    if (saleData.cliente !== 'Não informado') clientLine.push(`${saleData.cliente}`);
    if (saleData.contato !== 'Não informado') clientLine.push(`${saleData.contato}`);
    finalLines.push(clientLine.join(' '));
  }
  
  finalLines.push('');
  finalLines.push(itensStr);
  finalLines.push('');
  
  const freteFormat = String(saleData.frete).replace('R$ ', '');
  if (saleData.frete && freteFormat !== '0,00' && saleData.frete !== 'Não informado') {
    finalLines.push(`Frete R$ ${freteFormat}`);
  }
  
  const totalFormat = String(saleData.total).replace('R$ ', '');
  finalLines.push(`Total R$ ${totalFormat}`);
  
  if (pagamentoInfo) {
    finalLines.push(pagamentoInfo);
  }

  finalLines.push('');

  if (cepLimpado && cepLimpado !== 'Não informado') {
    finalLines.push(`CEP ${cepLimpado}`);
  }
  
  if (saleData.endereco && saleData.endereco !== 'Não informado') {
    finalLines.push(saleData.endereco);
  }

  if (cepLimpado || (saleData.endereco && saleData.endereco !== 'Não informado')) {
    finalLines.push('');
  }

  if (dataEntregaFormatada && dataEntregaFormatada !== 'Não informada') {
    finalLines.push(`Data da Entrega ${dataEntregaFormatada}`);
  }
  
  if (saleData.observacao && saleData.observacao !== 'Nenhuma') {
    finalLines.push(`Observação ${saleData.observacao}`);
  }

  // trim any extra trailing/leading newlines
  return finalLines.join('\n').trim();
}

function extractPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (digits.length === 10 || digits.length === 11) {
      return '55' + digits;
    }
    return digits;
  }
  return '';
}

function openWhatsappShareModal(saleData) {
  let dataToUse = saleData;

  if (!dataToUse) {
    const items = getActiveProductsFromDOM();
    const vendedor = DOM.inputVendedor ? DOM.inputVendedor.value.trim() : '';

    if (vendedor || items.length > 0) {
      const now = new Date();
      dataToUse = {
        vendedor: vendedor || '(A preencher)',
        itens: items,
        produto: items.map(item => item.produto).join(', ') || '(A preencher)',
        preco: formatBRL(items.reduce((acc, item) => acc + item.subtotal, 0)),
        cliente: DOM.inputCliente ? DOM.inputCliente.value.trim() || 'Não informado' : 'Não informado',
        contato: DOM.inputContato ? DOM.inputContato.value.trim() || 'Não informado' : 'Não informado',
        endereco: DOM.inputEndereco ? DOM.inputEndereco.value.trim() || 'Não informado' : 'Não informado',
        cep: document.getElementById('inputCEP') ? document.getElementById('inputCEP').value.trim() || 'Não informado' : 'Não informado',
        frete: DOM.inputFrete ? DOM.inputFrete.value.trim() || 'Não informado' : 'Não informado',
        total: DOM.inputTotal ? DOM.inputTotal.value.trim() || '0,00' : '0,00',
        data_entrega: DOM.inputDataEntrega && DOM.inputDataEntrega.value ? DOM.inputDataEntrega.value.split('-').reverse().join('/') : 'Não informada',
        pagamento: DOM.inputPagamento ? DOM.inputPagamento.value.trim() || 'Não informado' : 'Não informado',
        parcelas: document.getElementById('inputParcelas') ? document.getElementById('inputParcelas').value.trim() : '',
        observacao: DOM.inputObservacao ? DOM.inputObservacao.value.trim() || 'Nenhuma' : 'Nenhuma',
        comissao: DOM.inputComissao ? DOM.inputComissao.value.trim() || '0,00' : '0,00',
        lucro: DOM.inputLucro ? DOM.inputLucro.value.trim() || '0,00' : '0,00',
        dateString: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } else if (appState.sales.length > 0) {
      dataToUse = appState.sales[0];
      showToast('Compartilhando a última venda registrada.', 'info');
    } else {
      showToast('Preencha os dados da venda para compartilhar no WhatsApp.', 'error');
      DOM.inputVendedor.focus();
      return;
    }
  }

  const message = generateWhatsappMessage(dataToUse);
  appState.pendingWhatsappMessage = message;

  let targetPhone = extractPhoneNumber(dataToUse.contato);
  if (!targetPhone && appState.config.whatsTelefone) {
    targetPhone = extractPhoneNumber(appState.config.whatsTelefone);
  }
  appState.pendingWhatsappPhone = targetPhone;

  DOM.whatsappMessagePreview.textContent = message;
  
  if (DOM.recipientText) {
    if (targetPhone) {
      DOM.recipientText.textContent = `Destinatário: +${targetPhone} (${dataToUse.cliente || 'Contato da Venda'})`;
    } else {
      DOM.recipientText.textContent = 'Destinatário: Escolher contato ou grupo no WhatsApp';
    }
  }

  currentGarantiaSaleData = dataToUse;

  // Se a venda tem garantia ativada ou foi solicitada
  if (dataToUse.enviarGarantia || (DOM.checkEnviarGarantia && DOM.checkEnviarGarantia.checked)) {
    if (DOM.garantiaModalAttachment) {
      DOM.garantiaModalAttachment.style.display = 'flex';
    }
  } else {
    if (DOM.garantiaModalAttachment) {
      DOM.garantiaModalAttachment.style.display = 'none';
    }
  }

  DOM.whatsappModalBackdrop.style.display = 'flex';
  SoundEffects.playPop();
}

function closeWhatsappModal() {
  DOM.whatsappModalBackdrop.style.display = 'none';
}

function executeSendWhatsapp() {
  const msgEncoded = encodeURIComponent(appState.pendingWhatsappMessage);
  let url = '';

  if (appState.pendingWhatsappPhone) {
    url = `https://api.whatsapp.com/send?phone=${appState.pendingWhatsappPhone}&text=${msgEncoded}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${msgEncoded}`;
  }

  window.open(url, '_blank');
  closeWhatsappModal();
  showToast('WhatsApp aberto!', 'success');
}

function copyWhatsappMessageToClipboard() {
  if (!appState.pendingWhatsappMessage) return;
  navigator.clipboard.writeText(appState.pendingWhatsappMessage).then(() => {
    showToast('Texto copiado para a área de transferência!', 'success');
    SoundEffects.playPop();
  }).catch(() => {
    showToast('Não foi possível copiar automaticamente.', 'error');
  });
}

// ============================================================================
// RECIBO E TERMO DE GARANTIA (GERAÇÃO DE PDF PROFISSIONAL JBC)
// ============================================================================

let currentGarantiaSaleData = null;

function renderGarantiaDocumentHtml(saleData) {
  const items = saleData.itens && saleData.itens.length > 0
    ? saleData.itens
    : [{ produto: saleData.produto || 'Produto JBC', preco: parsePriceNumber(saleData.preco || saleData.total) }];

  const totalFormatado = String(saleData.total || saleData.preco || '0,00').replace('R$ ', '');
  const dataVenda = saleData.dateString || new Date().toLocaleDateString('pt-BR');
  const clienteNome = saleData.cliente && saleData.cliente !== 'Não informado' ? saleData.cliente : 'Cliente';
  const clienteDoc = saleData.documento && saleData.documento !== 'Não informado' ? saleData.documento : 'Não informado';
  const vendedorNome = saleData.vendedor || 'JBC Eletro';

  const rowsHtml = items.map(item => {
    const nome = typeof item === 'object' ? item.produto : item;
    const preco = typeof item === 'object' ? (typeof item.preco === 'number' ? formatBRL(item.preco) : item.preco) : '';
    
    let sku = '';
    let desc = nome;
    if (nome.includes(' - ')) {
      const parts = nome.split(' - ');
      sku = parts[0].trim();
      desc = parts.slice(1).join(' - ').trim();
    }

    return `
      <tr>
        <td style="width: 22%; font-weight: 800; color: #0f172a; font-size: 15px;">${escapeHtml(sku || 'JBC')}</td>
        <td style="width: 53%; font-weight: 600; color: #1e293b; font-size: 15px;">${escapeHtml(desc)}</td>
        <td style="width: 25%; text-align: right; font-weight: 800; color: #047857; font-size: 16px;">R$ ${escapeHtml(preco)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="doc-top-header">
      <div class="doc-brand-left">
        <img src="logo-2.jpg" alt="Logo JBC Eletro" class="doc-brand-logo">
        <div class="doc-company-info">
          <h3>JBC ELETROMAGAZINE LTDA</h3>
          <p><strong>CNPJ:</strong> 29.991.508/0001-80</p>
          <p>Rua Criselidia de Brito Barros, 125, Jardim Santa Emília, Guarulhos - SP</p>
        </div>
      </div>
      <div class="doc-title-badge">
        <h2 class="doc-main-title">RECIBO E GARANTIA</h2>
      </div>
    </div>

    <div class="doc-section-grid">
      <div class="doc-field-item">
        <span class="doc-field-label">CLIENTE:</span>
        <span class="doc-field-val">${escapeHtml(clienteNome)}</span>
      </div>
      <div class="doc-field-item">
        <span class="doc-field-label">CPF / CNPJ:</span>
        <span class="doc-field-val">${escapeHtml(clienteDoc)}</span>
      </div>
      <div class="doc-field-item">
        <span class="doc-field-label">VENDEDOR / ATENDENTE:</span>
        <span class="doc-field-val">${escapeHtml(vendedorNome)}</span>
      </div>
      <div class="doc-field-item">
        <span class="doc-field-label">DATA DA COMPRA:</span>
        <span class="doc-field-val">${escapeHtml(dataVenda)}</span>
      </div>
    </div>

    <table class="doc-products-table">
      <thead>
        <tr>
          <th>CÓDIGO</th>
          <th>PRODUTO / DISCRIMINAÇÃO</th>
          <th style="text-align: right;">VALOR</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="doc-total-bar">
      <span><strong>TOTAL GERAL DO PEDIDO:</strong></span>
      <span class="doc-total-val">R$ ${escapeHtml(totalFormatado)}</span>
    </div>

    <div class="doc-terms-card">
      <h4>Termos e Condições do Certificado de Garantia</h4>
      <ol class="doc-terms-list">
        <li><strong>Garantia de 90 dias de fábrica</strong> a partir da data de compra indicada acima.</li>
        <li class="doc-terms-highlight">Garantia cobre apenas defeitos de fabricação, não cobre em condições de mau uso.</li>
        <li>Garantia é anulada se for realizada manutenção nos produtos por pessoas não autorizadas, alterações/modificações ou se forem utilizados inadequadamente.</li>
        <li>Caso haja necessidade de troca, manutenção ou devolução, o cliente levará o produto ao local indicado pela JBC. <em>(A entrega é terceirizada e o valor do frete é pago diretamente ao entregador; portanto a JBC não retira produto no endereço do cliente)</em>.</li>
        <li>A garantia cobre apenas o valor dos produtos adquiridos, <strong>não cobre frete</strong>.</li>
      </ol>
    </div>

    <div class="doc-signature-row">
      <div class="doc-signature-line">
        Assinatura do Vendedor / Responsável JBC
      </div>
      <div class="doc-signature-line">
        Assinatura do Cliente / Recebedor
      </div>
    </div>
  `;
}

function openGarantiaModal(saleData) {
  currentGarantiaSaleData = saleData || (appState.sales.length > 0 ? appState.sales[0] : null);
  if (!currentGarantiaSaleData) {
    showToast('Nenhum dado de venda para exibir na garantia.', 'error');
    return;
  }

  DOM.garantiaDocumentRender.innerHTML = renderGarantiaDocumentHtml(currentGarantiaSaleData);
  DOM.garantiaModalBackdrop.style.display = 'flex';
  SoundEffects.playPop();
}

function closeGarantiaModal() {
  DOM.garantiaModalBackdrop.style.display = 'none';
}

async function generateGarantiaPdfBlob(saleData) {
  let renderElem = DOM.garantiaPdfOffscreen || DOM.garantiaDocumentRender;
  if (!renderElem) return null;

  // Garante que o conteúdo está renderizado na íntegra
  renderElem.innerHTML = renderGarantiaDocumentHtml(saleData);

  // Aguarda 100ms para carregar imagens e fontes
  await new Promise(r => setTimeout(r, 100));

  // Utiliza html2canvas para rasterizar fielmente o papel com tipografia e cores em alta resolução
  const canvas = await html2canvas(renderElem, {
    scale: 2, // alta resolução (Retina / Print quality)
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 800
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const { jsPDF } = window.jspdf;
  
  // Cria documento PDF A4 em retrato
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  // Renderiza ocupando a folha com margens proporcionais
  pdf.addImage(imgData, 'JPEG', 0, 4, pdfWidth, Math.min(pdfHeight, 289));

  // Extrair data da venda ou usar a data atual no formato dd/mm
  let ddmm = '';
  if (saleData.timestamp) {
    const d = new Date(saleData.timestamp);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    ddmm = `${dd}-${mm}`;
  } else if (saleData.dateString) {
    const parts = saleData.dateString.split(/[\/\s-]/);
    if (parts.length >= 2) {
      ddmm = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  if (!ddmm) {
    const d = new Date();
    ddmm = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Nome do arquivo solicitado: Garantia JBC ELETRO dd/mm (com traço no arquivo para compatibilidade com SOs)
  const filename = `Garantia JBC ELETRO ${ddmm}.pdf`;

  return { pdf, filename };
}

async function downloadGarantiaPDF() {
  if (!currentGarantiaSaleData) return;
  try {
    showToast('Gerando Recibo e Garantia em PDF...', 'info');
    const result = await generateGarantiaPdfBlob(currentGarantiaSaleData);
    if (result) {
      result.pdf.save(result.filename);
      showToast('📄 PDF baixado com sucesso!', 'success');
      SoundEffects.playSuccess();
    }
  } catch (err) {
    console.error(err);
    showToast('Erro ao gerar PDF: ' + err.message, 'error');
  }
}

function printGarantiaDocument() {
  const renderElem = DOM.garantiaPdfOffscreen || DOM.garantiaDocumentRender;
  if (!renderElem) return;
  const printContents = renderElem.innerHTML;
  const printWindow = window.open('', '', 'height=800,width=900');
  printWindow.document.write('<html><head><title>Recibo e Garantia JBC</title>');
  printWindow.document.write('<link rel="stylesheet" href="styles.css">');
  printWindow.document.write('<style>body { background: #fff; padding: 20px; font-family: "Inter", sans-serif; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(printContents);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

async function shareGarantiaOnWhatsapp() {
  const saleData = currentGarantiaSaleData || (appState.sales.length > 0 ? appState.sales[0] : null);
  if (!saleData) {
    showToast('Nenhuma venda selecionada para enviar a garantia.', 'error');
    return;
  }
  currentGarantiaSaleData = saleData;

  try {
    showToast('Gerando e preparando envio do PDF no WhatsApp...', 'info');
    const result = await generateGarantiaPdfBlob(saleData);
    if (!result) return;
    const pdfBlob = result.pdf.output('blob');
    const file = new File([pdfBlob], result.filename, { type: 'application/pdf' });

    // Se o dispositivo móvel suportar Web Share API com arquivos
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Recibo e Termo de Garantia JBC',
        text: `📄 Segue em anexo o Recibo e Termo de Garantia oficial da sua compra na JBC ELETROMAGAZINE LTDA.`
      });
      showToast('Garantia enviada com sucesso!', 'success');
      SoundEffects.playSuccess();
    } else {
      // Fallback: Baixa o PDF no dispositivo e abre o WhatsApp com a mensagem da garantia
      result.pdf.save(result.filename);
      showToast('📄 PDF baixado! Abrindo o WhatsApp...', 'success');
      SoundEffects.playSuccess();
      
      const phone = extractPhoneNumber(saleData.contato);
      const text = encodeURIComponent(`📄 *RECIBO E TERMO DE GARANTIA - JBC ELETRO*\n\nOlá ${saleData.cliente !== 'Não informado' ? saleData.cliente : ''}! O seu certificado de garantia foi gerado com sucesso e o arquivo PDF está em anexo.`);
      const url = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
      
      setTimeout(() => {
        window.open(url, '_blank');
      }, 700);
    }
  } catch (err) {
    console.error(err);
    downloadGarantiaPDF();
  }
}

// Ao enviar pelo botão do WhatsApp (envia os dados e em seguida o PDF caso a garantia esteja marcada)
async function handleSendWhatsappDirectWithGarantia() {
  const saleData = currentGarantiaSaleData || (appState.sales.length > 0 ? appState.sales[0] : null);
  const temGarantia = saleData && (saleData.enviarGarantia || (DOM.checkEnviarGarantia && DOM.checkEnviarGarantia.checked));

  // 1ª Mensagem: Dados e Resumo da Venda
  executeSendWhatsapp();

  // 2ª Mensagem: Se a garantia estiver ativa, baixa/compartilha o PDF da garantia
  if (temGarantia) {
    setTimeout(async () => {
      try {
        const result = await generateGarantiaPdfBlob(saleData);
        if (result) {
          result.pdf.save(result.filename);
          showToast('📄 Recibo e Garantia PDF baixado para envio!', 'success');
        }
      } catch (e) {
        console.warn('Erro ao gerar PDF da garantia:', e);
      }
    }, 1000);
  }
}

window.openGarantiaFromSaleId = function(saleId) {
  const sale = appState.sales.find(s => s.id === saleId);
  if (sale) {
    openGarantiaModal(sale);
  }
};

// ============================================================================
// PRODUCTS MANAGEMENT
// ============================================================================
function renderProductsDatalist() {
  DOM.produtosDatalist.innerHTML = appState.products
    .map(p => {
      const displayVal = p.sku ? `${p.sku} - ${p.name}` : p.name;
      return `<option value="${escapeHtml(displayVal)}">`;
    })
    .join('');
}

function renderProductsList() {
  const query = (DOM.productSearchInput ? DOM.productSearchInput.value : '').toLowerCase().trim();
  
  const filteredProds = appState.products.filter(p => {
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query))
    );
  });

  if (DOM.catalogCountBadge) {
    DOM.catalogCountBadge.textContent = `${appState.products.length} produtos`;
  }

  if (filteredProds.length === 0) {
    DOM.productsListGrid.innerHTML = `
      <div class="empty-state">
        <p>Nenhum produto cadastrado no catálogo.</p>
        <button type="button" class="btn-secondary-sm mt-2" onclick="document.getElementById('btnOpenBulkImport').click()">📥 Importar por Planilha</button>
      </div>
    `;
    return;
  }

  DOM.productsListGrid.innerHTML = filteredProds.map(p => `
    <div class="product-item-card" data-prod-id="${p.id}">
      <div class="product-info">
        <h5>${p.sku ? `<span style="color: var(--accent-blue); font-size: 0.85em;">[${escapeHtml(p.sku)}]</span> ` : ''}${escapeHtml(p.name)}</h5>
        <div class="product-meta-row" style="white-space: nowrap; overflow-x: auto;">
          <span style="margin-right: 8px;">Preço: <strong>R$ ${escapeHtml(p.price)}</strong></span>
          ${p.cost ? `<span>Custo: R$ ${escapeHtml(p.cost)}</span>` : ''}
        </div>
      </div>
      <div class="product-actions">
        <button type="button" class="btn-use-sale" title="Lançar este produto na venda" onclick="window.onUseProductInSale('${p.id}')">
          Usar na Venda
        </button>
        <button type="button" class="btn-icon-action" title="Editar" onclick="window.onEditProduct('${p.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button type="button" class="btn-icon-action delete-action" title="Excluir" onclick="window.onDeleteProduct('${p.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

window.onUseProductInSale = function(prodId) {
  const prod = appState.products.find(p => p.id === prodId);
  if (!prod) return;

  switchTab('tab-vendas');
  showSalesForm();

  DOM.inputProduto.value = prod.name;
  DOM.inputPreco.value = prod.price;

  onProductInputChange();

  DOM.inputCliente.focus();
  showToast(`Produto "${prod.name}" carregado com Preço Base e Custo!`, 'info');
  SoundEffects.playPop();
};

window.onEditProduct = function(prodId) {
  const prod = appState.products.find(p => p.id === prodId);
  if (!prod) return;

  DOM.editProductId.value = prod.id;
  DOM.prodName.value = prod.name;
  DOM.prodPrice.value = prod.price;
  DOM.prodCost.value = prod.cost || '';
  DOM.prodBasePrice.value = prod.basePrice || prod.price || '';
  DOM.prodCategory.value = prod.category || '';

  DOM.productFormTitle.textContent = 'Editar Produto';
  DOM.newProductCard.style.display = 'block';
  DOM.prodName.focus();
  SoundEffects.playPop();
};

window.onDeleteProduct = function(prodId) {
  if (confirm('Tem certeza que deseja excluir este produto do catálogo?')) {
    appState.products = appState.products.filter(p => p.id !== prodId);
    saveProductsToStorage();
    showToast('Produto excluído do catálogo.', 'info');
    SoundEffects.playPop();
  }
};

function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = DOM.editProductId.value.trim();
  const name = DOM.prodName.value.trim();
  const price = DOM.prodPrice.value.trim();
  const cost = DOM.prodCost.value.trim();
  const basePrice = DOM.prodBasePrice.value.trim();
  const category = DOM.prodCategory.value.trim();

  if (!name || !price || !basePrice) {
    showToast('Nome, Preço de Venda e Preço Base são obrigatórios.', 'error');
    return;
  }

  if (id) {
    const index = appState.products.findIndex(p => p.id === id);
    if (index !== -1) {
      appState.products[index] = { ...appState.products[index], name, price, cost, basePrice, category };
      showToast('Produto atualizado com sucesso!', 'success');
    }
  } else {
    const newProd = {
      id: 'prod-' + Date.now(),
      name,
      price,
      cost,
      basePrice,
      category
    };
    appState.products.unshift(newProd);
    showToast('Produto cadastrado com sucesso!', 'success');
  }

  saveProductsToStorage();
  resetProductForm();
  SoundEffects.playSuccess();
}

function resetProductForm() {
  DOM.productForm.reset();
  DOM.editProductId.value = '';
  DOM.productFormTitle.textContent = 'Cadastrar Novo Produto';
  DOM.newProductCard.style.display = 'none';
}

// ============================================================================
// CADASTRO EM MASSA POR PLANILHA
// ============================================================================
function downloadProductsTemplateCSV() {
  const headers = 'SKU;Produto;Preço;Custo;Preço Base;Categoria';
  const sampleRows = [
    'SKU001;Smartphone Galaxy A15;899,00;650,00;750,00;Smartphones',
    'SKU002;Fone Bluetooth Pro;149,90;55,00;100,00;Acessórios',
    'SKU003;Smartwatch Ultra 49mm;219,00;100,00;160,00;Wearables',
    'SKU004;Cabo USB-C Turbo Blindado;39,90;12,00;25,00;Cabos',
    'SKU005;Mochila Impermeável;189,00;85,00;130,00;Bolsas'
  ];

  const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_produtos_com_preco_base.csv';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Planilha modelo com Preço Base baixada com sucesso!', 'success');
}

function exportProductsToCSV() {
  if (appState.products.length === 0) {
    showToast('Nenhum produto cadastrado para exportar.', 'error');
    return;
  }

  const headers = ['SKU', 'Produto', 'Preço (R$)', 'Custo (R$)', 'Preço Base (R$)', 'Categoria'];
  const rows = appState.products.map(p => [
    `"${p.sku || p.id || ''}"`,
    `"${p.name || ''}"`,
    `"${p.price || ''}"`,
    `"${p.cost || ''}"`,
    `"${p.basePrice || p.price || ''}"`,
    `"${p.category || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `catalogo_produtos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Catálogo de produtos exportado em CSV!', 'success');
}

function parseSpreadsheetText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  let delimiter = ';';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes('\t')) {
    delimiter = ';';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  }

  const rows = lines.map(line => {
    const tokens = [];
    let insideQuotes = false;
    let currentToken = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        tokens.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    tokens.push(currentToken.trim());
    return tokens.map(t => t.replace(/^["']|["']$/g, '').trim());
  });

  if (rows.length === 0) return [];

  let startIndex = 0;
  const headerCandidates = rows[0].map(h => h.toLowerCase());
  let colSkuIdx = -1;
  let colNameIdx = 0;
  let colPriceIdx = 1;
  let colCostIdx = 2;
  let colBasePriceIdx = 3;
  let colCategoryIdx = 4;

  const isHeaderRow = headerCandidates.some(h => 
    h.includes('nome') || h.includes('prod') || h.includes('item') || h.includes('desc') || h.includes('name') || h.includes('preç') || h.includes('prec') || h.includes('valor')
  );

  if (isHeaderRow) {
    startIndex = 1;
    headerCandidates.forEach((h, idx) => {
      if (h.includes('sku') || h.includes('cód') || h.includes('cod')) {
        colSkuIdx = idx;
      } else if (h.includes('nome') || h.includes('prod') || h.includes('item') || h.includes('desc') || h.includes('name')) {
        colNameIdx = idx;
      } else if (h.includes('base') || h.includes('preço base') || h.includes('preco base')) {
        colBasePriceIdx = idx;
      } else if (h.includes('cust') || h.includes('cost')) {
        colCostIdx = idx;
      } else if (h.includes('preç') || h.includes('prec') || h.includes('valor') || h.includes('venda') || h.includes('price')) {
        colPriceIdx = idx;
      } else if (h.includes('categ') || h.includes('tipo') || h.includes('depart')) {
        colCategoryIdx = idx;
      }
    });
  }

  const parsedProducts = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const name = row[colNameIdx] || '';
    const sku = colSkuIdx >= 0 ? row[colSkuIdx] : '';
    let price = row[colPriceIdx] || '';
    let cost = row[colCostIdx] || '';
    let basePrice = row[colBasePriceIdx] || '';
    let category = row[colCategoryIdx] || '';

    if (!name.trim()) continue;

    price = price.replace(/R\$\s*/gi, '').trim();
    cost = cost.replace(/R\$\s*/gi, '').trim();
    basePrice = basePrice.replace(/R\$\s*/gi, '').trim();

    if (!price) price = '0,00';
    if (!basePrice) basePrice = price;

    parsedProducts.push({
      id: sku.trim() || 'bulk-' + Date.now() + '-' + i,
      sku: sku.trim() || '',
      name: name.trim(),
      price: price.trim(),
      cost: cost.trim(),
      basePrice: basePrice.trim(),
      category: category.trim() || 'Geral'
    });
  }

  return parsedProducts;
}

function openBulkImportModal() {
  appState.parsedBulkProducts = [];
  DOM.selectedFileInfo.style.display = 'none';
  DOM.bulkPreviewSection.style.display = 'none';
  DOM.bulkPreviewTableBody.innerHTML = '';
  DOM.btnConfirmBulkImport.disabled = true;
  DOM.bulkPasteTextarea.value = '';
  DOM.bulkCsvFileInput.value = '';

  DOM.bulkImportModalBackdrop.style.display = 'flex';
  SoundEffects.playPop();
}

function closeBulkImportModal() {
  DOM.bulkImportModalBackdrop.style.display = 'none';
}

function handleFileSelection(file) {
  if (!file) return;

  DOM.selectedFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  DOM.selectedFileInfo.style.display = 'flex';

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const products = parseSpreadsheetText(content);
    displayBulkPreview(products);
  };
  reader.onerror = () => {
    showToast('Erro ao ler arquivo da planilha.', 'error');
  };
  reader.readAsText(file, 'utf-8');
}

function displayBulkPreview(products) {
  if (!products || products.length === 0) {
    showToast('Nenhum produto válido encontrado no arquivo ou texto.', 'error');
    DOM.bulkPreviewSection.style.display = 'none';
    DOM.btnConfirmBulkImport.disabled = true;
    return;
  }

  appState.parsedBulkProducts = products;
  DOM.parsedProductsCount.textContent = products.length;

  DOM.bulkPreviewTableBody.innerHTML = products.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td style="color: var(--primary); font-weight: 700;">R$ ${escapeHtml(p.price)}</td>
      <td>${p.cost ? 'R$ ' + escapeHtml(p.cost) : '-'}</td>
      <td style="color: var(--accent-blue); font-weight: 700;">R$ ${escapeHtml(p.basePrice)}</td>
      <td>${escapeHtml(p.category)}</td>
    </tr>
  `).join('');

  DOM.bulkPreviewSection.style.display = 'block';
  DOM.btnConfirmBulkImport.disabled = false;
  DOM.btnConfirmBulkImport.textContent = `Confirmar e Cadastrar ${products.length} Produtos`;
  showToast(`${products.length} produtos reconhecidos com Preço Base!`, 'success');
  SoundEffects.playPop();
}

function executeBulkImport() {
  if (!appState.parsedBulkProducts || appState.parsedBulkProducts.length === 0) {
    showToast('Nenhum produto reconhecido para importar.', 'error');
    return;
  }

  const importMode = document.querySelector('input[name="importMode"]:checked')?.value || 'append';
  const newItems = appState.parsedBulkProducts;

  if (importMode === 'replace') {
    appState.products = newItems;
    showToast(`Catálogo substituído por ${newItems.length} novos produtos!`, 'success');
  } else {
    const existingNames = new Set(appState.products.map(p => p.name.toLowerCase().trim()));
    let count = 0;

    newItems.forEach(item => {
      if (!existingNames.has(item.name.toLowerCase().trim())) {
        appState.products.push(item);
        existingNames.add(item.name.toLowerCase().trim());
        count++;
      } else {
        const idx = appState.products.findIndex(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        if (idx !== -1) {
          appState.products[idx] = { ...appState.products[idx], ...item };
        }
        count++;
      }
    });

    showToast(`${count} produtos processados e cadastrados com sucesso!`, 'success');
  }

  saveProductsToStorage();
  closeBulkImportModal();
  SoundEffects.playSuccess();
}

// ============================================================================
// SUBNAV SWITCHER
// ============================================================================
function showSalesForm() {
  DOM.subnavFormBtn.classList.add('active');
  DOM.subnavListBtn.classList.remove('active');
  DOM.salesFormSection.style.display = 'block';
  DOM.salesHistorySection.style.display = 'none';
  SoundEffects.playPop();
}

function showSalesHistory() {
  DOM.subnavFormBtn.classList.remove('active');
  DOM.subnavListBtn.classList.add('active');
  DOM.salesFormSection.style.display = 'none';
  DOM.salesHistorySection.style.display = 'block';
  renderSalesHistory();
  SoundEffects.playPop();
}

// ============================================================================
// BACKUP ACTIONS
// ============================================================================
function exportDataToJSON() {
  const backup = {
    sales: appState.sales,
    products: appState.products,
    sellers: appState.sellers,
    config: appState.config,
    exportDate: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_completo_vendas_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON exportado com sucesso!', 'success');
}

function loadSampleData() {
  if (confirm('Deseja recarregar os dados de demonstração com os vendedores Junior, Alexandre, Jeremias, Allyson e Johnathan?')) {
    appState.sales = [...INITIAL_SALES];
    appState.products = [...INITIAL_PRODUCTS];
    appState.sellers = [...INITIAL_SELLERS];
    saveSalesToStorage();
    saveProductsToStorage();
    saveSellersToStorage();
    showToast('Dados de demonstração restaurados!', 'success');
    SoundEffects.playSuccess();
  }
}

function clearAllData() {
  if (confirm('ATENÇÃO: Deseja apagar permanentemente todas as vendas cadastradas?')) {
    appState.sales = [];
    saveSalesToStorage();
    showToast('Todas as vendas foram apagadas.', 'info');
    SoundEffects.playPop();
  }
}

// ============================================================================
// EVENT LISTENERS BINDING
// ============================================================================
function setupEventListeners() {
  // Tabs Navigation
  DOM.tabBtnVendas.addEventListener('click', () => switchTab('tab-vendas'));
  DOM.tabBtnProdutos.addEventListener('click', () => switchTab('tab-produtos'));
  DOM.tabBtnConfig.addEventListener('click', () => switchTab('tab-configuracoes'));

  // Vendas Sub-nav
  DOM.subnavFormBtn.addEventListener('click', showSalesForm);
  DOM.subnavListBtn.addEventListener('click', showSalesHistory);

  // Sales Form Events
  DOM.salesForm.addEventListener('submit', handleSalesFormSubmit);
  DOM.btnClearForm.addEventListener('click', clearSalesForm);
  
  const btnAddProductRow = document.getElementById('btnAddProductRow');
  if (btnAddProductRow) {
    btnAddProductRow.addEventListener('click', window.addEmptyProductRow);
  }

  const firstProdInput = document.getElementById('inputProduto_0');
  if (firstProdInput) {
    firstProdInput.addEventListener('input', onProductInputChange);
    firstProdInput.addEventListener('change', onProductInputChange);
  }
  
  const firstPrecoInput = document.getElementById('inputPreco_0');
  if (firstPrecoInput) {
    firstPrecoInput.addEventListener('input', onSellingPriceInputChange);
  }

  if (DOM.btnCalcComissao) DOM.btnCalcComissao.addEventListener('click', resetToProductRules);
  if (DOM.btnCalcLucro) DOM.btnCalcLucro.addEventListener('click', resetToProductRules);

  // Checkbox Enviar Garantia (Alterna campo de CPF/CNPJ)
  if (DOM.checkEnviarGarantia) {
    DOM.checkEnviarGarantia.addEventListener('change', (e) => {
      if (DOM.rowDocumento) {
        DOM.rowDocumento.style.display = e.target.checked ? 'grid' : 'none';
        if (e.target.checked && DOM.inputDocumento) {
          DOM.inputDocumento.focus();
        }
      }
      SoundEffects.playPop();
    });
  }

  // History Date Presets
  document.querySelectorAll('.date-preset-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.date-preset-pill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const range = e.target.getAttribute('data-range');
      appState.historyFilter.dateRangeMode = range;

      if (range === 'custom') {
        DOM.customDateContainer.style.display = 'flex';
      } else {
        DOM.customDateContainer.style.display = 'none';
        renderSalesHistory();
      }
      SoundEffects.playPop();
    });
  });

  DOM.btnApplyDateFilter.addEventListener('click', () => {
    appState.historyFilter.dateStart = DOM.filterDateStart.value;
    appState.historyFilter.dateEnd = DOM.filterDateEnd.value;
    renderSalesHistory();
    SoundEffects.playPop();
  });

  DOM.btnClearDateFilter.addEventListener('click', () => {
    DOM.filterDateStart.value = '';
    DOM.filterDateEnd.value = '';
    appState.historyFilter.dateStart = '';
    appState.historyFilter.dateEnd = '';
    renderSalesHistory();
    SoundEffects.playPop();
  });

  // History Seller dropdown
  DOM.filterSellerSelect.addEventListener('change', (e) => {
    appState.historyFilter.seller = e.target.value;
    renderSalesHistory();
    SoundEffects.playPop();
  });

  // History Search input
  DOM.historySearchInput.addEventListener('input', renderSalesHistory);

  // History Export Spreadsheet Button
  if (DOM.btnExportHistoryCSV) {
    DOM.btnExportHistoryCSV.addEventListener('click', exportFilteredHistoryToCSV);
  }

  // Clear all filters pill
  if (DOM.btnClearAllFilters) {
    DOM.btnClearAllFilters.addEventListener('click', window.onClearHistoryFilters);
  }

  // Toggle Seller Performance (Ranking dos Vendedores)
  if (DOM.btnTogglePerfTable) {
    DOM.btnTogglePerfTable.addEventListener('click', () => {
      const isHidden = DOM.sellerPerformanceCard.style.display === 'none';
      DOM.sellerPerformanceCard.style.display = isHidden ? 'block' : 'none';
      DOM.perfToggleText.textContent = isHidden ? 'Ocultar Detalhes' : 'Ver Detalhes';
      DOM.perfArrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      SoundEffects.playPop();
    });
  }

  // Sellers Management in Settings
  DOM.btnToggleNewSeller.addEventListener('click', () => {
    const isHidden = DOM.sellerFormCard.style.display === 'none';
    DOM.sellerFormCard.style.display = isHidden ? 'block' : 'none';
    if (isHidden) DOM.sellerNameInput.focus();
    SoundEffects.playPop();
  });
  DOM.btnCancelSeller.addEventListener('click', resetSellerForm);
  DOM.sellerForm.addEventListener('submit', handleSellerFormSubmit);

  // WhatsApp Button (Apenas enviar no whatsapp)
  if (DOM.btnApenasWhatsapp) {
    DOM.btnApenasWhatsapp.addEventListener('click', () => {
      openWhatsappShareModal(null);
    });
  }
  if (DOM.fabWhatsappBtn) {
    DOM.fabWhatsappBtn.addEventListener('click', () => {
      openWhatsappShareModal(null);
    });
  }

  // WhatsApp Modal actions
  DOM.btnCloseWhatsappModal.addEventListener('click', closeWhatsappModal);
  DOM.whatsappModalBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.whatsappModalBackdrop) closeWhatsappModal();
  });
  DOM.btnSendWhatsappDirect.addEventListener('click', handleSendWhatsappDirectWithGarantia);
  DOM.btnCopyWhatsappMessage.addEventListener('click', copyWhatsappMessageToClipboard);

  // Product management events
  DOM.btnToggleNewProduct.addEventListener('click', () => {
    const isHidden = DOM.newProductCard.style.display === 'none';
    DOM.newProductCard.style.display = isHidden ? 'block' : 'none';
    if (isHidden) DOM.prodName.focus();
    SoundEffects.playPop();
  });
  DOM.btnCancelProduct.addEventListener('click', resetProductForm);
  DOM.productForm.addEventListener('submit', handleProductFormSubmit);
  DOM.productSearchInput.addEventListener('input', renderProductsList);

  // Bulk Spreadsheet Import events
  DOM.btnOpenBulkImport.addEventListener('click', openBulkImportModal);
  DOM.btnCloseBulkModal.addEventListener('click', closeBulkImportModal);
  DOM.btnCancelBulkModal.addEventListener('click', closeBulkImportModal);
  DOM.bulkImportModalBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.bulkImportModalBackdrop) closeBulkImportModal();
  });

  DOM.tabUploadFileBtn.addEventListener('click', () => {
    DOM.tabUploadFileBtn.classList.add('active');
    DOM.tabPasteTextBtn.classList.remove('active');
    DOM.panelUploadFile.style.display = 'block';
    DOM.panelPasteText.style.display = 'none';
    SoundEffects.playPop();
  });

  DOM.tabPasteTextBtn.addEventListener('click', () => {
    DOM.tabPasteTextBtn.classList.add('active');
    DOM.tabUploadFileBtn.classList.remove('active');
    DOM.panelPasteText.style.display = 'block';
    DOM.panelUploadFile.style.display = 'none';
    DOM.bulkPasteTextarea.focus();
    SoundEffects.playPop();
  });

  DOM.fileDropzone.addEventListener('click', () => DOM.bulkCsvFileInput.click());

  DOM.fileDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.fileDropzone.classList.add('drag-over');
  });

  DOM.fileDropzone.addEventListener('dragleave', () => DOM.fileDropzone.classList.remove('drag-over'));

  DOM.fileDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.fileDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  DOM.bulkCsvFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  DOM.btnRemoveFile.addEventListener('click', () => {
    DOM.bulkCsvFileInput.value = '';
    DOM.selectedFileInfo.style.display = 'none';
    DOM.bulkPreviewSection.style.display = 'none';
    DOM.btnConfirmBulkImport.disabled = true;
    appState.parsedBulkProducts = [];
    SoundEffects.playPop();
  });

  DOM.btnProcessPastedText.addEventListener('click', () => {
    const text = DOM.bulkPasteTextarea.value.trim();
    if (!text) {
      showToast('Cole o conteúdo da planilha no campo antes de processar.', 'error');
      DOM.bulkPasteTextarea.focus();
      return;
    }
    const products = parseSpreadsheetText(text);
    displayBulkPreview(products);
  });

  DOM.btnDownloadTemplate.addEventListener('click', downloadProductsTemplateCSV);
  DOM.btnDownloadSampleCSV.addEventListener('click', downloadProductsTemplateCSV);
  DOM.btnExportProductsCSV.addEventListener('click', exportProductsToCSV);
  DOM.btnConfirmBulkImport.addEventListener('click', executeBulkImport);

  // Settings events
  if (DOM.btnSalvarConfig) DOM.btnSalvarConfig.addEventListener('click', saveConfigToStorage);
  if (DOM.btnResetTemplate) DOM.btnResetTemplate.addEventListener('click', () => {
    DOM.cfgWhatsMsg.value = DEFAULT_WHATSAPP_TEMPLATE;
    showToast('Modelo padrão restaurado.', 'info');
  });

  if (DOM.btnExportCSV) DOM.btnExportCSV.addEventListener('click', exportFilteredHistoryToCSV);
  if (DOM.btnExportJSON) DOM.btnExportJSON.addEventListener('click', exportDataToJSON);
  if (DOM.btnLoadSampleData) DOM.btnLoadSampleData.addEventListener('click', loadSampleData);
  if (DOM.btnClearAllData) DOM.btnClearAllData.addEventListener('click', clearAllData);

  // Google Sheets Cloud Database events
  if (DOM.btnTestGoogleSheets) DOM.btnTestGoogleSheets.addEventListener('click', () => testGoogleSheetsConnection(false));
  if (DOM.btnSyncAllFromSheet) DOM.btnSyncAllFromSheet.addEventListener('click', () => fetchDataFromGoogleSheets(false));
  if (DOM.btnPushProductsToSheet) DOM.btnPushProductsToSheet.addEventListener('click', () => syncProductsToGoogleSheets(appState.products));
  if (DOM.btnOpenScriptGuideModal) DOM.btnOpenScriptGuideModal.addEventListener('click', openAppsScriptGuideModal);
  if (DOM.btnSyncProductsSheetQuick) DOM.btnSyncProductsSheetQuick.addEventListener('click', () => fetchDataFromGoogleSheets(false));

  if (DOM.btnCloseScriptGuideModal) DOM.btnCloseScriptGuideModal.addEventListener('click', closeAppsScriptGuideModal);
  if (DOM.btnDoneScriptGuide) DOM.btnDoneScriptGuide.addEventListener('click', closeAppsScriptGuideModal);
  if (DOM.btnCopyScriptCode) DOM.btnCopyScriptCode.addEventListener('click', copyAppsScriptCode);
  if (DOM.appsScriptGuideModalBackdrop) {
    DOM.appsScriptGuideModalBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.appsScriptGuideModalBackdrop) closeAppsScriptGuideModal();
    });
  }

  // Recibo e Garantia Modal Events
  if (DOM.btnCloseGarantiaModal) DOM.btnCloseGarantiaModal.addEventListener('click', closeGarantiaModal);
  if (DOM.btnDismissGarantiaModal) DOM.btnDismissGarantiaModal.addEventListener('click', closeGarantiaModal);
  if (DOM.btnPrintGarantiaDoc) DOM.btnPrintGarantiaDoc.addEventListener('click', printGarantiaDocument);
  if (DOM.btnDownloadGarantiaPDF) DOM.btnDownloadGarantiaPDF.addEventListener('click', downloadGarantiaPDF);
  if (DOM.btnShareGarantiaWhatsapp) DOM.btnShareGarantiaWhatsapp.addEventListener('click', shareGarantiaOnWhatsapp);
  if (DOM.btnPreviewGarantiaModal) {
    DOM.btnPreviewGarantiaModal.addEventListener('click', (e) => {
      e.stopPropagation();
      openGarantiaModal(currentGarantiaSaleData);
    });
  }
  if (DOM.btnSendGarantiaDirectModal) {
    DOM.btnSendGarantiaDirectModal.addEventListener('click', (e) => {
      e.stopPropagation();
      shareGarantiaOnWhatsapp();
    });
  }
  if (DOM.garantiaModalBackdrop) {
    DOM.garantiaModalBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.garantiaModalBackdrop) closeGarantiaModal();
    });
  }
}

// ============================================================================
// LIVE CLOCK, THEME & FRAME SWITCHER
// ============================================================================
function setupLiveClock() {
  function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (DOM.livePhoneTime) {
      DOM.livePhoneTime.textContent = `${hours}:${minutes}`;
    }
  }
  updateTime();
  setInterval(updateTime, 30000);
}

function setupThemeAndFrame() {
  // Theme setup
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (DOM.toggleThemeBtn) {
    DOM.toggleThemeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      SoundEffects.playPop();
    });
  }

  // Frame mode setup
  const savedFrameMode = localStorage.getItem(STORAGE_KEYS.FRAME_MODE) || 'mobile';
  if (savedFrameMode === 'fullscreen' && DOM.smartphoneFrame) {
    DOM.smartphoneFrame.classList.add('fullscreen-mode');
    if (DOM.frameModeText) DOM.frameModeText.textContent = 'Tela Cheia';
  }

  if (DOM.toggleDeviceFrameBtn) {
    DOM.toggleDeviceFrameBtn.addEventListener('click', () => {
      const isFullscreen = DOM.smartphoneFrame.classList.toggle('fullscreen-mode');
      if (DOM.frameModeText) {
        DOM.frameModeText.textContent = isFullscreen ? 'Tela Cheia' : 'Moldura Celular';
      }
      localStorage.setItem(STORAGE_KEYS.FRAME_MODE, isFullscreen ? 'fullscreen' : 'mobile');
      SoundEffects.playPop();
    });
  }
}

// ============================================================================
// TABS NAVIGATION (VENDAS | PRODUTOS | CONFIGURAÇÕES)
// ============================================================================
function switchTab(tabId) {
  // Update nav buttons
  if (DOM.tabBtnVendas) DOM.tabBtnVendas.classList.toggle('active', tabId === 'tab-vendas');
  if (DOM.tabBtnProdutos) DOM.tabBtnProdutos.classList.toggle('active', tabId === 'tab-produtos');
  if (DOM.tabBtnConfig) DOM.tabBtnConfig.classList.toggle('active', tabId === 'tab-configuracoes');

  // Update panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tab-produtos') {
    renderProductsList();
  } else if (tabId === 'tab-configuracoes') {
    renderSellersList();
    renderSellersSelect();
    updateDatabaseMetrics();
    updateGoogleSheetStatusUI();
  } else if (tabId === 'tab-vendas') {
    renderSalesHistory();
  }

  SoundEffects.playPop();
}

// ============================================================================
// GOOGLE SHEETS CLOUD DATABASE INTEGRATION (24H ONLINE)
// ============================================================================
function updateGoogleSheetStatusUI(status = null, message = null) {
  if (!DOM.sheetStatusPill) return;

  const url = appState.config.googleSheetUrl || (DOM.cfgGoogleSheetUrl ? DOM.cfgGoogleSheetUrl.value.trim() : '');
  
  if (status === 'syncing') {
    DOM.sheetStatusPill.className = 'db-status-pill syncing';
    if (DOM.sheetStatusText) DOM.sheetStatusText.textContent = message || 'Sincronizando...';
  } else if (status === 'connected' || (url && status !== 'disconnected')) {
    DOM.sheetStatusPill.className = 'db-status-pill online';
    if (DOM.sheetStatusText) DOM.sheetStatusText.textContent = message || 'Google Sheets Conectado';
  } else {
    DOM.sheetStatusPill.className = 'db-status-pill offline';
    if (DOM.sheetStatusText) DOM.sheetStatusText.textContent = message || 'Desconectado';
  }
}

async function testGoogleSheetsConnection(silent = false) {
  const url = DOM.cfgGoogleSheetUrl ? DOM.cfgGoogleSheetUrl.value.trim() : appState.config.googleSheetUrl;
  
  if (!url) {
    if (!silent) showToast('Cole a URL do Web App do Google Apps Script primeiro.', 'error');
    updateGoogleSheetStatusUI('disconnected');
    return false;
  }

  if (!url.startsWith('https://script.google.com/macros/s/')) {
    if (!silent) showToast('URL inválida. Deve começar com https://script.google.com/macros/s/...', 'error');
    return false;
  }

  updateGoogleSheetStatusUI('syncing', 'Testando conexão...');

  try {
    const pingUrl = url + (url.includes('?') ? '&' : '?') + 'action=ping&t=' + Date.now();
    const res = await fetch(pingUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data && data.status === 'success') {
      appState.config.googleSheetUrl = url;
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(appState.config));
      updateGoogleSheetStatusUI('connected');
      if (!silent) {
        showToast('✅ Conexão com Google Sheets bem-sucedida! Banco 24h ativo.', 'success');
        SoundEffects.playSuccess();
      }
      return true;
    } else {
      throw new Error(data.message || 'Resposta inesperada');
    }
  } catch (err) {
    console.error('Erro de conexão com Google Sheets:', err);
    updateGoogleSheetStatusUI('disconnected', 'Erro de Conexão');
    if (!silent) {
      showToast('❌ Não foi possível conectar. Verifique a URL e se concedeu acesso a "Qualquer pessoa".', 'error');
    }
    return false;
  }
}

async function syncSaleToGoogleSheets(sale) {
  const url = appState.config.googleSheetUrl;
  if (!url || !appState.config.autoSyncSheet) return;

  try {
    updateGoogleSheetStatusUI('syncing', 'Gravando na planilha...');
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'addSale', sale: sale })
    });
    const result = await res.json();
    if (result && result.status === 'success') {
      updateGoogleSheetStatusUI('connected');
      // showToast('☁️ Venda sincronizada na Planilha Google!', 'success');
    }
  } catch (err) {
    console.warn('Erro ao sincronizar venda com Google Sheets:', err);
    updateGoogleSheetStatusUI('connected');
  }
}

async function syncProductsToGoogleSheets(products) {
  const url = appState.config.googleSheetUrl;
  if (!url) return;

  try {
    updateGoogleSheetStatusUI('syncing', 'Salvando produtos...');
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveProducts', products: products })
    });
    const result = await res.json();
    if (result && result.status === 'success') {
      updateGoogleSheetStatusUI('connected');
      showToast(`☁️ ${products.length} produto(s) gravados permanentemente no Google Sheets!`, 'success');
    }
  } catch (err) {
    console.warn('Erro ao salvar produtos no Google Sheets:', err);
    updateGoogleSheetStatusUI('connected');
  }
}

async function fetchDataFromGoogleSheets(silent = false) {
  const url = appState.config.googleSheetUrl;
  if (!url) {
    if (!silent) showToast('Nenhuma planilha conectada ainda.', 'error');
    return;
  }

  updateGoogleSheetStatusUI('syncing', 'Baixando dados...');
  if (!silent) showToast('Sincronizando com a Planilha Google...', 'info');

  try {
    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'action=getAll&t=' + Date.now();
    const res = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
    const data = await res.json();

    if (data && data.status === 'success') {
      let updated = false;

      // Update products from sheet
      if (Array.isArray(data.products)) {
        appState.products = data.products;
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(appState.products));
        renderProductsDatalist();
        renderProductsList();
        updated = true;
      }

      // Update sales from sheet
      if (Array.isArray(data.sales)) {
        appState.sales = data.sales;
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(appState.sales));
        renderSalesHistory();
        updated = true;
      }

      updateDatabaseMetrics();
      updateGoogleSheetStatusUI('connected');

      if (!silent) {
        showToast('✅ Dados sincronizados com sucesso da Planilha Google!', 'success');
        SoundEffects.playSuccess();
      }
    } else {
      throw new Error(data.message || 'Erro ao ler dados');
    }
  } catch (err) {
    console.error('Erro ao baixar dados do Google Sheets:', err);
    updateGoogleSheetStatusUI('connected');
    if (!silent) showToast('Erro ao sincronizar da planilha. Verifique a conexão.', 'error');
  }
}

// Modal helper functions for Apps Script Guide
function openAppsScriptGuideModal() {
  if (DOM.appsScriptGuideModalBackdrop) {
    DOM.appsScriptGuideModalBackdrop.style.display = 'flex';
    SoundEffects.playPop();
  }
}

function closeAppsScriptGuideModal() {
  if (DOM.appsScriptGuideModalBackdrop) {
    DOM.appsScriptGuideModalBackdrop.style.display = 'none';
  }
}

function copyAppsScriptCode() {
  const code = DOM.appsScriptCodePre ? DOM.appsScriptCodePre.textContent : '';
  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    showToast('Código copiado para a área de transferência!', 'success');
    SoundEffects.playSuccess();
  }).catch(() => {
    showToast('Não foi possível copiar automaticamente.', 'error');
  });
}

// ============================================================================
// TOAST UTILITY
// ============================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  DOM.toastStack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// ============================================================================
// SANITIZE HELPER
// ============================================================================
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
