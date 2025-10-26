// Constants and Configuration
// Maps to Verse enums and system limits

const CONSTANTS = {
    // System limits (from Verse architecture)
    MAX_STACK: 99,
    MAX_ENCHANTMENT_LEVEL: 4,
    MAX_UPGRADE_LEVEL: 4,
    
    // Item types (maps to ItemTypes.item_type enum)
    ITEM_TYPES: [
        { value: 'Equipment', label: 'Equipment', class: 'type-equipment' },
        { value: 'Resource', label: 'Resource', class: 'type-resource' },
        { value: 'Consumable', label: 'Consumable', class: 'type-consumable' },
        { value: 'Placeable', label: 'Placeable', class: 'type-placeable' }
    ],
    
    // Item quality (maps to ItemTypes.item_quality enum)
    ITEM_QUALITY: [
        { value: 'Broken', label: 'Broken', class: 'quality-broken' },
        { value: 'Basic', label: 'Basic', class: 'quality-basic' },
        { value: 'Improved', label: 'Improved', class: 'quality-improved' },
        { value: 'Perfect', label: 'Perfect', class: 'quality-perfect' }
    ],
    
    // Equipment slots (maps to ItemTypes.equip_slot enum)
    EQUIP_SLOTS: [
        { value: 'Armor', label: 'Armor', class: 'slot-armor' },
        { value: 'Weapon', label: 'Weapon', class: 'slot-weapon' },
        { value: 'HarvestingTool', label: 'Harvesting Tool', class: 'slot-tool' }
    ],
    
    // Effect types for consumables (maps to ItemTypes.effect_type enum)
    EFFECT_TYPES: [
        { value: 'HealOverTime', label: 'Heal Over Time', class: 'effect-heal-over-time' },
        { value: 'InstantHeal', label: 'Instant Heal', class: 'effect-instant-heal' },
        { value: 'SpeedBoost', label: 'Speed Boost', class: 'effect-speed-boost' },
        { value: 'DamageBoost', label: 'Damage Boost', class: 'effect-damage-boost' },
        { value: 'MaxHealthBoost', label: 'Max Health Boost', class: 'effect-max-health-boost' },
        { value: 'HarvestingBoost', label: 'Harvesting Boost', class: 'effect-harvesting-boost' }
    ],
    
    // Workstation boost types (maps to ItemTypes.workstation_boost_type enum)
    BOOST_TYPES: [
        { value: 'ReducedCost', label: 'Reduced Cost (20%)', class: 'boost-reducedcost', description: 'Reduces material cost of recipes by 20%' },
        { value: 'EasierSkillCheck', label: 'Easier Skill Check', class: 'boost-easierskillcheck', description: 'Increases area of success for skill checks' },
        { value: 'LuckyNotWaste', label: 'Lucky Not Waste', class: 'boost-luckynotwaste', description: 'Increases chance to not consume durability on use' },
        { value: 'DoubleYield', label: 'Double Yield', class: 'boost-doubleyield', description: 'Chance to double output items when crafting' },
        { value: 'UniqueEffect', label: 'Unique Effect', class: 'boost-uniqueeffect', description: 'Special effect defined per workstation' }
    ],
    
    // Placeable behavior types (maps to ItemTypes.placeable_behavior_type enum)
    PLACEABLE_BEHAVIORS: [
        { value: 'Workstation', label: 'Workstation', class: 'behavior-workstation', description: 'Can craft items with recipes' },
        { value: 'Storage', label: 'Storage', class: 'behavior-storage', description: 'Can store items' },
        { value: 'Decoration', label: 'Decoration', class: 'behavior-decoration', description: 'No interaction' },
        { value: 'Interactive', label: 'Interactive', class: 'behavior-interactive', description: 'Custom interaction defined per Placeable' },
        { value: 'Generator', label: 'Generator', class: 'behavior-generator', description: 'Generates resources over time' }
    ],
    
    // Skilled difficulty range (0-9)
    MIN_DIFFICULTY: 0,
    MAX_DIFFICULTY: 9,
    
    // Difficulty visual grouping
    DIFFICULTY_GROUPS: [
        { min: 0, max: 2, label: 'Easy', class: 'diff-easy', color: '#10b981' },
        { min: 3, max: 5, label: 'Medium', class: 'diff-medium', color: '#fbbf24' },
        { min: 6, max: 9, label: 'Hard', class: 'diff-hard', color: '#ef4444' }
    ],
    
    // Auto-save interval (milliseconds)
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    
    // Freshness warning threshold (hours)
    FRESHNESS_WARNING_HOURS: 2,
    
    // Export file naming
    EXPORT_FILES: {
        items: 'items_catalog.verse',
        recipes: 'recipes_catalog.verse',
        workstations: 'workstations_catalog.verse',
        makeshift: 'makeshift_config.verse',
        breakables: 'breakable_resources_catalog.verse' 
    },
    
    VERSE_IMPORTS: {
        items: [
            'ItemSystem.ItemData',
            'ItemSystem.ItemTypes'
        ],
        recipes: [
            'ItemSystem.RecipeData'
        ],
        workstations: [
            'ItemSystem.RecipeData',
            'ItemSystem.ItemTypes'
        ],
        makeshift: [
            'ItemSystem.RecipeInterfaces'
        ],
        breakables: [
            'ItemSystem.BreakableData',
            'ItemSystem.DropsConfig'
        ]
    },
    
    // Default metadata keys
    DEFAULT_METADATA_KEYS: [
        'tier',
        'rarity',
        'icon_path',
        'model_path',
        'sound_path'
    ]
};