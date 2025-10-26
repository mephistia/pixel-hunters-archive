// Workstations Module

const Workstations = {
    recipeSearchQuery: '',

    init() {
        document.getElementById('workstationsFileInput').addEventListener('change', (e) => {
            Utils.loadFile(e, (data) => {
                if (!Array.isArray(data)) {
                    Utils.showAlert('error', 'Invalid data: Expected an array of workstations');
                    return;
                }
                state.workstations = data;
                state.selectedWorkstation = null;
                
                // Update import metadata
                state.metadata.importedAt = new Date().toISOString();
                state.metadata.importedBy = state.metadata.username;
                State.save();
                
                this.renderList();
                this.updateStats();
                Utils.updateFreshnessIndicator();
                Utils.showAlert('success', `Loaded ${data.length} workstations`);
            });
        });

        document.getElementById('addWorkstationBtn').addEventListener('click', () => this.addNew());
        document.getElementById('validateWorkstationsBtn').addEventListener('click', () => this.validate());
        document.getElementById('workstationsSearchInput').addEventListener('input', (e) => {
            this.renderList(e.target.value);
        });
    },

    renderList(searchQuery = '') {
        const container = document.getElementById('workstationsList');
        let filtered = state.workstations;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = state.workstations.filter(ws => 
                (ws.workstation_def_id && ws.workstation_def_id.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = Utils.emptyState('No workstations found', searchQuery ? 'Try a different search' : 'Import WorkstationsCatalog.verse');
            return;
        }

        container.innerHTML = filtered.map((ws, index) => {
            const originalIndex = state.workstations.indexOf(ws);
            const item = State.getItemById(ws.workstation_def_id);
            const name = item ? item.name : ws.workstation_def_id;
            
            return `
                <div class="item-card ${state.selectedWorkstation === originalIndex ? 'active' : ''}" 
                     onclick="Workstations.select(${originalIndex})">
                    <div class="item-card-header">
                        <span class="item-name">${Utils.escapeHtml(name)}</span>
                    </div>
                    <div class="item-id">${Utils.escapeHtml(ws.workstation_def_id || 'no-id')}</div>
                    <div style="margin-top: 8px; font-size: 0.9em; color: var(--text-secondary);">
                        ${(ws.available_recipes || []).length} recipes | ${(ws.upgrades || []).length} upgrades
                    </div>
                </div>
            `;
        }).join('');
    },

    select(index) {
        state.selectedWorkstation = index;
        this.recipeSearchQuery = '';
        this.renderList();
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('workstationsEditor');
        
        if (state.selectedWorkstation === null) {
            container.innerHTML = Utils.emptyState('Select a workstation to edit', 'Or create a new one');
            return;
        }

        const ws = state.workstations[state.selectedWorkstation];

        let html = `
            <h2>Edit Workstation Content</h2>
            
            <div class="form-group">
                <label>Workstation Item ID <span class="required">*</span></label>
                <input type="text" id="ws_def_id" value="${Utils.escapeHtml(ws.workstation_def_id || '')}" placeholder="placeable_item_id">
                <small style="color: var(--text-secondary);">ID of the placeable item with behavior_type="Workstation"</small>
            </div>

            <h3>Available Recipes</h3>
            <div class="form-group">
                <input type="text" 
                    id="ws_recipe_search" 
                    value="${Utils.escapeHtml(this.recipeSearchQuery)}" 
                    placeholder="🔍 Search recipes by ID..." 
                    style="width: 100%; padding: 10px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-primary);"
                    oninput="Workstations.onRecipeSearchChange(event)">
            </div>
            <div class="recipes-selector" id="wsRecipesSelector">
                ${this.renderRecipesSelector(ws.available_recipes || [])}
            </div>

            <h3>Upgrades</h3>
            <div class="upgrades-editor" id="wsUpgradesEditor">
                ${this.renderUpgrades(ws.upgrades || [])}
            </div>
            <button type="button" class="btn btn-secondary btn-small" onclick="Workstations.addUpgrade()" style="margin-top: 10px;">+ Add Upgrade</button>

            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button type="button" class="btn btn-success" onclick="Workstations.save()">💾 Save</button>
                <button type="button" class="btn btn-danger" onclick="Workstations.delete()">🗑️ Delete</button>
                <button type="button" class="btn btn-secondary" onclick="Workstations.duplicate()">📋 Duplicate</button>
            </div>
        `;

        container.innerHTML = html;
    },

    renderUpgrades(upgrades) {
        if (upgrades.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 10px 0;">No upgrades defined</p>';
        }

        return upgrades.map((upgrade, index) => `
            <div class="upgrade-row" style="background: var(--bg-dark); padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: var(--accent-primary); margin: 0;">Upgrade Level ${upgrade.target_level || index + 1}</h4>
                    <button type="button" class="btn btn-danger btn-small" onclick="Workstations.removeUpgrade(${index})">✕ Remove</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Upgrade ID</label>
                        <input type="text" id="ws_upgrade_id_${index}" value="${Utils.escapeHtml(upgrade.id || '')}" placeholder="upgrade_unique_id">
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Target Level (1-${CONSTANTS.MAX_UPGRADE_LEVEL})</label>
                        <input type="number" id="ws_upgrade_level_${index}" value="${upgrade.target_level || index + 1}" min="1" max="${CONSTANTS.MAX_UPGRADE_LEVEL}">
                    </div>
                </div>

                <div class="form-group">
                    <label>Effect Description</label>
                    <textarea id="ws_upgrade_desc_${index}" placeholder="What this upgrade does..." style="min-height: 60px;">${Utils.escapeHtml(upgrade.effect_description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>Boost Types</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px;">
                        ${CONSTANTS.BOOST_TYPES.map(boost => {
                            const isSelected = (upgrade.boost_types || []).includes(boost.value);
                            return `
                                <label class="checkbox-group" style="margin: 0;">
                                    <input type="checkbox" 
                                        id="ws_upgrade_${index}_boost_${boost.value}"
                                        ${isSelected ? 'checked' : ''}>
                                    <span class="boost-badge ${boost.class}">${boost.label}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label>Recipes Unlocked at This Level</label>
                    <div style="background: var(--bg-medium); padding: 10px; border-radius: 5px;">
                        <input type="text" 
                            id="ws_upgrade_${index}_recipe_search" 
                            placeholder="🔍 Search recipes to add..." 
                            style="width: 100%; padding: 8px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-primary); margin-bottom: 10px;"
                            oninput="Workstations.onUpgradeRecipeSearchChange(${index}, event)">
                        <div id="ws_upgrade_${index}_recipes_container">
                            ${this.renderUpgradeRecipes(upgrade.available_recipes_ids || [], index)}
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Upgrade Requirements (Materials)</label>
                    <div style="background: var(--bg-medium); padding: 10px; border-radius: 5px;">
                        ${this.renderUpgradeMaterials(upgrade.upgrade_requirements || [], index)}
                        <button type="button" class="btn btn-secondary btn-small" onclick="Workstations.addUpgradeMaterial(${index})" style="margin-top: 10px;">+ Add Material</button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderUpgradeMaterials(materials, upgradeIndex) {
        if (materials.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 5px 0; font-size: 0.9em;">No materials required</p>';
        }

        return materials.map((mat, matIndex) => {
            const item = State.getItemById(mat.item_id);
            const itemName = item ? item.name : '';

            return `
                <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: start;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.85em;">Item ID</label>
                        <input type="text" id="ws_upgrade_${upgradeIndex}_mat_id_${matIndex}" 
                            value="${Utils.escapeHtml(mat.item_id || '')}" placeholder="item_id">
                        ${itemName ? `<small style="color: var(--accent-success); display: block; margin-top: 2px;">${Utils.escapeHtml(itemName)}</small>` : ''}
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.85em;">Amount</label>
                        <input type="number" id="ws_upgrade_${upgradeIndex}_mat_amount_${matIndex}" 
                            value="${mat.amount || 1}" min="1">
                    </div>
                    <button type="button" class="btn btn-danger btn-small" onclick="Workstations.removeUpgradeMaterial(${upgradeIndex}, ${matIndex})" style="margin-top: 20px;">✕</button>
                </div>
            `;
        }).join('');
    },

    renderUpgradeRecipes(selectedRecipes, upgradeIndex) {
        if (state.recipes.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 5px 0; font-size: 0.9em;">No recipes available. Import RecipesCatalog.verse first.</p>';
        }

        const searchInput = document.getElementById(`ws_upgrade_${upgradeIndex}_recipe_search`);
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        
        const filteredRecipes = query 
            ? state.recipes.filter(r => r.id && r.id.toLowerCase().includes(query))
            : state.recipes.slice(0, 20); // Limit to 20 when no search

        const selectedHtml = selectedRecipes.length > 0 ? `
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-secondary); font-size: 0.85em;">Selected (${selectedRecipes.length}):</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                    ${selectedRecipes.map(recipeId => `
                        <div class="recipe-chip selected" onclick="Workstations.toggleUpgradeRecipe(${upgradeIndex}, '${recipeId}')">
                            ${Utils.escapeHtml(recipeId)}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const availableToShow = filteredRecipes.filter(recipe => !selectedRecipes.includes(recipe.id));
        
        const availableHtml = availableToShow.length > 0 ? `
            <div>
                <strong style="color: var(--text-secondary); font-size: 0.85em;">Available ${query ? `(${filteredRecipes.length} matches)` : `(showing ${filteredRecipes.length})`}:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                    ${availableToShow.map(recipe => `
                        <div class="recipe-chip" onclick="Workstations.toggleUpgradeRecipe(${upgradeIndex}, '${recipe.id}')">
                            ${Utils.escapeHtml(recipe.id)}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '<p style="color: var(--text-secondary); margin: 5px 0; font-size: 0.9em;">No recipes match your search.</p>';

        return selectedHtml + availableHtml;
    },

    onUpgradeRecipeSearchChange(upgradeIndex, event) {
        const ws = state.workstations[state.selectedWorkstation];
        if (!ws.upgrades[upgradeIndex].available_recipes_ids) {
            ws.upgrades[upgradeIndex].available_recipes_ids = [];
        }
        const container = document.getElementById(`ws_upgrade_${upgradeIndex}_recipes_container`);
        container.innerHTML = this.renderUpgradeRecipes(ws.upgrades[upgradeIndex].available_recipes_ids, upgradeIndex);
    },

    toggleUpgradeRecipe(upgradeIndex, recipeId) {
        const ws = state.workstations[state.selectedWorkstation];
        if (!ws.upgrades[upgradeIndex].available_recipes_ids) {
            ws.upgrades[upgradeIndex].available_recipes_ids = [];
        }
        
        const recipes = ws.upgrades[upgradeIndex].available_recipes_ids;
        const index = recipes.indexOf(recipeId);
        
        if (index > -1) {
            recipes.splice(index, 1);
        } else {
            recipes.push(recipeId);
        }
        
        const container = document.getElementById(`ws_upgrade_${upgradeIndex}_recipes_container`);
        container.innerHTML = this.renderUpgradeRecipes(recipes, upgradeIndex);
    },

    onUpgradeRecipeSearchChange(upgradeIndex, event) {
        const ws = state.workstations[state.selectedWorkstation];
        if (!ws.upgrades[upgradeIndex].available_recipes_ids) {
            ws.upgrades[upgradeIndex].available_recipes_ids = [];
        }
        const container = document.getElementById(`ws_upgrade_${upgradeIndex}_recipes_container`);
        container.innerHTML = this.renderUpgradeRecipes(ws.upgrades[upgradeIndex].available_recipes_ids, upgradeIndex);
    },

    onRecipeSearchChange(event) {
        this.recipeSearchQuery = event.target.value;
        const ws = state.workstations[state.selectedWorkstation];
        const container = document.getElementById('wsRecipesSelector');
        container.innerHTML = this.renderRecipesSelector(ws.available_recipes || []);
    },

    renderRecipesSelector(selectedRecipes) {
        if (state.recipes.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 10px 0;">No recipes available. Import RecipesCatalog.verse first.</p>';
        }

        const query = this.recipeSearchQuery.toLowerCase();
        const filteredRecipes = query 
            ? state.recipes.filter(r => r.id && r.id.toLowerCase().includes(query))
            : state.recipes;

        if (filteredRecipes.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 10px 0;">No recipes match your search.</p>';
        }

        return `
            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                ${filteredRecipes.map(recipe => {
                    const isSelected = selectedRecipes.includes(recipe.id);
                    return `
                        <div class="recipe-chip ${isSelected ? 'selected' : ''}" 
                             onclick="Workstations.toggleRecipe('${recipe.id}')">
                            ${Utils.escapeHtml(recipe.id)}
                        </div>
                    `;
                }).join('')}
            </div>
            <p style="color: var(--text-secondary); font-size: 0.9em;">
                Click recipes to add/remove. Selected: ${selectedRecipes.length}
                ${query ? ` | Showing ${filteredRecipes.length} of ${state.recipes.length} recipes` : ''}
            </p>
        `;
    },

    toggleRecipe(recipeId) {
        const ws = state.workstations[state.selectedWorkstation];
        if (!ws.available_recipes) ws.available_recipes = [];
        
        const index = ws.available_recipes.indexOf(recipeId);
        if (index > -1) {
            ws.available_recipes.splice(index, 1);
        } else {
            ws.available_recipes.push(recipeId);
        }
        
        const container = document.getElementById('wsRecipesSelector');
        container.innerHTML = this.renderRecipesSelector(ws.available_recipes);
    },

    addUpgrade() {
        const ws = state.workstations[state.selectedWorkstation];
        
        // ✅ SAVE BEFORE RE-RENDERING
        this.saveCurrentFieldValues();
        
        if (!ws.upgrades) ws.upgrades = [];
        
        const nextLevel = ws.upgrades.length + 1;
        ws.upgrades.push({
            id: `${ws.workstation_def_id}_upgrade_${nextLevel}`,
            target_level: nextLevel,
            upgrade_requirements: [],
            effect_description: '',
            boost_types: [],
            available_recipes_ids: []  // NOVO
        });
        
        this.renderEditor();
    },

    removeUpgrade(index) {
        if (!confirm('Remove this upgrade?')) return;
        
        const ws = state.workstations[state.selectedWorkstation];
        
        // ✅ SAVE BEFORE RE-RENDERING
        this.saveCurrentFieldValues();
        
        ws.upgrades.splice(index, 1);
        this.renderEditor();
    },

    addUpgradeMaterial(upgradeIndex) {
        const ws = state.workstations[state.selectedWorkstation];
        
        // ✅ SAVE BEFORE RE-RENDERING
        this.saveCurrentFieldValues();
        
        if (!ws.upgrades[upgradeIndex].upgrade_requirements) {
            ws.upgrades[upgradeIndex].upgrade_requirements = [];
        }
        ws.upgrades[upgradeIndex].upgrade_requirements.push({ item_id: '', amount: 1 });
        this.renderEditor();
    },

    removeUpgradeMaterial(upgradeIndex, matIndex) {
        const ws = state.workstations[state.selectedWorkstation];
        
        // ✅ SAVE BEFORE RE-RENDERING
        this.saveCurrentFieldValues();
        
        ws.upgrades[upgradeIndex].upgrade_requirements.splice(matIndex, 1);
        this.renderEditor();
    },

    saveCurrentFieldValues() {
        if (state.selectedWorkstation === null) return;
        
        const ws = state.workstations[state.selectedWorkstation];
        
        const defIdField = document.getElementById('ws_def_id');
        if (defIdField) ws.workstation_def_id = defIdField.value;
        
        const upgrades = [];
        let i = 0;
        while (document.getElementById(`ws_upgrade_id_${i}`)) {
            const upgrade = {
                id: document.getElementById(`ws_upgrade_id_${i}`).value,
                target_level: parseInt(document.getElementById(`ws_upgrade_level_${i}`).value) || (i + 1),
                effect_description: document.getElementById(`ws_upgrade_desc_${i}`).value,
                boost_types: [],
                available_recipes_ids: ws.upgrades[i]?.available_recipes_ids || [],
                upgrade_requirements: []
            };

            CONSTANTS.BOOST_TYPES.forEach(boost => {
                const checkbox = document.getElementById(`ws_upgrade_${i}_boost_${boost.value}`);
                if (checkbox && checkbox.checked) {
                    upgrade.boost_types.push(boost.value);
                }
            });

            let j = 0;
            while (document.getElementById(`ws_upgrade_${i}_mat_id_${j}`)) {
                const itemId = document.getElementById(`ws_upgrade_${i}_mat_id_${j}`).value.trim();
                const amount = parseInt(document.getElementById(`ws_upgrade_${i}_mat_amount_${j}`).value) || 1;
                if (itemId) {
                    upgrade.upgrade_requirements.push({ item_id: itemId, amount });
                }
                j++;
            }

            upgrades.push(upgrade);
            i++;
        }
        ws.upgrades = upgrades;
    },

    save() {
        const ws = state.workstations[state.selectedWorkstation];
        
        ws.workstation_def_id = document.getElementById('ws_def_id').value;

        const upgrades = [];
        let i = 0;
        while (document.getElementById(`ws_upgrade_id_${i}`)) {
            const upgrade = {
                id: document.getElementById(`ws_upgrade_id_${i}`).value,
                target_level: parseInt(document.getElementById(`ws_upgrade_level_${i}`).value),
                effect_description: document.getElementById(`ws_upgrade_desc_${i}`).value,
                boost_types: [],
                available_recipes_ids: ws.upgrades[i]?.available_recipes_ids || [],  // NOVO
                upgrade_requirements: []
            };

            CONSTANTS.BOOST_TYPES.forEach(boost => {
                const checkbox = document.getElementById(`ws_upgrade_${i}_boost_${boost.value}`);
                if (checkbox && checkbox.checked) {
                    upgrade.boost_types.push(boost.value);
                }
            });

            let j = 0;
            while (document.getElementById(`ws_upgrade_${i}_mat_id_${j}`)) {
                const itemId = document.getElementById(`ws_upgrade_${i}_mat_id_${j}`).value.trim();
                const amount = parseInt(document.getElementById(`ws_upgrade_${i}_mat_amount_${j}`).value);
                if (itemId) {
                    upgrade.upgrade_requirements.push({ item_id: itemId, amount });
                }
                j++;
            }

            upgrades.push(upgrade);
            i++;
        }
        ws.upgrades = upgrades;

        const errors = this.validateWorkstation(ws);
        if (errors.length > 0) {
            Utils.showAlert('error', `Validation failed: ${errors.join(', ')}`);
            return;
        }

        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Workstation saved');
    },

    delete() {
        if (!confirm('Delete this workstation?')) return;
        state.workstations.splice(state.selectedWorkstation, 1);
        state.selectedWorkstation = null;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Workstation deleted');
    },

    duplicate() {
        const ws = JSON.parse(JSON.stringify(state.workstations[state.selectedWorkstation]));
        ws.workstation_def_id = `${ws.workstation_def_id}_copy_${Date.now()}`;
        state.workstations.push(ws);
        state.selectedWorkstation = state.workstations.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        Utils.showAlert('success', 'Workstation duplicated');
    },

    addNew() {
        const newWS = {
            workstation_def_id: `new_workstation_${Date.now()}`,
            available_recipes: [],
            upgrades: []
        };
        state.workstations.push(newWS);
        state.selectedWorkstation = state.workstations.length - 1;
        this.recipeSearchQuery = '';
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'New workstation created');
    },

    validateWorkstation(ws) {
        const errors = [];
        
        if (!ws.workstation_def_id) {
            errors.push('Workstation def ID required');
        } else {
            const placeableItem = State.getItemById(ws.workstation_def_id);
            if (!placeableItem) {
                errors.push(`Workstation def ID "${ws.workstation_def_id}" not found in items catalog`);
            } else if (placeableItem.type !== 'Placeable') {
                errors.push(`Item "${ws.workstation_def_id}" is not a placeable (type: ${placeableItem.type})`);
            }
        }

        if (ws.available_recipes && ws.available_recipes.length > 0) {
            ws.available_recipes.forEach((recipeId, idx) => {
                const recipe = State.getRecipeById(recipeId);
                if (!recipe) {
                    errors.push(`Recipe "${recipeId}" in available_recipes not found in recipes catalog`);
                }
            });
        }
        
        if (ws.upgrades) {
            ws.upgrades.forEach((upgrade, i) => {
                if (!upgrade.id) errors.push(`Upgrade ${i+1}: ID required`);
                if (!upgrade.target_level) errors.push(`Upgrade ${i+1}: Target level required`);
                if (upgrade.target_level < 1 || upgrade.target_level > CONSTANTS.MAX_UPGRADE_LEVEL) {
                    errors.push(`Upgrade ${i+1}: Target level must be 1-${CONSTANTS.MAX_UPGRADE_LEVEL}`);
                }

                if (upgrade.upgrade_requirements) {
                    upgrade.upgrade_requirements.forEach((mat, matIdx) => {
                        if (!mat.item_id) {
                            errors.push(`Upgrade ${i+1}, Material ${matIdx+1}: item_id required`);
                        } else {
                            const item = State.getItemById(mat.item_id);
                            if (!item) {
                                errors.push(`Upgrade ${i+1}, Material ${matIdx+1}: item "${mat.item_id}" not found in items catalog`);
                            }
                        }
                        if (!mat.amount || mat.amount < 1) {
                            errors.push(`Upgrade ${i+1}, Material ${matIdx+1}: amount must be >= 1`);
                        }
                    });
                }
            });
        }

        return errors;
    },

    validate() {
        const allErrors = [];
        state.workstations.forEach((ws, index) => {
            const errors = this.validateWorkstation(ws);
            if (errors.length > 0) {
                allErrors.push({ index, id: ws.workstation_def_id, errors });
            }
        });

        if (allErrors.length === 0) {
            Utils.showAlert('success', 'All workstations are valid! ✓');
        } else {
            Utils.showAlert('error', `Found ${allErrors.length} workstations with errors`);
            console.log('Validation errors:', allErrors);
        }
    },

    updateStats() {
        const stats = {
            total: state.workstations.length,
            withUpgrades: 0,
            totalRecipes: 0,
            totalUpgrades: 0
        };

        state.workstations.forEach(ws => {
            if ((ws.upgrades || []).length > 0) stats.withUpgrades++;
            stats.totalRecipes += (ws.available_recipes || []).length;
            stats.totalUpgrades += (ws.upgrades || []).length;
        });

        document.getElementById('workstationsTotal').textContent = stats.total;
        document.getElementById('workstationsWithUpgrades').textContent = stats.withUpgrades;
        document.getElementById('workstationsTotalRecipes').textContent = stats.totalRecipes;
        document.getElementById('workstationsAvgUpgrades').textContent = stats.total > 0 
            ? (stats.totalUpgrades / stats.total).toFixed(1) 
            : '0';
    }
};

window.Workstations = Workstations;