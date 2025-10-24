// Pixel Craft Catalog Editor - Main Application
// Initializes all modules and manages global state

console.log('🔵 app.js carregado');

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Pixel Craft Catalog Editor - Iniciando...');
    console.log('🔍 Verificando dependências...');
    console.log('  - State:', typeof State !== 'undefined' ? '✓' : '✗');
    console.log('  - Items:', typeof Items !== 'undefined' ? '✓' : '✗');
    console.log('  - Recipes:', typeof Recipes !== 'undefined' ? '✓' : '✗');
    console.log('  - Workstations:', typeof Workstations !== 'undefined' ? '✓' : '✗');
    console.log('  - Makeshift:', typeof Makeshift !== 'undefined' ? '✓' : '✗');
    console.log('  - Utils:', typeof Utils !== 'undefined' ? '✓' : '✗');
    
    // Load saved state from localStorage
    let loaded = false;
    try {
        loaded = State.load();
        if (loaded) {
            console.log('✓ Sessão anterior restaurada do localStorage');
            console.log(`  - Items: ${state.items.length}`);
            console.log(`  - Recipes: ${state.recipes.length}`);
            console.log(`  - Workstations: ${state.workstations.length}`);
            console.log(`  - Makeshift: ${state.makeshift.available_recipes.length}`);
        } else {
            console.log('ℹ Nenhuma sessão anterior encontrada');
        }
    } catch (error) {
        console.error('❌ Falha ao carregar state:', error);
    }
    
    // Initialize all modules
    try {
        console.log('🔧 Inicializando módulos...');
        Items.init();
        console.log('  ✓ Items inicializado');
        Recipes.init();
        console.log('  ✓ Recipes inicializado');
        Workstations.init();
        console.log('  ✓ Workstations inicializado');
        Makeshift.init();
        console.log('  ✓ Makeshift inicializado');
         Breakables.init();
        console.log('  ✓ Breakables inicializado');
    } catch (error) {
        console.error('❌ Falha ao inicializar módulos:', error);
    }
    
    // Setup global import/export buttons
    try {
        console.log('🔧 Configurando botões globais...');
        setupGlobalButtons();
        console.log('  ✓ Botões globais inicializados');
    } catch (error) {
        console.error('❌ Falha ao configurar botões globais:', error);
    }
    
    // Setup navigation tabs
    try {
        console.log('🔧 Configurando navegação...');
        setupNavigation();
        console.log('  ✓ Navegação inicializada');
    } catch (error) {
        console.error('❌ Falha ao configurar navegação:', error);
    }
    
    // If data was loaded, render all lists
    if (loaded) {
        try {
            console.log('📊 Renderizando dados carregados...');
            Items.renderList();
            Recipes.renderList();
            Workstations.renderList();
            Makeshift.renderEditor();
            console.log('  ✓ Todas as listas renderizadas');
        } catch (error) {
            console.error('❌ Falha ao renderizar listas:', error);
        }
    }
    
    // Start auto-save timer (saves every 30 seconds)
    try {
        Utils.startAutoSave();
        console.log('  ✓ Auto-save iniciado');
    } catch (error) {
        console.error('❌ Falha ao iniciar auto-save:', error);
    }
    
    // Update freshness indicator
    try {
        Utils.updateFreshnessIndicator();
        console.log('  ✓ Indicador de frescor atualizado');
    } catch (error) {
        console.error('❌ Falha ao atualizar indicador de frescor:', error);
    }
    
    // Update all module stats displays
    try {
        updateAllStats();
        console.log('  ✓ Estatísticas atualizadas');
    } catch (error) {
        console.error('❌ Falha ao atualizar estatísticas:', error);
    }
    
    console.log('✅ Aplicação inicializada com sucesso');
    console.log(`👤 Usuário: ${state.metadata.username}`);
});

// Setup navigation tabs
function setupNavigation() {
    console.log('🔧 setupNavigation chamado');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log(`  Encontradas ${tabs.length} abas`);
    console.log(`  Encontrados ${tabContents.length} conteúdos de abas`);
    
    tabs.forEach((tab, index) => {
        console.log(`  Configurando aba ${index}: ${tab.getAttribute('data-tab')}`);
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🖱️ Aba clicada:', tab.getAttribute('data-tab'));
            
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active to clicked
            tab.classList.add('active');
            
            // Show corresponding content
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            console.log('  Conteúdo alvo encontrado:', targetContent !== null);
            if (targetContent) {
                targetContent.classList.add('active');
                state.currentTab = targetId;
                console.log('  ✓ Aba ativada:', targetId);
            } else {
                console.error('  ✗ Conteúdo da aba não encontrado:', targetId);
            }
        });
    });
    
    // Activate first tab by default
    if (tabs.length > 0) {
        console.log('  Ativando primeira aba...');
        tabs[0].classList.add('active');
        if (tabContents[0]) {
            tabContents[0].classList.add('active');
        }
        state.currentTab = tabs[0].getAttribute('data-tab');
        console.log('  ✓ Primeira aba ativada:', state.currentTab);
    }
}

// Setup global import/export buttons
function setupGlobalButtons() {
    console.log('🔧 setupGlobalButtons chamado');
    const exportBtn = document.getElementById('exportAllBtn');
    const clearStorageBtn = document.getElementById('clearStorageBtn');
    const changeUsernameBtn = document.getElementById('changeUsernameBtn');
    
    console.log('  exportAllBtn:', exportBtn !== null);
    console.log('  clearStorageBtn:', clearStorageBtn !== null);
    console.log('  changeUsernameBtn:', changeUsernameBtn !== null);
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            console.log('🖱️ Botão de exportação clicado');
            handleExportClick();
        });
        console.log('  ✓ Listener do botão de exportação adicionado');
    } else {
        console.error('  ✗ Botão de exportação não encontrado!');
    }
    
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', () => {
            console.log('🖱️ Botão de limpar armazenamento clicado');
            handleClearStorage();
        });
        console.log('  ✓ Listener do botão de limpar armazenamento adicionado');
    } else {
        console.error('  ✗ Botão de limpar armazenamento não encontrado!');
    }

    if (changeUsernameBtn) {
        changeUsernameBtn.addEventListener('click', () => {
            console.log('🖱️ Botão de alterar usuário clicado');
            handleChangeUsername();
        });
        console.log('  ✓ Listener do botão de alterar usuário adicionado');
    } else {
        console.error('  ✗ Botão de alterar usuário não encontrado!');
    }
}

// Export handler with freshness check
function handleExportClick() {
    console.log('📤 handleExportClick chamado');
    
    // Check freshness before export
    if (!state.metadata.importedAt) {
        const msg = `⚠️ ATENÇÃO: Nenhuma importação detectada!

Você ainda não importou nenhum arquivo Verse. Exportar agora criará arquivos baseados apenas no estado atual do editor.

Fluxo recomendado:
1. Importar os arquivos Verse mais recentes do seu projeto UEFN
2. Fazer suas alterações no editor
3. Exportar de volta para Verse

Continuar exportação mesmo assim?`;
        
        if (!confirm(msg)) {
            console.log('  Exportação cancelada pelo usuário (sem importação)');
            return;
        }
    } 
    
    // Show export summary modal
    showExportModal();
}

// Show export confirmation modal with summary
function showExportModal() {
    console.log('📋 showExportModal chamado');
    
    const summary = {
        items: state.items.length,
        recipes: state.recipes.length,
        workstations: state.workstations.length,
        makeshifts: state.makeshift.available_recipes.length,
        lastImport: state.metadata.importedAt ? new Date(state.metadata.importedAt).toLocaleString('pt-BR') : 'Nunca'
    };
    
    console.log('  Resumo:', summary);
    
    const msg = `📋 Resumo da Exportação

Items: ${summary.items}
Receitas: ${summary.recipes}
Estações de Trabalho: ${summary.workstations}
Receitas Makeshift: ${summary.makeshifts}

Última Importação: ${summary.lastImport}

Isso irá gerar 4 arquivos de módulo Verse:
- items_catalog.verse
- recipes_catalog.verse
- workstations_catalog.verse
- makeshift_config.verse

Os arquivos serão baixados para a pasta de downloads do seu navegador.

Prosseguir com a exportação?`;
    
    if (confirm(msg)) {
        try {
            console.log('  ✓ Usuário confirmou exportação');
            exportAllCatalogs();
            
            // Update export metadata
            state.metadata.exportedAt = new Date().toISOString();
            state.metadata.exportedBy = state.metadata.username;
            State.save();
            
            Utils.updateFreshnessIndicator();
            console.log('  ✓ Exportação concluída com sucesso');
        } catch (error) {
            console.error('  ✗ Exportação falhou:', error);
            alert('❌ Exportação falhou: ' + error.message);
        }
    } else {
        console.log('  Exportação cancelada pelo usuário');
    }
}

// Clear localStorage handler
function handleClearStorage() {
    console.log('🗑️ handleClearStorage chamado');
    
    const storageInfo = State.getStorageInfo();
    
    if (!storageInfo) {
        alert('Nenhum dado salvo encontrado no localStorage.');
        console.log('  Nenhuma informação de armazenamento encontrada');
        return;
    }
    
    console.log('  Informação de armazenamento:', storageInfo);
    
    const msg = `⚠️ Limpar Armazenamento Local?

Isso irá deletar TODOS os dados salvos:
- Items: ${storageInfo.items}
- Receitas: ${storageInfo.recipes}
- Estações de Trabalho: ${storageInfo.workstations}
- Receitas Makeshift: ${storageInfo.makeshiftRecipes}
- Último salvamento: ${new Date(storageInfo.timestamp).toLocaleString('pt-BR')}
- Tamanho do armazenamento: ${storageInfo.sizeKB} KB

Esta ação NÃO PODE ser desfeita!

Continuar?`;
    
    if (confirm(msg)) {
        console.log('  ✓ Usuário confirmou limpeza de armazenamento');
        State.clearStorage();
        State.reset();
        
        // Reload page to reset UI
        console.log('  Recarregando página...');
        window.location.reload();
    } else {
        console.log('  Limpeza de armazenamento cancelada pelo usuário');
    }
}

// Change username handler
function handleChangeUsername() {
    console.log('👤 handleChangeUsername chamado');
    
    const currentUser = state.metadata.username;
    const newUsername = prompt('Digite o novo nome de usuário:', currentUser);
    
    console.log('  Nome de usuário atual:', currentUser);
    console.log('  Novo nome de usuário:', newUsername);
    
    if (newUsername && newUsername.trim() && newUsername.trim() !== currentUser) {
        state.metadata.username = newUsername.trim();
        
        // Also update localStorage username
        localStorage.setItem('pixelcraft_username', newUsername.trim());
        
        State.save();
        Utils.updateFreshnessIndicator();
        alert(`✅ Nome de usuário alterado para: ${newUsername.trim()}`);
        console.log('  ✓ Nome de usuário alterado com sucesso');
    } else {
        console.log('  Alteração de nome de usuário cancelada ou inválida');
    }
}

// Update all module statistics
function updateAllStats() {
    console.log('📊 updateAllStats chamado');
    if (window.Items) {
        Items.updateStats();
        console.log('  ✓ Estatísticas de Items atualizadas');
    }
    if (window.Recipes) {
        Recipes.updateStats();
        console.log('  ✓ Estatísticas de Recipes atualizadas');
    }
    if (window.Workstations) {
        Workstations.updateStats();
        console.log('  ✓ Estatísticas de Workstations atualizadas');
    }
    if (window.Makeshift) {
        Makeshift.updateStats();
        console.log('  ✓ Estatísticas de Makeshift atualizadas');
    }
}

// Export for use in other modules
window.updateAllStats = updateAllStats;

console.log('🔵 Definições do app.js completas');