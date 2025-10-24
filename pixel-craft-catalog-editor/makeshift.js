// Makeshift Module

const Makeshift = {
    recipeSearchQuery: '',

    init() {
        document.getElementById('makeshiftFileInput').addEventListener('change', (e) => {
            Utils.loadFile(e, (data) => {
                if (!data.available_recipes || !Array.isArray(data.available_recipes)) {
                    Utils.showAlert('error', 'Invalid makeshift config: missing available_recipes array');
                    return;
                }
                state.makeshift = data;
                
                // Update import metadata
                state.metadata.importedAt = new Date().toISOString();
                state.metadata.importedBy = state.metadata.username;
                State.save();
                
                this.recipeSearchQuery = '';
                this.renderEditor();
                this.updateStats();
                Utils.updateFreshnessIndicator();
                Utils.showAlert('success', `Loaded ${data.available_recipes.length} makeshift recipes`);
            });
        });

        document.getElementById('saveMakeshiftBtn').addEventListener('click', () => this.save());
        document.getElementById('validateMakeshiftBtn').addEventListener('click', () => this.validate());
    },

    renderEditor() {
        const container = document.getElementById('makeshiftEditor');

        if (state.recipes.length === 0) {
            container.innerHTML = Utils.emptyState('No recipes available', 'Import recipes_catalog.verse first');
            return;
        }

        const query = this.recipeSearchQuery.toLowerCase();
        const filteredRecipes = query 
            ? state.recipes.filter(r => r.id && r.id.toLowerCase().includes(query))
            : state.recipes;

        let html = `
            <h2>Makeshift Station Recipes</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Hand-crafting recipes available without any workstation. Click recipes to add/remove.
            </p>

            <div class="form-group">
                <input type="text" 
                       id="makeshift_recipe_search" 
                       value="${Utils.escapeHtml(this.recipeSearchQuery)}" 
                       placeholder="🔍 Search recipes by ID..." 
                       style="width: 100%; padding: 10px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-primary);"
                       oninput="Makeshift.onRecipeSearchChange(event)">
            </div>

            <div class="recipes-selector">
                ${filteredRecipes.length === 0 
                    ? '<p style="color: var(--text-secondary); margin: 10px 0;">No recipes match your search.</p>'
                    : `<div style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${filteredRecipes.map(recipe => {
                            const isSelected = state.makeshift.available_recipes.includes(recipe.id);
                            const outputItem = State.getItemById(recipe.output_item_id);
                            const outputName = outputItem ? outputItem.name : recipe.output_item_id;
                            
                            return `
                                <div class="recipe-chip ${isSelected ? 'selected' : ''}" 
                                     onclick="Makeshift.toggleRecipe('${recipe.id}')"
                                     title="${Utils.escapeHtml(outputName)} x${recipe.output_amount}">
                                    ${Utils.escapeHtml(recipe.id)}
                                </div>
                            `;
                        }).join('')}
                    </div>`
                }
                <p style="color: var(--text-secondary); font-size: 0.9em; margin-top: 10px;">
                    Click recipes to add/remove. Selected: ${state.makeshift.available_recipes.length}
                    ${query ? ` | Showing ${filteredRecipes.length} of ${state.recipes.length} recipes` : ''}
                </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: var(--bg-dark); border-radius: 5px;">
                <h4 style="color: var(--accent-success); margin: 0 0 10px 0;">
                    Selected Recipes: ${state.makeshift.available_recipes.length}
                </h4>
                <div style="color: var(--text-secondary); font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                    ${this.renderSelectedRecipesList()}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    onRecipeSearchChange(event) {
        this.recipeSearchQuery = event.target.value;
        this.renderEditor();
    },

    renderSelectedRecipesList() {
        if (state.makeshift.available_recipes.length === 0) {
            return '<p>No recipes selected</p>';
        }

        return state.makeshift.available_recipes.map(recipeId => {
            const recipe = State.getRecipeById(recipeId);
            if (!recipe) return `<div style="color: var(--accent-danger);">❌ ${recipeId} (not found)</div>`;
            
            const outputItem = State.getItemById(recipe.output_item_id);
            const outputName = outputItem ? outputItem.name : recipe.output_item_id;
            
            return `<div>✓ ${Utils.escapeHtml(recipeId)} → ${Utils.escapeHtml(outputName)} x${recipe.output_amount}</div>`;
        }).join('');
    },

    toggleRecipe(recipeId) {
        const index = state.makeshift.available_recipes.indexOf(recipeId);
        if (index > -1) {
            state.makeshift.available_recipes.splice(index, 1);
        } else {
            state.makeshift.available_recipes.push(recipeId);
        }
        this.renderEditor();
        this.updateStats();
        State.save();
    },

    save() {
        Utils.downloadJSON(state.makeshift, `makeshift_config_${Date.now()}.json`);
        Utils.showAlert('success', 'Makeshift config exported');
    },

    validate() {
        const errors = [];
        
        if (!state.makeshift.available_recipes || !Array.isArray(state.makeshift.available_recipes)) {
            errors.push('available_recipes must be an array');
        } else {
            state.makeshift.available_recipes.forEach((recipeId, i) => {
                const recipe = State.getRecipeById(recipeId);
                if (!recipe) {
                    errors.push(`Recipe ${i+1}: "${recipeId}" not found in recipes catalog`);
                }
            });
        }

        if (errors.length === 0) {
            Utils.showAlert('success', 'Makeshift config is valid! ✓');
        } else {
            Utils.showAlert('error', `Found ${errors.length} validation errors`);
            console.log('Validation errors:', errors);
        }
    },

    updateStats() {
        document.getElementById('makeshiftTotal').textContent = state.makeshift.available_recipes.length;
    }
};

window.Makeshift = Makeshift;