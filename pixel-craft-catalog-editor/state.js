// Global Application State with Local Storage
const STORAGE_KEY = 'pixelcraft_editor_data';

const state = {
    items: [],
    recipes: [],
    workstations: [],
    makeshift: { available_recipes: [] },
    breakables: [], 
    selectedItem: null,
    selectedRecipe: null,
    selectedWorkstation: null,
    selectedBreakable: null,
    currentTab: 'itemsTab',
    metadata: {
        username: 'unknown',
        importedAt: null,
        importedBy: null,
        exportedAt: null,
        exportedBy: null,
        importedHash: null
    }
};

// State helpers
const State = {
    reset() {
        state.items = [];
        state.recipes = [];
        state.workstations = [];
        state.makeshift = { available_recipes: [] };
        state.breakables = [];
        state.selectedItem = null;
        state.selectedRecipe = null;
        state.selectedWorkstation = null;
        state.selectedBreakable = null;
        state.metadata = {
            username: state.metadata.username,
            importedAt: null,
            importedBy: null,
            exportedAt: null,
            exportedBy: null,
            importedHash: null
        };
    },
    
    getItemById(id) {
        return state.items.find(item => item.id === id);
    },
    
    getRecipeById(id) {
        return state.recipes.find(recipe => recipe.id === id);
    },
    
    getWorkstationById(id) {
        return state.workstations.find(ws => ws.workstation_def_id === id);
    },

    getBreakableById(id) {
        return state.breakables.find(br => br.id === id);
    },

    save() {
        try {
            const dataToSave = {
                items: state.items,
                recipes: state.recipes,
                workstations: state.workstations,
                makeshift: state.makeshift,
                breakables: state.breakables, // ✓ Salva junto com tudo
                metadata: state.metadata,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            
            localStorage.setItem('items', JSON.stringify(state.items));
            
            console.log('✓ State saved to localStorage');
            console.log('  - Items:', state.items.length);
            console.log('  - Breakables:', state.breakables.length);
        } catch (e) {
            console.error('❌ Failed to save state:', e);
        }
    },

    load() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (!savedData) return false;
            const data = JSON.parse(savedData);
            state.items = data.items || [];
            state.recipes = data.recipes || [];
            state.workstations = data.workstations || [];
            state.makeshift = data.makeshift || { available_recipes: [] };
            state.breakables = data.breakables || []; // ✓ Carrega junto com tudo
            state.metadata = data.metadata || state.metadata;
            return true;
        } catch (e) {
            console.error('❌ Failed to load state:', e);
            return false;
        }
    },

    // Get or prompt for username
    getUsername() {
        // 1. Check if already stored in state
        if (state.metadata.username && state.metadata.username !== 'unknown') {
            return state.metadata.username;
        }

        // 2. Check localStorage for username
        const storedUsername = localStorage.getItem('pixelcraft_username');
        if (storedUsername) {
            return storedUsername;
        }

        // 3. Prompt user for username
        const username = prompt('Digite seu nome de usuário para o editor:', '');
        const finalUsername = username && username.trim() ? username.trim() : 'unknown';
        localStorage.setItem('pixelcraft_username', finalUsername);
        return finalUsername;
    },

    // Clear Local Storage
    clearStorage() {
        try {
            const username = state.metadata.username; // Preserve username
            localStorage.removeItem(STORAGE_KEY);
            console.log('✓ Local Storage limpo');
            
            // Reset state but keep username
            this.reset();
            state.metadata.username = username;
            
            return true;
        } catch (error) {
            console.error('Falha ao limpar Local Storage:', error);
            return false;
        }
    },

    // Get storage info
    getStorageInfo() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return null;

        try {
            const data = JSON.parse(savedData);
            return {
                items: data.items?.length || 0,
                recipes: data.recipes?.length || 0,
                workstations: data.workstations?.length || 0,
                makeshiftRecipes: data.makeshift?.available_recipes?.length || 0,
                breakables: data.breakables?.length || 0,
                timestamp: data.timestamp,
                sizeKB: (new Blob([savedData]).size / 1024).toFixed(2),
                username: data.metadata?.username || 'unknown',
                importedAt: data.metadata?.importedAt,
                exportedAt: data.metadata?.exportedAt
            };
        } catch {
            return null;
        }
    },

    // Update storage info display
    updateStorageInfo() {
        const info = this.getStorageInfo();
        const storageDisplay = document.getElementById('storageSize');
        
        if (storageDisplay && info) {
            storageDisplay.textContent = `${info.sizeKB} KB`;
            storageDisplay.title = `Items: ${info.items}, Receitas: ${info.recipes}, Estações: ${info.workstations}, Makeshift: ${info.makeshiftRecipes}`;
        }
    },

    // Generate hash for freshness tracking
    generateHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    },

    // Check if data has changed since import
    hasChangedSinceImport() {
        if (!state.metadata.importedHash) return false;
        
        const currentHash = this.generateHash(JSON.stringify({
            items: state.items,
            recipes: state.recipes,
            workstations: state.workstations,
            makeshift: state.makeshift
        }));
        
        return currentHash !== state.metadata.importedHash;
    }
};

// Export to window
window.state = state;
window.State = State;