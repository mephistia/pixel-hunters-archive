// Items Module

const Items = {
    init() {
        document.getElementById('itemsFileInput').addEventListener('change', (e) => {
            Utils.loadFile(e, (data) => {
                if (!Array.isArray(data)) {
                    Utils.showAlert('error', 'Invalid data: Expected an array of items');
                    return;
                }
                state.items = data;
                state.selectedItem = null;
                
                // Update import metadata
                state.metadata.importedAt = new Date().toISOString();
                state.metadata.importedBy = state.metadata.username;
                State.save();
                
                this.renderList();
                this.updateStats();
                Utils.updateFreshnessIndicator();
                Utils.showAlert('success', `Loaded ${data.length} items`);
            });
        });

        document.getElementById('addItemBtn').addEventListener('click', () => this.addNew());
        document.getElementById('validateItemsBtn').addEventListener('click', () => this.validate());
        document.getElementById('itemsSearchInput').addEventListener('input', (e) => {
            this.renderList(e.target.value);
        });
    },

    renderList(searchQuery = '') {
        const container = document.getElementById('itemsList');
        let filtered = state.items;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = state.items.filter(item => 
                (item.id && item.id.toLowerCase().includes(query)) ||
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.type && item.type.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = Utils.emptyState('No items found', searchQuery ? 'Try a different search' : 'Import ItemsCatalog.verse');
            return;
        }

        container.innerHTML = filtered.map((item, index) => {
            const originalIndex = state.items.indexOf(item);
            const behaviorBadge = item.type === 'Placeable' && item.behavior_type ? 
                `<span class="behavior-badge behavior-${item.behavior_type.toLowerCase()}">${item.behavior_type}</span>` : '';
            
            return `
                <div class="item-card ${state.selectedItem === originalIndex ? 'active' : ''}" 
                     onclick="Items.select(${originalIndex})">
                    <div class="item-card-header">
                        <span class="item-name">${Utils.escapeHtml(item.name || 'Unnamed')}</span>
                        <div>
                            <span class="item-type type-${(item.type || 'Resource').toLowerCase()}">${item.type || 'Resource'}</span>
                            ${behaviorBadge}
                        </div>
                    </div>
                    <div class="item-id">${Utils.escapeHtml(item.id || 'no-id')}</div>
                </div>
            `;
        }).join('');
    },

    select(index) {
        state.selectedItem = index;
        this.renderList();
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('itemsEditor');
        
        if (state.selectedItem === null) {
            container.innerHTML = Utils.emptyState('Select an item to edit', 'Or create a new one');
            return;
        }

        const item = state.items[state.selectedItem];
        const type = item.type || 'Resource';

        let html = `
            <h2>Edit ${type}</h2>
            
            <div class="form-group">
                <label>ID <span class="required">*</span></label>
                <input type="text" id="item_id" value="${Utils.escapeHtml(item.id || '')}" placeholder="unique_item_id">
            </div>

            <div class="form-group">
                <label>Name <span class="required">*</span></label>
                <input type="text" id="item_name" value="${Utils.escapeHtml(item.name || '')}" placeholder="Item Name">
            </div>

            <div class="form-group">
                <label>Type <span class="required">*</span></label>
                <select id="item_type" onchange="Items.onTypeChange()">
                    ${CONSTANTS.ITEM_TYPES.map(t => `
                        <option value="${t.value}" ${type === t.value ? 'selected' : ''}>${t.label}</option>
                    `).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Description <span class="required">*</span></label>
                <textarea id="item_description" placeholder="Item description...">${Utils.escapeHtml(item.description || '')}</textarea>
            </div>

            <div class="form-group">
                <label>Max Stack</label>
                <input type="number" id="item_max_stack" value="${item.max_stack || (type === 'Equipment' || type === 'Placeable' ? 1 : CONSTANTS.MAX_STACK)}" min="1">
            </div>
        `;

        // Type-specific fields
        if (type === 'Equipment') {
            html += `
                <h3>Equipment Properties</h3>
                
                <div class="form-group">
                    <label>Equip Slot <span class="required">*</span></label>
                    <select id="item_equip_slot">
                        ${CONSTANTS.EQUIP_SLOTS.map(slot => `
                            <option value="${slot.value}" ${item.equip_slot === slot.value ? 'selected' : ''}>${slot.label}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Base Stat <span class="required">*</span></label>
                    <input type="number" id="item_base_stat" value="${item.base_stat || 0}" step="0.1">
                    <small style="color: var(--text-secondary);">HP value (Armor), Damage multiplier (Weapon), Harvesting Strength (Tool)</small>
                </div>

                <div class="form-group checkbox-group">
                    <input type="checkbox" id="item_is_unbreakable" ${item.is_unbreakable === 'true' || item.is_unbreakable === true ? 'checked' : ''}>
                    <label for="item_is_unbreakable">Unbreakable</label>
                </div>

                <div class="form-group">
                    <label>Required Level to Craft</label>
                    <input type="number" id="item_required_level" value="${item.required_level_to_craft || 0}" min="0" step="1">
                    <small style="color: var(--text-secondary);">Minimum crafting level required (0 = no requirement)</small>
                </div>

                <div class="form-group">
                    <label>Experience After Craft</label>
                    <input type="number" id="item_exp_after_craft" value="${item.exp_after_craft || 0}" min="0" step="1">
                    <small style="color: var(--text-secondary);">XP gained when crafting this item</small>
                </div>
            `;
        } else if (type === 'Consumable') {
            html += `
                <h3>Consumable Properties</h3>
                
                <div class="form-group">
                    <label>Effect Type <span class="required">*</span></label>
                    <select id="item_effect_type">
                        ${CONSTANTS.EFFECT_TYPES.map(eff => `
                            <option value="${eff.value}" ${item.effect_type === eff.value ? 'selected' : ''}>${eff.label}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Amount <span class="required">*</span></label>
                    <input type="number" id="item_effect_amount" value="${item.effect_amount || 0}" step="0.1" min="0">
                    <small style="color: var(--text-secondary);">Effect intensity (HP restored, damage boost value, etc.)</small>
                </div>

                <div class="form-group">
                    <label>Duration (seconds) <span class="required">*</span></label>
                    <input type="number" id="item_effect_duration" value="${item.effect_duration || 0}" step="0.1" min="0">
                    <small style="color: var(--text-secondary);">Effect duration in seconds (0 for instant effects)</small>
                </div>
            `;
        } else if (type === 'Placeable') {
            html += `
                <h3>Placeable Properties</h3>
                
                <div class="form-group">
                    <label>Behavior Type</label>
                    <select id="item_behavior_type">
                        ${CONSTANTS.PLACEABLE_BEHAVIORS.map(beh => `
                            <option value="${beh.value}" ${item.behavior_type === beh.value ? 'selected' : ''}>${beh.label}</option>
                        `).join('')}
                    </select>
                    <small style="color: var(--text-secondary);">${CONSTANTS.PLACEABLE_BEHAVIORS.find(b => b.value === (item.behavior_type || 'Decoration'))?.description || ''}</small>
                </div>
            `;
        }

        // Metadata editor
        html += `
            <h3>Metadata</h3>
            <div class="metadata-editor" id="itemMetadataEditor">
                ${this.renderMetadata(item.metadata || {})}
                <button type="button" class="btn btn-secondary btn-small" onclick="Items.addMetadata()">+ Add Field</button>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button type="button" class="btn btn-success" onclick="Items.save()">💾 Save</button>
                <button type="button" class="btn btn-danger" onclick="Items.delete()">🗑️ Delete</button>
                <button type="button" class="btn btn-secondary" onclick="Items.duplicate()">📋 Duplicate</button>
            </div>
        `;

        container.innerHTML = html;
    },

    renderMetadata(metadata) {
        const entries = Object.entries(metadata);
        if (entries.length === 0) {
            return '<p style="color: var(--text-secondary); margin: 10px 0;">No metadata</p>';
        }

        return entries.map(([key, value], index) => `
            <div class="metadata-item">
                <input type="text" value="${Utils.escapeHtml(key)}" placeholder="key" id="meta_key_${index}">
                <input type="text" value="${Utils.escapeHtml(value)}" placeholder="value" id="meta_value_${index}">
                <button type="button" class="btn btn-danger btn-small" onclick="Items.removeMetadata(${index})">✕</button>
            </div>
        `).join('');
    },

    saveCurrentFieldValues() {
        if (state.selectedItem === null) return;
        
        const item = state.items[state.selectedItem];
        
        const idField = document.getElementById('item_id');
        const nameField = document.getElementById('item_name');
        const typeField = document.getElementById('item_type');
        const descField = document.getElementById('item_description');
        const maxStackField = document.getElementById('item_max_stack');
        
        if (idField) item.id = idField.value;
        if (nameField) item.name = nameField.value;
        if (typeField) item.type = typeField.value;
        if (descField) item.description = descField.value;
        if (maxStackField) item.max_stack = parseInt(maxStackField.value) || CONSTANTS.MAX_STACK;
        
        if (item.type === 'Equipment') {
            const equipSlotField = document.getElementById('item_equip_slot');
            const baseStatField = document.getElementById('item_base_stat');
            const unbreakableField = document.getElementById('item_is_unbreakable');
            const requiredLevelField = document.getElementById('item_required_level');
            const expAfterCraftField = document.getElementById('item_exp_after_craft');
            
            if (equipSlotField) item.equip_slot = equipSlotField.value;
            if (baseStatField) item.base_stat = parseFloat(baseStatField.value) || 0;
            if (unbreakableField) item.is_unbreakable = unbreakableField.checked ? 'true' : 'false';
            if (requiredLevelField) item.required_level_to_craft = parseInt(requiredLevelField.value) || 0;
            if (expAfterCraftField) item.exp_after_craft = parseInt(expAfterCraftField.value) || 0;
            
            // Clear type-specific fields from other types
            delete item.effect_type;
            delete item.effect_amount;
            delete item.effect_duration;
            delete item.behavior_type;
        } else if (item.type === 'Placeable') {
            const behaviorTypeField = document.getElementById('item_behavior_type');
            if (behaviorTypeField) item.behavior_type = behaviorTypeField.value;
            
            // Clear type-specific fields from other types
            delete item.equip_slot;
            delete item.base_stat;
            delete item.is_unbreakable;
            delete item.effect_type;
            delete item.effect_amount;
            delete item.effect_duration;
        } else {
            // Resource - clear all type-specific fields
            delete item.equip_slot;
            delete item.base_stat;
            delete item.is_unbreakable;
            delete item.effect_type;
            delete item.effect_amount;
            delete item.effect_duration;
            delete item.behavior_type;
        }
        
        const metadata = {};
        let i = 0;
        while (document.getElementById(`meta_key_${i}`)) {
            const key = document.getElementById(`meta_key_${i}`).value;
            const value = document.getElementById(`meta_value_${i}`).value;
            if (key) metadata[key] = value;
            i++;
        }
        item.metadata = metadata;
    },

    addMetadata() {
        const item = state.items[state.selectedItem];
        
        this.saveCurrentFieldValues();
        
        if (!item.metadata) item.metadata = {};
        item.metadata[`field_${Date.now()}`] = '';
        this.renderEditor();
    },

    removeMetadata(index) {
        const item = state.items[state.selectedItem];
        
        this.saveCurrentFieldValues();
        
        const keys = Object.keys(item.metadata);
        delete item.metadata[keys[index]];
        this.renderEditor();
    },

    onTypeChange() {
        // Save current field values before re-rendering
        this.saveCurrentFieldValues();
        
        // Re-render with new type
        this.renderEditor();
        
        // Show feedback
        const item = state.items[state.selectedItem];
        console.log(`Type changed to: ${item.type}`);
    },

    duplicate() {
        const item = JSON.parse(JSON.stringify(state.items[state.selectedItem]));
        item.id = `${item.id}_copy_${Date.now()}`;
        state.items.push(item);
        state.selectedItem = state.items.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        Utils.showAlert('success', 'Item duplicated');
    },

    validateItem(item) {
        const errors = [];
        if (!item.id) errors.push('ID required');
        if (!item.name) errors.push('Name required');
        if (!item.type) errors.push('Type required');
        if (!item.description) errors.push('Description required');

        if (item.type === 'Equipment') {
            if (!item.equip_slot) errors.push('Equip slot required');
            if (item.base_stat === undefined || item.base_stat === null) errors.push('Base stat required');
        }

        if (item.type === 'Consumable') {
            if (!item.effect_type) errors.push('Effect type required');
            if (item.effect_amount === undefined || item.effect_amount === null) errors.push('Effect amount required');
            if (item.effect_duration === undefined || item.effect_duration === null) errors.push('Effect duration required');
        }

        return errors;
    },

    validate() {
        const allErrors = [];
        state.items.forEach((item, index) => {
            const errors = this.validateItem(item);
            if (errors.length > 0) {
                allErrors.push({ index, id: item.id, errors });
            }
        });

        if (allErrors.length === 0) {
            Utils.showAlert('success', 'All items are valid! ✓');
        } else {
            Utils.showAlert('error', `Found ${allErrors.length} items with errors`);
            console.log('Validation errors:', allErrors);
        }
    },

    updateStats() {
        const stats = {
            total: state.items.length,
            Equipment: 0,
            Resource: 0,
            Consumable: 0,
            Placeable: 0
        };

        state.items.forEach(item => {
            const type = item.type || 'Resource';
            if (stats[type] !== undefined) stats[type]++;
        });

        document.getElementById('itemsTotal').textContent = stats.total;
        document.getElementById('itemsEquipment').textContent = stats.Equipment;
        document.getElementById('itemsResource').textContent = stats.Resource;
        document.getElementById('itemsConsumable').textContent = stats.Consumable;
        document.getElementById('itemsPlaceable').textContent = stats.Placeable;
    },

    save() {
        const item = state.items[state.selectedItem];
        
        item.id = document.getElementById('item_id').value;
        item.name = document.getElementById('item_name').value;
        item.type = document.getElementById('item_type').value;
        item.description = document.getElementById('item_description').value;
        item.max_stack = parseInt(document.getElementById('item_max_stack').value);

        if (item.type === 'Equipment') {
            item.equip_slot = document.getElementById('item_equip_slot').value;
            item.base_stat = parseFloat(document.getElementById('item_base_stat').value);
            item.is_unbreakable = document.getElementById('item_is_unbreakable').checked ? 'true' : 'false';
            item.required_level_to_craft = parseInt(document.getElementById('item_required_level').value) || 0; 
            item.exp_after_craft = parseInt(document.getElementById('item_exp_after_craft').value) || 0;
            
            // Clear other type-specific fields
            delete item.effect_type;
            delete item.effect_amount;
            delete item.effect_duration;
            delete item.behavior_type;
        } else if (item.type === 'Consumable') {
            item.effect_type = document.getElementById('item_effect_type').value;
            item.effect_amount = parseFloat(document.getElementById('item_effect_amount').value);
            item.effect_duration = parseFloat(document.getElementById('item_effect_duration').value);
            
            // Clear other type-specific fields
            delete item.equip_slot;
            delete item.base_stat;
            delete item.is_unbreakable;
            delete item.behavior_type;
        } else if (item.type === 'Placeable') {
            item.behavior_type = document.getElementById('item_behavior_type').value;
            
            // Clear other type-specific fields
            delete item.equip_slot;
            delete item.base_stat;
            delete item.is_unbreakable;
            delete item.effect_type;
            delete item.effect_amount;
            delete item.effect_duration;
        } else {
            // Resource - clear all type-specific fields
            delete item.equip_slot;
            delete item.base_stat;
            delete item.is_unbreakable;
            delete item.effect_type;
            delete item.effect_amount;
            delete item.effect_duration;
            delete item.behavior_type;
        }

        const metadata = {};
        let i = 0;
        while (document.getElementById(`meta_key_${i}`)) {
            const key = document.getElementById(`meta_key_${i}`).value;
            const value = document.getElementById(`meta_value_${i}`).value;
            if (key) metadata[key] = value;
            i++;
        }
        item.metadata = metadata;

        const errors = this.validateItem(item);
        if (errors.length > 0) {
            Utils.showAlert('error', `Validation failed: ${errors.join(', ')}`);
            return;
        }

        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Item saved');
    },

    delete() {
        if (!confirm('Delete this item?')) return;
        state.items.splice(state.selectedItem, 1);
        state.selectedItem = null;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'Item deleted');
    },

    addNew() {
        const newItem = {
            id: `new_item_${Date.now()}`,
            name: 'New Item',
            type: 'Resource',
            description: '',
            max_stack: CONSTANTS.MAX_STACK,
            metadata: {}
        };
        state.items.push(newItem);
        state.selectedItem = state.items.length - 1;
        this.renderList();
        this.renderEditor();
        this.updateStats();
        State.save();
        Utils.showAlert('success', 'New item created');
    }
};

window.Items = Items;