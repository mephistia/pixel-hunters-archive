// Utility Functions

const Utils = {
    showAlert(type, message) {
        const container = document.getElementById('alertContainer');
        const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠' : type === 'info' ? 'ℹ' : '✕';
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        
        container.innerHTML = '';
        container.appendChild(alert);
        
        setTimeout(() => alert.remove(), 5000);
    },

    downloadJSON(data, filename) {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },

    downloadText(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },

    loadFile(event, callback) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const filename = file.name;
                
                // Detect file type by extension
                if (filename.endsWith('.verse')) {
                    // Parse Verse file
                    console.log('📖 Detected Verse file, parsing...');
                    const data = VerseParser.parse(content, filename);
                    callback(data);
                } else if (filename.endsWith('.json')) {
                    // Parse JSON file (for migration/compatibility)
                    console.log('📖 Detected JSON file, parsing...');
                    const data = JSON.parse(content);
                    callback(data);
                } else {
                    // Try to auto-detect
                    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                        // Looks like JSON
                        const data = JSON.parse(content);
                        callback(data);
                    } else if (content.includes(':=') || content.includes('module:')) {
                        // Looks like Verse
                        const data = VerseParser.parse(content, filename);
                        callback(data);
                    } else {
                        throw new Error('Unable to detect file format (expected .verse or .json)');
                    }
                }
            } catch (error) {
                Utils.showAlert('error', `Failed to parse file: ${error.message}`);
                console.error('File parse error:', error);
            }
        };
        reader.readAsText(file);
    },

    emptyState(title, subtitle) {
        return `
            <div class="empty-state">
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        `;
    },

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Update freshness indicator based on import timestamp
    updateFreshnessIndicator() {
        const indicator = document.getElementById('freshnessIndicator');
        const icon = document.getElementById('freshnessIcon');
        const text = document.getElementById('freshnessText');
        
        if (!indicator || !icon || !text) return;

        const importedAt = state.metadata.importedAt;
        
        if (!importedAt) {
            // No import yet
            indicator.className = 'freshness-indicator';
            icon.textContent = '📝';
            text.textContent = 'No import yet';
            return;
        }

        const importDate = new Date(importedAt);
        const now = new Date();
        const hoursSince = (now - importDate) / (1000 * 60 * 60);
        const minutesSince = (now - importDate) / (1000 * 60);

        // Determine freshness state
        if (hoursSince < 1) {
            // Fresh (< 1 hour)
            indicator.className = 'freshness-indicator fresh';
            icon.textContent = '✅';
            if (minutesSince < 60) {
                text.textContent = `Fresh (${Math.floor(minutesSince)}m ago)`;
            } else {
                text.textContent = `Fresh (${hoursSince.toFixed(1)}h ago)`;
            }
        } else if (hoursSince < CONSTANTS.FRESHNESS_WARNING_HOURS) {
            // Warning (1-2 hours)
            indicator.className = 'freshness-indicator warning';
            icon.textContent = '⚠️';
            text.textContent = `Warning (${hoursSince.toFixed(1)}h ago)`;
        } else {
            // Stale (> 2 hours)
            indicator.className = 'freshness-indicator stale';
            icon.textContent = '🔴';
            text.textContent = `Stale (${hoursSince.toFixed(1)}h ago)`;
        }

        // Add tooltip with detailed info
        const importedBy = state.metadata.importedBy || 'unknown';
        indicator.title = `Last import: ${importDate.toLocaleString()}\nBy: ${importedBy}`;
    },

    // Start auto-save timer
    startAutoSave() {
        setInterval(() => {
            if (state.items.length > 0 || state.recipes.length > 0 || 
                state.workstations.length > 0 || state.makeshift.available_recipes.length > 0) {
                State.save();
                console.log('🔄 Auto-saved at', new Date().toLocaleTimeString());
            }
        }, CONSTANTS.AUTO_SAVE_INTERVAL);
        
        console.log(`✓ Auto-save enabled (every ${CONSTANTS.AUTO_SAVE_INTERVAL / 1000}s)`);
    },

    // Calculate time difference in human-readable format
    getTimeDifference(timestamp) {
        if (!timestamp) return 'Never';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    },

    // Format date for display
    formatDate(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleString();
    },

    // Validate item ID format (no spaces, lowercase recommended)
    validateId(id) {
        const errors = [];
        
        if (!id) {
            errors.push('ID is required');
            return errors;
        }

        if (id.includes(' ')) {
            errors.push('ID should not contain spaces (use underscores instead)');
        }

        if (id !== id.toLowerCase()) {
            errors.push('ID should be lowercase for consistency');
        }

        if (!/^[a-z0-9_]+$/.test(id)) {
            errors.push('ID should only contain lowercase letters, numbers, and underscores');
        }

        return errors;
    },

    // Check for duplicate IDs in array
    findDuplicateIds(items, idField = 'id') {
        const ids = items.map(item => item[idField]);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        return [...new Set(duplicates)];
    },

    // Generate unique ID based on name
    generateIdFromName(name) {
        if (!name) return `item_${Date.now()}`;
        
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    },

    // Copy text to clipboard
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showAlert('success', 'Copied to clipboard!');
            }).catch(err => {
                this.showAlert('error', 'Failed to copy: ' + err.message);
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.showAlert('success', 'Copied to clipboard!');
            } catch (err) {
                this.showAlert('error', 'Failed to copy');
            }
            document.body.removeChild(textarea);
        }
    },

    // Debounce function for search inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Get color for difficulty level
    getDifficultyColor(difficulty) {
        const group = CONSTANTS.DIFFICULTY_GROUPS.find(
            g => difficulty >= g.min && difficulty <= g.max
        );
        return group ? group.color : CONSTANTS.DIFFICULTY_GROUPS[0].color;
    },

    // Get label for difficulty level
    getDifficultyLabel(difficulty) {
        const group = CONSTANTS.DIFFICULTY_GROUPS.find(
            g => difficulty >= g.min && difficulty <= g.max
        );
        return group ? group.label : 'Easy';
    },

    // Format number with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};

window.Utils = Utils;