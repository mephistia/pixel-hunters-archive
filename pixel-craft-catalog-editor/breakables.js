// Breakables Module - Manages breakable resources with drop tables

const Breakables = {
    init() {
        document.getElementById('breakablesFileInput').addEventListener('change', (e) => {
            Utils.loadFile(e, (data) => {
                if (!Array.isArray(data)) {
                    Utils.showAlert('error', 'Dados inválidos: Esperado um array de breakable resources');
                    return;
                }
                state.breakables = data;
                state.selectedBreakable = null;
                
                // Update import metadata
                state.metadata.importedAt = new Date().toISOString();
                state.metadata.importedBy = state.metadata.username;
                State.save();
                
                this.renderList();
                this.updateStats();
                Utils.updateFreshnessIndicator();
                Utils.showAlert('success', `Carregados ${data.length} breakable resources`);
            });
        });

        document.getElementById('addBreakableBtn').addEventListener('click', () => this.addNew());
        document.getElementById('validateBreakablesBtn').addEventListener('click', () => this.validate());
        document.getElementById('breakablesSearchInput').addEventListener('input', (e) => {
            this.renderList(e.target.value);
        });
    },

    renderList(searchQuery = '') {
        const container = document.getElementById('breakablesList');
        let filtered = state.breakables;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = state.breakables.filter(br => 
                (br.id && br.id.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = Utils.emptyState('No breakable resources found', searchQuery ? 'Try a different search' : 'Import BreakablesCatalog.verse');
            return;
        }

        container.innerHTML = filtered.map((br, index) => {
            const originalIndex = state.breakables.indexOf(br);
            
            return `
                <div class="item-card ${state.selectedBreakable === originalIndex ? 'active' : ''}" 
                     onclick="Breakables.select(${originalIndex})">
                    <div class="item-card-header">
                        <span class="item-name">${Utils.escapeHtml(br.id || 'unnamed')}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 0.9em; color: var(--text-secondary);">
                        Hardness: ${br.hardness || 0} | Regen: ${br.regen_seconds || 0}s | ${(br.drop_table || []).length} drops
                    </div>
                </div>
            `;
        }).join('');
    },

    select(index) {
        state.selectedBreakable = index;
        this.renderList();
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('breakablesEditor');
        
        if (state.selectedBreakable === null) {
            container.innerHTML = Utils.emptyState('Select a breakable resource to edit', 'Or create a new one');
            return;
        }

        const br = state.breakables[state.selectedBreakable];

        let html = `
            <h2>Edit Breakable Resource</h2>
            
            <div class="form-group">
                <label>ID <span class="required">*</span></label>
                <input type="text" id="br_id" value="${Utils.escapeHtml(br.id || '')}" placeholder="unique_resource_id">
                <small style="color: var(--text-secondary);">Unique identifier (e.g., "breakable_wood", "breakable_stone", "breakable_crystal")</small>
            </div>

            <div class="form-group">
                <label>Hardness <span class="required">*</span></label>
                <input type="number" id="br_hardness" value="${br.hardness || 0}" step="0.1" min="0">
                <small style="color: var(--text-secondary);">How hard to break (affects damage/tool requirement)</small>
            </div>

            <div class="form-group">
                <label>Regen Time (seconds) <span class="required">*</span></label>
                <input type="number" id="br_regen_seconds" value="${br.regen_seconds || 0}" step="0.1" min="0">
                <small style="color: var(--text-secondary);">Time to regenerate after being broken (0 = instant)</small>
            </div>

            <h3>Drop Table</h3>
            <p style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 15px;">
                The system picks <strong>ONE</strong> item based on weights, then rolls amount between Min/Max.
            </p>
            <div class="drop-table-editor" id="dropTableEditor">
                ${this.renderDropTable(br.drop_table || [])}
            </div>
            <button type="button" class="btn btn-secondary btn-small" onclick="Breakables.addDrop()" style="margin-top: 10px;">+ Add Drop</button>

            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button type="button" class="btn btn-success" onclick="Breakables.save()">💾 Save</button>
                <button type="button" class="btn btn-danger" onclick="Breakables.delete()">🗑️ Delete</button>
                <button type="button" class="btn btn-secondary" onclick="Breakables.duplicate()">📋 Duplicate</button>
            </div>
        `;

        container.innerHTML = html;
    },

    renderDropTable(dropTable) {
        if (dropTable.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 10px 0;">No drops defined. Add your first drop entry.</p>';
        }

        // Calculate total weight and percentages
        const totalWeight = dropTable.reduce((sum, drop) => sum + (drop.weight || 0), 0);

        return `
            <div style="background: var(--bg-medium); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <strong>Total Weight: ${totalWeight}</strong>
                <small style="display: block; color: var(--text-secondary); margin-top: 5px;">
                    Each entry's chance is calculated as: (weight / total_weight) × 100%
                </small>
            </div>
            ${dropTable.map((drop, index) => {
                const item = State.getItemById(drop.item_id);
                const itemName = item ? item.name : '';
                const percentage = totalWeight > 0 ? ((drop.weight / totalWeight) * 100).toFixed(2) : 0;

                return `
                    <div style="background: var(--bg-dark); padding: 15px; border-radius: 5px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h4 style="color: var(--accent-primary); margin: 0;">Drop Entry #${index + 1} <span style="color: var(--accent-success);">(${percentage}%)</span></h4>
                            <button type="button" class="btn btn-danger btn-small" onclick="Breakables.removeDrop(${index})">✕</button>
                        </div>

                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.85em;">Item ID <span class="required">*</span></label>
                                <input type="text" id="drop_item_id_${index}" 
                                    value="${Utils.escapeHtml(drop.item_id || '')}" placeholder="item_id">
                                ${itemName ? `<small style="color: var(--accent-success); display: block; margin-top: 2px;">✓ ${Utils.escapeHtml(itemName)}</small>` : 
                                              `<small style="color: var(--accent-danger); display: block; margin-top: 2px;">⚠ Item not found</small>`}
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.85em;">Weight <span class="required">*</span></label>
                                <input type="number" id="drop_weight_${index}" 
                                    value="${drop.weight || 1}" min="1" 
                                    onchange="Breakables.saveCurrentFieldValues(); Breakables.renderEditor();">
                                <small style="color: var(--text-secondary); display: block; margin-top: 2px;">Higher = more common</small>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.85em;">Min Amount</label>
                                <input type="number" id="drop_min_${index}" 
                                    value="${drop.min_amount || 1}" min="1">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.85em;">Max Amount</label>
                                <input type="number" id="drop_max_${index}" 
                                    value="${drop.max_amount || 1}" min="1">
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    },

    saveCurrentFieldValues() {
        if (state.selectedBreakable === null) return;
        
        const br = state.breakables[state.selectedBreakable];
        
        const idField = document.getElementById('br_id');
        const hardnessField = document.getElementById('br_hardness');
        const regenField = document.getElementById('br_regen_seconds');
        
        if (idField) br.id = idField.value;
        if (hardnessField) br.hardness = parseFloat(hardnessField.value) || 0;
        if (regenField) br.regen_seconds = parseFloat(regenField.value) || 0;
        
        // Save drop table
        const dropTable = [];
        let i = 0;
        while (document.getElementById(`drop_item_id_${i}`)) {
            const itemId = document.getElementById(`drop_item_id_${i}`).value.trim();
            const weight = parseInt(document.getElementById(`drop_weight_${i}`).value) || 1;
            const minAmount = parseInt(document.getElementById(`drop_min_${i}`).value) || 1;
            const maxAmount = parseInt(document.getElementById(`drop_max_${i}`).value) || 1;
            
            if (itemId) {
                dropTable.push({
                    item_id: itemId,
                    weight: weight,
                    min_amount: minAmount,
                    max_amount: maxAmount
                });
            }
            i++;
        }
        br.drop_table = dropTable;
    },

    addDrop() {
        const br = state.breakables[state.selectedBreakable];
        
        this.saveCurrentFieldValues();
        
        if (!br.drop_table) br.drop_table = [];
        br.drop_table.push({
            item_id: '',
            weight: 1,
            min_amount: 1,
            max_amount: 1
        });
        State.save();
        this.renderEditor();
    },

    removeDrop(index) {
        const br = state.breakables[state.selectedBreakable];
        
        this.saveCurrentFieldValues();
        
        br.drop_table.splice(index, 1);
        State.save();
        this.renderEditor();
    },

    save() {
        const br = state.breakables[state.selectedBreakable];
        
        br.id = document.getElementById('br_id').value;
        br.hardness = parseFloat(document.getElementById('br_hardness').value);
        br.regen_seconds = parseFloat(document.getElementById('br_regen_seconds').value);

        // Save drop table
        const dropTable = [];
        let i = 0;
        while (document.getElementById(`drop_item_id_${i}`)) {
            const itemId = document.getElementById(`drop_item_id_${i}`).value.trim();
            const weight = parseInt(document.getElementById(`drop_weight_${i}`).value);
            const minAmount = parseInt(document.getElementById(`drop_min_${i}`).value);
            const maxAmount = parseInt(document.getElementById(`drop_max_${i}`).value);
            
            if (itemId) {
                dropTable.push({
                    item_id: itemId,
                    weight: weight,
                    min_amount: minAmount,
                    max_amount: maxAmount
                });
            }
            i++;
        }
        br.drop_table = dropTable;

        const errors = this.validateBreakable(br);
        if (errors.length > 0) {
            Utils.showAlert('error', `Validação falhou: ${errors.join(', ')}`);
            return;
        }

        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Breakable resource saved');
    },

    delete() {
        if (!confirm('Deletar este breakable resource?')) return;
        state.breakables.splice(state.selectedBreakable, 1);
        state.selectedBreakable = null;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Breakable resource deleted');
    },

    duplicate() {
        const br = JSON.parse(JSON.stringify(state.breakables[state.selectedBreakable]));
        br.id = `${br.id}_copy_${Date.now()}`;
        state.breakables.push(br);
        state.selectedBreakable = state.breakables.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Breakable resource duplicated');
    },

    addNew() {
        const newBreakable = {
            id: `new_breakable_${Date.now()}`,
            hardness: 10,
            regen_seconds: 60,
            drop_table: []
        };
        state.breakables.push(newBreakable);
        state.selectedBreakable = state.breakables.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'New breakable resource created');
    },

    validateBreakable(br) {
        const errors = [];
        
        if (!br.id) errors.push('ID required');
        if (br.hardness === undefined || br.hardness === null || br.hardness < 0) errors.push('Valid hardness required');
        if (br.regen_seconds === undefined || br.regen_seconds === null || br.regen_seconds < 0) errors.push('Valid regen time required');

        if (br.drop_table && br.drop_table.length > 0) {
            br.drop_table.forEach((drop, idx) => {
                if (!drop.item_id) {
                    errors.push(`Drop ${idx + 1}: Item ID required`);
                } else {
                    const item = State.getItemById(drop.item_id);
                    if (!item) {
                        errors.push(`Drop ${idx + 1}: Item "${drop.item_id}" not found in items catalog`);
                    }
                }
                if (!drop.weight || drop.weight < 1) {
                    errors.push(`Drop ${idx + 1}: Weight must be >= 1`);
                }
                if (!drop.min_amount || drop.min_amount < 1) {
                    errors.push(`Drop ${idx + 1}: Min amount must be >= 1`);
                }
                if (!drop.max_amount || drop.max_amount < drop.min_amount) {
                    errors.push(`Drop ${idx + 1}: Max amount must be >= min amount`);
                }
            });
        }

        return errors;
    },

    validate() {
        const allErrors = [];
        state.breakables.forEach((br, index) => {
            const errors = this.validateBreakable(br);
            if (errors.length > 0) {
                allErrors.push({ index, id: br.id, errors });
            }
        });

        if (allErrors.length === 0) {
            Utils.showAlert('success', 'Todos os breakable resources são válidos! ✓');
        } else {
            Utils.showAlert('error', `Encontrados ${allErrors.length} breakable resources com erros`);
            console.log('Validation errors:', allErrors);
        }
    },

    updateStats() {
        const stats = {
            total: state.breakables.length,
            withDrops: 0,
            totalDropEntries: 0,
            totalHardness: 0
        };

        state.breakables.forEach(br => {
            if ((br.drop_table || []).length > 0) stats.withDrops++;
            stats.totalDropEntries += (br.drop_table || []).length;
            stats.totalHardness += br.hardness || 0;
        });

        // Update global stat bar (main statistics)
        const globalTotal = document.getElementById('breakablesTotal');
        if (globalTotal) {
            globalTotal.textContent = stats.total;
        }

        // Update breakables tab stats
        const tabWithDrops = document.getElementById('breakablesWithDrops');
        const tabAvgDrops = document.getElementById('breakablesAvgDrops');
        const tabAvgHardness = document.getElementById('breakablesAvgHardness');
        
        if (tabWithDrops) tabWithDrops.textContent = stats.withDrops;
        if (tabAvgDrops) {
            tabAvgDrops.textContent = stats.total > 0 
                ? (stats.totalDropEntries / stats.total).toFixed(1) 
                : '0';
        }
        if (tabAvgHardness) {
            tabAvgHardness.textContent = stats.total > 0 
                ? (stats.totalHardness / stats.total).toFixed(1) 
                : '0';
        }
    }
};

window.Breakables = Breakables;