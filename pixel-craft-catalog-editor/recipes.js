// Recipes Module

const Recipes = {
    init() {
        document.getElementById('recipesFileInput').addEventListener('change', (e) => {
            Utils.loadFile(e, (data) => {
                if (!Array.isArray(data)) {
                    Utils.showAlert('error', 'Invalid data: Expected an array of recipes');
                    return;
                }
                state.recipes = data;
                state.selectedRecipe = null;
                
                // Update import metadata
                state.metadata.importedAt = new Date().toISOString();
                state.metadata.importedBy = state.metadata.username;
                State.save();
                
                this.renderList();
                this.updateStats();
                
                // Update makeshift editor if it's visible
                if (window.Makeshift) {
                    Makeshift.renderEditor();
                }
                
                Utils.updateFreshnessIndicator();
                Utils.showAlert('success', `Loaded ${data.length} recipes`);
            });
        });

        document.getElementById('addRecipeBtn').addEventListener('click', () => this.addNew());
        document.getElementById('validateRecipesBtn').addEventListener('click', () => this.validate());
        document.getElementById('recipesSearchInput').addEventListener('input', (e) => {
            this.renderList(e.target.value);
        });
    },

    renderList(searchQuery = '') {
        const container = document.getElementById('recipesList');
        let filtered = state.recipes;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = state.recipes.filter(recipe => 
                (recipe.id && recipe.id.toLowerCase().includes(query)) ||
                (recipe.output_item_id && recipe.output_item_id.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = Utils.emptyState('No recipes found', searchQuery ? 'Try a different search' : 'Import recipes_catalog.verse');
            return;
        }

        container.innerHTML = filtered.map((recipe, index) => {
            const originalIndex = state.recipes.indexOf(recipe);
            const outputItem = State.getItemById(recipe.output_item_id);
            const outputName = outputItem ? outputItem.name : recipe.output_item_id;
            const difficulty = recipe.skilled_difficulty || 0;
            const diffGroup = CONSTANTS.DIFFICULTY_GROUPS.find(g => difficulty >= g.min && difficulty <= g.max);
            
            return `
                <div class="item-card ${state.selectedRecipe === originalIndex ? 'active' : ''}" 
                     onclick="Recipes.select(${originalIndex})">
                    <div class="item-card-header">
                        <span class="item-name">${Utils.escapeHtml(recipe.id || 'Unnamed')}</span>
                        <span class="difficulty-badge ${diffGroup?.class || 'diff-easy'}" title="${diffGroup?.label || 'Easy'}">
                            Diff: ${difficulty}
                        </span>
                    </div>
                    <div class="item-id">→ ${Utils.escapeHtml(outputName)} x${recipe.output_amount || 1}</div>
                    <div style="margin-top: 5px; color: var(--text-secondary); font-size: 0.9em;">
                        ${(recipe.materials || []).length} materials
                    </div>
                </div>
            `;
        }).join('');
    },

    select(index) {
        state.selectedRecipe = index;
        this.renderList();
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('recipesEditor');
        
        if (state.selectedRecipe === null) {
            container.innerHTML = Utils.emptyState('Select a recipe to edit', 'Or create a new one');
            return;
        }

        const recipe = state.recipes[state.selectedRecipe];

        let html = `
            <h2>Edit Recipe</h2>
            
            <div class="form-group">
                <label>Recipe ID <span class="required">*</span></label>
                <input type="text" id="recipe_id" value="${Utils.escapeHtml(recipe.id || '')}" placeholder="recipe_unique_id">
            </div>

            <h3>Output</h3>

            <div class="form-group">
                <label>Output Item ID <span class="required">*</span></label>
                <input type="text" id="recipe_output_id" value="${Utils.escapeHtml(recipe.output_item_id || '')}" placeholder="item_id">
                <small style="color: var(--text-secondary);">What item this recipe creates</small>
            </div>

            <div class="form-group">
                <label>Output Amount <span class="required">*</span></label>
                <input type="number" id="recipe_output_amount" value="${recipe.output_amount || 1}" min="1">
            </div>

            <h3>Materials</h3>

            <div class="materials-editor" id="recipeMaterialsEditor">
                ${this.renderMaterials(recipe.materials || [])}
            </div>
            <button type="button" class="btn btn-secondary btn-small" onclick="Recipes.addMaterial()" style="margin-top: 10px;">+ Add Material</button>

            <h3>Settings</h3>

            <div class="form-group">
                <label>Skilled Difficulty (${CONSTANTS.MIN_DIFFICULTY}-${CONSTANTS.MAX_DIFFICULTY})</label>
                <input type="number" id="recipe_difficulty" value="${recipe.skilled_difficulty || 0}" min="${CONSTANTS.MIN_DIFFICULTY}" max="${CONSTANTS.MAX_DIFFICULTY}">
                <small style="color: var(--text-secondary);">Higher = harder skill check required</small>
            </div>

            <div class="form-group checkbox-group">
                <input type="checkbox" id="recipe_visible" ${recipe.should_start_visible ? 'checked' : ''}>
                <label for="recipe_visible">Visible from start (not hidden until materials discovered)</label>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button type="button" class="btn btn-success" onclick="Recipes.save()">💾 Save</button>
                <button type="button" class="btn btn-danger" onclick="Recipes.delete()">🗑️ Delete</button>
                <button type="button" class="btn btn-secondary" onclick="Recipes.duplicate()">📋 Duplicate</button>
            </div>
        `;

        container.innerHTML = html;
    },

    renderMaterials(materials) {
        if (materials.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 10px 0;">No materials</p>';
        }

        return materials.map((mat, index) => {
            const item = State.getItemById(mat.item_id);
            const itemName = item ? item.name : '';

            return `
                <div class="material-row">
                    <div class="form-group">
                        <label>Item ID</label>
                        <input type="text" id="recipe_mat_id_${index}" value="${Utils.escapeHtml(mat.item_id || '')}" placeholder="item_id">
                        ${itemName ? `<small style="color: var(--accent-success);">${Utils.escapeHtml(itemName)}</small>` : ''}
                    </div>
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="number" id="recipe_mat_amount_${index}" value="${mat.amount || 1}" min="1">
                    </div>
                    <button type="button" class="btn btn-danger btn-small" onclick="Recipes.removeMaterial(${index})">✕</button>
                </div>
            `;
        }).join('');
    },

    saveCurrentFieldValues() {
        if (state.selectedRecipe === null) return;
        
        const recipe = state.recipes[state.selectedRecipe];
        
        const idField = document.getElementById('recipe_id');
        const outputIdField = document.getElementById('recipe_output_id');
        const outputAmountField = document.getElementById('recipe_output_amount');
        const difficultyField = document.getElementById('recipe_difficulty');
        const visibleField = document.getElementById('recipe_visible');
        
        if (idField) recipe.id = idField.value;
        if (outputIdField) recipe.output_item_id = outputIdField.value;
        if (outputAmountField) recipe.output_amount = parseInt(outputAmountField.value) || 1;
        if (difficultyField) recipe.skilled_difficulty = parseInt(difficultyField.value) || 0;
        if (visibleField) recipe.should_start_visible = visibleField.checked;
        
        const materials = [];
        let i = 0;
        while (document.getElementById(`recipe_mat_id_${i}`)) {
            const id = document.getElementById(`recipe_mat_id_${i}`).value.trim();
            const amount = parseInt(document.getElementById(`recipe_mat_amount_${i}`).value) || 1;
            if (id) materials.push({ item_id: id, amount });
            i++;
        }
        recipe.materials = materials;
    },

    addMaterial() {
        const recipe = state.recipes[state.selectedRecipe];
        
        this.saveCurrentFieldValues();
        
        if (!recipe.materials) recipe.materials = [];
        recipe.materials.push({ item_id: '', amount: 1 });
        State.save();
        this.renderEditor();
    },

    removeMaterial(index) {
        const recipe = state.recipes[state.selectedRecipe];
        
        this.saveCurrentFieldValues();
        
        recipe.materials.splice(index, 1);
        State.save();
        this.renderEditor();
    },

    save() {
        const recipe = state.recipes[state.selectedRecipe];
        
        recipe.id = document.getElementById('recipe_id').value;
        recipe.output_item_id = document.getElementById('recipe_output_id').value;
        recipe.output_amount = parseInt(document.getElementById('recipe_output_amount').value);
        recipe.skilled_difficulty = parseInt(document.getElementById('recipe_difficulty').value);
        recipe.should_start_visible = document.getElementById('recipe_visible').checked;

        const materials = [];
        let i = 0;
        while (document.getElementById(`recipe_mat_id_${i}`)) {
            const id = document.getElementById(`recipe_mat_id_${i}`).value.trim();
            const amount = parseInt(document.getElementById(`recipe_mat_amount_${i}`).value);
            if (id) materials.push({ item_id: id, amount });
            i++;
        }
        recipe.materials = materials;

        const errors = this.validateRecipe(recipe);
        if (errors.length > 0) {
            Utils.showAlert('error', `Validation failed: ${errors.join(', ')}`);
            return;
        }

        this.renderList();
        this.renderEditor();
        this.updateStats();
        
        if (window.Makeshift) {
            Makeshift.renderEditor();
        }
        
        State.save();
        Utils.showAlert('success', 'Recipe saved');
    },

    delete() {
        if (!confirm('Delete this recipe?')) return;
        state.recipes.splice(state.selectedRecipe, 1);
        state.selectedRecipe = null;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        
        if (window.Makeshift) {
            Makeshift.renderEditor();
        }
        
        State.save();
        Utils.showAlert('success', 'Recipe deleted');
    },

    duplicate() {
        const recipe = JSON.parse(JSON.stringify(state.recipes[state.selectedRecipe]));
        recipe.id = `${recipe.id}_copy_${Date.now()}`;
        state.recipes.push(recipe);
        state.selectedRecipe = state.recipes.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Recipe duplicated');
    },

    addNew() {
        const newRecipe = {
            id: `new_recipe_${Date.now()}`,
            output_item_id: '',
            output_amount: 1,
            materials: [],
            skilled_difficulty: 0,
            should_start_visible: false
        };
        state.recipes.push(newRecipe);
        state.selectedRecipe = state.recipes.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'New recipe created');
    },

    validateRecipe(recipe) {
        const errors = [];
        
        if (!recipe.id) errors.push('ID required');
        if (!recipe.output_item_id) {
            errors.push('Output item required');
        } else {
            const outputItem = State.getItemById(recipe.output_item_id);
            if (!outputItem) {
                errors.push(`Output item "${recipe.output_item_id}" not found in items catalog`);
            }
        }
        
        if (!recipe.materials || recipe.materials.length === 0) {
            errors.push('At least 1 material required');
        }
        
        if (recipe.materials) {
            recipe.materials.forEach((mat, i) => {
                if (!mat.item_id) {
                    errors.push(`Material ${i+1}: ID required`);
                } else {
                    const item = State.getItemById(mat.item_id);
                    if (!item) {
                        errors.push(`Material ${i+1}: item "${mat.item_id}" not found in items catalog`);
                    }
                }
                if (!mat.amount || mat.amount < 1) {
                    errors.push(`Material ${i+1}: amount must be >= 1`);
                }
            });
        }

        return errors;
    },

    validate() {
        const allErrors = [];
        state.recipes.forEach((recipe, index) => {
            const errors = this.validateRecipe(recipe);
            if (errors.length > 0) {
                allErrors.push({ index, id: recipe.id, errors });
            }
        });

        if (allErrors.length === 0) {
            Utils.showAlert('success', 'All recipes are valid! ✓');
        } else {
            Utils.showAlert('error', `Found ${allErrors.length} recipes with errors`);
            console.log('Validation errors:', allErrors);
        }
    },

    updateStats() {
        const stats = {
            total: state.recipes.length,
            totalMaterials: 0
        };

        state.recipes.forEach(recipe => {
            stats.totalMaterials += (recipe.materials || []).length;
        });

        document.getElementById('recipesTotal').textContent = stats.total;
        document.getElementById('recipesAvgMaterials').textContent = stats.total > 0 
            ? (stats.totalMaterials / stats.total).toFixed(1) 
            : '0';
    }
};

window.Recipes = Recipes;