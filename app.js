
// ============================================================================
// CUSTOM AUTOCOMPLETE ENGINE PARA PRODUTOS (MOBILE & DESKTOP)
// ============================================================================
function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getCleanProductName(product) {
  if (!product) return '';
  const raw = typeof product === 'string' ? product : (product.name || '');
  if (raw.includes(' - ')) {
    return raw.split(' - ').slice(1).join(' - ').trim();
  }
  return raw.trim();
}

function setupProductAutocomplete(inputEl) {
  if (!inputEl) return;
  const wrapper = inputEl.closest('.product-autocomplete-wrapper');
  if (!wrapper) return;
  
  let dropdown = wrapper.querySelector('.product-suggestions-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('ul');
    dropdown.className = 'product-suggestions-dropdown sheets-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);
  } else {
    dropdown.classList.add('sheets-dropdown');
  }

  const toggleBtn = wrapper.querySelector('.btn-product-dropdown-toggle');
  let isInteractingWithDropdown = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Touch & Pointer gesture detection for native swipe scrolling on mobile
  dropdown.addEventListener('touchstart', (e) => {
    isInteractingWithDropdown = true;
    isDragging = false;
    if (e.touches && e.touches.length > 0) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  dropdown.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 0) {
      const diffX = Math.abs(e.touches[0].clientX - startX);
      const diffY = Math.abs(e.touches[0].clientY - startY);
      if (diffY > 8 || diffX > 8) {
        isDragging = true;
      }
    }
  }, { passive: true });

  dropdown.addEventListener('touchend', () => {
    setTimeout(() => { isDragging = false; }, 80);
  }, { passive: true });

  dropdown.addEventListener('pointerdown', (e) => {
    isInteractingWithDropdown = true;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = false;
  });

  dropdown.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) {
      isDragging = true;
    }
  });

  dropdown.addEventListener('pointerup', () => {
    setTimeout(() => { isDragging = false; }, 80);
  });

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const qNorm = normalizeText(query);
    const tNorm = normalizeText(text);
    const idx = tNorm.indexOf(qNorm);
    if (idx === -1) return escapeHtml(text);
    
    const before = escapeHtml(text.substring(0, idx));
    const match = escapeHtml(text.substring(idx, idx + query.length));
    const after = escapeHtml(text.substring(idx + query.length));
    return before + '<strong>' + match + '</strong>' + after;
  }

  function renderDropdown(items, query) {
    if (!items || items.length === 0) {
      if (query && query.length >= 1) {
        dropdown.innerHTML = '<li class="sheets-item-empty">Nenhum produto correspondente</li>';
        dropdown.style.display = 'block';
        wrapper.classList.add('is-open');
        const entryEl = wrapper.closest('.product-entry');
        if (entryEl) entryEl.classList.add('has-open-dropdown');
      } else {
        dropdown.style.display = 'none';
        wrapper.classList.remove('is-open');
        const entryEl = wrapper.closest('.product-entry');
        if (entryEl) entryEl.classList.remove('has-open-dropdown');
      }
      return;
    }

    dropdown.innerHTML = items.map((p, idx) => {
      // Exibe APENAS o que aparece após o hífen (ex: "Fritadeira Redonda 5L")
      const displayVal = getCleanProductName(p);
      const highlightedName = highlightMatch(displayVal, query);

      return '<li class="sheets-dropdown-item" data-index="' + idx + '" data-val="' + escapeHtml(displayVal) + '">' +
        '<span class="sheets-item-text">' + highlightedName + '</span>' +
      '</li>';
    }).join('');

    dropdown.style.display = 'block';
    wrapper.classList.add('is-open');
    const entryEl = wrapper.closest('.product-entry');
    if (entryEl) entryEl.classList.add('has-open-dropdown');

    // Posicionamento exato no celular:
    // Mantém o bloco anterior (Unidade Guarulhos/Itaquera ou Preço do produto anterior) visível no topo,
    // deixando o campo do produto e toda a lista abertos com folga acima do teclado
    function adjustFieldScroll() {
      try {
        const currentEntry = inputEl.closest('.product-entry');
        let targetPrevEl = null;

        if (currentEntry) {
          const prevEntry = currentEntry.previousElementSibling;
          if (prevEntry && prevEntry.classList && prevEntry.classList.contains('product-entry')) {
            // Se for o 2º, 3º, etc. produto: pega a linha de Preço do produto imediatamente anterior
            targetPrevEl = prevEntry.querySelector('.input-preco') || prevEntry;
          } else {
            // Se for o 1º produto: pega o bloco de Unidade (Guarulhos / Itaquera)
            targetPrevEl = document.getElementById('row-filial');
          }
        }

        if (targetPrevEl) {
          const rect = targetPrevEl.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - 12; // 12px de margem suave no topo
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        } else {
          const rect = inputEl.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - 80;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
      } catch (err) {}
    }

    setTimeout(adjustFieldScroll, 100);
    setTimeout(adjustFieldScroll, 300);

    dropdown.querySelectorAll('.sheets-dropdown-item').forEach(itemEl => {
      let touchStartTime = 0;
      let itemStartX = 0;
      let itemStartY = 0;

      itemEl.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
        if (e.touches && e.touches[0]) {
          itemStartX = e.touches[0].clientX;
          itemStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      itemEl.addEventListener('touchend', (e) => {
        const timeDiff = Date.now() - touchStartTime;
        let dist = 0;
        if (e.changedTouches && e.changedTouches[0]) {
          const dx = e.changedTouches[0].clientX - itemStartX;
          const dy = e.changedTouches[0].clientY - itemStartY;
          dist = Math.sqrt(dx * dx + dy * dy);
        }
        // Se foi um toque rápido sem arrastar (menos de 300ms e movimento menor que 10px), é uma seleção!
        if (!isDragging && dist < 12 && timeDiff < 450) {
          e.preventDefault();
          e.stopPropagation();
          selectItem(itemEl);
        }
      });

      itemEl.addEventListener('click', (e) => {
        if (!isDragging) {
          selectItem(itemEl);
        }
      });
    });
  }

  function selectItem(itemEl) {
    const val = itemEl.getAttribute('data-val');
    inputEl.value = val;
    dropdown.style.display = 'none';
    wrapper.classList.remove('is-open');
    const entryEl = wrapper.closest('.product-entry');
    if (entryEl) entryEl.classList.remove('has-open-dropdown');
    isInteractingWithDropdown = false;
    isDragging = false;
    
    onProductInputChange({ target: inputEl });
    if (window.SoundEffects && SoundEffects.playPop) SoundEffects.playPop();
  }

  function filterAndShow(showAllIfEmpty = false) {
    const rawVal = inputEl.value || '';
    const query = normalizeText(rawVal);
    const list = (appState && Array.isArray(appState.products) && appState.products.length > 0) ? appState.products : INITIAL_PRODUCTS;

    if (!query) {
      renderDropdown(list, '');
      return;
    }

    const matches = list.filter(p => {
      const cleanName = getCleanProductName(p);
      const nameNorm = normalizeText(cleanName);
      const rawNameNorm = normalizeText(p.name);
      const skuNorm = normalizeText(p.sku);
      const catNorm = normalizeText(p.category);
      return nameNorm.includes(query) || rawNameNorm.includes(query) || skuNorm.includes(query) || catNorm.includes(query);
    });

    renderDropdown(matches, rawVal.trim());
  }

  // Eventos de digitação e foco (idempotente)
  if (!inputEl._hasProductAutocompleteBound) {
    inputEl._hasProductAutocompleteBound = true;
    inputEl.addEventListener('input', () => filterAndShow(false));
    inputEl.addEventListener('keyup', () => filterAndShow(false));
    inputEl.addEventListener('focus', () => filterAndShow(true));
    inputEl.addEventListener('click', () => filterAndShow(true));

    inputEl.addEventListener('blur', () => {
      setTimeout(() => {
        if (!isInteractingWithDropdown) {
          dropdown.style.display = 'none';
          wrapper.classList.remove('is-open');
          const entryEl = wrapper.closest('.product-entry');
          if (entryEl) entryEl.classList.remove('has-open-dropdown');
        }
        isInteractingWithDropdown = false;
      }, 350);
    });
  }

  // Clique na setinha de validação
  if (toggleBtn && !toggleBtn._hasToggleBound) {
    toggleBtn._hasToggleBound = true;
    function onToggle(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      isInteractingWithDropdown = true;
      if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        wrapper.classList.remove('is-open');
        const entryEl = wrapper.closest('.product-entry');
        if (entryEl) entryEl.classList.remove('has-open-dropdown');
      } else {
        inputEl.focus();
        filterAndShow(true);
      }
      setTimeout(() => { isInteractingWithDropdown = false; }, 300);
    }

    toggleBtn.addEventListener('click', onToggle);
    toggleBtn.addEventListener('touchstart', onToggle, { passive: false });
  }

  inputEl._openProductDropdown = () => filterAndShow(true);
}

function initAllProductAutocompletes() {
  document.querySelectorAll('.input-produto').forEach(input => {
    setupProductAutocomplete(input);
  });
}

// Delegação global para garantir que o autocomplete e a lista abram imediatamente no primeiro campo ou em qualquer outro
document.addEventListener('focusin', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('input-produto')) {
    setupProductAutocomplete(e.target);
    if (typeof e.target._openProductDropdown === 'function') {
      e.target._openProductDropdown();
    }
  }
});

document.addEventListener('click', (e) => {
  const toggle = e.target && e.target.closest ? e.target.closest('.btn-product-dropdown-toggle') : null;
  if (toggle) {
    const wrap = toggle.closest('.product-autocomplete-wrapper');
    if (wrap) {
      const input = wrap.querySelector('.input-produto');
      if (input) {
        setupProductAutocomplete(input);
      }
    }
  }
});

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
  {
    "sku": "prod-1793049105214",
    "name": "Marmiteiro 50 Marmitas",
    "price": "1500",
    "cost": "1100",
    "basePrice": "1450",
    "category": "Geral",
    "id": "prod-1793049105214"
  },
  {
    "sku": "Mesa de Inox",
    "name": "Mesa de Inox",
    "price": "250",
    "cost": "81",
    "basePrice": "220",
    "category": "Geral",
    "id": "prod-1791469819673"
  },
  {
    "sku": "FT RED 5L",
    "name": "Fritadeira Redonda 5L",
    "price": "150",
    "cost": "85",
    "basePrice": "130",
    "category": "Geral",
    "id": "p-1"
  },
  {
    "sku": "FT RED 5L Cabo",
    "name": "Fritadeira Redonda 5L com Cabo",
    "price": "160",
    "cost": "95",
    "basePrice": "140",
    "category": "Geral",
    "id": "p-2"
  },
  {
    "sku": "FT RED 6L Inox",
    "name": "Fritadeira Redonda 6L Inox",
    "price": "200",
    "cost": "120",
    "basePrice": "180",
    "category": "Geral",
    "id": "p-3"
  },
  {
    "sku": "FT RED 7L",
    "name": "Fritadeira Redonda 7L",
    "price": "220",
    "cost": "155",
    "basePrice": "200",
    "category": "Geral",
    "id": "p-4"
  },
  {
    "sku": "FT RED 7L Cabo",
    "name": "Fritadeira Redonda 7L com Cabo",
    "price": "230",
    "cost": "165",
    "basePrice": "210",
    "category": "Geral",
    "id": "p-5"
  },
  {
    "sku": "FT 1 CUBA 5L",
    "name": "Fritadeira 1 Cuba 5 L Quadrada",
    "price": "220",
    "cost": "150",
    "basePrice": "200",
    "category": "Geral",
    "id": "p-6"
  },
  {
    "sku": "FT 1 CUBA 5L Cabo",
    "name": "Fritadeira 1 Cuba 5 L Quadrada com Cabo",
    "price": "230",
    "cost": "160",
    "basePrice": "210",
    "category": "Geral",
    "id": "p-7"
  },
  {
    "sku": "FT 1 CUBA 5L Tampa",
    "name": "Fritadeira 1 Cuba 5 L Quadrada com Tampa",
    "price": "260",
    "cost": "170",
    "basePrice": "235",
    "category": "Geral",
    "id": "p-8"
  },
  {
    "sku": "FT 1 CUBA 5L Cabo Tampa",
    "name": "Fritadeira 1 Cuba 5 L Quadrada com Cabo e Tampa",
    "price": "270",
    "cost": "180",
    "basePrice": "245",
    "category": "Geral",
    "id": "p-9"
  },
  {
    "sku": "FT 1 CUBA 7L",
    "name": "Fritadeira 1 Cuba 7 L Quadrada",
    "price": "250",
    "cost": "170",
    "basePrice": "230",
    "category": "Geral",
    "id": "p-10"
  },
  {
    "sku": "FT 1 CUBA 7L Cabo",
    "name": "Fritadeira 1 Cuba 7 L Quadrada com Cabo",
    "price": "260",
    "cost": "180",
    "basePrice": "240",
    "category": "Geral",
    "id": "p-11"
  },
  {
    "sku": "FT 1 CUBA 7L Tampa",
    "name": "Fritadeira 1 Cuba 7 L Quadrada com Tampa",
    "price": "290",
    "cost": "190",
    "basePrice": "265",
    "category": "Geral",
    "id": "p-12"
  },
  {
    "sku": "FT 1 CUBA 7L Cabo Tampa",
    "name": "Fritadeira 1 Cuba 7 L Quadrada com Cabo e Tampa",
    "price": "300",
    "cost": "200",
    "basePrice": "275",
    "category": "Geral",
    "id": "p-13"
  },
  {
    "sku": "FT 2 CUBAS 10L",
    "name": "Fritadeira 2 Cubas 10 L Quadrada",
    "price": "400",
    "cost": "310",
    "basePrice": "380",
    "category": "Geral",
    "id": "p-14"
  },
  {
    "sku": "FT 2 CUBAS 10L Cabo",
    "name": "Fritadeira 2 Cubas 10 L Quadrada com Cabo",
    "price": "420",
    "cost": "330",
    "basePrice": "400",
    "category": "Geral",
    "id": "p-15"
  },
  {
    "sku": "FT 2 CUBAS 10L Tampa",
    "name": "Fritadeira 2 Cubas 10 L Quadrada com Tampa",
    "price": "480",
    "cost": "350",
    "basePrice": "450",
    "category": "Geral",
    "id": "p-16"
  },
  {
    "sku": "FT 2 CUBAS 10L Cabo Tampa",
    "name": "Fritadeira 2 Cubas 10 L Quadrada com Cabo e Tampa",
    "price": "500",
    "cost": "380",
    "basePrice": "470",
    "category": "Geral",
    "id": "p-17"
  },
  {
    "sku": "FT 2 CUBAS 14L",
    "name": "Fritadeira 2 Cubas 14 L Quadrada",
    "price": "450",
    "cost": "335",
    "basePrice": "420",
    "category": "Geral",
    "id": "p-18"
  },
  {
    "sku": "FT 2 CUBAS 14L Cabo",
    "name": "Fritadeira 2 Cubas 14 L Quadrada com Cabo",
    "price": "470",
    "cost": "355",
    "basePrice": "440",
    "category": "Geral",
    "id": "p-19"
  },
  {
    "sku": "FT 2 CUBAS 14L Tampa",
    "name": "Fritadeira 2 Cubas 14 L Quadrada com Tampa",
    "price": "530",
    "cost": "375",
    "basePrice": "490",
    "category": "Geral",
    "id": "p-20"
  },
  {
    "sku": "FT 2 CUBAS 14L Cabo Tampa",
    "name": "Fritadeira 2 Cubas 14 L Quadrada com Cabo e Tampa",
    "price": "550",
    "cost": "395",
    "basePrice": "510",
    "category": "Geral",
    "id": "p-21"
  },
  {
    "sku": "FG 2 JR RISK",
    "name": "Fogão 2 Bocas Junior Risk",
    "price": "280",
    "cost": "200",
    "basePrice": "260",
    "category": "Geral",
    "id": "p-22"
  },
  {
    "sku": "FG 2 JR ROA",
    "name": "Fogão 2 Bocas Junior Roa",
    "price": "280",
    "cost": "220",
    "basePrice": "260",
    "category": "Geral",
    "id": "p-23"
  },
  {
    "sku": "FG 2 Baby",
    "name": "Fogão 2 Bocas Baby",
    "price": "250",
    "cost": "157",
    "basePrice": "220",
    "category": "Geral",
    "id": "p-24"
  },
  {
    "sku": "FG 2 Baby c/ Chapa",
    "name": "Fogão 2 Bocas Baby com Chapa",
    "price": "350",
    "cost": "190",
    "basePrice": "320",
    "category": "Geral",
    "id": "p-25"
  },
  {
    "sku": "FG 2 SEN RISK",
    "name": "Fogão 2 Bocas Senior Risk",
    "price": "350",
    "cost": "220",
    "basePrice": "320",
    "category": "Geral",
    "id": "p-26"
  },
  {
    "sku": "FG 2 SEN ROA",
    "name": "Fogão 2 Bocas Senior Roa",
    "price": "350",
    "cost": "280",
    "basePrice": "320",
    "category": "Geral",
    "id": "p-27"
  },
  {
    "sku": "FG 2 SEN SUZAN",
    "name": "Fogão 2 Bocas Senior Suzan",
    "price": "320",
    "cost": "200",
    "basePrice": "300",
    "category": "Geral",
    "id": "p-28"
  },
  {
    "sku": "FG 3 RISK",
    "name": "Fogão 3 Bocas Risk",
    "price": "470",
    "cost": "310",
    "basePrice": "440",
    "category": "Geral",
    "id": "p-29"
  },
  {
    "sku": "FG 3 ROA",
    "name": "Fogão 3 Bocas Roa",
    "price": "470",
    "cost": "330",
    "basePrice": "440",
    "category": "Geral",
    "id": "p-30"
  },
  {
    "sku": "FG 3 SUZAN",
    "name": "Fogão 3 Bocas Suzan",
    "price": "450",
    "cost": "260",
    "basePrice": "420",
    "category": "Geral",
    "id": "p-31"
  },
  {
    "sku": "FG 4 RISK",
    "name": "Fogão 4 Bocas Risk",
    "price": "580",
    "cost": "415",
    "basePrice": "550",
    "category": "Geral",
    "id": "p-32"
  },
  {
    "sku": "FG 4 ROA",
    "name": "Fogão 4 Bocas Roa",
    "price": "580",
    "cost": "415",
    "basePrice": "550",
    "category": "Geral",
    "id": "p-33"
  },
  {
    "sku": "FG 4 SUZAN",
    "name": "Fogão 4 Bocas Suzan",
    "price": "550",
    "cost": "310",
    "basePrice": "520",
    "category": "Geral",
    "id": "p-34"
  },
  {
    "sku": "FG 4 c/ Forno",
    "name": "Fogão 4 Bocas com Forno",
    "price": "1250",
    "cost": "920",
    "basePrice": "1170",
    "category": "Geral",
    "id": "p-35"
  },
  {
    "sku": "FG 6 RISK",
    "name": "Fogão 6 Bocas Risk",
    "price": "700",
    "cost": "515",
    "basePrice": "670",
    "category": "Geral",
    "id": "p-36"
  },
  {
    "sku": "FG 6 ROA",
    "name": "Fogão 6 Bocas Roa",
    "price": "700",
    "cost": "550",
    "basePrice": "670",
    "category": "Geral",
    "id": "p-37"
  },
  {
    "sku": "FG 6 c/ Forno",
    "name": "Fogão 6 Bocas com Forno",
    "price": "1350",
    "cost": "1020",
    "basePrice": "1270",
    "category": "Geral",
    "id": "p-38"
  },
  {
    "sku": "CH 30X40 Prensa",
    "name": "Chapa 30X40 Prensa",
    "price": "300",
    "cost": "215",
    "basePrice": "280",
    "category": "Geral",
    "id": "p-39"
  },
  {
    "sku": "CH 30X40 Prensa",
    "name": "Chapa 30X40 Prensa",
    "price": "350",
    "cost": "250",
    "basePrice": "320",
    "category": "Geral",
    "id": "p-40"
  },
  {
    "sku": "CH 30X60 Prensa",
    "name": "Chapa 30X60 Prensa",
    "price": "400",
    "cost": "305",
    "basePrice": "370",
    "category": "Geral",
    "id": "p-41"
  },
  {
    "sku": "CH 40X60",
    "name": "Chapa 40X60",
    "price": "450",
    "cost": "345",
    "basePrice": "430",
    "category": "Geral",
    "id": "p-42"
  },
  {
    "sku": "CH 40X80",
    "name": "Chapa 40X80",
    "price": "600",
    "cost": "475",
    "basePrice": "570",
    "category": "Geral",
    "id": "p-43"
  },
  {
    "sku": "ET 2 Band",
    "name": "Estufa 2 Band",
    "price": "250",
    "cost": "175",
    "basePrice": "230",
    "category": "Geral",
    "id": "p-44"
  },
  {
    "sku": "ET 3 Mini",
    "name": "Estufa 3 Mini",
    "price": "280",
    "cost": "190",
    "basePrice": "260",
    "category": "Geral",
    "id": "p-45"
  },
  {
    "sku": "ET 2 Gelo X",
    "name": "Estufa 2 Gelo X",
    "price": "300",
    "cost": "185",
    "basePrice": "270",
    "category": "Geral",
    "id": "p-46"
  },
  {
    "sku": "ET 3 Band",
    "name": "Estufa 3 Band",
    "price": "300",
    "cost": "205",
    "basePrice": "280",
    "category": "Geral",
    "id": "p-47"
  },
  {
    "sku": "ET 4 Mini",
    "name": "Estufa 4 Mini",
    "price": "320",
    "cost": "225",
    "basePrice": "300",
    "category": "Geral",
    "id": "p-48"
  },
  {
    "sku": "ET 3 Gelo X",
    "name": "Estufa 3 Gelo X",
    "price": "350",
    "cost": "216",
    "basePrice": "320",
    "category": "Geral",
    "id": "p-49"
  },
  {
    "sku": "ET 4 Linha",
    "name": "Estufa 4 Linha",
    "price": "0",
    "cost": "",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-50"
  },
  {
    "sku": "ET 4 Dupla",
    "name": "Estufa 4 Dupla",
    "price": "350",
    "cost": "265",
    "basePrice": "330",
    "category": "Geral",
    "id": "p-51"
  },
  {
    "sku": "ET 4 Dupla Term",
    "name": "Estufa 4 Dupla Term",
    "price": "0",
    "cost": "",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-52"
  },
  {
    "sku": "ET 6 Mini",
    "name": "Estufa 6 Mini",
    "price": "400",
    "cost": "285",
    "basePrice": "370",
    "category": "Geral",
    "id": "p-53"
  },
  {
    "sku": "ET 6 Dupla",
    "name": "Estufa 6 Dupla",
    "price": "450",
    "cost": "310",
    "basePrice": "420",
    "category": "Geral",
    "id": "p-54"
  },
  {
    "sku": "ET 6 Dupla Term",
    "name": "Estufa 6 Dupla Term",
    "price": "0",
    "cost": "",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-55"
  },
  {
    "sku": "ET 8 Dupla",
    "name": "Estufa 8 Dupla",
    "price": "550",
    "cost": "400",
    "basePrice": "530",
    "category": "Geral",
    "id": "p-56"
  },
  {
    "sku": "Caça 26",
    "name": "Caçarola 26",
    "price": "70",
    "cost": "37",
    "basePrice": "65",
    "category": "Geral",
    "id": "p-57"
  },
  {
    "sku": "Caça 34",
    "name": "Caçarola 34",
    "price": "100",
    "cost": "56",
    "basePrice": "95",
    "category": "Geral",
    "id": "p-58"
  },
  {
    "sku": "Cald 26",
    "name": "Caldeirão 26",
    "price": "80",
    "cost": "41",
    "basePrice": "75",
    "category": "Geral",
    "id": "p-59"
  },
  {
    "sku": "Cald 34",
    "name": "Caldeirão 34",
    "price": "120",
    "cost": "73",
    "basePrice": "115",
    "category": "Geral",
    "id": "p-60"
  },
  {
    "sku": "Jogo Ind",
    "name": "Jogo Industrial",
    "price": "320",
    "cost": "207",
    "basePrice": "300",
    "category": "Geral",
    "id": "p-61"
  },
  {
    "sku": "Jogo + Con",
    "name": "Jogo + Con",
    "price": "345",
    "cost": "220",
    "basePrice": "320",
    "category": "Geral",
    "id": "p-62"
  },
  {
    "sku": "Jogo + Con + Esp",
    "name": "Jogo + Con + Esp",
    "price": "370",
    "cost": "233",
    "basePrice": "340",
    "category": "Geral",
    "id": "p-63"
  },
  {
    "sku": "Pres 10L Craq",
    "name": "Panela de Pressão 10L Craqueada",
    "price": "150",
    "cost": "96",
    "basePrice": "140",
    "category": "Geral",
    "id": "p-64"
  },
  {
    "sku": "Pres 10L Pol",
    "name": "Panela de Pressão 10L Polida",
    "price": "150",
    "cost": "91",
    "basePrice": "140",
    "category": "Geral",
    "id": "p-65"
  },
  {
    "sku": "Jogo 5 Peças",
    "name": "Jogo 5 Peças",
    "price": "150",
    "cost": "92",
    "basePrice": "140",
    "category": "Geral",
    "id": "p-66"
  },
  {
    "sku": "Concha",
    "name": "Concha",
    "price": "25",
    "cost": "13",
    "basePrice": "20",
    "category": "Geral",
    "id": "p-67"
  },
  {
    "sku": "Espum",
    "name": "Espumadeira",
    "price": "25",
    "cost": "13",
    "basePrice": "20",
    "category": "Geral",
    "id": "p-68"
  },
  {
    "sku": "Forno Inox 54L",
    "name": "Forno Inox 54L",
    "price": "600",
    "cost": "430",
    "basePrice": "550",
    "category": "Geral",
    "id": "p-69"
  },
  {
    "sku": "Forno Inox 85L",
    "name": "Forno Inox 85L",
    "price": "700",
    "cost": "515",
    "basePrice": "650",
    "category": "Geral",
    "id": "p-70"
  },
  {
    "sku": "Grade p/ Forno",
    "name": "Grade p/ Forno",
    "price": "50",
    "cost": "20",
    "basePrice": "40",
    "category": "Geral",
    "id": "p-71"
  },
  {
    "sku": "CAR c/ GAV",
    "name": "Carrinho c/ Gaveta",
    "price": "400",
    "cost": "295",
    "basePrice": "380",
    "category": "Geral",
    "id": "p-72"
  },
  {
    "sku": "CAR s/ GAV",
    "name": "Carrinho s/ Gaveta",
    "price": "320",
    "cost": "230",
    "basePrice": "300",
    "category": "Geral",
    "id": "p-73"
  },
  {
    "sku": "Ester 2 Bules",
    "name": "Esterilizador 2 Bules",
    "price": "350",
    "cost": "275",
    "basePrice": "330",
    "category": "Geral",
    "id": "p-74"
  },
  {
    "sku": "Ester 3 Bules",
    "name": "Esterilizador 3 Bules",
    "price": "420",
    "cost": "330",
    "basePrice": "400",
    "category": "Geral",
    "id": "p-75"
  },
  {
    "sku": "Marmiteiro 12 M",
    "name": "Marmiteiro 12 Marmitas",
    "price": "470",
    "cost": "410",
    "basePrice": "450",
    "category": "Geral",
    "id": "p-76"
  },
  {
    "sku": "Gav 5 Inox",
    "name": "Gaveteiro 5 Inox",
    "price": "1200",
    "cost": "921",
    "basePrice": "1150",
    "category": "Geral",
    "id": "p-77"
  },
  {
    "sku": "Gav 6 Inox",
    "name": "Gaveteiro 6 Inox",
    "price": "1300",
    "cost": "1060",
    "basePrice": "1250",
    "category": "Geral",
    "id": "p-78"
  },
  {
    "sku": "Tampa c/ Corte",
    "name": "Tampa c/ Corte",
    "price": "50",
    "cost": "20",
    "basePrice": "40",
    "category": "Geral",
    "id": "p-79"
  },
  {
    "sku": "Tampa c/ Dobra",
    "name": "Tampa c/ Dobra",
    "price": "50",
    "cost": "22",
    "basePrice": "40",
    "category": "Geral",
    "id": "p-80"
  },
  {
    "sku": "EC P",
    "name": "Escorredor P",
    "price": "80",
    "cost": "50",
    "basePrice": "70",
    "category": "Geral",
    "id": "p-81"
  },
  {
    "sku": "EC G",
    "name": "Escorredor G",
    "price": "100",
    "cost": "56",
    "basePrice": "90",
    "category": "Geral",
    "id": "p-82"
  },
  {
    "sku": "Mang e Reg",
    "name": "Mang e Reg",
    "price": "20",
    "cost": "Mon Aug 10 2026 00:00:00 GMT-0300 (Horário Padrão de Brasília)",
    "basePrice": "15",
    "category": "Geral",
    "id": "p-83"
  },
  {
    "sku": "Reg",
    "name": "Registro Alta Pressão",
    "price": "15",
    "cost": "5",
    "basePrice": "10",
    "category": "Geral",
    "id": "p-84"
  },
  {
    "sku": "Reg Duplo",
    "name": "Registro Duplo Alta Pressão",
    "price": "15",
    "cost": "15",
    "basePrice": "20",
    "category": "Geral",
    "id": "p-85"
  },
  {
    "sku": "Queim",
    "name": "Queimador 5 Caulis Ajustável",
    "price": "50",
    "cost": "Thu Apr 23 2026 00:00:00 GMT-0300 (Horário Padrão de Brasília)",
    "basePrice": "40",
    "category": "Geral",
    "id": "p-86"
  },
  {
    "sku": "1 Caulim",
    "name": "1 Caulim",
    "price": "2",
    "cost": "0.58",
    "basePrice": "0.75",
    "category": "Geral",
    "id": "p-87"
  },
  {
    "sku": "10 Caulins",
    "name": "10 Caulins",
    "price": "15",
    "cost": "Wed Aug 05 2026 00:00:00 GMT-0300 (Horário Padrão de Brasília)",
    "basePrice": "15",
    "category": "Geral",
    "id": "p-88"
  },
  {
    "sku": "Band P",
    "name": "Bandeja P",
    "price": "30",
    "cost": "15",
    "basePrice": "30",
    "category": "Geral",
    "id": "p-89"
  },
  {
    "sku": "Band M",
    "name": "Bandeja M",
    "price": "0",
    "cost": "16.75",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-90"
  },
  {
    "sku": "Band G",
    "name": "Bandeja G",
    "price": "0",
    "cost": "20",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-91"
  },
  {
    "sku": "Cesto",
    "name": "Cesto",
    "price": "0",
    "cost": "19",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-92"
  },
  {
    "sku": "Cabo",
    "name": "Cabo",
    "price": "0",
    "cost": "10",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-93"
  },
  {
    "sku": "Pasta de Brilho",
    "name": "Pasta de Brilho",
    "price": "0",
    "cost": "3",
    "basePrice": "0",
    "category": "Geral",
    "id": "p-94"
  }
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
    "id": "sale-1791296293699-1",
    "dateString": "Tue Oct 06 2026 11:18:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "420",
    "cliente": "Alenxadre",
    "contato": "11975972012",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Item 1/2 - Nenhuma",
    "comissao": "-20",
    "lucro": "130",
    "timestamp": 1791296280000
  },
  {
    "id": "sale-1791296293699-2",
    "dateString": "Tue Oct 06 2026 11:18:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FT 2 CUBAS 10L - Fritadeira 2 Cubas 10 L Quadrada",
    "preco": "359",
    "cliente": "Alenxadre",
    "contato": "11975972012",
    "endereco": "Não informado",
    "frete": "Incluso",
    "pagamento": "Não informado",
    "observacao": "Item 2/2 - Nenhuma",
    "comissao": "-21",
    "lucro": "70",
    "timestamp": 1791296280000
  },
  {
    "id": "sale-1790698415554",
    "dateString": "Tue Sep 29 2026 13:13:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "p25 - FG 2 Baby",
    "preco": "250",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "63",
    "timestamp": 1790698380000
  },
  {
    "id": "sale-1790699753981",
    "dateString": "Tue Sep 29 2026 13:35:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Allyson",
    "produto": "p105 - Cesto",
    "preco": "50",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "10",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "5",
    "lucro": "26",
    "timestamp": 1790699700000
  },
  {
    "id": "sale-1790778883075",
    "dateString": "Wed Sep 30 2026 11:34:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "ET 6 Mini - Estufa 6 Mini",
    "preco": "400",
    "cliente": "vanderli",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "370",
    "timestamp": 1790778840000
  },
  {
    "id": "sale-1790791477044",
    "dateString": "Wed Sep 30 2026 15:04:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "400",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "370",
    "timestamp": 1790791440000
  },
  {
    "id": "sale-1790858809949",
    "dateString": "Thu Oct 01 2026 09:46:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Allyson",
    "produto": "ET 6 Dupla Term - Estufa 6 Dupla Term",
    "preco": "450",
    "cliente": "Wanessa",
    "contato": "11950940625",
    "endereco": "Rua Dona Antônia, 1073 - Vila das Palmeiras, Guarulhos - SP",
    "frete": "40",
    "pagamento": "Dinheiro",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "450",
    "timestamp": 1790858760000
  },
  {
    "id": "sale-1790868955568",
    "dateString": "Thu Oct 01 2026 12:35:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 4 RISK - Fogão 4 Bocas Risk",
    "preco": "550",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "550",
    "timestamp": 1790868900000
  },
  {
    "id": "sale-1790951147723",
    "dateString": "Fri Oct 02 2026 11:25:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 6 RISK - Fogão 6 Bocas Risk",
    "preco": "650",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "650",
    "timestamp": 1790951100000
  },
  {
    "id": "sale-1790968790395",
    "dateString": "Fri Oct 02 2026 16:19:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "FG 2 JR ROA - Fogão 2 Bocas Junior Roa, FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "709",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "709",
    "timestamp": 1790968740000
  },
  {
    "id": "sale-1791037627037",
    "dateString": "Sat Oct 03 2026 11:27:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Allyson",
    "produto": "Queim - Queimador 5 Caulis Ajustável",
    "preco": "50",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "50",
    "timestamp": 1791037620000
  },
  {
    "id": "sale-1791038257981",
    "dateString": "Sat Oct 03 2026 11:37:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 2 JR ROA - Fogão 2 Bocas Junior Roa, FG 4 RISK - Fogão 4 Bocas Risk",
    "preco": "810",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "810",
    "timestamp": 1791038220000
  },
  {
    "id": "sale-1791038297847",
    "dateString": "Sat Oct 03 2026 11:38:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "CAR c/ GAV - Carrinho c/ Gaveta",
    "preco": "350",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "350",
    "timestamp": 1791038280000
  },
  {
    "id": "sale-1791052565454",
    "dateString": "Sat Oct 03 2026 15:36:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk, panela de pressão",
    "preco": "500",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "500",
    "timestamp": 1791052560000
  },
  {
    "id": "sale-1791052632071",
    "dateString": "Sat Oct 03 2026 15:37:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "ET 3 Mini - Estufa 3 Mini",
    "preco": "260",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "260",
    "timestamp": 1791052620000
  },
  {
    "id": "sale-1791238061262",
    "dateString": "Mon Oct 05 2026 19:07:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "ET 6 Mini - Estufa 6 Mini, FT RED 7L - Fritadeira Redonda 7L",
    "preco": "650",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "80",
    "lucro": "130",
    "timestamp": 1791238020000
  },
  {
    "id": "sale-1791238127409",
    "dateString": "Mon Oct 05 2026 19:08:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk, FG 2 JR RISK - Fogão 2 Bocas Junior Risk",
    "preco": "620",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-80",
    "lucro": "190",
    "timestamp": 1791238080000
  },
  {
    "id": "sale-1791294432523",
    "dateString": "Tue Oct 06 2026 10:47:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Allyson",
    "produto": "CAR c/ GAV - Carrinho c/ Gaveta",
    "preco": "350",
    "cliente": "Marco Mendes",
    "contato": "11 99488-2422",
    "endereco": "Rua Cipriano Barata, 1582 - Ipiranga, São Paulo - SP",
    "frete": "90",
    "pagamento": "Pix",
    "observacao": "Nenhuma",
    "comissao": "-30",
    "lucro": "85",
    "timestamp": 1791294420000
  },
  {
    "id": "sale-1791313832680",
    "dateString": "Tue Oct 06 2026 16:10:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "FG 6 RISK - Fogão 6 Bocas Risk",
    "preco": "650",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-20",
    "lucro": "155",
    "timestamp": 1791313800000
  },
  {
    "id": "sale-1791393793492",
    "dateString": "Wed Oct 07 2026 14:23:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "ET 6 Mini - Estufa 6 Mini",
    "preco": "370",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "85",
    "timestamp": 1791393780000
  },
  {
    "id": "sale-1791469663415",
    "dateString": "Thu Oct 08 2026 11:27:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "junior",
    "produto": "carrinho",
    "preco": "380",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "85",
    "timestamp": 1791469620000
  },
  {
    "id": "sale-1791469769202",
    "dateString": "Thu Oct 08 2026 11:29:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "ET 6 Mini - Estufa 6 Mini, FG 2 JR ROA - Fogão 2 Bocas Junior Roa",
    "preco": "620",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-10",
    "lucro": "125",
    "timestamp": 1791469740000
  },
  {
    "id": "sale-1791469920825",
    "dateString": "Thu Oct 08 2026 11:32:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "mesa, gaveteiro 6",
    "preco": "1420",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-50",
    "lucro": "410",
    "timestamp": 1791469920000
  },
  {
    "id": "sale-1791469987646",
    "dateString": "Thu Oct 08 2026 11:33:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 2 Baby c/ Chapa - Fogão 2 Bocas Baby com Chapa",
    "preco": "250",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-70",
    "lucro": "130",
    "timestamp": 1791469980000
  },
  {
    "id": "sale-1791487223744",
    "dateString": "Thu Oct 08 2026 16:20:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "ET 3 Band - Estufa 3 Band, ET 4 Dupla - Estufa 4 Dupla",
    "preco": "680",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "70",
    "lucro": "140",
    "timestamp": 1791487200000
  },
  {
    "id": "sale-1791487885839",
    "dateString": "Thu Oct 08 2026 16:31:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 4 c/ Forno - Fogão 4 Bocas com Forno",
    "preco": "1170",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "250",
    "timestamp": 1791487860000
  },
  {
    "id": "sale-1791496597571",
    "dateString": "Thu Oct 08 2026 18:56:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Johnathan",
    "produto": "FT 1 CUBA 7L - Fritadeira 1 Cuba 7 L Quadrada",
    "preco": "250",
    "cliente": "Pamela",
    "contato": "11 965102173",
    "endereco": "Avenida Doutor Guilherme de Abreu Sodré, N 1073- Vila Hortência, São Paulo - SP",
    "frete": "42",
    "pagamento": "Pix",
    "observacao": "Nenhuma",
    "comissao": "20",
    "lucro": "60",
    "timestamp": 1791496560000
  },
  {
    "id": "sale-1791497133626",
    "dateString": "Thu Oct 08 2026 19:05:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Johnathan",
    "produto": "FT 1 CUBA 5L - Fritadeira 1 Cuba 5 L Quadrada",
    "preco": "240",
    "cliente": "jaqueline",
    "contato": "11989535640",
    "endereco": "Praça Marisa Marques, N82 - Vila Rosália, Guarulhos - SP",
    "frete": "0.2",
    "pagamento": "Pix",
    "observacao": "Nenhuma",
    "comissao": "40",
    "lucro": "50",
    "timestamp": 1791497100000
  },
  {
    "id": "sale-1791566591378",
    "dateString": "Fri Oct 09 2026 14:23:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 6 RISK - Fogão 6 Bocas Risk, panela de pressão",
    "preco": "780",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-30",
    "lucro": "199",
    "timestamp": 1791566580000
  },
  {
    "id": "sale-1791579822201",
    "dateString": "Fri Oct 09 2026 18:03:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "370",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-70",
    "lucro": "130",
    "timestamp": 1791579780000
  },
  {
    "id": "sale-1791579829544",
    "dateString": "Fri Oct 09 2026 18:03:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "370",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-70",
    "lucro": "130",
    "timestamp": 1791579780000
  },
  {
    "id": "sale-1791652833420",
    "dateString": "Sat Oct 10 2026 14:20:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 2 JR ROA - Fogão 2 Bocas Junior Roa, ET 6 Mini - Estufa 6 Mini",
    "preco": "620",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-10",
    "lucro": "125",
    "timestamp": 1791652800000
  },
  {
    "id": "sale-1791662798072",
    "dateString": "Sat Oct 10 2026 17:06:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "FT 1 CUBA 7L - Fritadeira 1 Cuba 7 L Quadrada",
    "preco": "250",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "20",
    "lucro": "60",
    "timestamp": 1791662760000
  },
  {
    "id": "sale-1791929474661",
    "dateString": "Tue Oct 13 2026 19:11:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 6 RISK - Fogão 6 Bocas Risk, FG 4 RISK - Fogão 4 Bocas Risk",
    "preco": "1190",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-30",
    "lucro": "290",
    "timestamp": 1791929460000
  },
  {
    "id": "sale-1792002042951",
    "dateString": "Wed Oct 14 2026 15:20:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "FT RED 7L - Fritadeira Redonda 7L",
    "preco": "230",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "45",
    "timestamp": 1792002000000
  },
  {
    "id": "sale-1792094418764",
    "dateString": "Thu Oct 15 2026 17:00:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "Mesa de Inox - Mesa de Inox, Mesa de Inox - Mesa de Inox, FT 1 CUBA 5L - Fritadeira 1 Cuba 5 L Quadrada",
    "preco": "629",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-11",
    "lucro": "230",
    "timestamp": 1792094400000
  },
  {
    "id": "sale-1792094857132",
    "dateString": "Thu Oct 15 2026 17:07:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "ET 3 Mini - Estufa 3 Mini, Ester 3 Bules - Esterilizador 3 Bules, FT 1 CUBA 7L - Fritadeira 1 Cuba 7 L Quadrada, EC P - Escorredor P, fogão",
    "preco": "1269",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "49",
    "lucro": "280",
    "timestamp": 1792094820000
  },
  {
    "id": "sale-1792108981594",
    "dateString": "Thu Oct 15 2026 21:03:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Johnathan",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "499",
    "cliente": "Reinaldo gangas",
    "contato": "11 94206-1096",
    "endereco": "Avenida Henrique Franco, 100 - Limoeiro, São Paulo - SP",
    "frete": "40",
    "pagamento": "Pix",
    "observacao": "Nenhuma",
    "comissao": "59",
    "lucro": "130",
    "timestamp": 1792108980000
  },
  {
    "id": "sale-1792434012527",
    "dateString": "Mon Oct 19 2026 15:20:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "FT 2 CUBAS 10L - Fritadeira 2 Cubas 10 L Quadrada, mesa, escorredor, tampa",
    "preco": "860",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-45",
    "lucro": "294",
    "timestamp": 1792434000000
  },
  {
    "id": "sale-1792513874165",
    "dateString": "Tue Oct 20 2026 13:31:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk, FG 4 RISK - Fogão 4 Bocas Risk",
    "preco": "999",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "9",
    "lucro": "265",
    "timestamp": 1792513860000
  },
  {
    "id": "sale-1792520822359",
    "dateString": "Tue Oct 20 2026 15:27:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "FG 3 RISK - Fogão 3 Bocas Risk",
    "preco": "449",
    "cliente": "sociedade escola de samba  imperador do Ipiranga",
    "contato": "#ERROR!",
    "endereco": "Avenida Otto Baumgart 451 em Vila Guilherme",
    "frete": "50",
    "pagamento": "Não informado",
    "observacao": "fábrica do samba 2 barracão  imperador do Ipiranga",
    "comissao": "0",
    "lucro": "139",
    "timestamp": 1792520820000
  },
  {
    "id": "sale-1792773205048",
    "dateString": "Fri Oct 23 2026 13:33:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "Fogão 6 bocas com forno",
    "preco": "1350",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "140",
    "lucro": "190",
    "timestamp": 1792773180000
  },
  {
    "id": "sale-1792853299273",
    "dateString": "Sat Oct 24 2026 11:48:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "jinior",
    "produto": "fogão 4",
    "preco": "500",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-50",
    "lucro": "135",
    "timestamp": 1792853280000
  },
  {
    "id": "sale-1793040259864",
    "dateString": "Mon Oct 26 2026 15:44:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "junior",
    "produto": "fogão 3, fogão 3, fogão 4, fogão 4",
    "preco": "1800",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-180",
    "lucro": "530",
    "timestamp": 1793040240000
  },
  {
    "id": "sale-1793040470275",
    "dateString": "Mon Oct 26 2026 15:47:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "fogão 3",
    "preco": "400",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-40",
    "lucro": "130",
    "timestamp": 1793040420000
  },
  {
    "id": "sale-1793049231570",
    "dateString": "Mon Oct 26 2026 18:13:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Allyson",
    "produto": "Marmiteiro",
    "preco": "1500",
    "cliente": "Anjun Express",
    "contato": "#ERROR!",
    "endereco": "Rua dos Tucanos, 630 - Sítio Guarehy, Carapicuíba - SP",
    "frete": "Não informado",
    "pagamento": "Pix",
    "observacao": "Nenhuma",
    "comissao": "50",
    "lucro": "350",
    "timestamp": 1793049180000
  },
  {
    "id": "sale-1793139759860",
    "dateString": "Tue Oct 27 2026 19:22:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Allyson",
    "produto": "FG 4 Risk, Pres craq",
    "preco": "720",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "275",
    "timestamp": 1793139720000
  },
  {
    "id": "sale-1793190836836",
    "dateString": "Wed Oct 28 2026 09:33:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "redonda, fogão 2 bocas, mesa",
    "preco": "580",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-30",
    "lucro": "244",
    "timestamp": 1793190780000
  },
  {
    "id": "sale-1793190886269",
    "dateString": "Wed Oct 28 2026 09:34:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "carrinho",
    "preco": "380",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "85",
    "timestamp": 1793190840000
  },
  {
    "id": "sale-1793198016066",
    "dateString": "Wed Oct 28 2026 11:33:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Jeremias",
    "produto": "Fogão 6 Bocas Roa, Chapa 40x60",
    "preco": "1150",
    "cliente": "Gabriela Yuri da Cruz",
    "contato": "11943517918",
    "endereco": "Rua Orlando Tasca, 277 - Vila Falchi, Mauá - SP",
    "frete": "120",
    "pagamento": "Pix",
    "observacao": "Comércio",
    "comissao": "65",
    "lucro": "1085",
    "timestamp": 1793197980000
  },
  {
    "id": "sale-1793218468598",
    "dateString": "Wed Oct 28 2026 17:14:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Jeremias",
    "produto": "Fogão 6 Bocas Risk, Chapa 40x60",
    "preco": "1150",
    "cliente": "Gabriela Yuri da Cruz",
    "contato": "11943517918",
    "endereco": "Rua Orlando Tasca, 277 - Vila Falchi, Mauá - SP",
    "frete": "120",
    "pagamento": "Pix",
    "observacao": "Condomínio",
    "comissao": "75",
    "lucro": "1075",
    "timestamp": 1793218440000
  },
  {
    "id": "sale-1793309378113",
    "dateString": "Thu Oct 29 2026 18:29:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Junior",
    "produto": "estufa 6, redonda 7, escorredor, 2 Cubas 14",
    "preco": "1218",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "158",
    "lucro": "235",
    "timestamp": 1793309340000
  },
  {
    "id": "sale-1793309694878",
    "dateString": "Thu Oct 29 2026 18:34:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "mesa, 4 bcs, fogão 2 Risk",
    "preco": "1080",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "969",
    "timestamp": 1793309640000
  },
  {
    "id": "sale-1793309742338",
    "dateString": "Thu Oct 29 2026 18:35:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "mesa, 4 bcs, fogão 2 Risk",
    "preco": "1080",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "30",
    "lucro": "969",
    "timestamp": 1793309700000
  },
  {
    "id": "sale-1793309804195",
    "dateString": "Thu Oct 29 2026 18:36:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "jogo de panelas, fogão 6",
    "preco": "940",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-20",
    "lucro": "445",
    "timestamp": 1793309760000
  },
  {
    "id": "sale-1793309852191",
    "dateString": "Thu Oct 29 2026 18:37:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "jogo de panelas, fogão 6",
    "preco": "940",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "-20",
    "lucro": "445",
    "timestamp": 1793309820000
  },
  {
    "id": "sale-1793310560500",
    "dateString": "Thu Oct 29 2026 18:49:00 GMT-0300 (Horário Padrão de Brasília)",
    "vendedor": "Alexandre",
    "produto": "fogão 4",
    "preco": "550",
    "cliente": "Não informado",
    "contato": "Não informado",
    "endereco": "Não informado",
    "frete": "Não informado",
    "pagamento": "Não informado",
    "observacao": "Nenhuma",
    "comissao": "0",
    "lucro": "135",
    "timestamp": 1793310540000
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
  tabBtnCalculadora: document.getElementById('tabBtnCalculadora'),
  tabBtnConfig: document.getElementById('tabBtnConfig'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  // Calculadora
  calcModeSelect: document.getElementById('calcModeSelect'),
  calcBrandSelect: document.getElementById('calcBrandSelect'),
  calcValueInput: document.getElementById('calcValueInput'),
  calcTableBody: document.getElementById('calcTableBody'),
  btnShareCalcPrint: document.getElementById('btnShareCalcPrint'),
  calcCaptureArea: document.getElementById('calcCaptureArea'),
  
  // Vendas Sub-nav
  subnavFormBtn: document.getElementById('subnavFormBtn'),
  subnavListBtn: document.getElementById('subnavListBtn'),
  salesFormSection: document.getElementById('salesFormSection'),
  salesHistorySection: document.getElementById('salesHistorySection'),
  salesCounter: document.getElementById('salesCounter'),
  
  // Sales Form Inputs
  salesForm: document.getElementById('salesForm'),
  inputVendedor: document.getElementById('inputVendedor'),
  inputFilial: document.getElementById('inputFilial'),
  btnFilialGuarulhos: document.getElementById('btnFilialGuarulhos'),
  btnFilialItaquera: document.getElementById('btnFilialItaquera'),
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
  prodStock: document.getElementById('prodStock'),
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
  btnSyncQuickHistory: document.getElementById('btnSyncQuickHistory'),
  syncHistoryIcon: document.getElementById('syncHistoryIcon'),
  syncHistoryBtnText: document.getElementById('syncHistoryBtnText'),

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
    initAllProductAutocompletes();
    renderProductsList();
    renderSalesHistory();
    if (window.recalculateSimulator) window.recalculateSimulator();
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
function parseSaleDateToTimestamp(item) {
  if (!item) return 0;
  if (item.timestamp && typeof item.timestamp === 'number' && !isNaN(item.timestamp) && item.timestamp > 0) {
    return item.timestamp;
  }
  if (item.timestamp) {
    const parsed = Number(item.timestamp);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  
  const rawDate = String(item.dateString || item.data_entrega || '').trim();
  if (rawDate) {
    // Caso seja formato brasileiro DD/MM/AAAA ou DD/MM/AAAA HH:mm:ss
    const brMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      let year = parseInt(brMatch[3], 10);
      if (year < 100) year += 2000;
      const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
      const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
      const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // Caso seja formato ISO YYYY-MM-DD ou Date string padrão
    const isoParsed = Date.parse(rawDate);
    if (!isNaN(isoParsed) && isoParsed > 0) {
      return isoParsed;
    }
  }
  return 0;
}

function sortSalesDescending(salesList) {
  if (!Array.isArray(salesList)) return [];
  return salesList.slice().sort((a, b) => parseSaleDateToTimestamp(b) - parseSaleDateToTimestamp(a));
}

function loadDataFromStorage() {
  try {
    const savedSales = localStorage.getItem(STORAGE_KEYS.SALES);
    const parsedSales = savedSales ? JSON.parse(savedSales) : INITIAL_SALES;
    appState.sales = sortSalesDescending(parsedSales);

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

  const list = (appState && Array.isArray(appState.products) && appState.products.length > 0) ? appState.products : INITIAL_PRODUCTS;

  // Correspondência EXATA por Nome Limpo (após o hífen), Nome original, Display ou SKU
  let matched = list.find(p => {
    const cleanName = getCleanProductName(p).toLowerCase();
    const pName = (p.name || '').trim().toLowerCase();
    const pSku = (p.sku || '').trim().toLowerCase();
    const displayVal = pSku ? `${pSku} - ${pName}` : pName;
    return val === cleanName || val === pName || val === displayVal || (pSku && val === pSku);
  });
  if (matched) return matched;

  // Correspondência exata sem acentos/pontuação
  const valNorm = normalizeText(val);
  matched = list.find(p => {
    const cleanNorm = normalizeText(getCleanProductName(p));
    const pNameNorm = normalizeText(p.name);
    const pSkuNorm = normalizeText(p.sku);
    const displayNorm = pSkuNorm ? `${pSkuNorm} - ${pNameNorm}` : pNameNorm;
    return valNorm === cleanNorm || valNorm === pNameNorm || valNorm === displayNorm || (pSkuNorm && valNorm === pSkuNorm);
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

window.updateProductRowButtons = function() {
  const container = document.getElementById('productsContainer');
  if (!container) return;
  const entries = container.querySelectorAll('.product-entry');
  
  if (entries.length <= 1) {
    // Se tiver apenas 1 produto, garante que mostre o botão de adicionar (+)
    entries.forEach(entry => {
      const wrapper = entry.querySelector('.input-wrapper');
      if (wrapper) {
        let actionBtn = wrapper.querySelector('.btn-add-product, .btn-remove-product');
        if (!actionBtn) {
          actionBtn = document.createElement('button');
          wrapper.appendChild(actionBtn);
        }
        actionBtn.type = 'button';
        actionBtn.className = 'btn-add-product';
        actionBtn.id = 'btnAddProductRow';
        actionBtn.title = 'Adicionar mais um produto';
        actionBtn.onclick = function() { window.addEmptyProductRow(); };
        actionBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        `;
      }
    });
  } else {
    // Se tiver mais de 1 produto:
    // Apenas a última linha (ou primeira) tem botão de adicionar? Normalmente cada linha intermediária tem remover (-), e pode-se permitir remover qualquer uma ou adicionar na primeira/última.
    // Melhor padrão: todas as linhas têm o botão vermelho de remover (-), exceto a última ou primeira que também permite adicionar.
    // O mais intuitivo: a primeira linha tem o botão de adicionar (+), e as linhas subsequentes têm o botão de remover (-). Ou se preferir, a última tem (+) e as outras têm (-).
    // Conforme pedido: "Se tiver apenas um produto não deixe aparecer o botão de remover produto, mas sim o de adicionar o produto."
    // Portanto: quando houver múltiplos produtos, a primeira linha tem botão de adicionar (+), e todas as demais têm o botão de remover (-).
    entries.forEach((entry, idx) => {
      const wrapper = entry.querySelector('.input-wrapper');
      if (wrapper) {
        let actionBtn = wrapper.querySelector('.btn-add-product, .btn-remove-product');
        if (!actionBtn) {
          actionBtn = document.createElement('button');
          wrapper.appendChild(actionBtn);
        }
        actionBtn.type = 'button';
        if (idx === 0) {
          actionBtn.className = 'btn-add-product';
          actionBtn.id = 'btnAddProductRow';
          actionBtn.title = 'Adicionar mais um produto';
          actionBtn.onclick = function() { window.addEmptyProductRow(); };
          actionBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `;
        } else {
          actionBtn.className = 'btn-remove-product';
          actionBtn.removeAttribute('id');
          actionBtn.title = 'Remover este produto';
          actionBtn.onclick = function() { window.removeProductRow(actionBtn); };
          actionBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `;
        }
      }
    });
  }
};

window.addEmptyProductRow = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (window._isAddingProductRow) return;
  window._isAddingProductRow = true;
  setTimeout(() => { window._isAddingProductRow = false; }, 350);
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
        <div class="product-autocomplete-wrapper">
          <input type="text" id="inputProduto_${index}" name="produto" class="form-input input-produto" placeholder="Ex: Fritadeira, Fogão..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required>
          <button type="button" class="btn-product-dropdown-toggle" tabindex="-1" title="Abrir lista de produtos">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <ul class="product-suggestions-dropdown" style="display: none;"></ul>
        </div>
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
  setupProductAutocomplete(inputProduto);
  
  const inputPreco = newRow.querySelector('.input-preco');
  inputPreco.addEventListener('input', onSellingPriceInputChange);
  
  window.updateProductRowButtons();
  SoundEffects.playPop();
};

window.removeProductRow = function(button) {
  const row = button.closest('.product-entry');
  if (row) {
    row.remove();
  }
  window.updateProductRowButtons();
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
    DOM.rowDocumento.style.display = 'grid';
  }
  if (window.setFilial) {
    window.setFilial('Guarulhos');
  } else if (DOM.inputFilial) {
    DOM.inputFilial.value = 'Guarulhos';
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
    if (firstProd) {
      firstProd.value = '';
      setupProductAutocomplete(firstProd);
    }
    if (firstPreco) firstPreco.value = '';
    if (window.updateProductRowButtons) window.updateProductRowButtons();
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
    filial: DOM.inputFilial ? DOM.inputFilial.value.trim() || 'Guarulhos' : 'Guarulhos',
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
    enviarGarantia: Boolean(DOM.inputDocumento && DOM.inputDocumento.value.trim()),
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
    return parseSaleDateToTimestamp(b) - parseSaleDateToTimestamp(a);
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
        ${sale.filial ? `<span class="sale-tag" style="font-weight: 600; color: var(--primary);">🏢 ${escapeHtml(sale.filial)}</span>` : ''}
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
  if (window.setFilial) {
    window.setFilial(sale.filial || 'Guarulhos');
  }
  
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
    if (window.updateProductRowButtons) window.updateProductRowButtons();
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
  }
  if (DOM.rowDocumento) {
    DOM.rowDocumento.style.display = 'grid';
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
  
  // Rola até o topo do formulário tanto na janela quanto no container interno
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const appBody = document.getElementById('appBodyContent');
  if (appBody) {
    appBody.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (DOM.salesFormSection) {
    DOM.salesFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

  // Se a venda tem garantia ativada ou possui CPF/CNPJ cadastrado
  if (dataToUse.enviarGarantia || (dataToUse.documento && dataToUse.documento !== 'Não informado')) {
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
  
  // Formatar data da compra rigorosamente no formato dd/mm/aaaa
  let dataVenda = '';
  if (saleData.timestamp) {
    const d = new Date(saleData.timestamp);
    if (!isNaN(d.getTime())) {
      dataVenda = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  }
  if (!dataVenda && saleData.dateString) {
    const raw = String(saleData.dateString).trim();
    const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (brMatch) {
      const d = brMatch[1].padStart(2, '0');
      const m = brMatch[2].padStart(2, '0');
      let y = brMatch[3];
      if (y.length === 2) y = '20' + y;
      dataVenda = `${d}/${m}/${y}`;
    } else {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        dataVenda = `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
      }
    }
  }
  if (!dataVenda) {
    const now = new Date();
    dataVenda = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }

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
    const brMatch = String(saleData.dateString).trim().match(/^(\d{1,2})\/(\d{1,2})/);
    if (brMatch) {
      ddmm = `${brMatch[1].padStart(2, '0')}-${brMatch[2].padStart(2, '0')}`;
    }
  }
  if (!ddmm) {
    const d = new Date();
    ddmm = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Nome do cliente limpo para o nome do arquivo (ex: "Ronaldo")
  let clienteNome = (saleData.cliente && saleData.cliente !== 'Não informado') ? String(saleData.cliente).trim() : 'Cliente';
  clienteNome = clienteNome.replace(/[/\\?%*:|"<>]/g, '').trim();

  // Código aleatório de 3 caracteres alfanuméricos em minúsculas (ex: "1hm", "jd5")
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let rand3 = '';
  for (let i = 0; i < 3; i++) {
    rand3 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Nome do arquivo solicitado: "Garantia JBC ELETRO Ronaldo 20-10 jd5.pdf"
  const filename = `Garantia JBC ELETRO ${clienteNome} ${ddmm} ${rand3}.pdf`;

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

// Ao enviar pelo botão do WhatsApp (envia os dados e em seguida o PDF caso a garantia esteja marcada/preenchida)
async function handleSendWhatsappDirectWithGarantia() {
  const saleData = currentGarantiaSaleData || (appState.sales.length > 0 ? appState.sales[0] : null);
  const temGarantia = saleData && (saleData.enviarGarantia || (saleData.documento && saleData.documento !== 'Não informado'));

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
    currentGarantiaSaleData = sale;
    shareGarantiaOnWhatsapp();
  }
};

// ============================================================================
// PRODUCTS MANAGEMENT
// ============================================================================
function renderProductsDatalist() {
  DOM.produtosDatalist.innerHTML = appState.products
    .map(p => {
      const displayVal = getCleanProductName(p);
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

  DOM.productsListGrid.innerHTML = filteredProds.map(p => {
    const skuDisplay = p.sku ? `<span class="product-sku-tag">[${escapeHtml(p.sku)}]</span> ` : '';
    const priceNum = String(p.price).replace('R$ ', '');
    const costNum = p.cost ? String(p.cost).replace('R$ ', '') : '';

    return `
    <div class="product-item-card" data-prod-id="${p.id}">
      <div class="product-info">
        <h5>${skuDisplay}${escapeHtml(p.name)}</h5>
        <div class="product-meta-row" style="white-space: nowrap; overflow-x: auto;">
          <span class="prod-price-text">Preço: R$ ${escapeHtml(priceNum)}</span>
          ${costNum ? `<span class="prod-cost-text">Custo: R$ ${escapeHtml(costNum)}</span>` : ''}
          <span class="prod-stock-text">Unid ${escapeHtml(String((p.stock !== undefined && p.stock !== null && String(p.stock).trim() !== '') ? p.stock : (p.estoque !== undefined ? p.estoque : '0')))}</span>
        </div>
      </div>
      <div class="product-actions">
        <button type="button" class="btn-icon-action whatsapp-action" title="Compartilhar / Enviar no WhatsApp" onclick="window.onShareProductWhatsapp('${p.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
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
  `;
  }).join('');
}

window.onShareProductWhatsapp = function(prodId) {
  const prod = appState.products.find(p => p.id === prodId);
  if (!prod) return;

  const priceClean = String(prod.price).replace('R$ ', '');
  const skuText = prod.sku ? `[${prod.sku}] ` : '';
  const text = `📦 *${skuText}${prod.name}*\n💰 *Preço:* R$ ${priceClean}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
  SoundEffects.playPop();
};

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
  if (DOM.prodStock) DOM.prodStock.value = (prod.stock !== undefined && prod.stock !== null) ? prod.stock : '';
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
  const stock = DOM.prodStock ? DOM.prodStock.value.trim() : '';
  const category = DOM.prodCategory.value.trim();

  if (!name || !price || !basePrice) {
    showToast('Nome, Preço de Venda e Preço Base são obrigatórios.', 'error');
    return;
  }

  if (id) {
    const index = appState.products.findIndex(p => p.id === id);
    if (index !== -1) {
      appState.products[index] = { ...appState.products[index], name, price, cost, basePrice, stock, category };
      showToast('Produto atualizado com sucesso!', 'success');
    }
  } else {
    const newProd = {
      id: 'prod-' + Date.now(),
      name,
      price,
      cost,
      basePrice,
      stock,
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
// CALCULADORA DE TAXAS DE CARTÃO (SIMULADOR DE PARCELAMENTO)
// ============================================================================
// Fatores de acréscimo deduzidos das simulações da maquininha:
const TAXAS_MAQUININHA = {
  // REPASSAR: Multiplica pelo fator da maquininha para repassar os custos ao cliente
  REPASSAR: {
    MASTER_VISA: {
      DEBITO: 1.02637,
      1: 1.0401,
      2: 1.1093,
      3: 1.1266,
      4: 1.1440,
      5: 1.1617,
      6: 1.1795,
      7: 1.1976,
      8: 1.2159,
      9: 1.2344,
      10: 1.2529,
      11: 1.2717,
      12: 1.2908
    },
    ELO_AMEX: {
      DEBITO: 1.02637,
      1: 1.0531,
      2: 1.1267,
      3: 1.1445,
      4: 1.1625,
      5: 1.1807,
      6: 1.1991,
      7: 1.2178,
      8: 1.2368,
      9: 1.2559,
      10: 1.2751,
      11: 1.2945,
      12: 1.3139
    }
  },
  // ASSUMIR: O cliente paga o valor líquido e o lojista recebe descontado
  ASSUMIR: {
    MASTER_VISA: {
      DEBITO: 1.02637,
      1: 1.0401,
      2: 1.1093,
      3: 1.1266,
      4: 1.1440,
      5: 1.1617,
      6: 1.1795,
      7: 1.1976,
      8: 1.2159,
      9: 1.2344,
      10: 1.2529,
      11: 1.2717,
      12: 1.2908
    },
    ELO_AMEX: {
      DEBITO: 1.02637,
      1: 1.0531,
      2: 1.1267,
      3: 1.1445,
      4: 1.1625,
      5: 1.1807,
      6: 1.1991,
      7: 1.2178,
      8: 1.2368,
      9: 1.2559,
      10: 1.2751,
      11: 1.2945,
      12: 1.3139
    }
  }
};

window.recalculateSimulator = function() {
  if (!DOM.calcTableBody) return;

  const mode = DOM.calcModeSelect ? DOM.calcModeSelect.value : 'REPASSAR';
  const brand = DOM.calcBrandSelect ? DOM.calcBrandSelect.value : 'ELO_AMEX';
  const valorBase = parsePriceNumber(DOM.calcValueInput ? DOM.calcValueInput.value : '750,00');

  const tabelaTaxas = (TAXAS_MAQUININHA[mode] && TAXAS_MAQUININHA[mode][brand]) ? TAXAS_MAQUININHA[mode][brand] : TAXAS_MAQUININHA.REPASSAR.ELO_AMEX;

  const linhas = [
    { label: 'DÉBITO', parcelas: 1, fator: tabelaTaxas.DEBITO },
    { label: 'CRÉDITO 1X', parcelas: 1, fator: tabelaTaxas[1] },
    { label: 'PARCELADO 2X', parcelas: 2, fator: tabelaTaxas[2] },
    { label: 'PARCELADO 3X', parcelas: 3, fator: tabelaTaxas[3] },
    { label: 'PARCELADO 4X', parcelas: 4, fator: tabelaTaxas[4] },
    { label: 'PARCELADO 5X', parcelas: 5, fator: tabelaTaxas[5] },
    { label: 'PARCELADO 6X', parcelas: 6, fator: tabelaTaxas[6] },
    { label: 'PARCELADO 7X', parcelas: 7, fator: tabelaTaxas[7] },
    { label: 'PARCELADO 8X', parcelas: 8, fator: tabelaTaxas[8] },
    { label: 'PARCELADO 9X', parcelas: 9, fator: tabelaTaxas[9] },
    { label: 'PARCELADO 10X', parcelas: 10, fator: tabelaTaxas[10] },
    { label: 'PARCELADO 11X', parcelas: 11, fator: tabelaTaxas[11] },
    { label: 'PARCELADO 12X', parcelas: 12, fator: tabelaTaxas[12] }
  ];

  DOM.calcTableBody.innerHTML = linhas.map(l => {
    let totalCobrar = 0;
    let valorParcela = 0;

    if (mode === 'REPASSAR') {
      totalCobrar = valorBase * l.fator;
      valorParcela = totalCobrar / l.parcelas;
    } else {
      // ASSUMIR: O cliente paga o valor nominal (valorBase), e a parcela é valorBase / l.parcelas
      // (O valor líquido recebido pelo vendedor seria valorBase / l.fator)
      totalCobrar = valorBase;
      valorParcela = totalCobrar / l.parcelas;
    }

    return `
      <tr>
        <td class="col-parcelamento">${l.label}</td>
        <td class="col-total">R$ ${formatBRL(totalCobrar)}</td>
        <td class="col-parcela">R$ ${formatBRL(valorParcela)}</td>
      </tr>
    `;
  }).join('');
};

window.shareCalculatorPrintJpeg = async function() {
  if (!DOM.calcCaptureArea) return;
  if (typeof html2canvas === 'undefined') {
    showToast('Biblioteca html2canvas não disponível no momento.', 'error');
    return;
  }

  showToast('📸 Gerando imagem da simulação...', 'info');

  try {
    const canvas = await html2canvas(DOM.calcCaptureArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast('Erro ao processar imagem.', 'error');
        return;
      }

      const mode = DOM.calcModeSelect ? DOM.calcModeSelect.value : 'REPASSAR';
      const brand = DOM.calcBrandSelect && DOM.calcBrandSelect.value === 'ELO_AMEX' ? 'Elo & Amex' : 'Master & Visa';
      const valorBase = DOM.calcValueInput ? DOM.calcValueInput.value : '0,00';
      const fileName = `simulacao_${mode.toLowerCase()}_${valorBase.replace(/\D/g, '')}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Se o navegador suporta Web Share API com arquivos (mobile Chrome/Safari)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Simulação de Cartão - R$ ${valorBase}`,
            text: `Simulação de Parcelamento (${mode} - ${brand}) no valor de R$ ${valorBase}:`,
            files: [file]
          });
          showToast('Compartilhado com sucesso!', 'success');
          return;
        } catch (err) {
          console.log('Compartilhamento cancelado ou não suportado:', err);
        }
      }

      // Fallback: Baixa a imagem JPEG e abre o WhatsApp com o texto da simulação
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const msg = `📊 *Simulação de Parcelamento*\n💰 *Valor:* R$ ${valorBase}\n💳 *Opção:* ${mode} (${brand})\n\n(A imagem da simulação completa foi baixada no seu aparelho)`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      showToast('Imagem JPEG salva! Anexe-a na conversa do WhatsApp.', 'success');
    }, 'image/jpeg', 0.95);

  } catch (error) {
    console.error('Erro ao gerar print:', error);
    showToast('Não foi possível gerar a imagem da simulação.', 'error');
  }
};

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
  const firstInput = document.getElementById('inputProduto_0');
  if (firstInput) setupProductAutocomplete(firstInput);
  SoundEffects.playPop();
}

function showSalesHistory() {
  DOM.subnavFormBtn.classList.remove('active');
  DOM.subnavListBtn.classList.add('active');
  DOM.salesFormSection.style.display = 'none';
  DOM.salesHistorySection.style.display = 'block';
  renderSalesHistory();
  // Auto sync on history tab click
  if (appState.config.googleSheetUrl && appState.config.autoSyncSheet) {
    const lastSync = window._lastSheetAutoFetch || 0;
    if (Date.now() - lastSync > 30000) {
      window._lastSheetAutoFetch = Date.now();
      fetchDataFromGoogleSheets(true);
    }
  }
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
  if (DOM.tabBtnCalculadora) DOM.tabBtnCalculadora.addEventListener('click', () => switchTab('tab-calculadora'));
  DOM.tabBtnConfig.addEventListener('click', () => switchTab('tab-configuracoes'));

  // Vendas Sub-nav
  DOM.subnavFormBtn.addEventListener('click', showSalesForm);
  DOM.subnavListBtn.addEventListener('click', showSalesHistory);

  // Sales Form Events
  DOM.salesForm.addEventListener('submit', handleSalesFormSubmit);
  DOM.btnClearForm.addEventListener('click', clearSalesForm);
  
  const btnAddProductRow = document.getElementById('btnAddProductRow');
  if (btnAddProductRow) {
    btnAddProductRow.onclick = function(e) { window.addEmptyProductRow(e); };
  }

  const firstProdInput = document.getElementById('inputProduto_0');
  if (firstProdInput) {
    firstProdInput.addEventListener('input', onProductInputChange);
    firstProdInput.addEventListener('change', onProductInputChange);
    setupProductAutocomplete(firstProdInput);
  }
  
  const firstPrecoInput = document.getElementById('inputPreco_0');
  if (firstPrecoInput) {
    firstPrecoInput.addEventListener('input', onSellingPriceInputChange);
  }

  if (DOM.btnCalcComissao) DOM.btnCalcComissao.addEventListener('click', resetToProductRules);
  if (DOM.btnCalcLucro) DOM.btnCalcLucro.addEventListener('click', resetToProductRules);

  // Checkbox Enviar Garantia
  if (DOM.checkEnviarGarantia) {
    DOM.checkEnviarGarantia.addEventListener('change', (e) => {
      if (e.target.checked && DOM.inputDocumento && !DOM.inputDocumento.value) {
        DOM.inputDocumento.focus();
      }
      SoundEffects.playPop();
    });
  }

  // Máscara dinâmica CPF / CNPJ
  if (DOM.inputDocumento) {
    DOM.inputDocumento.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length <= 11) {
        // CPF: 000.000.000-00
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
        // CNPJ: 00.000.000/0000-00
        v = v.substring(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
      }
      e.target.value = v;
    });
  }

  // Toggle de Unidade/Filial (Guarulhos / Itaquera) - Exclusivo
  window.setFilial = function(filialName) {
    if (DOM.inputFilial) DOM.inputFilial.value = filialName;
    if (DOM.btnFilialGuarulhos) {
      DOM.btnFilialGuarulhos.classList.toggle('active', filialName === 'Guarulhos');
    }
    if (DOM.btnFilialItaquera) {
      DOM.btnFilialItaquera.classList.toggle('active', filialName === 'Itaquera');
    }
    SoundEffects.playPop();
  };

  if (DOM.btnFilialGuarulhos) {
    DOM.btnFilialGuarulhos.addEventListener('click', () => window.setFilial('Guarulhos'));
  }
  if (DOM.btnFilialItaquera) {
    DOM.btnFilialItaquera.addEventListener('click', () => window.setFilial('Itaquera'));
  }

  // Calculadora Events
  if (DOM.calcModeSelect) {
    DOM.calcModeSelect.addEventListener('change', () => {
      window.recalculateSimulator();
      SoundEffects.playPop();
    });
  }
  if (DOM.calcBrandSelect) {
    DOM.calcBrandSelect.addEventListener('change', () => {
      window.recalculateSimulator();
      SoundEffects.playPop();
    });
  }
  if (DOM.btnShareCalcPrint) {
    DOM.btnShareCalcPrint.addEventListener('click', window.shareCalculatorPrintJpeg);
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
  if (DOM.btnSyncQuickHistory) DOM.btnSyncQuickHistory.addEventListener('click', () => triggerQuickHistorySync());

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
  if (DOM.tabBtnCalculadora) DOM.tabBtnCalculadora.classList.toggle('active', tabId === 'tab-calculadora');
  if (DOM.tabBtnConfig) DOM.tabBtnConfig.classList.toggle('active', tabId === 'tab-configuracoes');

  // Update panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tab-produtos') {
    renderProductsList();
  } else if (tabId === 'tab-calculadora') {
    if (window.recalculateSimulator) window.recalculateSimulator();
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


async function triggerQuickHistorySync() {
  if (DOM.btnSyncQuickHistory) DOM.btnSyncQuickHistory.classList.add('syncing');
  if (DOM.syncHistoryBtnText) DOM.syncHistoryBtnText.textContent = 'Buscando...';
  try {
    await fetchDataFromGoogleSheets(false);
  } finally {
    if (DOM.btnSyncQuickHistory) DOM.btnSyncQuickHistory.classList.remove('syncing');
    if (DOM.syncHistoryBtnText) DOM.syncHistoryBtnText.textContent = 'Atualizar';
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
        appState.sales = sortSalesDescending(data.sales);
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

// Fechar dropdowns de autocomplete ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.product-autocomplete-wrapper')) {
    document.querySelectorAll('.product-suggestions-dropdown').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.product-autocomplete-wrapper').forEach(w => w.classList.remove('is-open'));
    document.querySelectorAll('.product-entry').forEach(pe => pe.classList.remove('has-open-dropdown'));
  }
});
