/* SUPERDOC ENHANCED CLIENT EDITOR SCRIPT FOR D+SAÚDE TEMPLATES */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 [CLIENT] Editor de Templates SuperDoc inicializado.');

  // CORE DOM ELEMENTS & VIEWS
  const templatesDashboardView = document.getElementById('templatesDashboardView');
  const templateEditorView = document.getElementById('templateEditorView');
  const btnBackToDashboard = document.getElementById('btnBackToDashboard');
  const btnDashboardNew = document.getElementById('btnDashboardNew');
  const btnDashboardImport = document.getElementById('btnDashboardImport');
  const dashboardSearchInput = document.getElementById('dashboardSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const btnRefreshGrid = document.getElementById('btnRefreshGrid');
  const templatesGrid = document.getElementById('templatesGrid');
  const templatesEmptyState = document.getElementById('templatesEmptyState');
  const btnEmptyStateNew = document.getElementById('btnEmptyStateNew');
  const statTotalTemplates = document.getElementById('statTotalTemplates');
  const statBuiltinTemplates = document.getElementById('statBuiltinTemplates');
  const statCustomTemplates = document.getElementById('statCustomTemplates');

  const templateTitleInput = document.getElementById('templateTitleInput');
  const saveStatus = document.getElementById('saveStatus');
  const btnNewTemplate = document.getElementById('btnNewTemplate');
  const btnImportFile = document.getElementById('btnImportFile');
  const btnOpenTemplates = document.getElementById('btnOpenTemplates');
  const btnSaveTemplate = document.getElementById('btnSaveTemplate');
  const btnTestGenerate = document.getElementById('btnTestGenerate');
  const savedTemplatesList = document.getElementById('savedTemplatesList');

  // CANVAS & EDITORS
  const paperPage = document.getElementById('paperPage');
  const headerSection = document.getElementById('headerSection');
  const footerSection = document.getElementById('footerSection');
  const headerEditor = document.getElementById('headerEditor');
  const bodyEditor = document.getElementById('bodyEditor');
  const footerEditor = document.getElementById('footerEditor');
  const bodySection = document.querySelector('.paper-body-section');

  // SIDEBAR & VARIABLES
  const customVarName = document.getElementById('customVarName');
  const btnAddCustomVar = document.getElementById('btnAddCustomVar');
  const detectedCount = document.getElementById('detectedCount');
  const detectedVarsList = document.getElementById('detectedVarsList');

  // PAGE SETUP CONTROLS
  const btnToggleOrientation = document.getElementById('btnToggleOrientation');
  const orientationIcon = document.getElementById('orientationIcon');
  const orientationText = document.getElementById('orientationText');
  const marginsSelect = document.getElementById('marginsSelect');
  const lineSpacingSelect = document.getElementById('lineSpacingSelect');
  const headingSelect = document.getElementById('headingSelect');
  const calloutSelect = document.getElementById('calloutSelect');
  const listTypeSelect = document.getElementById('listTypeSelect');
  const btnRemoveList = document.getElementById('btnRemoveList');

  // BACKGROUND CONTROL ELEMENTS
  const bgSizeSelect = document.getElementById('bgSizeSelect');
  const bgOpacityRange = document.getElementById('bgOpacityRange');
  const bgOpacityVal = document.getElementById('bgOpacityVal');
  const bgPaddingTopInput = document.getElementById('bgPaddingTopInput');
  const bgMarginTopInput = document.getElementById('bgMarginTopInput');
  const bgMarginLeftInput = document.getElementById('bgMarginLeftInput');
  const bgMarginRightInput = document.getElementById('bgMarginRightInput');
  const btnUploadBgImage = document.getElementById('btnUploadBgImage');
  const bgFileInput = document.getElementById('bgFileInput');
  const btnRemoveBgImage = document.getElementById('btnRemoveBgImage');

  // HEADER & FOOTER IMAGE CONTROL & STYLING ELEMENTS
  const btnUploadHeaderImage = document.getElementById('btnUploadHeaderImage');
  const headerImageFileInput = document.getElementById('headerImageFileInput');
  const headerImageOptions = document.getElementById('headerImageOptions');
  const headerImageWidthInput = document.getElementById('headerImageWidthInput');
  const headerImageHeightInput = document.getElementById('headerImageHeightInput');
  const headerImageAlignSelect = document.getElementById('headerImageAlignSelect');
  const headerImageFitSelect = document.getElementById('headerImageFitSelect');
  const btnRemoveHeaderImage = document.getElementById('btnRemoveHeaderImage');

  const btnUploadFooterImage = document.getElementById('btnUploadFooterImage');
  const footerImageFileInput = document.getElementById('footerImageFileInput');
  const footerImageOptions = document.getElementById('footerImageOptions');
  const footerImageWidthInput = document.getElementById('footerImageWidthInput');
  const footerImageHeightInput = document.getElementById('footerImageHeightInput');
  const footerImageAlignSelect = document.getElementById('footerImageAlignSelect');
  const footerImageFitSelect = document.getElementById('footerImageFitSelect');
  const btnRemoveFooterImage = document.getElementById('btnRemoveFooterImage');
  const showPageNumbersInput = document.getElementById('showPageNumbersInput');

  // FLOATING AUTOCOMPLETE
  const autocompletePopup = document.getElementById('autocompletePopup');
  const autocompleteList = document.getElementById('autocompleteList');

  // IMPORT MODAL
  const importModal = document.getElementById('importModal');
  const btnCloseImportModal = document.getElementById('btnCloseImportModal');
  const dropzone = document.getElementById('dropzone');
  const importFileInput = document.getElementById('importFileInput');
  const btnSelectFile = document.getElementById('btnSelectFile');

  // TEST MODAL
  const testModal = document.getElementById('testModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const testVariablesForm = document.getElementById('testVariablesForm');
  const previewFrameContainer = document.getElementById('previewFrameContainer');
  const btnRefreshPreview = document.getElementById('btnRefreshPreview');
  const btnDownloadPdf = document.getElementById('btnDownloadPdf');

  // STATE VARIABLES
  let currentTemplateId = null;
  let isDirty = false;
  let lastSavedRange = null;
  let activeEditor = bodyEditor;
  let currentOrientation = 'portrait';
  let currentBgUrl = '';
  let currentHeaderImageUrl = '';
  let currentFooterImageUrl = '';
  let paginationTimer = null;

  // DASHBOARD STATE
  let allTemplatesCache = [];
  let currentFilter = 'all';
  let searchQuery = '';

  // TEMPLATE DATA SERVICE (ABSTRACTED FOR EASY SUPABASE SWAP IN FUTURE)
  const TemplateService = {
    async fetchAll() {
      const response = await fetch('/api/templates');
      const resData = await response.json();
      if (!response.ok || !resData.sucesso) throw new Error(resData.erro || 'Falha ao buscar templates');
      return resData.dados || [];
    },

    async fetchById(id) {
      const response = await fetch(`/api/templates/${id}`);
      const resData = await response.json();
      if (!response.ok || !resData.sucesso) throw new Error(resData.erro || 'Falha ao buscar detalhes do template');
      return resData.dados;
    },

    async save(payload, id = null) {
      const endpoint = id ? `/api/templates/${id}` : '/api/templates';
      const method = id ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();
      if (!response.ok || !resData.sucesso) throw new Error(resData.erro || 'Falha ao salvar template');
      return resData.dados;
    },

    async delete(id) {
      const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const resData = await response.json();
      if (!response.ok || !resData.sucesso) throw new Error(resData.erro || 'Falha ao excluir template');
      return resData;
    }
  };

  const CATEGORIZED_VARS = {
    colaborador: ['nome_colaborador', 'cpf', 'rg', 'cargo', 'setor', 'funcao'],
    empresa: ['empresa', 'razao_social', 'cnpj', 'endereco_sede', 'nomeEmpresa', 'cnpjEmpresa', 'enderecoEmpresa', 'representanteLegal', 'cpfRepresentante'],
    medico: ['medico_examinador', 'crm', 'data_exame', 'tabelaExames'],
    financeiro: ['valor_total', 'forma_pagamento', 'data_atual_extenso', 'data_atual_curta', 'temPlano', 'empresasContratantes', 'itensPlano', 'empresasContratantesFiliais']
  };

  const SAMPLE_DEFAULTS = {
    nome_colaborador: 'João Silva',
    cpf: '000.000.000-00',
    empresa: 'Empresa X Ltda',
    nomeEmpresa: 'Empresa X Ltda',
    cnpjEmpresa: '00.000.000/0001-00',
    enderecoEmpresa: 'Rua das Flores, 123 - São Paulo/SP',
    representanteLegal: 'Carlos Eduardo',
    cpfRepresentante: '111.222.333-44',
    empresasContratantes: 'Empresa X e Coligadas',
    temPlano: 'Plano Ambulatorial Completo',
    itensPlano: 'Consultas, Exames admissionais, exames periódicos e segurança do trabalho',
    empresasContratantesFiliais: 'Matriz São Paulo / Filial Rio de Janeiro',
    data_exame: '25/08/2026',
    cargo: 'Operador de Produção',
    setor: 'Operacional',
    cnpj: '00.000.000/0001-00',
    razao_social: 'Empresa X Serviços S.A.',
    rg: '12.345.678-9',
    funcao: 'Operador',
    medico_examinador: 'Dr. Roberto Alves',
    crm: 'CRM/SP 123456',
    valor_total: 'R$ 1.500,00',
    forma_pagamento: 'Boleto Bancário 30 dias',
    data_atual_extenso: '25 de agosto de 2026',
    data_atual_curta: '25/08/2026'
  };

  // INITIALIZATION
  function init() {
    renderCategorizedVars();
    setupEventListeners();
    setupDashboardEventListeners();
    scanDetectedVariables();

    // Default to Dashboard View on load unless hash #editor is specified
    if (window.location.hash === '#editor') {
      showEditorView();
    } else {
      showDashboardView();
    }
  }

  // DASHBOARD VIEW SWITCHERS & CONTROLLERS
  function showDashboardView() {
    if (isDirty) {
      // Prompt if unsaved editor changes exist when switching back
      if (!confirm('Você possui alterações não salvas no editor. Deseja sair e voltar para a Home de Templates?')) {
        return;
      }
    }
    if (templatesDashboardView) templatesDashboardView.style.display = 'flex';
    if (templateEditorView) templateEditorView.style.display = 'none';
    window.location.hash = '';
    loadDashboardTemplates();
  }

  function showEditorView() {
    if (templatesDashboardView) templatesDashboardView.style.display = 'none';
    if (templateEditorView) templateEditorView.style.display = 'flex';
    window.location.hash = '#editor';
    scanDetectedVariables();
    updateCanvasPagination();
  }

  async function loadDashboardTemplates() {
    try {
      if (templatesGrid) templatesGrid.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando modelos...</div>';
      allTemplatesCache = await TemplateService.fetchAll();
      updateDashboardMetrics();
      applyDashboardFilters();
      loadSavedTemplatesList(); // Also sync sidebar templates tab list
    } catch (err) {
      console.error('[CLIENT] Erro ao carregar templates para dashboard:', err);
      if (templatesGrid) {
        templatesGrid.innerHTML = `<div class="empty-state-card"><div class="empty-icon"><i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i></div><h3>Erro ao carregar templates</h3><p>${err.message}</p></div>`;
      }
    }
  }

  function updateDashboardMetrics() {
    const total = allTemplatesCache.length;
    const builtin = allTemplatesCache.filter(t => t.type === 'builtin').length;
    const custom = total - builtin;

    if (statTotalTemplates) statTotalTemplates.innerText = total;
    if (statBuiltinTemplates) statBuiltinTemplates.innerText = builtin;
    if (statCustomTemplates) statCustomTemplates.innerText = custom;
  }

  function applyDashboardFilters() {
    let filtered = [...allTemplatesCache];

    if (currentFilter === 'builtin') {
      filtered = filtered.filter(t => t.type === 'builtin');
    } else if (currentFilter === 'custom') {
      filtered = filtered.filter(t => t.type !== 'builtin');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const nameMatch = (t.name || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const varsMatch = (t.variables || []).some(v => v.toLowerCase().includes(q));
        return nameMatch || descMatch || varsMatch;
      });
    }

    renderDashboardGrid(filtered);
  }

  function renderDashboardGrid(templates) {
    if (!templatesGrid) return;
    templatesGrid.innerHTML = '';

    if (templates.length === 0) {
      if (templatesEmptyState) templatesEmptyState.style.display = 'flex';
      return;
    }

    if (templatesEmptyState) templatesEmptyState.style.display = 'none';

    templates.forEach(tpl => {
      const isBuiltin = tpl.type === 'builtin';
      const card = document.createElement('div');
      card.className = 'template-home-card';
      const varsCount = tpl.variables ? tpl.variables.length : 0;

      card.innerHTML = `
        <div>
          <div class="card-top">
            <div class="card-icon-title">
              <div class="card-doc-icon">
                <i class="fa-solid ${isBuiltin ? 'fa-file-shield' : 'fa-file-pen'}"></i>
              </div>
              <div>
                <h3 class="card-title">${escapeHtml(tpl.name)}</h3>
              </div>
            </div>
            <span class="card-badge ${isBuiltin ? 'badge-builtin' : 'badge-custom'}">
              ${isBuiltin ? 'Padrão' : 'Personalizado'}
            </span>
          </div>

          <p class="card-desc">${escapeHtml(tpl.description || 'Sem descrição cadastrada.')}</p>

          <div class="card-meta">
            <span class="card-vars-tag">
              <i class="fa-solid fa-code"></i> ${varsCount} ${varsCount === 1 ? 'variável' : 'variáveis'}
            </span>
            <span><i class="fa-solid fa-file-lines"></i> A4 ${tpl.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-primary btn-edit-card" data-id="${tpl.id}" title="Editar Template">
            <i class="fa-solid fa-pen-to-square"></i> Editar
          </button>
          <button class="btn btn-accent btn-test-card" data-id="${tpl.id}" title="Testar & Gerar PDF">
            <i class="fa-solid fa-bolt"></i> Testar
          </button>
          <button class="btn btn-secondary btn-duplicate-card" data-id="${tpl.id}" title="Duplicar Template">
            <i class="fa-solid fa-copy"></i>
          </button>
          ${!isBuiltin ? `
          <button class="btn btn-card-danger btn-delete-card" data-id="${tpl.id}" title="Excluir Template">
            <i class="fa-solid fa-trash-can"></i>
          </button>` : ''}
        </div>
      `;

      // Event listeners for card buttons
      const btnEdit = card.querySelector('.btn-edit-card');
      if (btnEdit) btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        openTemplateInEditor(tpl.id);
      });

      const btnTest = card.querySelector('.btn-test-card');
      if (btnTest) btnTest.addEventListener('click', (e) => {
        e.stopPropagation();
        quickTestTemplate(tpl.id);
      });

      const btnDuplicate = card.querySelector('.btn-duplicate-card');
      if (btnDuplicate) btnDuplicate.addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateTemplate(tpl.id);
      });

      const btnDelete = card.querySelector('.btn-delete-card');
      if (btnDelete) btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteTemplate(tpl.id, tpl.name);
      });

      // Clicking card body opens editor
      card.addEventListener('click', () => {
        openTemplateInEditor(tpl.id);
      });

      templatesGrid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function openTemplateInEditor(id) {
    try {
      await loadTemplateById(id);
      showEditorView();
    } catch (err) {
      alert(`Erro ao abrir template: ${err.message}`);
    }
  }

  async function quickTestTemplate(id) {
    try {
      await loadTemplateById(id);
      showEditorView();
      openTestModal();
    } catch (err) {
      alert(`Erro ao abrir teste do template: ${err.message}`);
    }
  }

  async function duplicateTemplate(id) {
    try {
      const tpl = await TemplateService.fetchById(id);
      currentTemplateId = null; // Reset ID so it creates a new record on save
      templateTitleInput.value = `[Cópia] ${tpl.name}`;
      
      bodyEditor.innerHTML = tpl.html || '';
      if (tpl.headerHtml) {
        headerEditor.innerHTML = tpl.headerHtml;
        headerSection.style.display = 'block';
      }
      if (tpl.footerHtml) {
        footerEditor.innerHTML = tpl.footerHtml;
        footerSection.style.display = 'block';
      }

      currentHeaderImageUrl = tpl.headerImageUrl || '';
      currentFooterImageUrl = tpl.footerImageUrl || '';
      currentBgUrl = tpl.bgUrl || '';

      applyBackgroundStyles();
      scanDetectedVariables();
      updateCanvasPagination();
      markAsDirty();
      showEditorView();
    } catch (err) {
      alert(`Erro ao duplicar template: ${err.message}`);
    }
  }

  async function confirmDeleteTemplate(id, name) {
    if (!confirm(`Tem certeza que deseja excluir o template "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await TemplateService.delete(id);
      alert(`Template "${name}" excluído com sucesso!`);
      loadDashboardTemplates();
    } catch (err) {
      alert(`Erro ao excluir template: ${err.message}`);
    }
  }

  function setupDashboardEventListeners() {
    if (btnBackToDashboard) btnBackToDashboard.addEventListener('click', showDashboardView);
    if (btnDashboardNew) btnDashboardNew.addEventListener('click', () => {
      createNewTemplate();
      showEditorView();
    });
    if (btnDashboardImport) btnDashboardImport.addEventListener('click', openImportModal);
    if (btnEmptyStateNew) btnEmptyStateNew.addEventListener('click', () => {
      createNewTemplate();
      showEditorView();
    });

    if (dashboardSearchInput) {
      dashboardSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (btnClearSearch) btnClearSearch.style.display = searchQuery ? 'block' : 'none';
        applyDashboardFilters();
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (dashboardSearchInput) dashboardSearchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        applyDashboardFilters();
      });
    }

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-filter') || 'all';
        applyDashboardFilters();
      });
    });

    if (btnRefreshGrid) {
      btnRefreshGrid.addEventListener('click', () => {
        loadDashboardTemplates();
      });
    }
  }

  // DEBOUNCED CANVAS PAGINATION SCHEDULER
  function scheduleCanvasPagination(delayMs = 1500) {
    if (paginationTimer) clearTimeout(paginationTimer);
    paginationTimer = setTimeout(() => {
      updateCanvasPagination();
    }, delayMs);
  }

  // BACKGROUND STYLING APPLIER
  function applyBackgroundStyles() {
    console.log(`🖼️ [CLIENT] Aplicando estilos do plano de fundo sangrado. Url presente: ${currentBgUrl ? 'SIM' : 'NÃO'}`);
    
    const basePaddingTop = parseInt(bgPaddingTopInput ? bgPaddingTopInput.value : 130) || 130;
    const headerHeightPx = (currentHeaderImageUrl && headerImageHeightInput) ? (parseInt(headerImageHeightInput.value) || 100) : 0;
    const paddingTopVal = currentHeaderImageUrl ? Math.max(basePaddingTop, headerHeightPx + 15) : basePaddingTop;

    if (!currentBgUrl || paperPage.classList.contains('multi-page-view')) {
      paperPage.classList.remove('has-bg-template');
      paperPage.style.removeProperty('--bg-template-url');
      paperPage.style.removeProperty('--bg-template-size');
      paperPage.style.removeProperty('--bg-margin-top');
      paperPage.style.removeProperty('--bg-margin-side');
      if (bodySection) bodySection.style.paddingTop = `${paddingTopVal}px`;
      return;
    }

    const marginTopVal = `${bgMarginTopInput ? bgMarginTopInput.value : 0}px`;
    const marginLeftVal = `${bgMarginLeftInput ? bgMarginLeftInput.value : 0}px`;

    paperPage.classList.add('has-bg-template');
    paperPage.style.setProperty('--bg-template-url', `url("${currentBgUrl}")`);
    paperPage.style.setProperty('--bg-template-size', bgSizeSelect.value || '100% auto');
    paperPage.style.setProperty('--bg-margin-top', marginTopVal);
    paperPage.style.setProperty('--bg-margin-side', marginLeftVal);
    
    if (bodySection) {
      bodySection.style.paddingTop = `${paddingTopVal}px`;
    }

    markAsDirty();
  }

  function handleBgImageUpload(file) {
    if (!file) return;
    console.log(`📤 [CLIENT] Fazendo upload manual de imagem de fundo: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (e) => {
      currentBgUrl = e.target.result;
      applyBackgroundStyles();
      updateCanvasPagination();
      alert('Imagem de papel timbrado carregada com sucesso!');
    };
    reader.readAsDataURL(file);
  }

  function removeBgImage() {
    console.log('🗑️ [CLIENT] Removendo papel timbrado...');
    currentBgUrl = '';
    applyBackgroundStyles();
    updateCanvasPagination();
    alert('Papel timbrado removido.');
  }

  // HEADER & FOOTER IMAGE UPLOADING AND STYLING HANDLERS
  function handleHeaderImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentHeaderImageUrl = e.target.result;
      if (headerImageOptions) headerImageOptions.style.display = 'block';
      applyBackgroundStyles();
      updateCanvasPagination();
      markAsDirty();
      alert('Imagem de cabeçalho inserida com sucesso!');
    };
    reader.readAsDataURL(file);
  }

  function removeHeaderImage() {
    currentHeaderImageUrl = '';
    if (headerImageOptions) headerImageOptions.style.display = 'none';
    applyBackgroundStyles();
    updateCanvasPagination();
    markAsDirty();
  }

  function handleFooterImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentFooterImageUrl = e.target.result;
      if (footerImageOptions) footerImageOptions.style.display = 'block';
      updateCanvasPagination();
      markAsDirty();
      alert('Imagem de rodapé inserida com sucesso!');
    };
    reader.readAsDataURL(file);
  }

  function removeFooterImage() {
    currentFooterImageUrl = '';
    if (footerImageOptions) footerImageOptions.style.display = 'none';
    updateCanvasPagination();
    markAsDirty();
  }

  // RENDER CATEGORIZED SIDEBAR VARIABLES
  function renderCategorizedVars() {
    Object.keys(CATEGORIZED_VARS).forEach(cat => {
      const container = document.querySelector(`.vars-list[data-category="${cat}"]`);
      if (!container) return;

      container.innerHTML = '';
      CATEGORIZED_VARS[cat].forEach(varName => {
        const pill = document.createElement('div');
        pill.className = 'var-pill';
        pill.innerHTML = `<i class="fa-solid fa-code"></i> {{${varName}}}`;
        pill.title = 'Clique para inserir no documento';
        pill.addEventListener('click', () => {
          insertVariableAtCursor(varName);
        });
        container.appendChild(pill);
      });
    });
  }

  // CONVERT ALL LISTS INTO REAL EDITABLE TEXT PARAGRAPHS WITHOUT BULLET SYMBOLS
  function convertAllListsToEditableTopics(rootElement = bodyEditor) {
    if (!rootElement) return;

    const lists = Array.from(rootElement.querySelectorAll('ol, ul'));
    lists.forEach(list => {
      const items = Array.from(list.children);

      items.forEach((li) => {
        if (li.nodeName !== 'LI') return;

        const p = document.createElement('p');
        p.style.marginBottom = '6px';
        p.style.lineHeight = '1.6';

        let innerHtml = li.innerHTML.replace(/<(ol|ul)[\s\S]*?<\/\1>/gi, '').trim();
        innerHtml = innerHtml.replace(/^\s*(•|&bull;|\u2022)\s*/gi, '').trim();

        p.innerHTML = innerHtml.trim() ? innerHtml : '<br>';

        list.parentNode.insertBefore(p, list);
      });

      list.remove();
    });
  }

  // APPLY LIST STYLE TYPE (NUMBERS, LEGAL 1.1, MANUAL, LETTERS a, b, c, ROMANS, BULLETS)
  function applyListTypeStyle(styleType) {
    if (!activeEditor) activeEditor = bodyEditor;
    activeEditor.focus();

    if (styleType === 'manual') {
      removeListFormat();
      return;
    }

    const isUnorderedStyle = ['disc', 'circle', 'square'].includes(styleType);
    const cmd = isUnorderedStyle ? 'insertUnorderedList' : 'insertOrderedList';

    const sel = window.getSelection();
    let targetList = null;

    if (sel && sel.rangeCount) {
      let node = sel.anchorNode;
      while (node && node !== activeEditor) {
        if (node.nodeName === 'OL' || node.nodeName === 'UL') {
          targetList = node;
          break;
        }
        node = node.parentNode;
      }
    }

    if (!targetList) {
      document.execCommand(cmd, false, null);
      const sel2 = window.getSelection();
      if (sel2 && sel2.rangeCount) {
        let node2 = sel2.anchorNode;
        while (node2 && node2 !== activeEditor) {
          if (node2.nodeName === 'OL' || node2.nodeName === 'UL') {
            targetList = node2;
            break;
          }
          node2 = node2.parentNode;
        }
      }
    }

    if (targetList) {
      if (styleType === 'legal') {
        targetList.classList.add('legal-list');
        targetList.setAttribute('data-list-style', 'legal');
        targetList.style.listStyleType = 'none';
        
        targetList.querySelectorAll('ol').forEach(childOl => {
          childOl.classList.add('legal-list');
          childOl.setAttribute('data-list-style', 'legal');
          childOl.style.listStyleType = 'none';
        });
      } else {
        targetList.classList.remove('legal-list');
        targetList.removeAttribute('data-list-style');
        targetList.style.listStyleType = styleType;
      }
    }

    markAsDirty();
    updateCanvasPagination();
  }

  // REMOVE LIST / TOPIC FORMATTING (SAFELY CONVERT LIST ITEM TO PARAGRAPH OUTSIDE LIST CONTAINER)
  function removeListFormat() {
    if (!activeEditor) activeEditor = bodyEditor;
    activeEditor.focus();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let anchorNode = sel.anchorNode;
    let targetLi = null;
    let targetList = null;

    let current = anchorNode;
    while (current && current !== activeEditor) {
      if (current.nodeName === 'LI') targetLi = current;
      if (current.nodeName === 'OL' || current.nodeName === 'UL') targetList = current;
      current = current.parentNode;
    }

    let focusTargetElement = null;

    if (targetLi && targetList) {
      const p = document.createElement('p');
      p.style.marginBottom = '6px';
      p.style.lineHeight = '1.6';

      let innerHtml = targetLi.innerHTML.replace(/<(ol|ul)[\s\S]*?<\/\1>/gi, '').trim();
      innerHtml = innerHtml.replace(/^\s*(•|&bull;|\u2022)\s*/gi, '').trim();
      p.innerHTML = innerHtml.trim() ? innerHtml : '<br>';

      // CRITICAL FIX: Insert <p> in targetList.parentNode BEFORE targetList (OUTSIDE <ol>/<ul>) so DOM never deletes it!
      const parentContainer = targetList.parentNode || activeEditor;
      parentContainer.insertBefore(p, targetList);

      targetLi.remove();
      focusTargetElement = p;

      if (targetList.querySelectorAll('li').length === 0) {
        targetList.remove();
      }
    } else if (targetList) {
      targetList.classList.remove('legal-list');
      targetList.removeAttribute('data-list-style');
      convertAllListsToEditableTopics(targetList.parentNode || activeEditor);
    } else {
      document.execCommand('formatBlock', false, '<p>');
    }

    // Clean up any lingering bullet points or empty bullet symbols in current editor
    activeEditor.querySelectorAll('p').forEach(p => {
      let html = p.innerHTML;
      if (html.includes('•') || html.includes('&bull;')) {
        p.innerHTML = html.replace(/^\s*(•|&bull;|\u2022)\s*/gi, '');
      }
    });

    // RESTORE FOCUS EXACTLY ON THE REPLACED PARAGRAPH
    if (focusTargetElement) {
      const newSel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(focusTargetElement);
      range.collapse(false);
      newSel.removeAllRanges();
      newSel.addRange(range);
    }

    markAsDirty();
  }

  // EVENT LISTENERS SETUP
  function setupEventListeners() {
    [bodyEditor, headerEditor, footerEditor].forEach(editor => {
      if (!editor) return;
      
      editor.addEventListener('focus', () => {
        activeEditor = editor;
      });

      editor.addEventListener('keyup', (e) => {
        saveSelection();
        scanDetectedVariables();
        markAsDirty();
        handleAutocompleteTrigger(e);
      });

      editor.addEventListener('mouseup', () => {
        saveSelection();
      });

      editor.addEventListener('input', () => {
        scanDetectedVariables();
        markAsDirty();
        scheduleCanvasPagination(1500);
      });

      // KEYDOWN HANDLERS FOR BACKSPACE & TAB
      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            if (range.collapsed) {
              let node = range.startContainer;
              let li = null;
              let current = node;
              while (current && current !== editor) {
                if (current.nodeName === 'LI') {
                  li = current;
                  break;
                }
                current = current.parentNode;
              }

              if (li) {
                const isAtStart = (range.startOffset === 0 && (!node.previousSibling || (node.previousSibling.nodeType === Node.TEXT_NODE && !node.previousSibling.textContent)));
                if (isAtStart) {
                  e.preventDefault();
                  removeListFormat();
                  return;
                }
              }
            }
          }
        }

        // TAB & SHIFT+TAB HANDLER FOR EASY SUBTOPIC CREATION
        if (e.key === 'Tab') {
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            let node = sel.anchorNode;
            while (node && node !== editor) {
              if (node.nodeName === 'LI' || node.nodeName === 'OL' || node.nodeName === 'UL') {
                e.preventDefault();
                if (e.shiftKey) {
                  document.execCommand('outdent', false, null);
                } else {
                  document.execCommand('indent', false, null);
                }
                
                // Ensure legal list styling propagates to sub-list
                let parentOl = node.nodeName === 'OL' ? node : node.closest('ol');
                if (parentOl && (parentOl.classList.contains('legal-list') || parentOl.getAttribute('data-list-style') === 'legal')) {
                  editor.querySelectorAll('ol').forEach(ol => {
                    ol.classList.add('legal-list');
                    ol.setAttribute('data-list-style', 'legal');
                    ol.style.listStyleType = 'none';
                  });
                }

                markAsDirty();
                updateCanvasPagination();
                return;
              }
              node = node.parentNode;
            }
          }
        }
      });
    });

    templateTitleInput.addEventListener('input', markAsDirty);

    // Sidebar Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        if (tabId === 'templatesTab') {
          loadSavedTemplatesList();
        }
      });
    });

    // Custom variable creation
    btnAddCustomVar.addEventListener('click', handleAddCustomVar);
    customVarName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddCustomVar();
    });

    // Background Controls
    bgSizeSelect.addEventListener('change', () => {
      applyBackgroundStyles();
      updateCanvasPagination();
    });
    bgOpacityRange.addEventListener('input', (e) => {
      bgOpacityVal.innerText = `${Math.round(e.target.value * 100)}%`;
      applyBackgroundStyles();
      updateCanvasPagination();
    });
    bgPaddingTopInput.addEventListener('input', () => {
      applyBackgroundStyles();
      updateCanvasPagination();
    });
    if (bgMarginTopInput) bgMarginTopInput.addEventListener('input', () => {
      applyBackgroundStyles();
      updateCanvasPagination();
    });
    if (bgMarginLeftInput) bgMarginLeftInput.addEventListener('input', () => {
      applyBackgroundStyles();
      updateCanvasPagination();
    });
    if (bgMarginRightInput) bgMarginRightInput.addEventListener('input', () => {
      applyBackgroundStyles();
      updateCanvasPagination();
    });

    btnUploadBgImage.addEventListener('click', () => bgFileInput.click());
    bgFileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleBgImageUpload(e.target.files[0]);
    });
    btnRemoveBgImage.addEventListener('click', removeBgImage);

    // Header Image Controls & Listeners
    if (btnUploadHeaderImage) btnUploadHeaderImage.addEventListener('click', () => headerImageFileInput.click());
    if (headerImageFileInput) headerImageFileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleHeaderImageUpload(e.target.files[0]);
    });
    if (btnRemoveHeaderImage) btnRemoveHeaderImage.addEventListener('click', removeHeaderImage);
    
    [headerImageWidthInput, headerImageHeightInput, headerImageAlignSelect, headerImageFitSelect].forEach(input => {
      if (input) input.addEventListener('input', () => {
        applyBackgroundStyles();
        updateCanvasPagination();
        markAsDirty();
      });
    });

    // Footer Image Controls & Listeners
    if (btnUploadFooterImage) btnUploadFooterImage.addEventListener('click', () => footerImageFileInput.click());
    if (footerImageFileInput) footerImageFileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFooterImageUpload(e.target.files[0]);
    });
    if (btnRemoveFooterImage) btnRemoveFooterImage.addEventListener('click', removeFooterImage);
    if (showPageNumbersInput) showPageNumbersInput.addEventListener('change', () => {
      updateCanvasPagination();
      markAsDirty();
    });

    [footerImageWidthInput, footerImageHeightInput, footerImageAlignSelect, footerImageFitSelect].forEach(input => {
      if (input) input.addEventListener('input', () => {
        updateCanvasPagination();
        markAsDirty();
      });
    });

    // List & Numbering Style Selector Listener
    if (listTypeSelect) {
      listTypeSelect.addEventListener('change', (e) => {
        applyListTypeStyle(e.target.value);
        listTypeSelect.selectedIndex = 0;
      });
    }

    if (btnRemoveList) {
      btnRemoveList.addEventListener('click', (e) => {
        e.preventDefault();
        removeListFormat();
      });
    }

    // Formatting Toolbar commands
    document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        if (activeEditor) activeEditor.focus();
        markAsDirty();
        updateCanvasPagination();
      });
    });

    // Headings Selector
    headingSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'p' || val.startsWith('h')) {
        document.execCommand('formatBlock', false, `<${val}>`);
      } else if (val === 'blockquote') {
        document.execCommand('formatBlock', false, 'blockquote');
      }
    });

    // Callout Alert Boxes
    calloutSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      if (!type) return;
      insertCalloutBox(type);
      calloutSelect.selectedIndex = 0;
    });

    // Page Setup Handlers
    btnToggleOrientation.addEventListener('click', toggleOrientation);
    marginsSelect.addEventListener('change', handleMarginsChange);
    lineSpacingSelect.addEventListener('change', (e) => {
      bodyEditor.style.lineHeight = e.target.value;
    });

    // Typography & Colors
    document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
      document.execCommand('fontName', false, e.target.value);
    });
    
    document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
      document.execCommand('fontSize', false, e.target.value);
    });

    document.getElementById('foreColorInput').addEventListener('input', (e) => {
      document.execCommand('foreColor', false, e.target.value);
    });
    
    document.getElementById('hiliteColorInput').addEventListener('input', (e) => {
      document.execCommand('hiliteColor', false, e.target.value);
    });

    // Advanced Table & Elements
    document.getElementById('btnInsertTable').addEventListener('click', insertTable);
    document.getElementById('btnAddRowBelow').addEventListener('click', addTableRowBelow);
    document.getElementById('btnDeleteRow').addEventListener('click', deleteTableRow);
    document.getElementById('btnInsertImage').addEventListener('click', insertImagePrompt);
    document.getElementById('btnInsertHorizontalRule').addEventListener('click', () => {
      document.execCommand('insertHorizontalRule', false, null);
    });
    document.getElementById('btnInsertPageBreak').addEventListener('click', () => {
      insertPageBreak();
      updateCanvasPagination();
    });
    document.getElementById('btnToggleHeaderFooter').addEventListener('click', toggleHeaderFooter);

    // Navbar actions
    btnNewTemplate.addEventListener('click', createNewTemplate);
    btnImportFile.addEventListener('click', openImportModal);
    btnOpenTemplates.addEventListener('click', () => {
      document.querySelector('[data-tab="templatesTab"]').click();
    });
    btnSaveTemplate.addEventListener('click', saveCurrentTemplate);
    btnTestGenerate.addEventListener('click', openTestModal);

    // Import Modal & Dropzone
    btnCloseImportModal.addEventListener('click', closeImportModal);
    btnSelectFile.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFileImport(e.target.files[0]);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFileImport(e.dataTransfer.files[0]);
    });

    // Test Modal close & actions
    btnCloseModal.addEventListener('click', closeTestModal);
    testModal.addEventListener('click', (e) => {
      if (e.target === testModal) closeTestModal();
    });
    btnRefreshPreview.addEventListener('click', updateTestPreview);
    btnDownloadPdf.addEventListener('click', downloadTestPdf);

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (!autocompletePopup.contains(e.target)) {
        autocompletePopup.classList.remove('active');
      }
    });
  }

  // RANGE SELECTION MANAGEMENT
  function saveSelection() {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        lastSavedRange = sel.getRangeAt(0);
      }
    }
  }

  function restoreSelection() {
    if (lastSavedRange && window.getSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(lastSavedRange);
    }
  }

  // FLOATING AUTOCOMPLETE ON {{ TRIGGER
  function handleAutocompleteTrigger(e) {
    if (!activeEditor) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent.substring(0, sel.anchorOffset);
    const triggerIndex = text.lastIndexOf('{{');

    if (triggerIndex >= 0 && triggerIndex === text.length - 2) {
      const range = sel.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();
      
      autocompletePopup.style.top = `${window.scrollY + rect.bottom + 6}px`;
      autocompletePopup.style.left = `${window.scrollX + rect.left}px`;
      
      renderAutocompleteItems();
      autocompletePopup.classList.add('active');
    }
  }

  function renderAutocompleteItems() {
    autocompleteList.innerHTML = '';
    const allVars = [];
    Object.values(CATEGORIZED_VARS).forEach(list => allVars.push(...list));

    allVars.forEach(v => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `<span><i class="fa-solid fa-code"></i> {{${v}}}</span>`;
      item.addEventListener('click', () => {
        restoreSelection();
        const sel = window.getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.setStart(range.startContainer, Math.max(0, range.startOffset - 2));
          range.deleteContents();
        }
        insertVariableAtCursor(v);
        autocompletePopup.classList.remove('active');
      });
      autocompleteList.appendChild(item);
    });
  }

  // PAGE SETUP: ORIENTATION & MARGINS
  function toggleOrientation() {
    currentOrientation = currentOrientation === 'portrait' ? 'landscape' : 'portrait';
    paperPage.classList.remove('portrait', 'landscape');
    paperPage.classList.add(currentOrientation);

    if (currentOrientation === 'landscape') {
      orientationIcon.className = 'fa-solid fa-file';
      orientationText.innerText = 'Paisagem';
    } else {
      orientationIcon.className = 'fa-solid fa-file-lines';
      orientationText.innerText = 'Retrato';
    }
    markAsDirty();
  }

  function handleMarginsChange(e) {
    const val = e.target.value;
    const marginMap = {
      narrow: '10mm 10mm',
      normal: '20mm 15mm',
      wide: '30mm 25mm'
    };
    if (bodySection) bodySection.style.paddingLeft = marginMap[val] ? marginMap[val].split(' ')[1] : '15mm';
    markAsDirty();
  }

  // INSERT CALLOUT BOX
  function insertCalloutBox(type) {
    const titleMap = {
      info: 'Informação Importante',
      success: 'Confirmação',
      warning: 'Aviso do Sistema',
      danger: 'Atenção Necessária'
    };
    const calloutHtml = `
      <div class="callout callout-${type}" contenteditable="true">
        <strong>${titleMap[type] || 'Aviso'}:</strong> Digite o texto de destaque aqui...
      </div><p><br></p>
    `;
    document.execCommand('insertHTML', false, calloutHtml);
    scanDetectedVariables();
  }

  // INSERT VARIABLE AT CURSOR
  function insertVariableAtCursor(varName) {
    if (!activeEditor) activeEditor = bodyEditor;
    activeEditor.focus();
    restoreSelection();

    const textToInsert = `{{${varName}}}`;
    
    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, textToInsert);
    } else {
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(textToInsert));
      }
    }

    scanDetectedVariables();
    markAsDirty();
  }

  // ADD CUSTOM VARIABLE TO CATALOG
  function handleAddCustomVar() {
    const rawName = customVarName.value.trim();
    if (!rawName) return;

    const varName = rawName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    if (!CATEGORIZED_VARS.colaborador.includes(varName)) {
      CATEGORIZED_VARS.colaborador.unshift(varName);
      renderCategorizedVars();
    }
    customVarName.value = '';
    insertVariableAtCursor(varName);
  }

  // REAL-TIME REGEX SCAN OF DETECTED VARIABLES
  function scanDetectedVariables() {
    const fullText = (headerEditor.innerText || '') + ' ' + (bodyEditor.innerText || '') + ' ' + (footerEditor.innerText || '');
    const matches = fullText.match(/{{(.*?)}}/g) || [];
    const varsSet = new Set();

    matches.forEach(match => {
      const v = match.replace(/[{}]/g, '').trim();
      if (v) varsSet.add(v);
    });

    const detected = Array.from(varsSet);
    detectedCount.innerText = detected.length;

    if (detected.length === 0) {
      detectedVarsList.innerHTML = '<span class="empty-state">Nenhuma variável inserida ainda.</span>';
      return;
    }

    detectedVarsList.innerHTML = '';
    detected.forEach(v => {
      const item = document.createElement('div');
      item.className = 'detected-var-item';
      item.innerHTML = `<span><i class="fa-solid fa-check-double" style="color:#10b981;"></i> {{${v}}}</span>`;
      detectedVarsList.appendChild(item);
    });
  }

  // BACKGROUND IMAGE HANDLERS
  function handleBgImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentBgUrl = e.target.result;
      applyBackgroundStyles();
      updateCanvasPagination();
      markAsDirty();
    };
    reader.readAsDataURL(file);
  }

  function removeBgImage() {
    currentBgUrl = '';
    if (bgFileInput) bgFileInput.value = '';
    applyBackgroundStyles();
    updateCanvasPagination();
    markAsDirty();
  }

  // HEADER IMAGE HANDLERS
  function handleHeaderImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentHeaderImageUrl = e.target.result;
      if (headerImageOptions) headerImageOptions.style.display = 'block';
      if (headerEditor && (headerEditor.innerText.includes('LOGOTIPO') || headerEditor.innerText.includes('D+SAÚDE'))) {
        headerEditor.innerHTML = '<p><br></p>';
      }
      applyBackgroundStyles();
      updateCanvasPagination();
      markAsDirty();
    };
    reader.readAsDataURL(file);
  }

  function removeHeaderImage() {
    currentHeaderImageUrl = '';
    if (headerImageFileInput) headerImageFileInput.value = '';
    if (headerImageOptions) headerImageOptions.style.display = 'none';
    applyBackgroundStyles();
    updateCanvasPagination();
    markAsDirty();
  }

  // FOOTER IMAGE HANDLERS
  function handleFooterImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentFooterImageUrl = e.target.result;
      if (footerImageOptions) footerImageOptions.style.display = 'block';
      applyBackgroundStyles();
      updateCanvasPagination();
      markAsDirty();
    };
    reader.readAsDataURL(file);
  }

  function removeFooterImage() {
    currentFooterImageUrl = '';
    if (footerImageFileInput) footerImageFileInput.value = '';
    if (footerImageOptions) footerImageOptions.style.display = 'none';
    applyBackgroundStyles();
    updateCanvasPagination();
    markAsDirty();
  }

  // MARK STATUS AS UN-SAVED
  function markAsDirty() {
    isDirty = true;
    saveStatus.innerText = 'Alterações não salvas';
    saveStatus.classList.remove('saved');
  }

  function markAsSaved() {
    isDirty = false;
    saveStatus.innerText = 'Salvo com sucesso';
    saveStatus.classList.add('saved');
  }

  // ADVANCED TABLE MANIPULATORS
  function insertTable() {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 8px;">Item / Descrição</th>
            <th style="border: 1px solid #d1d5db; padding: 8px;">Quantidade</th>
            <th style="border: 1px solid #d1d5db; padding: 8px;">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 8px;">Exame Ocupacional</td>
            <td style="border: 1px solid #d1d5db; padding: 8px;">1</td>
            <td style="border: 1px solid #d1d5db; padding: 8px;">R$ 150,00</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    scanDetectedVariables();
  }

  function addTableRowBelow() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    let node = sel.anchorNode;
    while (node && node.nodeName !== 'TR' && node !== bodyEditor) {
      node = node.parentNode;
    }

    if (node && node.nodeName === 'TR') {
      const colCount = node.children.length;
      const newRow = document.createElement('tr');
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.style.border = '1px solid #d1d5db';
        td.style.padding = '8px';
        td.innerHTML = 'Nova célula';
        newRow.appendChild(td);
      }
      node.parentNode.insertBefore(newRow, node.nextSibling);
    }
  }

  function deleteTableRow() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    let node = sel.anchorNode;
    while (node && node.nodeName !== 'TR' && node !== bodyEditor) {
      node = node.parentNode;
    }

    if (node && node.nodeName === 'TR') {
      node.remove();
    }
  }

  function insertImagePrompt() {
    const url = prompt('Informe a URL da imagem (ou cole uma imagem diretamente no editor):');
    if (url) {
      document.execCommand('insertImage', false, url);
    }
  }

  function insertPageBreak() {
    const pbHtml = `<div class="a4-page-separator" contenteditable="false">📄 QUEBRA DE PÁGINA A4 (PÁGINA SEGUINTE)</div><p><br></p>`;
    document.execCommand('insertHTML', false, pbHtml);
  }

  function toggleHeaderFooter() {
    const isHeaderVisible = headerSection.style.display !== 'none';
    headerSection.style.display = isHeaderVisible ? 'none' : 'block';
    footerSection.style.display = isHeaderVisible ? 'none' : 'block';
  }

  // IMPORT FILE ENGINE (.DOCX, .HTML, .TXT)
  function openImportModal() {
    importModal.classList.add('active');
  }

  function closeImportModal() {
    importModal.classList.remove('active');
  }

  async function handleFileImport(file) {
    closeImportModal();
    const fileName = file.name;
    const isDocx = fileName.toLowerCase().endsWith('.docx');

    try {
      saveStatus.innerText = 'Importando arquivo...';

      if (isDocx) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target.result.split(',')[1];
          console.log(`[CLIENT] Enviando arquivo DOCX "${fileName}" em base64 (${base64.length} caracteres)...`);
          const response = await fetch('/api/templates/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              fileType: 'docx',
              contentBase64: base64
            })
          });

          const resData = await response.json();
          if (!response.ok || !resData.sucesso) {
            throw new Error(resData.erro || 'Falha ao importar arquivo DOCX');
          }

          loadImportedData(resData.dados);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          loadImportedData({
            name: fileName.replace(/\.[^/.]+$/, ''),
            html: text
          });
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error(err);
      alert(`Erro ao importar arquivo: ${err.message}`);
      saveStatus.innerText = 'Erro ao importar';
    }
  }

  function loadImportedData(dados) {
    console.log(`[CLIENT] Carregando dados importados "${dados.name}"...`);
    if (dados.name) templateTitleInput.value = dados.name;

    if (dados.html) {
      bodyEditor.innerHTML = dados.html;

      const bgLayer = bodyEditor.querySelector('.page-background-layer');
      const bgImg = bgLayer ? bgLayer.querySelector('img') : null;
      
      if (bgImg && bgImg.src) {
        currentBgUrl = bgImg.src;
        bgLayer.remove();
      } else {
        const firstImg = bodyEditor.querySelector('img');
        if (firstImg && firstImg.src && (firstImg.src.startsWith('data:image') || firstImg.src.includes('base64') || firstImg.src.includes('logo'))) {
          currentBgUrl = firstImg.src;
          
          if (firstImg.parentElement && firstImg.parentElement.tagName === 'P' && firstImg.parentElement.children.length === 1) {
            firstImg.parentElement.remove();
          } else {
            firstImg.remove();
          }
        } else {
          currentBgUrl = '';
        }
      }

      if (currentBgUrl) {
        bodyEditor.querySelectorAll('img').forEach(img => {
          if (img.src === currentBgUrl) {
            if (img.parentElement && img.parentElement.tagName === 'P' && img.parentElement.children.length === 1) {
              img.parentElement.remove();
            } else {
              img.remove();
            }
          }
        });
      }

      // Convert imported HTML lists into real editable text paragraphs so numbers are mouse-selectable and editable!
      convertAllListsToEditableTopics(bodyEditor);

      // Normalize & apply fallback standard formatting for unrecognized DOCX paragraph styles
      bodyEditor.querySelectorAll('p, div').forEach(el => {
        if (!el.style.lineHeight) el.style.lineHeight = '1.6';
        if (!el.style.fontSize) el.style.fontSize = '14px';
        if (!el.style.color) el.style.color = '#1f2937';
      });
    }

    if (dados.headerHtml && dados.headerHtml.trim()) {
      headerEditor.innerHTML = dados.headerHtml;
      headerSection.style.display = 'block';
    } else {
      headerEditor.innerHTML = '';
      headerSection.style.display = 'none';
    }

    if (dados.footerHtml && dados.footerHtml.trim()) {
      footerEditor.innerHTML = dados.footerHtml;
      footerSection.style.display = 'block';
    } else {
      footerEditor.innerHTML = '';
      footerSection.style.display = 'none';
    }

    applyBackgroundStyles();
    scanDetectedVariables();
    updateCanvasPagination();
    markAsDirty();
    alert(`Arquivo "${dados.name}" importado com sucesso!`);
  }

  // NEW TEMPLATE
  function createNewTemplate() {
    if (isDirty && !confirm('Você possui alterações não salvas. Deseja criar um novo template limpo?')) {
      return;
    }
    currentTemplateId = null;
    templateTitleInput.value = 'Novo Template de Documento';
    currentBgUrl = '';
    currentHeaderImageUrl = '';
    currentFooterImageUrl = '';
    if (headerImageOptions) headerImageOptions.style.display = 'none';
    if (footerImageOptions) footerImageOptions.style.display = 'none';
    applyBackgroundStyles();
    bodyEditor.innerHTML = '<p>Digite o conteúdo do novo modelo de documento aqui...</p>';
    headerEditor.innerHTML = '<p><br></p>';
    footerEditor.innerHTML = '<p><br></p>';
    scanDetectedVariables();
    updateCanvasPagination();
    markAsDirty();
  }

  // SAVE TEMPLATE VIA API
  async function saveCurrentTemplate() {
    const title = templateTitleInput.value.trim();
    if (!title) {
      alert('Por favor, informe o nome do template.');
      return;
    }

    let cleanBodyHtml = getUnwrappedEditorHtml();
    if (currentBgUrl) {
      cleanBodyHtml = `<div class="page-background-layer" data-bg-src="${currentBgUrl}"><img src="${currentBgUrl}" alt="Background" /></div>` + cleanBodyHtml;
    }

    const headerTextContent = headerEditor.innerText ? headerEditor.innerText.trim() : '';
    const footerTextContent = footerEditor.innerText ? footerEditor.innerText.trim() : '';

    const payload = {
      id: currentTemplateId,
      name: title,
      description: `Template criado via editor Superdoc em ${new Date().toLocaleDateString('pt-BR')}`,
      html: cleanBodyHtml,
      headerHtml: (headerSection.style.display !== 'none' && headerTextContent && !headerTextContent.includes('LOGOTIPO DA EMPRESA')) ? headerEditor.innerHTML : '',
      footerHtml: (footerSection.style.display !== 'none' && footerTextContent) ? footerEditor.innerHTML : '',
      headerImageUrl: currentHeaderImageUrl,
      headerImageWidth: headerImageWidthInput ? headerImageWidthInput.value : '100%',
      headerImageHeight: headerImageHeightInput ? headerImageHeightInput.value : '100',
      headerImageAlign: headerImageAlignSelect ? headerImageAlignSelect.value : 'center',
      headerImageFit: headerImageFitSelect ? headerImageFitSelect.value : 'contain',
      footerImageUrl: currentFooterImageUrl,
      footerImageWidth: footerImageWidthInput ? footerImageWidthInput.value : '100%',
      footerImageHeight: footerImageHeightInput ? footerImageHeightInput.value : '80',
      footerImageAlign: footerImageAlignSelect ? footerImageAlignSelect.value : 'center',
      footerImageFit: footerImageFitSelect ? footerImageFitSelect.value : 'contain',
      showPageNumbers: showPageNumbersInput ? showPageNumbersInput.checked : true,
      orientation: currentOrientation,
      margins: marginsSelect.value,
      lineSpacing: lineSpacingSelect.value,
      bgUrl: currentBgUrl,
      bgSize: bgSizeSelect.value,
      bgOpacity: bgOpacityRange.value,
      bgPaddingTop: `${bgPaddingTopInput.value}px`,
      bgMarginTop: `${bgMarginTopInput ? bgMarginTopInput.value : 0}px`,
      bgMarginLeft: `${bgMarginLeftInput ? bgMarginLeftInput.value : 0}px`,
      bgMarginRight: `${bgMarginRightInput ? bgMarginRightInput.value : 0}px`
    };

    console.log(`[CLIENT] Salvando template "${title}"... bgUrl enviado: ${currentBgUrl ? 'SIM' : 'NÃO'}`);

    try {
      saveStatus.innerText = 'Salvando...';
      const endpoint = currentTemplateId ? `/api/templates/${currentTemplateId}` : '/api/templates';
      const method = currentTemplateId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok || !resData.sucesso) {
        throw new Error(resData.erro || 'Falha ao salvar template');
      }

      currentTemplateId = resData.dados.id;
      console.log(`[CLIENT] Template salvo com sucesso! ID ativo: ${currentTemplateId}`);
      markAsSaved();
      loadSavedTemplatesList();
      alert(`Template "${resData.dados.name}" salvo com sucesso!`);
    } catch (err) {
      console.error('[CLIENT] Erro ao salvar template:', err);
      alert(`Erro ao salvar template: ${err.message}`);
      saveStatus.innerText = 'Erro ao salvar';
    }
  }

  // LOAD SAVED TEMPLATES LIST
  async function loadSavedTemplatesList() {
    try {
      savedTemplatesList.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>';
      const response = await fetch('/api/templates');
      const resData = await response.json();

      if (!resData.sucesso || !Array.isArray(resData.dados)) {
        throw new Error('Falha ao carregar lista de templates');
      }

      if (resData.dados.length === 0) {
        savedTemplatesList.innerHTML = '<div class="empty-state">Nenhum template salvo ainda.</div>';
        return;
      }

      savedTemplatesList.innerHTML = '';
      resData.dados.forEach(tpl => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
          <div class="template-card-header">
            <span class="template-card-title">${tpl.name}</span>
            <span class="template-card-type">${tpl.type === 'builtin' ? 'Padrão' : 'Custom'}</span>
          </div>
          <div class="template-card-desc">${tpl.description || 'Sem descrição'}</div>
          <div style="font-size: 10px; color: #a7f3d0; margin-top: 4px;">
            <i class="fa-solid fa-code"></i> ${tpl.variables ? tpl.variables.length : 0} variáveis
          </div>
        `;
        card.addEventListener('click', () => loadTemplateById(tpl.id));
        savedTemplatesList.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      savedTemplatesList.innerHTML = `<div class="empty-state">Erro ao carregar templates: ${err.message}</div>`;
    }
  }

  // LOAD SPECIFIC TEMPLATE
  async function loadTemplateById(id) {
    if (isDirty && !confirm('Você possui alterações não salvas. Deseja carregar o template selecionado?')) {
      return;
    }

    try {
      console.log(`[CLIENT] Carregando template por ID "${id}"...`);
      const response = await fetch(`/api/templates/${id}`);
      const resData = await response.json();

      if (!response.ok || !resData.sucesso) {
        throw new Error(resData.erro || 'Falha ao buscar detalhes do template');
      }

      const tpl = resData.dados;
      currentTemplateId = tpl.id;
      templateTitleInput.value = tpl.name;
      
      bodyEditor.innerHTML = tpl.html || '';
      if (tpl.headerHtml) {
        headerEditor.innerHTML = tpl.headerHtml;
        headerSection.style.display = 'block';
      }
      if (tpl.footerHtml) {
        footerEditor.innerHTML = tpl.footerHtml;
        footerSection.style.display = 'block';
      }

      currentHeaderImageUrl = tpl.headerImageUrl || '';
      currentFooterImageUrl = tpl.footerImageUrl || '';
      if (headerImageOptions) headerImageOptions.style.display = currentHeaderImageUrl ? 'block' : 'none';
      if (footerImageOptions) footerImageOptions.style.display = currentFooterImageUrl ? 'block' : 'none';

      if (showPageNumbersInput) showPageNumbersInput.checked = tpl.showPageNumbers !== false;

      if (tpl.headerImageWidth && headerImageWidthInput) headerImageWidthInput.value = tpl.headerImageWidth;
      if (tpl.headerImageHeight && headerImageHeightInput) headerImageHeightInput.value = tpl.headerImageHeight;
      if (tpl.headerImageAlign && headerImageAlignSelect) headerImageAlignSelect.value = tpl.headerImageAlign;
      if (tpl.headerImageFit && headerImageFitSelect) headerImageFitSelect.value = tpl.headerImageFit;

      if (tpl.footerImageWidth && footerImageWidthInput) footerImageWidthInput.value = tpl.footerImageWidth;
      if (tpl.footerImageHeight && footerImageHeightInput) footerImageHeightInput.value = tpl.footerImageHeight;
      if (tpl.footerImageAlign && footerImageAlignSelect) footerImageAlignSelect.value = tpl.footerImageAlign;
      if (tpl.footerImageFit && footerImageFitSelect) footerImageFitSelect.value = tpl.footerImageFit;

      const bgMatch = tpl.bgUrl || (tpl.html ? tpl.html.match(/data-bg-src=["']([^"']+)["']/i) || tpl.html.match(/<img[^>]+src=["']([^"']+)["']/i) : null);
      if (bgMatch) {
        currentBgUrl = typeof bgMatch === 'string' ? bgMatch : bgMatch[1];
        if (tpl.bgSize) bgSizeSelect.value = tpl.bgSize;
        if (tpl.bgOpacity) {
          bgOpacityRange.value = tpl.bgOpacity;
          bgOpacityVal.innerText = `${Math.round(tpl.bgOpacity * 100)}%`;
        }
        if (tpl.bgPaddingTop) bgPaddingTopInput.value = parseInt(tpl.bgPaddingTop) || 130;
        if (tpl.bgMarginTop && bgMarginTopInput) bgMarginTopInput.value = parseInt(tpl.bgMarginTop) || 0;
        if (tpl.bgMarginLeft && bgMarginLeftInput) bgMarginLeftInput.value = parseInt(tpl.bgMarginLeft) || 0;
        if (tpl.bgMarginRight && bgMarginRightInput) bgMarginRightInput.value = parseInt(tpl.bgMarginRight) || 0;

        const bgLayer = bodyEditor.querySelector('.page-background-layer');
        if (bgLayer) bgLayer.remove();
        
        bodyEditor.querySelectorAll('img').forEach(img => {
          if (img.src === currentBgUrl) {
            if (img.parentElement && img.parentElement.tagName === 'P' && img.parentElement.children.length === 1) {
              img.parentElement.remove();
            } else {
              img.remove();
            }
          }
        });
      } else {
        currentBgUrl = '';
      }

      if (tpl.orientation) {
        currentOrientation = tpl.orientation;
        paperPage.classList.remove('portrait', 'landscape');
        paperPage.classList.add(currentOrientation);
      }
      if (tpl.margins) marginsSelect.value = tpl.margins;
      if (tpl.lineSpacing) lineSpacingSelect.value = tpl.lineSpacing;

      applyBackgroundStyles();
      scanDetectedVariables();
      updateCanvasPagination();
      markAsSaved();
    } catch (err) {
      console.error(err);
      alert(`Erro ao carregar template: ${err.message}`);
    }
  }

  // STRIP ALL CARD WRAPPERS TO GET PURE ORIGINAL HTML
  function getUnwrappedEditorHtml() {
    let rawHtml = bodyEditor.innerHTML;
    if (!rawHtml) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

    const pageCards = tempDiv.querySelectorAll('.a4-canvas-page-card');
    if (pageCards.length > 0) {
      let unwrappedHtml = '';
      pageCards.forEach(card => {
        const pageBody = card.querySelector('.canvas-page-body');
        if (pageBody) unwrappedHtml += pageBody.innerHTML;
        else unwrappedHtml += card.innerHTML;
      });
      tempDiv.innerHTML = unwrappedHtml;
    }

    tempDiv.querySelectorAll('.canvas-page-bg, .canvas-page-footer, .canvas-header-img, .page-background-layer').forEach(el => el.remove());

    return tempDiv.innerHTML;
  }

  // INTERFACE CANVAS MULTI-PAGE RENDERER WITH GUARANTEED HEADER & FOOTER PADDING SAFETY
  function updateCanvasPagination() {
    if (!bodyEditor || !paperPage) return;

    let cleanHtml = getUnwrappedEditorHtml();
    if (!cleanHtml || !cleanHtml.trim()) return;

    const showPageNumbers = showPageNumbersInput ? showPageNumbersInput.checked : true;
    const basePaddingTop = parseInt(bgPaddingTopInput ? bgPaddingTopInput.value : 130) || 130;
    const headerHeightPx = (currentHeaderImageUrl && headerImageHeightInput) ? (parseInt(headerImageHeightInput.value) || 100) : 0;
    const paddingTop = currentHeaderImageUrl ? Math.max(basePaddingTop, headerHeightPx + 15) : basePaddingTop;

    const pages = paginateHtmlIntoA4Pages(cleanHtml, paddingTop);

    console.log(`📄 [CANVAS PAGINATOR] Renderizando ${pages.length} folhas A4 na interface principal (paddingTop: ${paddingTop}px).`);

    const headerWidth = headerImageWidthInput ? headerImageWidthInput.value : '100%';
    const headerHeight = headerImageHeightInput ? `${headerImageHeightInput.value}px` : '100px';
    const headerAlign = headerImageAlignSelect ? headerImageAlignSelect.value : 'center';
    const headerFit = headerImageFitSelect ? headerImageFitSelect.value : 'contain';
    const headerAlignMargin = headerAlign === 'center' ? '0 auto' : (headerAlign === 'right' ? '0 0 0 auto' : '0 auto 0 0');

    const footerWidth = footerImageWidthInput ? footerImageWidthInput.value : '100%';
    const footerHeight = footerImageHeightInput ? `${footerImageHeightInput.value}px` : '80px';
    const footerAlign = footerImageAlignSelect ? footerImageAlignSelect.value : 'center';
    const footerFit = footerImageFitSelect ? footerImageFitSelect.value : 'contain';
    const footerAlignMargin = footerAlign === 'center' ? '0 auto' : (footerAlign === 'right' ? '0 0 0 auto' : '0 auto 0 0');

    const isHeaderFullBleed = headerWidth === '100%';
    const isFooterFullBleed = footerWidth === '100%';

    if (pages.length <= 1) {
      paperPage.classList.remove('multi-page-view');
      
      let singlePageHeaderHtml = '';
      if (currentHeaderImageUrl) {
        singlePageHeaderHtml = `
          <div class="canvas-header-img" style="${isHeaderFullBleed ? 'position: absolute; top: 0; left: 0; width: 100%; z-index: 2; padding: 0; margin: 0;' : 'position: relative; z-index: 1; padding: 15px 15mm 0 15mm; width: 100%;'}">
            <img src="${currentHeaderImageUrl}" style="width: ${headerWidth}; max-height: ${headerHeight}; height: auto; object-fit: ${headerFit}; display: block; margin: ${isHeaderFullBleed ? '0' : headerAlignMargin};" />
          </div>
        `;
      }

      bodyEditor.innerHTML = singlePageHeaderHtml + cleanHtml;
      
      if (bodySection) {
        bodySection.style.paddingTop = `${paddingTop}px`;
        bodySection.style.paddingBottom = '35mm';
      }
      
      applyBackgroundStyles();
      return;
    }

    paperPage.classList.add('multi-page-view');
    paperPage.classList.remove('has-bg-template');

    const marginLeft = parseInt(bgMarginLeftInput ? bgMarginLeftInput.value : 0) || 0;
    const marginRight = parseInt(bgMarginRightInput ? bgMarginRightInput.value : 0) || 0;
    const marginTop = parseInt(bgMarginTopInput ? bgMarginTopInput.value : 0) || 0;

    const multiPageCardsHtml = pages.map((pageContent, idx) => `
      <div class="a4-canvas-page-card ${currentOrientation}">
        ${currentBgUrl ? `
        <div class="canvas-page-bg" style="
          position: absolute;
          top: ${marginTop}px;
          left: ${marginLeft}px;
          width: calc(100% - ${marginLeft + marginRight}px);
          z-index: 0;
          pointer-events: none;
        ">
          <img src="${currentBgUrl}" style="
            width: 100%;
            height: auto;
            max-height: 297mm;
            object-fit: contain;
            object-position: top center;
          " />
        </div>` : ''}

        ${currentHeaderImageUrl ? `
        <div class="canvas-header-img" style="
          ${isHeaderFullBleed ? 'position: absolute; top: 0; left: 0; width: 100%; z-index: 2; padding: 0; margin: 0;' : 'position: relative; z-index: 1; padding: 15px 15mm 0 15mm; width: 100%;'}
        ">
          <img src="${currentHeaderImageUrl}" style="
            width: ${headerWidth};
            max-height: ${headerHeight};
            height: auto;
            object-fit: ${headerFit};
            display: block;
            margin: ${isHeaderFullBleed ? '0' : headerAlignMargin};
          " />
        </div>` : ''}

        <div class="canvas-page-body" style="
          position: relative;
          z-index: 1;
          padding: ${paddingTop}px 15mm 35mm 15mm;
          min-height: calc(297mm - ${paddingTop}px - 35mm);
        ">${pageContent}</div>

        <div class="canvas-page-footer" style="
          ${isFooterFullBleed && currentFooterImageUrl ? 'position: absolute; bottom: 0; left: 0; width: 100%; z-index: 2; padding: 0; margin: 0; text-align: center;' : 'position: relative; z-index: 1; padding: 8px 15mm 15px 15mm; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;'}
        ">
          ${showPageNumbers ? `<div style="position: relative; z-index: 5; font-size: 11px; color: #64748b; text-align: center; margin-bottom: 6px;">Página ${idx + 1} de ${pages.length}</div>` : ''}
          ${currentFooterImageUrl ? `
          <img src="${currentFooterImageUrl}" style="
            width: ${footerWidth};
            max-height: ${footerHeight};
            height: auto;
            object-fit: ${footerFit};
            display: block;
            margin: ${isFooterFullBleed ? '0' : footerAlignMargin};
          " />` : ''}
        </div>
      </div>
    `).join('');

    bodyEditor.innerHTML = multiPageCardsHtml;
  }

  // TEST GENERATION MODAL
  function openTestModal() {
    testModal.classList.add('active');
    renderTestFormInputs();
    updateTestPreview();
  }

  function closeTestModal() {
    testModal.classList.remove('active');
  }

  function renderTestFormInputs() {
    testVariablesForm.innerHTML = '';
    const fullText = (headerEditor.innerText || '') + ' ' + (bodyEditor.innerText || '') + ' ' + (footerEditor.innerText || '');
    const matches = fullText.match(/{{(.*?)}}/g) || [];
    const varsSet = new Set();

    matches.forEach(match => {
      const v = match.replace(/[{}]/g, '').trim();
      if (v) varsSet.add(v);
    });

    const detected = Array.from(varsSet);

    if (detected.length === 0) {
      testVariablesForm.innerHTML = '<span class="empty-state">Nenhuma variável encontrada no documento para preencher.</span>';
      return;
    }

    detected.forEach(varName => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const defaultValue = SAMPLE_DEFAULTS[varName] || `Valor de ${varName}`;

      group.innerHTML = `
        <label for="input_${varName}">{{${varName}}}</label>
        <input type="text" id="input_${varName}" data-var="${varName}" value="${defaultValue}" />
      `;
      testVariablesForm.appendChild(group);
    });
  }

  function getTestFormData() {
    const payload = {};
    const inputs = testVariablesForm.querySelectorAll('input[data-var]');
    inputs.forEach(input => {
      const v = input.getAttribute('data-var');
      payload[v] = input.value;
    });
    return payload;
  }

  // AUTOMATIC A4 CONTENT PAGINATOR ENGINE
  function paginateHtmlIntoA4Pages(rawHtml, paddingTopPx = 130) {
    if (!rawHtml || !rawHtml.trim()) return ['<p></p>'];

    let cleanHtml = rawHtml;
    cleanHtml = cleanHtml.replace(/<div[^>]*class=["']page-content-layer["'][^>]*>([\s\S]*?)<\/div>/gi, '$1');

    const measurer = document.createElement('div');
    measurer.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 210mm;
      padding: ${paddingTopPx}px 15mm 35mm 15mm;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      line-height: ${lineSpacingSelect ? lineSpacingSelect.value : '1.6'};
      box-sizing: border-box;
      visibility: hidden;
    `;
    measurer.innerHTML = cleanHtml;
    document.body.appendChild(measurer);

    const A4_HEIGHT_PX = 1122.5;
    const PADDING_BOTTOM_PX = 130; // 35mm bottom padding
    const MAX_PAGE_HEIGHT = A4_HEIGHT_PX - paddingTopPx - PADDING_BOTTOM_PX;

    let topElements = Array.from(measurer.children);

    if (topElements.length === 1 && topElements[0].tagName === 'DIV' && topElements[0].children.length > 0) {
      topElements = Array.from(topElements[0].children);
    }

    if (topElements.length === 0) {
      topElements = Array.from(measurer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, table, ul, ol, blockquote, .callout'));
    }

    console.log(`🔍 [PAGINATOR] Total de ${topElements.length} elementos de bloco limpos identificados para paginação.`);

    const pages = [];
    let currentPageHtml = '';
    let currentHeight = 0;

    topElements.forEach((el) => {
      const textContent = (el.textContent || '').trim();
      const isExplicitBreak = el.classList.contains('a4-page-separator') || 
                             el.classList.contains('page-break') || 
                             textContent.includes('QUEBRA DE PÁGINA');

      if (isExplicitBreak) {
        if (currentPageHtml.trim()) {
          pages.push(currentPageHtml + el.outerHTML);
        } else {
          pages.push(el.outerHTML);
        }
        currentPageHtml = '';
        currentHeight = 0;
        return;
      }

      let elHeight = el.offsetHeight;
      if (!elHeight || elHeight <= 0) {
        const lineCount = Math.max(1, Math.ceil(textContent.length / 70));
        elHeight = lineCount * 24 + 16;
        if (['H1', 'H2', 'H3'].includes(el.tagName)) elHeight += 26;
        if (el.tagName === 'TABLE' || el.tagName === 'OL' || el.tagName === 'UL') elHeight = Math.max(120, (el.querySelectorAll('li, tr').length || 3) * 35);
      }

      if (currentHeight + elHeight > MAX_PAGE_HEIGHT && currentPageHtml.trim()) {
        pages.push(currentPageHtml);
        currentPageHtml = el.outerHTML;
        currentHeight = elHeight;
      } else {
        currentPageHtml += el.outerHTML;
        currentHeight += elHeight;
      }
    });

    if (currentPageHtml.trim()) {
      pages.push(currentPageHtml);
    }

    document.body.removeChild(measurer);

    console.log(`✅ [PAGINATOR] Documento paginado com sucesso em ${pages.length} páginas A4 sem duplicações!`);
    return pages.length > 0 ? pages : [cleanHtml];
  }

  // MULTI-PAGE ZOOMED OUT MODAL PREVIEW RENDERER WITH AUTOMATIC A4 PAGINATION
  async function updateTestPreview() {
    previewFrameContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Gerando pré-visualização...</div>';

    const testData = getTestFormData();
    const showPageNumbers = showPageNumbersInput ? showPageNumbersInput.checked : true;
    
    let bodyHtml = getUnwrappedEditorHtml();
    let headerHtml = headerSection.style.display !== 'none' ? headerEditor.innerHTML : '';
    let footerHtml = footerSection.style.display !== 'none' ? footerEditor.innerHTML : '';

    if (currentBgUrl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyHtml;
      tempDiv.querySelectorAll('img').forEach(img => {
        if (img.src === currentBgUrl) {
          if (img.parentElement && img.parentElement.tagName === 'P' && img.parentElement.children.length === 1) {
            img.parentElement.remove();
          } else {
            img.remove();
          }
        }
      });
      bodyHtml = tempDiv.innerHTML;
    }

    Object.keys(testData).forEach(key => {
      const regex = new RegExp(`{{\\s*\\(?\\s*${key}\\s*\\)?\\s*}}`, 'g');
      const val = testData[key];
      bodyHtml = bodyHtml.replace(regex, val);
      headerHtml = headerHtml.replace(regex, val);
      footerHtml = footerHtml.replace(regex, val);
    });

    const basePaddingTop = parseInt(bgPaddingTopInput ? bgPaddingTopInput.value : 130) || 130;
    const headerHeightPx = (currentHeaderImageUrl && headerImageHeightInput) ? (parseInt(headerImageHeightInput.value) || 100) : 0;
    const paddingTop = currentHeaderImageUrl ? Math.max(basePaddingTop, headerHeightPx + 15) : basePaddingTop;

    const marginLeft = parseInt(bgMarginLeftInput ? bgMarginLeftInput.value : 0) || 0;
    const marginRight = parseInt(bgMarginRightInput ? bgMarginRightInput.value : 0) || 0;
    const marginTop = parseInt(bgMarginTopInput ? bgMarginTopInput.value : 0) || 0;

    const headerWidth = headerImageWidthInput ? headerImageWidthInput.value : '100%';
    const headerHeight = headerImageHeightInput ? `${headerImageHeightInput.value}px` : '100px';
    const headerAlign = headerImageAlignSelect ? headerImageAlignSelect.value : 'center';
    const headerFit = headerImageFitSelect ? headerImageFitSelect.value : 'contain';
    const headerAlignMargin = headerAlign === 'center' ? '0 auto' : (headerAlign === 'right' ? '0 0 0 auto' : '0 auto 0 0');

    const footerWidth = footerImageWidthInput ? footerImageWidthInput.value : '100%';
    const footerHeight = footerImageHeightInput ? `${footerImageHeightInput.value}px` : '80px';
    const footerAlign = footerImageAlignSelect ? footerImageAlignSelect.value : 'center';
    const footerFit = footerImageFitSelect ? footerImageFitSelect.value : 'contain';
    const footerAlignMargin = footerAlign === 'center' ? '0 auto' : (footerAlign === 'right' ? '0 0 0 auto' : '0 auto 0 0');

    const isHeaderFullBleed = headerWidth === '100%';
    const isFooterFullBleed = footerWidth === '100%';

    const pages = paginateHtmlIntoA4Pages(bodyHtml, paddingTop);

    const pagesHtml = pages.map((pageContent, idx) => `
      <div class="a4-preview-card">
        ${currentBgUrl ? `
        <div class="a4-preview-bg" style="left: ${marginLeft}px; top: ${marginTop}px; width: calc(100% - ${marginLeft + marginRight}px);">
          <img src="${currentBgUrl}" alt="Background Page ${idx + 1}" />
        </div>` : ''}

        ${currentHeaderImageUrl && isHeaderFullBleed ? `
        <div style="position: absolute; top: 0; left: 0; width: 100%; z-index: 2; pointer-events: none;">
          <img src="${currentHeaderImageUrl}" style="width: 100%; max-height: ${headerHeight}; height: auto; object-fit: ${headerFit}; display: block; margin: 0;" />
        </div>` : ''}

        <div class="document-header" style="${currentHeaderImageUrl && isHeaderFullBleed ? 'border-bottom: none;' : ''}">
          ${currentHeaderImageUrl && !isHeaderFullBleed ? `
          <img src="${currentHeaderImageUrl}" style="
            width: ${headerWidth};
            max-height: ${headerHeight};
            height: auto;
            object-fit: ${headerFit};
            display: block;
            margin: ${headerAlignMargin};
            margin-bottom: 10px;
          " />` : ''}
          ${headerHtml ? headerHtml : ''}
        </div>

        <div class="document-body" style="padding: ${paddingTop}px 15mm 35mm 15mm; min-height: calc(297mm - ${paddingTop}px - 35mm);">${pageContent}</div>

        <div class="document-footer" style="${currentFooterImageUrl && isFooterFullBleed ? 'border-top: none;' : ''}">
          ${showPageNumbers ? `<div style="position: relative; z-index: 5; font-size: 11px; color: #64748b; text-align: center; margin-bottom: 6px;">Página ${idx + 1} de ${pages.length}</div>` : ''}
          ${currentFooterImageUrl ? `
          <img src="${currentFooterImageUrl}" style="
            width: ${footerWidth};
            max-height: ${footerHeight};
            height: auto;
            object-fit: ${footerFit};
            display: block;
            margin: ${isFooterFullBleed ? '0' : footerAlignMargin};
          " />` : ''}
          ${footerHtml ? footerHtml : ''}
        </div>
      </div>
    `).join('');

    const fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * { box-sizing: border-box; }
    
    html, body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      padding: 30px 10px;
      color: #1f2937;
      line-height: ${lineSpacingSelect.value};
      font-size: 14px;
      background-color: #334155;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .a4-preview-card {
      background-color: #ffffff;
      width: 210mm;
      min-height: 297mm;
      position: relative;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      margin-bottom: 25px;
      transform: scale(0.65);
      transform-origin: top center;
      margin-bottom: -95mm;
    }

    .a4-preview-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 0;
      pointer-events: none;
    }

    .a4-preview-bg img {
      width: 100%;
      height: auto;
      max-height: 297mm;
      object-fit: contain;
      object-position: top center;
    }

    .document-body {
      position: relative;
      z-index: 1;
      padding: ${paddingTop}px 15mm 35mm 15mm;
      min-height: calc(297mm - ${paddingTop}px - 35mm);
    }

    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    table, th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
    img { max-width: 100%; height: auto; display: block; margin: 12px auto; }
    
    ol, ul { padding-left: 28px; margin: 8px 0; }
    li { margin-bottom: 4px; line-height: 1.6; }
    ol ol { list-style-type: lower-alpha; margin-top: 4px; margin-bottom: 4px; }
    ol ol ol { list-style-type: lower-roman; }
    ul ul { list-style-type: circle; margin-top: 4px; margin-bottom: 4px; }
    ul ul ul { list-style-type: square; }

    ol.legal-list, ol[data-list-style="legal"] { counter-reset: legal-item; list-style-type: none !important; padding-left: 0 !important; margin: 6px 0; }
    ol.legal-list ol, ol[data-list-style="legal"] ol { counter-reset: legal-item; list-style-type: none !important; padding-left: 24px !important; margin: 4px 0; }
    ol.legal-list li, ol[data-list-style="legal"] li { counter-increment: legal-item; position: relative; list-style-type: none !important; padding-left: 45px; margin-bottom: 6px; line-height: 1.6; }
    ol.legal-list li::before, ol[data-list-style="legal"] li::before { content: counters(legal-item, ".") ". "; position: absolute; left: 0; top: 0; font-weight: 700; color: #0f172a; }

    .callout { padding: 12px 16px; border-radius: 6px; margin: 15px 0; font-size: 14px; }
    .callout-info { background-color: #eff6ff; border-left: 4px solid #3b82f6; color: #1e40af; }
    .callout-success { background-color: #ecfdf5; border-left: 4px solid #10b981; color: #065f46; }
    .callout-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; }
    .callout-danger { background-color: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; }
    .document-header { position: relative; z-index: 1; padding: 15px 15mm 0 15mm; border-bottom: 2px solid #00652c; margin-bottom: 20px; }
    .document-footer { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; z-index: 1; font-size: 11px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    previewFrameContainer.innerHTML = '';
    previewFrameContainer.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(fullDoc);
    doc.close();
  }

  async function downloadTestPdf() {
    const testData = getTestFormData();
    const showPageNumbers = showPageNumbersInput ? showPageNumbersInput.checked : true;
    
    console.log('[CLIENT] Iniciando download do PDF de teste...');
    await saveCurrentTemplate();

    if (!currentTemplateId) {
      console.warn('[CLIENT] Nenhum templateId definido para gerar o PDF.');
      return;
    }

    try {
      btnDownloadPdf.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Gerando PDF...';
      btnDownloadPdf.disabled = true;

      const response = await fetch(`/api/templates/${currentTemplateId}/gerar?download=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campos: testData,
          retornaPdf: true,
          showPageNumbers,
          bgUrl: currentBgUrl,
          headerImageUrl: currentHeaderImageUrl,
          headerImageWidth: headerImageWidthInput ? headerImageWidthInput.value : '100%',
          headerImageHeight: headerImageHeightInput ? headerImageHeightInput.value : '100',
          headerImageAlign: headerImageAlignSelect ? headerImageAlignSelect.value : 'center',
          headerImageFit: headerImageFitSelect ? headerImageFitSelect.value : 'contain',
          footerImageUrl: currentFooterImageUrl,
          footerImageWidth: footerImageWidthInput ? footerImageWidthInput.value : '100%',
          footerImageHeight: footerImageHeightInput ? footerImageHeightInput.value : '80',
          footerImageAlign: footerImageAlignSelect ? footerImageAlignSelect.value : 'center',
          footerImageFit: footerImageFitSelect ? footerImageFitSelect.value : 'contain',
          bgSize: bgSizeSelect.value,
          bgOpacity: bgOpacityRange.value,
          bgPaddingTop: `${bgPaddingTopInput.value}px`,
          bgMarginTop: `${bgMarginTopInput ? bgMarginTopInput.value : 0}px`,
          bgMarginLeft: `${bgMarginLeftInput ? bgMarginLeftInput.value : 0}px`,
          bgMarginRight: `${bgMarginRightInput ? bgMarginRightInput.value : 0}px`
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar PDF no servidor.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${currentTemplateId}_gerado.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      alert('Documento PDF gerado com sucesso!');
    } catch (err) {
      console.error('[CLIENT] Erro ao baixar PDF:', err);
      alert(`Erro ao gerar PDF: ${err.message}`);
    } finally {
      btnDownloadPdf.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Baixar PDF Final';
      btnDownloadPdf.disabled = false;
    }
  }

  // START APPLICATION
  init();
});
