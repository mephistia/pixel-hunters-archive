// Progression Module - XP Balancing Tool

const Progression = {
    // Default values
    config: {
        quadratic_multiplier: 5,
        linear_multiplier: 50,
        max_level: 100
    },  

    init() {
        this.loadConfig();
        this.setupEventListeners();
        this.calculate();
    },

    loadConfig() {
        // Load from localStorage if exists
        const saved = localStorage.getItem('progression_config');
        if (saved) {
            try {
                this.config = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load progression config, using defaults');
            }
        }
        this.renderInputs();
    },

    saveConfig() {
        localStorage.setItem('progression_config', JSON.stringify(this.config));
    },

    setupEventListeners() {
        document.getElementById('quadraticMultiplierInput').addEventListener('input', (e) => {
            this.config.quadratic_multiplier = parseInt(e.target.value) || 1;
        });

        document.getElementById('linearMultiplierInput').addEventListener('input', (e) => {
            this.config.linear_multiplier = parseInt(e.target.value) || 1;
        });

        document.getElementById('maxLevelInput').addEventListener('input', (e) => {
            this.config.max_level = parseInt(e.target.value) || 10;
        });

        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculate();
            this.saveConfig();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToVerse();
        });

        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Import file listener
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    this.importFromVerse(event.target.result);
                } catch (error) {
                    Utils.showAlert('error', `Import failed: ${error.message}`);
                }
            };
            reader.readAsText(file);
            
            // Reset input
            e.target.value = '';
        });

        // Range selector buttons
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                this.showRange(range);
                
                // Update active state
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    },

    renderInputs() {
        document.getElementById('quadraticMultiplierInput').value = this.config.quadratic_multiplier;
        document.getElementById('linearMultiplierInput').value = this.config.linear_multiplier;
        document.getElementById('maxLevelInput').value = this.config.max_level;

        document.getElementById('quadraticMultiplierValue').textContent = this.config.quadratic_multiplier;
        document.getElementById('linearMultiplierValue').textContent = this.config.linear_multiplier;
        document.getElementById('maxLevelValue').textContent = this.config.max_level;
    },

    reset() {
        this.config = {
            quadratic_multiplier: 5,
            linear_multiplier: 50,
            max_level: 100
        };
        this.renderInputs();
        this.calculate();
        this.saveConfig();
        Utils.showAlert('success', 'Reset to default values');
    },

    // Core calculation functions (Polynomial formula: Quadratic*Level² + Linear*Level)
    getRequiredExpForLevel(level) {
        const clampedLevel = Math.min(level, this.config.max_level);
        const quadraticTerm = this.config.quadratic_multiplier * clampedLevel * clampedLevel;
        const linearTerm = this.config.linear_multiplier * clampedLevel;
        return Math.round(quadraticTerm + linearTerm);
    },

    getTotalExpForLevel(level) {
        let total = 0;
        for (let i = 1; i <= level; i++) {
            total += this.getRequiredExpForLevel(i);
        }
        return total;
    },

    getCurrentLevelFromExp(exp) {
        if (exp <= 0) return 0;
        
        // Solve quadratic equation: ax² + bx - c = 0
        // where total_exp = sum from 1 to n of (quad*i² + linear*i)
        // Approximate by iterating (more accurate than quadratic formula for cumulative sum)
        let currentLevel = 0;
        let accumulatedXP = 0;
        
        while (accumulatedXP < exp && currentLevel < this.config.max_level) {
            currentLevel++;
            accumulatedXP += this.getRequiredExpForLevel(currentLevel);
        }
        
        return Math.min(currentLevel - 1, this.config.max_level);
    },

    calculate() {
        this.renderInputs();
        this.renderTable('1-20'); // Default range
        this.renderStats();
        this.renderItemAnalysis();
    },

    showRange(range) {
        this.renderTable(range);
    },

    renderTable(range) {
        const tbody = document.getElementById('levelTableBody');
        tbody.innerHTML = '';

        let levels = [];

        if (range === 'all') {
            for (let i = 1; i <= this.config.max_level; i++) {
                levels.push(i);
            }
        } else if (range.includes('-')) {
            const [start, end] = range.split('-').map(n => parseInt(n));
            for (let i = start; i <= Math.min(end, this.config.max_level); i++) {
                levels.push(i);
            }
        }

        levels.forEach(level => {
            const totalXp = this.getTotalExpForLevel(level);
            const prevTotal = level > 1 ? this.getTotalExpForLevel(level - 1) : 0;
            const difference = totalXp - prevTotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${level}</td>
                <td>${totalXp.toLocaleString()}</td>
                <td>${level > 1 ? '+' + difference.toLocaleString() : '-'}</td>
            `;
            tbody.appendChild(row);
        });
    },

    renderStats() {
        const maxLevelXp = this.getTotalExpForLevel(this.config.max_level);
        const avgXpPerLevel = Math.round(maxLevelXp / this.config.max_level);

        // Load items from state (shared with main editor)
        const itemsData = localStorage.getItem('items');
        let items = [];
        if (itemsData) {
            try {
                items = JSON.parse(itemsData);
            } catch (e) {
                console.warn('Failed to load items');
            }
        }

        const equipmentItems = items.filter(item => item.type === 'Equipment');
        const itemsWithXp = equipmentItems.filter(item => (item.exp_after_craft || 0) > 0);
        const totalXpRewards = itemsWithXp.reduce((sum, item) => sum + (item.exp_after_craft || 0), 0);
        const avgXpReward = itemsWithXp.length > 0 ? Math.round(totalXpRewards / itemsWithXp.length) : 0;

        document.getElementById('statMaxLevelXp').textContent = maxLevelXp.toLocaleString();
        document.getElementById('statAvgXpPerLevel').textContent = avgXpPerLevel.toLocaleString();
        document.getElementById('statItemsWithXp').textContent = `${itemsWithXp.length}/${equipmentItems.length}`;
        document.getElementById('statAvgXpReward').textContent = avgXpReward.toLocaleString();
    },

    renderItemAnalysis() {
        const container = document.getElementById('itemAnalysisContainer');
        
        // Load items from localStorage
        let items = [];
        
        const itemsData = localStorage.getItem('items');
        console.log('📦 localStorage items data:', itemsData ? `${itemsData.length} chars` : 'null');
        
        if (itemsData) {
            try {
                items = JSON.parse(itemsData);
                console.log('✓ Parsed items:', items.length);
            } catch (e) {
                console.error('❌ Failed to parse items:', e);
                container.innerHTML = '<p style="color: var(--accent-danger);">Error parsing items data. Try re-importing items in the main editor.</p>';
                return;
            }
        }
        
        // Check if we got data
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div style="background: var(--bg-dark); padding: 20px; border-radius: 5px; text-align: center;">
                    <p style="color: var(--text-secondary); margin-bottom: 10px;">
                        ⚠️ No items found in storage.
                    </p>
                    <p style="color: var(--text-secondary); font-size: 0.9em;">
                        Please import items in the <a href="index.html" style="color: var(--accent-primary);">main editor</a> first.
                    </p>
                </div>
            `;
            return;
        }

        // Filter equipment items
        const equipmentItems = items.filter(item => item.type === 'Equipment');
        console.log('🎯 Equipment items:', equipmentItems.length);
        
        if (equipmentItems.length === 0) {
            container.innerHTML = `
                <div style="background: var(--bg-dark); padding: 20px; border-radius: 5px; text-align: center;">
                    <p style="color: var(--text-secondary);">
                        No equipment items found. Total items: ${items.length}
                    </p>
                </div>
            `;
            return;
        }

        // Analyze XP configuration
        const itemsWithXp = equipmentItems.filter(item => (item.exp_after_craft || 0) > 0);
        const itemsWithoutXp = equipmentItems.filter(item => !(item.exp_after_craft || 0));

        console.log('✓ Items with XP:', itemsWithXp.length);
        console.log('⚠ Items without XP:', itemsWithoutXp.length);

        let html = '';

        // Warning banner if items missing XP
        if (itemsWithoutXp.length > 0) {
            html += `
                <div style="background: rgba(255, 193, 7, 0.15); border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 1.5em;">⚠️</span>
                        <strong style="color: #ffc107;">Missing XP Configuration</strong>
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 10px;">
                        ${itemsWithoutXp.length} of ${equipmentItems.length} equipment items don't have <code>ExpAfterCraft</code> configured.
                    </p>
                    <details style="cursor: pointer;">
                        <summary style="color: var(--accent-secondary); user-select: none;">
                            Show items without XP (${itemsWithoutXp.length})
                        </summary>
                        <ul style="margin-top: 10px; padding-left: 20px; color: var(--text-secondary); font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                            ${itemsWithoutXp.map(item => `
                                <li>${item.name || item.id} (Level ${item.required_level_to_craft || 0})</li>
                            `).join('')}
                        </ul>
                    </details>
                </div>
            `;
        }

        // Only analyze if we have items with XP
        if (itemsWithXp.length === 0) {
            html += `
                <div style="background: var(--bg-dark); padding: 20px; border-radius: 5px; text-align: center;">
                    <p style="color: var(--text-secondary);">
                        No items have ExpAfterCraft configured yet. Configure XP rewards in the main editor.
                    </p>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        // Group by RequiredLevelToCraft
        const grouped = {};
        itemsWithXp.forEach(item => {
            const reqLevel = item.required_level_to_craft || 0;
            if (!grouped[reqLevel]) grouped[reqLevel] = [];
            grouped[reqLevel].push(item);
        });

        console.log('📊 Grouped by level:', Object.keys(grouped).length, 'levels');

        html += '<h3 style="color: var(--accent-primary); margin-bottom: 15px;">📊 XP Balance by Required Level</h3>';

        const sortedLevels = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedLevels.forEach(reqLevel => {
            const levelItems = grouped[reqLevel];
            const xpValues = levelItems.map(item => item.exp_after_craft || 0);
            const totalXp = xpValues.reduce((sum, xp) => sum + xp, 0);
            const avgXp = Math.round(totalXp / levelItems.length);
            const minXp = Math.min(...xpValues);
            const maxXp = Math.max(...xpValues);
            const variance = maxXp - minXp;
            
            const levelTotalXp = this.getTotalExpForLevel(parseInt(reqLevel));
            const nextLevelTotalXp = this.getTotalExpForLevel(parseInt(reqLevel) + 1);
            const xpToNextLevel = nextLevelTotalXp - levelTotalXp;
            
            // Calculate how many crafts needed to level up
            const craftsToLevel = avgXp > 0 ? Math.ceil(xpToNextLevel / avgXp) : Infinity;
            
            // Determine balance status
            let balanceStatus = '✓';
            let balanceColor = 'var(--accent-success)';
            let balanceText = 'Well balanced';
            
            if (variance > avgXp * 0.5) {
                balanceStatus = '⚠️';
                balanceColor = '#ffc107';
                balanceText = 'High variance';
            }
            
            if (avgXp < levelTotalXp * 0.01) {
                balanceStatus = '❌';
                balanceColor = 'var(--accent-danger)';
                balanceText = 'XP too low';
            } else if (avgXp > levelTotalXp * 0.5) {
                balanceStatus = '⚠️';
                balanceColor = '#ffc107';
                balanceText = 'XP very high';
            }

            html += `
                <div class="analysis-group" style="border-left: 3px solid ${balanceColor};">
                    <div class="analysis-header">
                        <div>
                            <strong>Required Level ${reqLevel}</strong>
                            <span style="margin-left: 10px; color: ${balanceColor}; font-size: 0.9em;">
                                ${balanceStatus} ${balanceText}
                            </span>
                        </div>
                        <span>${levelItems.length} item${levelItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div class="analysis-stats">
                        <div>
                            <strong style="color: var(--accent-primary);">XP Statistics</strong><br>
                            Avg: <strong>${avgXp}</strong> | 
                            Min: <strong>${minXp}</strong> | 
                            Max: <strong>${maxXp}</strong>
                            ${variance > 0 ? ` | Variance: <strong>${variance}</strong>` : ''}
                        </div>
                        
                        <div>
                            <strong style="color: var(--accent-primary);">Level Context</strong><br>
                            Total XP to reach level: <strong>${levelTotalXp.toLocaleString()}</strong><br>
                            XP to next level: <strong>${xpToNextLevel.toLocaleString()}</strong>
                        </div>
                        
                        <div>
                            <strong style="color: var(--accent-primary);">Balance Metrics</strong><br>
                            Reward/Level ratio: <strong>${((avgXp / levelTotalXp) * 100).toFixed(2)}%</strong><br>
                            Crafts to level up: <strong>${craftsToLevel === Infinity ? '∞' : craftsToLevel}</strong>
                        </div>
                    </div>
                    
                    <details style="margin-top: 15px;">
                        <summary style="cursor: pointer; color: var(--accent-secondary); font-size: 0.9em; user-select: none;">
                            📋 Show all items (${levelItems.length})
                        </summary>
                        <div style="margin-top: 10px; max-height: 300px; overflow-y: auto;">
                            <table style="width: 100%; font-size: 0.9em; border-collapse: collapse;">
                                <thead style="position: sticky; top: 0; background: var(--bg-dark);">
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <th style="text-align: left; padding: 8px; color: var(--accent-secondary);">Item</th>
                                        <th style="text-align: right; padding: 8px; color: var(--accent-secondary);">XP Reward</th>
                                        <th style="text-align: right; padding: 8px; color: var(--accent-secondary);">% of Avg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${levelItems.map(item => {
                                        const itemXp = item.exp_after_craft || 0;
                                        const percentOfAvg = avgXp > 0 ? ((itemXp / avgXp) * 100).toFixed(0) : 0;
                                        let rowColor = 'var(--text-primary)';
                                        
                                        if (itemXp < avgXp * 0.5) rowColor = '#ff6b6b';
                                        else if (itemXp > avgXp * 1.5) rowColor = '#ffc107';
                                        
                                        return `
                                            <tr style="border-bottom: 1px solid var(--border-color);">
                                                <td style="padding: 8px; color: var(--text-primary);">${item.name || item.id}</td>
                                                <td style="padding: 8px; text-align: right; color: ${rowColor}; font-weight: 600;">${itemXp}</td>
                                                <td style="padding: 8px; text-align: right; color: var(--text-secondary);">${percentOfAvg}%</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </div>
            `;
        });

        // Add summary statistics at the bottom
        const allXpValues = itemsWithXp.map(item => item.exp_after_craft || 0);
        const overallAvg = Math.round(allXpValues.reduce((sum, xp) => sum + xp, 0) / allXpValues.length);
        const overallMin = Math.min(...allXpValues);
        const overallMax = Math.max(...allXpValues);

        html += `
            <div style="margin-top: 30px; padding: 20px; background: var(--bg-dark); border-radius: 5px; border: 1px solid var(--border-color);">
                <h3 style="color: var(--accent-primary); margin-bottom: 15px;">📈 Overall Statistics</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">Total Equipment Items</div>
                        <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-primary);">${equipmentItems.length}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">Items with XP</div>
                        <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-success);">${itemsWithXp.length}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">Avg XP Reward</div>
                        <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-primary);">${overallAvg}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">XP Range</div>
                        <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-primary);">${overallMin} - ${overallMax}</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },
    
    exportToVerse() {
        const timestamp = new Date().toISOString();
        const username = 'mephistia';

        let verse = `# ProgressionConstants.verse
    # Generated by Pixel Craft Progression Balancer
    # Date: ${timestamp}
    # User: ${username}
    # Formula: Polynomial (Minecraft-style)
    # XP = QuadraticMultiplier * Level² + LinearMultiplier * Level

    using { /Verse.org/Simulation }

    ProgressionConstants<public> := module {
        QuadraticMultiplier<public> : int = ${this.config.quadratic_multiplier}
        LinearMultiplier<public> : int = ${this.config.linear_multiplier}
        MaxLevel<public> : int = ${this.config.max_level}
    }

    # Quick Reference - Key Milestones
    `;

        // Add milestones
        const milestones = [10, 25, 50, 75, this.config.max_level];
        milestones.forEach(level => {
            if (level <= this.config.max_level) {
                const xp = this.getTotalExpForLevel(level);
                verse += `# Level ${level}: ${xp.toLocaleString()} XP\n`;
            }
        });

        Utils.downloadText(verse, 'ProgressionConstants.verse');
        Utils.showAlert('success', 'ProgressionConstants.verse exported!');
    },

    exportToCSV() {
        let csv = 'Level,XP for Level,Total XP,Difference\n';
        
        for (let level = 1; level <= this.config.max_level; level++) {
            const xpForLevel = this.getRequiredExpForLevel(level);
            const totalXp = this.getTotalExpForLevel(level);
            const prevTotal = level > 1 ? this.getTotalExpForLevel(level - 1) : 0;
            const difference = totalXp - prevTotal;

            csv += `${level},${xpForLevel},${totalXp},${difference}\n`;
        }

        Utils.downloadText(csv, 'progression_table.csv');
        Utils.showAlert('success', 'CSV exported!');
    },

    importFromVerse(verseCode) {
        console.log('📖 Importing ProgressionConstants from Verse file');

        // Extract QuadraticMultiplier
        const quadraticMatch = verseCode.match(/QuadraticMultiplier<public>\s*:\s*int\s*=\s*(\d+)/);
        if (quadraticMatch) {
            this.config.quadratic_multiplier = parseInt(quadraticMatch[1]);
        }

        // Extract LinearMultiplier
        const linearMatch = verseCode.match(/LinearMultiplier<public>\s*:\s*int\s*=\s*(\d+)/);
        if (linearMatch) {
            this.config.linear_multiplier = parseInt(linearMatch[1]);
        }

        // Extract MaxLevel
        const maxLevelMatch = verseCode.match(/MaxLevel<public>\s*:\s*int\s*=\s*(\d+)/);
        if (maxLevelMatch) {
            this.config.max_level = parseInt(maxLevelMatch[1]);
        }

        // Validate
        if (!quadraticMatch && !linearMatch && !maxLevelMatch) {
            throw new Error('No valid ProgressionConstants found in file');
        }

        // Update UI and recalculate
        this.renderInputs();
        this.calculate();
        this.saveConfig();

        Utils.showAlert('success', `✅ Imported: Quadratic=${this.config.quadratic_multiplier}, Linear=${this.config.linear_multiplier}, MaxLevel=${this.config.max_level}`);
        console.log('✓ Progression constants imported successfully');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Progression.init());
} else {
    Progression.init();
}

window.Progression = Progression;