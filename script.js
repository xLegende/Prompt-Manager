/**
 * Local AI Prompt Manager
 * Version 3.9.3 (Bulk Operations Update)
 */

const app = {
    // ============================================================
    // 1. GLOBAL STATE & CONFIGURATION
    // ============================================================
    
    // File System Handles
    dirHandle: null,
    
    // Data Stores
    prompts: [],
    wildcards: [],
    placeholders: [],
    dictionary: [],
    
    // Selection & Editing State
    selectedIds: new Set(),
    currentEditId: null,
    currentImageFile: null,
    currentImageName: null,
    originalImageName: null,
    activeWildcard: null,
    currentImportMeta: null, // Temp storage for import
    importFilesQueue: [],    // Queue for bulk import

    // Autocomplete State
    selectedAutoIndex: -1,
    activeInput: null,

    // Default Settings
    settings: {
        gridColumns: 3,
        compactMode: false,
        deleteWithImage: false,
        copyNoLora: false,
        copyNoEmbedding: false,
        copyNoBreak: false,
        copyNormalize: false,
        imgFormat: 'original',
        imgQuality: 90,
        imgMaxRes: 0,
        stripMeta: false,
        defaultPositive: '',
        defaultNegative: ''
    },

    // Cache for DOM Elements
    dom: {},

    // Tour Configuration
    tour: {
        active: false,
        step: 0,
        steps: [
            { 
                sel: '#btn-connect', view: 'any', 
                title: '1. Connect Your Folder', 
                desc: 'Start here! Select a local folder. We will create a safe file structure to store your prompts and images.' 
            },
            { 
                sel: '[data-view="library"]', view: 'library', 
                title: '2. The Library', 
                desc: 'This is your main hub. View, sort, and manage all your saved prompts here.' 
            },
            { 
                sel: '#btn-toggle-filter', view: 'library', 
                title: '3. Filters', 
                desc: 'Looking for something specific? Filter by LoRA, Wildcards, Favorites, or specific tags.' 
            },
            { 
                sel: '[data-view="editor"]', view: 'editor', 
                title: '4. The Editor', 
                desc: 'Create new prompts here. Drag tags to reorder them. Drag & Drop an image to extract its prompt.' 
            },
            { 
                sel: '.nav-btn[onclick*="import-input"]', view: 'any', 
                title: '5. Bulk Import', 
                desc: 'Have a collection of AI images? Select multiple files here to automatically import them all at once.' 
            },
            { 
                sel: '[data-view="wildcards"]', view: 'wildcards', 
                title: '6. Wildcards & Placeholders', 
                desc: 'Manage dynamic text here. Create lists (wildcards) or variables (placeholders) to randomize your prompts.' 
            },
            { 
                sel: '[data-view="settings"]', view: 'settings', 
                title: '7. Settings & Dictionary', 
                desc: 'Customize the app here. You can also load a CSV dictionary to get autocomplete suggestions for thousands of tags.' 
            }
        ]
    },


    // ============================================================
    // 2. INITIALIZATION & DOM BINDING
    // ============================================================

    async init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadSettings();
        this.updateFolderStatus(false);
    },

    cacheDOM() {
        // Views
        this.dom.views = {
            library: document.getElementById('view-library'),
            editor: document.getElementById('view-editor'),
            wildcards: document.getElementById('view-wildcards'),
            placeholders: document.getElementById('view-placeholders'),
            settings: document.getElementById('view-settings'),
            tutorial: document.getElementById('view-tutorial')
        };

        // Navigation
        this.dom.navBtns = document.querySelectorAll('.nav-btn');

        // Library UI
        this.dom.grid = document.getElementById('prompt-grid');
        this.dom.emptyState = document.getElementById('library-empty-state');
        this.dom.noResults = document.getElementById('library-no-results');
        this.dom.searchInput = document.getElementById('search-input');
        this.dom.sortSelect = document.getElementById('sort-select');
        this.dom.advFilterPanel = document.getElementById('advanced-filters');

        // Batch & Modal UI
        this.dom.batchBar = document.getElementById('batch-bar');
        this.dom.batchCount = document.getElementById('batch-count');
        this.dom.bulkModal = document.getElementById('bulk-tag-modal');

        // Filter Inputs
        this.dom.filterInclude = document.getElementById('filter-tag-include');
        this.dom.filterExclude = document.getElementById('filter-tag-exclude');
        this.dom.filterFavorite = document.getElementById('filter-favorite');
        this.dom.filterLora = document.getElementById('filter-lora');
        this.dom.filterEmbed = document.getElementById('filter-embed');
        this.dom.filterWildcard = document.getElementById('filter-wildcard');
        this.dom.filterPlaceholder = document.getElementById('filter-placeholder');

        // Editor Inputs
        this.dom.tagList = document.getElementById('tag-list');
        this.dom.tagInput = document.getElementById('inp-tags');
        this.dom.negTagList = document.getElementById('tag-list-neg');
        this.dom.negTagInput = document.getElementById('inp-tags-neg');
        
        this.dom.autoList = document.getElementById('autocomplete-list');
        this.dom.dropZone = document.getElementById('drop-zone');
        this.dom.previewImg = document.getElementById('preview-image');
        this.dom.imgActions = document.getElementById('image-actions');
        this.dom.fileInput = document.getElementById('file-input');

        // Import UI
        this.dom.importInput = document.getElementById('import-input');
        this.dom.importModal = document.getElementById('import-modal');
        this.dom.importList = document.getElementById('import-preview-list');

        // Wildcards & Placeholders UI
        this.dom.wildcardList = document.getElementById('wildcard-file-list');
        this.dom.wildcardEditor = document.getElementById('txt-wildcard-content');
        this.dom.wildcardName = document.getElementById('current-wildcard-name');
        this.dom.placeholderList = document.getElementById('placeholder-list');

        // Tour UI
        this.dom.tourOverlay = document.getElementById('tour-overlay');
        this.dom.tourBox = document.getElementById('tour-focus-box');
        this.dom.tourTooltip = document.getElementById('tour-tooltip');
        this.dom.tourTitle = document.getElementById('tour-title');
        this.dom.tourDesc = document.getElementById('tour-desc');

        // Info Modal
        this.dom.infoModal = document.getElementById('info-modal');
        this.dom.infoGrid = document.getElementById('info-grid');

        // Dictionary
        this.dom.dictInput = document.getElementById('dict-input');
        this.dom.dictStatus = document.getElementById('dict-status');
    },

    bindEvents() {
        // Navigation
        this.dom.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!btn.hasAttribute('onclick')) this.switchView(btn.dataset.view);
            });
        });

        // Connection & Refresh
        document.getElementById('btn-connect').addEventListener('click', () => this.connectFolder());
        document.getElementById('btn-refresh').addEventListener('click', () => this.refreshData());

        // Search & Filters
        this.dom.searchInput.addEventListener('input', this.debounce(() => this.renderLibrary(), 300));
        this.dom.sortSelect.addEventListener('change', () => this.renderLibrary());

        document.getElementById('btn-toggle-filter').addEventListener('click', () => {
            this.dom.advFilterPanel.classList.toggle('hidden');
        });

        document.getElementById('btn-clear-filters').addEventListener('click', () => {
            this.dom.filterInclude.value = '';
            this.dom.filterExclude.value = '';
            this.dom.filterFavorite.checked = false;
            this.dom.filterLora.checked = false;
            this.dom.filterEmbed.checked = false;
            this.dom.filterWildcard.checked = false;
            this.dom.filterPlaceholder.checked = false;
            this.dom.searchInput.value = '';
            this.renderLibrary();
        });

        [this.dom.filterInclude, this.dom.filterExclude].forEach(el => {
            el.addEventListener('input', this.debounce(() => this.renderLibrary(), 400));
        });

        [this.dom.filterFavorite, this.dom.filterLora, this.dom.filterEmbed, this.dom.filterWildcard, this.dom.filterPlaceholder].forEach(el => {
            el.addEventListener('change', () => this.renderLibrary());
        });

        // Library Grid Delegation
        this.dom.grid.addEventListener('click', (e) => {
            // 1. Handle Tag Copy
            const tag = e.target.closest('.tag-pill');
            if (tag) {
                e.stopPropagation();
                const text = tag.textContent;
                navigator.clipboard.writeText(text).then(() => this.showToast(`Copied tag: "${text}"`));
                return;
            }

            // 2. Handle Positive Tags Expand
            const tagContainer = e.target.closest('.card-tags.positive');
            if (tagContainer) {
                tagContainer.classList.toggle('expanded');
            }

            // 3. Handle Negative Container Toggle
            const negContainer = e.target.closest('.neg-tags-container');
            if (negContainer) {
                if (e.target.closest('.icon-btn')) return;
                app.toggleNegative(negContainer.previousElementSibling);
            }
        });

        // Bulk Operations
        document.getElementById('btn-confirm-bulk').addEventListener('click', () => this.executeBulkTagOperation());

        // Editor Events
        document.getElementById('btn-cancel-edit').addEventListener('click', () => this.switchView('library'));
        document.getElementById('btn-save-prompt').addEventListener('click', () => this.savePrompt());

        [this.dom.tagInput, this.dom.negTagInput].forEach(input => {
            input.addEventListener('keydown', (e) => this.handleTagInput(e, input));
            input.addEventListener('input', (e) => this.showAutocomplete(input));
            input.addEventListener('focus', (e) => { this.activeInput = input; });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tag-editor')) {
                this.dom.autoList.classList.add('hidden');
                this.selectedAutoIndex = -1;
            }
        });

        // Image Upload & Drag-Drop
        this.dom.dropZone.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') this.dom.fileInput.click(); });
        this.dom.fileInput.addEventListener('change', (e) => this.handleImageUpload(e.target.files[0]));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dom.dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
        });
        this.dom.dropZone.addEventListener('drop', (e) => { this.handleImageUpload(e.dataTransfer.files[0]); });
        document.getElementById('btn-remove-image').addEventListener('click', (e) => { e.stopPropagation(); this.clearImage(); });

        // Import Flow
        this.dom.importInput.addEventListener('change', (e) => this.handleImportImage(e.target.files));
        document.getElementById('btn-confirm-import').addEventListener('click', () => this.executeBulkImport());

        // Wildcards & Placeholders
        document.getElementById('btn-save-wildcard-file').addEventListener('click', () => this.saveCurrentWildcard());
        document.getElementById('btn-new-wildcard').addEventListener('click', () => this.createNewWildcard());
        document.getElementById('btn-add-placeholder').addEventListener('click', () => this.addPlaceholderRow());

        // Dictionary
        this.dom.dictInput.addEventListener('change', (e) => this.handleDictionaryUpload(e.target.files[0]));
        document.getElementById('btn-clear-dict').addEventListener('click', () => this.clearDictionary());

        // Settings Bindings
        const bindSetting = (id, key, type = 'bool') => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', (e) => {
                if (type === 'bool') this.settings[key] = e.target.checked;
                else if (type === 'int') this.settings[key] = parseInt(e.target.value);
                else this.settings[key] = e.target.value;

                if (id === 'setting-img-quality') document.getElementById('lbl-quality').textContent = this.settings[key];
                if (id === 'setting-grid-cols') document.getElementById('lbl-cols').textContent = this.settings[key];

                this.saveSettings();
                if (key === 'compactMode' || key === 'gridColumns') this.applySettings();
            });
            // Init label for int types
            if (type === 'int' && id === 'setting-grid-cols') document.getElementById('lbl-cols').textContent = this.settings[key];
        };

        bindSetting('setting-compact', 'compactMode');
        bindSetting('setting-del-img', 'deleteWithImage');
        bindSetting('setting-grid-cols', 'gridColumns', 'int');
        bindSetting('setting-copy-lora', 'copyNoLora');
        bindSetting('setting-copy-embed', 'copyNoEmbedding');
        bindSetting('setting-copy-break', 'copyNoBreak');
        bindSetting('setting-copy-norm', 'copyNormalize');
        bindSetting('setting-img-format', 'imgFormat', 'val');
        bindSetting('setting-img-quality', 'imgQuality', 'int');
        bindSetting('setting-img-maxres', 'imgMaxRes', 'int');
        bindSetting('setting-strip-meta', 'stripMeta');
        bindSetting('setting-def-pos', 'defaultPositive', 'val');
        bindSetting('setting-def-neg', 'defaultNegative', 'val');

        // Tour Events
        document.getElementById('btn-start-tour').addEventListener('click', () => this.startTour());
        document.getElementById('btn-tour-next').addEventListener('click', () => this.nextTourStep());
        document.getElementById('btn-tour-skip').addEventListener('click', () => this.endTour());
        window.addEventListener('resize', () => { if (this.tour.active) this.renderTourStep(); });
    },


    // ============================================================
    // 3. FILE SYSTEM OPERATIONS
    // ============================================================

    async connectFolder() {
        try {
            this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await this.ensureFile('prompts.json', '[]');
            await this.ensureFile('placeholders.json', '{}');
            await this.ensureDir('wildcards');
            await this.ensureDir('img');
            await this.loadData();
            this.updateFolderStatus(true, this.dirHandle.name);
            this.switchView('library');
            this.showToast('Connected successfully');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                this.showToast('Connection failed', 'error');
            }
        }
    },

    async refreshData() {
        if (!this.dirHandle) return this.showToast('No folder connected', 'error');
        try {
            await this.loadData();
            // Attempt to restore previous selection
            const currentSelection = new Set(this.selectedIds);
            this.selectedIds.clear();
            this.prompts.forEach(p => {
                if (currentSelection.has(p.createdAt)) this.selectedIds.add(p.createdAt);
            });
            this.showToast('Data Reloaded');
            this.updateBatchBar();
        } catch (e) {
            console.error(e);
            this.showToast('Refresh failed', 'error');
        }
    },

    async ensureFile(name, defaultContent) {
        try {
            await this.dirHandle.getFileHandle(name);
        } catch (e) {
            const fh = await this.dirHandle.getFileHandle(name, { create: true });
            const w = await fh.createWritable();
            await w.write(defaultContent);
            await w.close();
        }
    },

    async ensureDir(name) {
        await this.dirHandle.getDirectoryHandle(name, { create: true });
    },

    async loadData() {
        // 1. Load Prompts
        const pHandle = await this.dirHandle.getFileHandle('prompts.json');
        const pFile = await pHandle.getFile();
        try {
            this.prompts = JSON.parse(await pFile.text() || '[]');
        } catch (e) {
            this.prompts = [];
        }

        // 2. Load Placeholders
        const plHandle = await this.dirHandle.getFileHandle('placeholders.json');
        const plFile = await plHandle.getFile();
        try {
            const rawObj = JSON.parse(await plFile.text() || '{}');
            this.placeholders = Object.entries(rawObj).map(([k, v], index) => {
                let active = true;
                let key = k;
                if (k.startsWith('_disabled_')) {
                    active = false;
                    key = k.replace('_disabled_', '');
                }
                return { id: Date.now() + index, key, value: v, active };
            });
        } catch (e) {
            this.placeholders = [];
        }

        // 3. Load Dictionary
        try {
            const dHandle = await this.dirHandle.getFileHandle('dictionary.csv');
            const dFile = await dHandle.getFile();
            const dText = await dFile.text();
            this.loadDictionary(dText);
        } catch (e) {
            this.dictionary = [];
            this.dom.dictStatus.textContent = "No dictionary loaded";
        }

        // 4. Load Wildcards
        const wDir = await this.dirHandle.getDirectoryHandle('wildcards');
        this.wildcards = [];
        for await (const entry of wDir.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
                this.wildcards.push({ name: entry.name, handle: entry });
            }
        }

        // Update Views
        this.renderWildcardList();
        this.renderLibrary();
        this.renderPlaceholders();
    },

    async writeJSON(filename, data) {
        const handle = await this.dirHandle.getFileHandle(filename, { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    },


    // ============================================================
    // 4. LIBRARY VIEW LOGIC
    // ============================================================

    renderLibrary() {
        if (!this.dirHandle) {
            this.dom.emptyState.classList.remove('hidden');
            this.dom.grid.classList.add('hidden');
            this.dom.noResults.classList.add('hidden');
            return;
        }

        this.dom.emptyState.classList.add('hidden');

        // Gather Filter Values
        const term = this.dom.searchInput.value.trim().toLowerCase();
        const sortMode = this.dom.sortSelect.value;
        const incTag = this.dom.filterInclude.value.trim().toLowerCase();
        const excTag = this.dom.filterExclude.value.trim().toLowerCase();

        const favOnly = this.dom.filterFavorite.checked;
        const loraOnly = this.dom.filterLora.checked;
        const embedOnly = this.dom.filterEmbed.checked;
        const wcOnly = this.dom.filterWildcard.checked;
        const phOnly = this.dom.filterPlaceholder.checked;

        // Filtering
        let filtered = this.prompts.filter(p => {
            const combinedText = (p.name + ' ' + p.tags.join(' ')).toLowerCase();
            const negText = p.negativeTags ? p.negativeTags.join(' ').toLowerCase() : '';
            const fullText = combinedText + ' ' + negText;

            const matchTerm = !term || fullText.includes(term);
            const matchInc = !incTag || p.tags.some(t => t.toLowerCase().includes(incTag)) || (p.negativeTags && p.negativeTags.some(t => t.toLowerCase().includes(incTag)));
            const matchExc = excTag && (p.tags.some(t => t.toLowerCase().includes(excTag)) || (p.negativeTags && p.negativeTags.some(t => t.toLowerCase().includes(excTag))));

            // Type Detection
            const hasLora = p.tags.some(t => t.toLowerCase().includes('<lora:'));
            const hasEmbed = p.tags.some(t => t.toLowerCase().startsWith('embedding:'));
            const hasWc = p.tags.some(t => /__[a-zA-Z0-9_.-]+__/.test(t));
            const hasPh = p.tags.some(t => /\{[a-zA-Z0-9_.-]+\}/.test(t));

            const matchFav = !favOnly || p.isFavorite;
            const matchLora = !loraOnly || hasLora;
            const matchEmbed = !embedOnly || hasEmbed;
            const matchWc = !wcOnly || hasWc;
            const matchPh = !phOnly || hasPh;

            return matchTerm && matchInc && !matchExc && matchFav && matchLora && matchEmbed && matchWc && matchPh;
        });

        // Sorting
        if (sortMode === 'newest') filtered.sort((a, b) => b.createdAt - a.createdAt);
        else if (sortMode === 'oldest') filtered.sort((a, b) => a.createdAt - b.createdAt);
        else if (sortMode === 'az') filtered.sort((a, b) => a.name.localeCompare(b.name));

        // Render
        this.dom.grid.innerHTML = '';
        if (filtered.length === 0) {
            this.dom.grid.classList.add('hidden');
            this.dom.noResults.classList.remove('hidden');
            return;
        }

        this.dom.noResults.classList.add('hidden');
        this.dom.grid.classList.remove('hidden');

        filtered.forEach(p => {
            const card = document.createElement('div');
            const isSelected = this.selectedIds.has(p.createdAt);
            card.className = `card ${isSelected ? 'selected' : ''}`;

            // Helper to generate tag HTML
            const renderTags = (tagList) => {
                let html = '';
                if (!tagList) return '';
                tagList.forEach(t => {
                    const lowerT = t.toLowerCase();
                    let cls = 'tag-pill';
                    
                    // Syntax Highlighting
                    if (lowerT.startsWith('<lora:')) cls += ' type-lora';
                    else if (lowerT.startsWith('embedding:')) cls += ' type-embed';
                    else if (t === 'BREAK') cls += ' type-break';
                    else if (/^__[a-zA-Z0-9_.-]+__$/.test(t)) cls += ' type-wildcard';
                    else if (/^\{[a-zA-Z0-9_.-]+\}$/.test(t)) cls += ' type-placeholder';

                    html += `<span class="${cls}" title="Click to copy tag">${this.escapeHtml(t)}</span>`;
                });
                return html;
            };

            const posTagsHtml = renderTags(p.tags.slice(0, 20)); // Limit displayed tags
            const negTagsHtml = p.negativeTags ? renderTags(p.negativeTags) : '';

            // Negative Prompt Section
            let negSection = '';
            if (p.negativeTags && p.negativeTags.length > 0) {
                negSection = `
                    <div class="neg-prompt-toggle" onclick="app.toggleNegative(this)">
                        <span>Negative Prompt</span>
                        <svg class="icon-chevron"><use href="#icon-plus"/></svg>
                    </div>
                    <div class="neg-tags-container hidden">
                        <div class="neg-actions">
                            <button class="icon-btn small" title="Copy Negative Prompt" onclick="event.stopPropagation(); app.copyText('${this.escapeString(p.negativeTags.join(', '))}')">
                                <svg><use href="#icon-copy"/></svg>
                            </button>
                        </div>
                        <div class="card-tags negative">${negTagsHtml}</div>
                    </div>
                `;
            }

            const favIconId = p.isFavorite ? 'icon-star' : 'icon-star-outline';
            const favClass = p.isFavorite ? 'active' : '';

            card.innerHTML = `
                <div class="select-btn" onclick="event.stopPropagation(); app.toggleSelection(${p.createdAt}, this)">
                    <svg><use href="#icon-check"/></svg>
                </div>
                <button class="fav-btn ${favClass}" title="${p.isFavorite ? 'Remove from favorites' : 'Add to favorites'}" onclick="event.stopPropagation(); app.toggleFavorite(${p.createdAt})">
                    <svg><use href="#${favIconId}"/></svg>
                </button>
                <img class="card-img" data-src="${p.image}" src="" alt="${p.name}">
                <div class="card-body">
                    <div class="card-title">${p.name}</div>
                    <div class="card-tags positive">${posTagsHtml}</div>
                    ${negSection}
                    <div class="card-actions">
                        <button class="icon-btn" title="Copy Positive Prompt" onclick="app.copyPrompt(${p.createdAt})"><svg><use href="#icon-copy"/></svg></button>
                        <button class="icon-btn" title="Edit" onclick="app.editPrompt(${p.createdAt})"><svg><use href="#icon-edit"/></svg></button>
                        <button class="icon-btn" title="Image Info" onclick="app.showInfo(${p.createdAt})"><svg><use href="#icon-info"/></svg></button>
                        <button class="icon-btn delete" title="Delete" onclick="app.deletePrompt(${p.createdAt})"><svg><use href="#icon-trash"/></svg></button>
                    </div>
                </div>`;
            this.dom.grid.appendChild(card);
        });

        this.lazyLoadImages();
    },

    lazyLoadImages() {
        const observer = new IntersectionObserver(async (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const filename = img.dataset.src;
                    if (filename && this.dirHandle) {
                        try {
                            const imgDir = await this.dirHandle.getDirectoryHandle('img');
                            const handle = await imgDir.getFileHandle(filename);
                            const file = await handle.getFile();
                            img.src = URL.createObjectURL(file);
                        } catch (e) { }
                    }
                    observer.unobserve(img);
                }
            }
        });
        document.querySelectorAll('.card-img').forEach(img => observer.observe(img));
    },

    async toggleFavorite(id) {
        const p = this.prompts.find(x => x.createdAt === id);
        if (p) {
            p.isFavorite = !p.isFavorite;
            await this.writeJSON('prompts.json', this.prompts);
            this.renderLibrary();
        }
    },

    toggleNegative(el) {
        const container = el.nextElementSibling;
        container.classList.toggle('hidden');
        if (container.classList.contains('hidden')) {
            el.classList.remove('expanded');
        } else {
            el.classList.add('expanded');
        }
    },


    // ============================================================
    // 5. BULK OPERATIONS
    // ============================================================

    toggleSelection(id, element) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
            element.closest('.card').classList.remove('selected');
        } else {
            this.selectedIds.add(id);
            element.closest('.card').classList.add('selected');
        }
        this.updateBatchBar();
    },

    clearSelection() {
        this.selectedIds.clear();
        document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
        this.updateBatchBar();
    },

    updateBatchBar() {
        const count = this.selectedIds.size;
        this.dom.batchCount.textContent = count;
        if (count > 0) this.dom.batchBar.classList.remove('hidden');
        else this.dom.batchBar.classList.add('hidden');
    },

    async bulkDelete() {
        if (this.selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${this.selectedIds.size} prompts? This cannot be undone.`)) return;

        const idsToDelete = Array.from(this.selectedIds);

        // Remove Images if needed
        if (this.settings.deleteWithImage && this.dirHandle) {
            try {
                const imgDir = await this.dirHandle.getDirectoryHandle('img');
                for (const id of idsToDelete) {
                    const p = this.prompts.find(x => x.createdAt === id);
                    if (p && p.image) {
                        // Check if image is used by other prompts not being deleted
                        const isUsed = this.prompts.some(x => x.createdAt !== id && !this.selectedIds.has(x.createdAt) && x.image === p.image);
                        if (!isUsed) {
                            try { await imgDir.removeEntry(p.image); } catch (e) { }
                        }
                    }
                }
            } catch (e) {
                console.warn("Error accessing img dir during bulk delete");
            }
        }

        this.prompts = this.prompts.filter(p => !this.selectedIds.has(p.createdAt));
        await this.writeJSON('prompts.json', this.prompts);

        this.showToast(`Deleted ${idsToDelete.length} prompts`);
        this.clearSelection();
        this.renderLibrary();
    },

    bulkTagMode: 'add', // 'add' or 'remove'

    openBulkTagModal(mode) {
        this.bulkTagMode = mode;
        document.getElementById('bulk-mode-text').textContent = mode === 'add' ? 'Add' : 'Remove';
        document.getElementById('bulk-tag-input').value = '';
        this.dom.bulkModal.classList.remove('hidden');
    },

    async executeBulkTagOperation() {
        const raw = document.getElementById('bulk-tag-input').value;
        if (!raw.trim()) return;

        const tagsToProcess = raw.split(',').map(t => t.trim()).filter(t => t);
        if (tagsToProcess.length === 0) return;

        let modifiedCount = 0;

        this.prompts.forEach(p => {
            if (this.selectedIds.has(p.createdAt)) {
                let changed = false;

                if (this.bulkTagMode === 'add') {
                    if (!p.tags) p.tags = [];
                    tagsToProcess.forEach(newTag => {
                        // Case insensitive duplicate check
                        if (!p.tags.some(existing => existing.toLowerCase() === newTag.toLowerCase())) {
                            p.tags.push(newTag);
                            changed = true;
                        }
                    });
                } else {
                    if (p.tags) {
                        const originalLen = p.tags.length;
                        p.tags = p.tags.filter(t => !tagsToProcess.some(rem => rem.toLowerCase() === t.toLowerCase()));
                        if (p.tags.length !== originalLen) changed = true;
                    }
                }

                if (changed) modifiedCount++;
            }
        });

        if (modifiedCount > 0) {
            await this.writeJSON('prompts.json', this.prompts);
            this.showToast(`${this.bulkTagMode === 'add' ? 'Added' : 'Removed'} tags in ${modifiedCount} prompts`);
            this.renderLibrary();
        } else {
            this.showToast('No changes made (tags might already exist or not found)');
        }

        this.dom.bulkModal.classList.add('hidden');
    },


    // ============================================================
    // 6. EDITOR & TAGS
    // ============================================================

    openEditor(promptData = null) {
        this.switchView('editor');
        const modeText = document.getElementById('editor-mode-text');
        const nameInp = document.getElementById('inp-name');

        this.dom.tagList.innerHTML = '';
        this.dom.negTagList.innerHTML = '';
        this.clearImage();
        this.currentImportMeta = null;

        if (promptData) {
            this.currentEditId = promptData.createdAt;
            this.originalImageName = promptData.image || null;
            modeText.textContent = 'Edit';
            nameInp.value = promptData.name;

            if (promptData.tags) promptData.tags.forEach(t => this.addTag(t, 'tag-list'));
            if (promptData.negativeTags) promptData.negativeTags.forEach(t => this.addTag(t, 'tag-list-neg'));

            if (promptData.image) {
                this.currentImageName = promptData.image;
                this.dom.dropZone.querySelector('.drop-msg').classList.add('hidden');
                this.dom.previewImg.classList.remove('hidden');
                this.dom.imgActions.classList.remove('hidden');
                (async () => {
                    try {
                        const imgDir = await this.dirHandle.getDirectoryHandle('img');
                        const handle = await imgDir.getFileHandle(promptData.image);
                        const file = await handle.getFile();
                        this.dom.previewImg.src = URL.createObjectURL(file);
                    } catch (e) { }
                })();
            }
        } else {
            this.currentEditId = null;
            this.originalImageName = null;
            modeText.textContent = 'Create';
            nameInp.value = '';

            // Apply Defaults
            if (this.settings.defaultPositive) {
                this.settings.defaultPositive.split(',').forEach(t => {
                    const clean = t.trim();
                    if (clean) this.addTag(clean, 'tag-list');
                });
            }
            if (this.settings.defaultNegative) {
                this.settings.defaultNegative.split(',').forEach(t => {
                    const clean = t.trim();
                    if (clean) this.addTag(clean, 'tag-list-neg');
                });
            }
        }
    },

    addTag(text, containerId = 'tag-list') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.draggable = true;
        chip.innerHTML = `${this.escapeHtml(text)} <span>&times;</span>`;

        chip.querySelector('span').onclick = () => chip.remove();

        // Drag and Drop Logic
        chip.addEventListener('dragstart', () => chip.classList.add('dragging'));
        chip.addEventListener('dragend', () => chip.classList.remove('dragging'));

        container.appendChild(chip);

        // Bind container dragover only once
        if (!container.dataset.dragBound) {
            container.addEventListener('dragover', e => {
                e.preventDefault();
                const dragging = document.querySelector('.dragging');
                if (!container.contains(dragging)) return;

                const siblings = [...container.querySelectorAll('.tag-chip:not(.dragging)')];
                const nextSibling = siblings.find(sib => e.clientX < sib.getBoundingClientRect().left + sib.getBoundingClientRect().width / 2);
                container.insertBefore(dragging, nextSibling);
            });
            container.dataset.dragBound = "true";
        }
    },

    handleTagInput(e, inputElement) {
        const isAutocompleteOpen = !this.dom.autoList.classList.contains('hidden');

        // Navigation within Autocomplete
        if (isAutocompleteOpen) {
            const items = this.dom.autoList.querySelectorAll('li');
            if (items.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.selectedAutoIndex = (this.selectedAutoIndex + 1) % items.length;
                    this.updateAutoHighlight(items);
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.selectedAutoIndex = (this.selectedAutoIndex - 1 + items.length) % items.length;
                    this.updateAutoHighlight(items);
                    return;
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const idx = this.selectedAutoIndex >= 0 ? this.selectedAutoIndex : 0;
                    if (items[idx]) items[idx].click();
                    return;
                }
            }
        }

        // Adding a tag (Enter or Comma)
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = inputElement.value.trim();
            if (val) {
                const containerId = inputElement.id === 'inp-tags' ? 'tag-list' : 'tag-list-neg';
                this.addTag(val, containerId);
                inputElement.value = '';
                this.dom.autoList.classList.add('hidden');
                this.selectedAutoIndex = -1;
            }
        } 
        // Deleting last tag (Backspace)
        else if (e.key === 'Backspace' && !inputElement.value) {
            const containerId = inputElement.id === 'inp-tags' ? 'tag-list' : 'tag-list-neg';
            const container = document.getElementById(containerId);
            if (container && container.lastChild) container.removeChild(container.lastChild);
            this.dom.autoList.classList.add('hidden');
        }
    },

    showAutocomplete(inputElement) {
        const val = inputElement.value.toLowerCase();
        const parent = inputElement.parentElement;
        
        // Attach dropdown to current active editor
        if (!parent.contains(this.dom.autoList)) {
            parent.appendChild(this.dom.autoList);
        }

        this.dom.autoList.innerHTML = '';
        this.selectedAutoIndex = -1;

        if (!val) {
            this.dom.autoList.classList.add('hidden');
            return;
        }

        const suggestions = [];
        
        // 1. Wildcards
        this.wildcards.forEach(w => {
            const key = `__${w.name.replace('.txt', '')}__`;
            if (key.includes(val)) suggestions.push({ text: key, type: 'wildcard' });
        });
        
        // 2. Placeholders
        this.placeholders.filter(p => p.active).forEach(p => {
            const key = `{${p.key}}`;
            if (key.includes(val)) suggestions.push({ text: key, type: 'placeholder' });
        });

        // 3. Existing Tags (from Library)
        const allTags = new Set();
        this.prompts.forEach(p => {
            p.tags.forEach(t => allTags.add(t));
            if (p.negativeTags) p.negativeTags.forEach(t => allTags.add(t));
        });
        [...allTags].filter(t => t.toLowerCase().includes(val)).slice(0, 10).forEach(t => {
            if (!suggestions.find(s => s.text === t)) suggestions.push({ text: t, type: 'tag' });
        });

        // 4. Dictionary (Limit to 15)
        if (this.dictionary.length > 0) {
            const dictMatches = this.dictionary.filter(d => d.toLowerCase().includes(val)).slice(0, 15);
            dictMatches.forEach(d => {
                if (!suggestions.find(s => s.text === d)) suggestions.push({ text: d, type: 'dict' });
            });
        }

        // Render list
        if (suggestions.length > 0) {
            this.dom.autoList.classList.remove('hidden');
            suggestions.forEach((s, i) => {
                const li = document.createElement('li');
                const typeClass = s.type === 'dict' ? 'type-dict' : 'type';
                li.innerHTML = `${this.escapeHtml(s.text)} <span class="${typeClass}">${s.type}</span>`;
                li.onclick = () => {
                    const containerId = inputElement.id === 'inp-tags' ? 'tag-list' : 'tag-list-neg';
                    this.addTag(s.text, containerId);
                    inputElement.value = '';
                    this.dom.autoList.classList.add('hidden');
                    this.selectedAutoIndex = -1;
                    inputElement.focus();
                };
                this.dom.autoList.appendChild(li);
            });
        } else {
            this.dom.autoList.classList.add('hidden');
        }
    },

    updateAutoHighlight(items) {
        items.forEach((li, idx) => {
            if (idx === this.selectedAutoIndex) li.classList.add('selected');
            else li.classList.remove('selected');
        });
        if (this.selectedAutoIndex >= 0 && items[this.selectedAutoIndex]) {
            items[this.selectedAutoIndex].scrollIntoView({ block: 'nearest' });
        }
    },

    async savePrompt() {
        const name = document.getElementById('inp-name').value;
        const tags = [...this.dom.tagList.querySelectorAll('.tag-chip')].map(c => c.firstChild.textContent.trim());
        const negTags = [...this.dom.negTagList.querySelectorAll('.tag-chip')].map(c => c.firstChild.textContent.trim());

        if (!name) return this.showToast('Prompt name required', 'error');
        if (!this.dirHandle) return this.showToast('No folder connected', 'error');

        try {
            let imgName = this.currentImageName || '';
            
            // Handle new image upload
            if (this.currentImageFile) {
                this.showToast('Processing image...', 'success');
                const processedFile = await this.processImage(this.currentImageFile);
                imgName = `${Date.now()}_${processedFile.name}`;
                const imgDir = await this.dirHandle.getDirectoryHandle('img');
                const fh = await imgDir.getFileHandle(imgName, { create: true });
                const writable = await fh.createWritable();
                await writable.write(processedFile);
                await writable.close();
            }

            // Delete old image if setting enabled
            if (this.settings.deleteWithImage && this.originalImageName && this.originalImageName !== imgName) {
                try {
                    const imgDir = await this.dirHandle.getDirectoryHandle('img');
                    await imgDir.removeEntry(this.originalImageName);
                } catch (e) { console.warn('Failed to delete old image'); }
            }

            // Merge Meta
            const existing = this.currentEditId ? this.prompts.find(p => p.createdAt === this.currentEditId) : null;
            const metaToSave = existing ? (existing.meta || {}) : (this.currentImportMeta || {});

            const newObj = {
                name,
                tags,
                negativeTags: negTags,
                image: imgName,
                isFavorite: existing ? (existing.isFavorite || false) : false,
                meta: metaToSave,
                createdAt: this.currentEditId || Date.now()
            };

            if (this.currentEditId) {
                const idx = this.prompts.findIndex(p => p.createdAt === this.currentEditId);
                if (idx > -1) this.prompts[idx] = newObj;
            } else {
                this.prompts.unshift(newObj);
            }

            await this.writeJSON('prompts.json', this.prompts);
            this.showToast('Prompt Saved!');
            this.switchView('library');
        } catch (e) {
            console.error(e);
            this.showToast('Save failed', 'error');
        }
    },

    editPrompt(id) {
        const p = this.prompts.find(x => x.createdAt === id);
        if (p) this.openEditor(p);
    },

    async deletePrompt(id) {
        if (!confirm('Delete this prompt?')) return;
        const p = this.prompts.find(x => x.createdAt === id);
        
        if (this.settings.deleteWithImage && p && p.image) {
            const isUsed = this.prompts.some(x => x.createdAt !== id && x.image === p.image);
            if (!isUsed) {
                try {
                    const imgDir = await this.dirHandle.getDirectoryHandle('img');
                    await imgDir.removeEntry(p.image);
                } catch (e) { }
            }
        }
        
        this.prompts = this.prompts.filter(p => p.createdAt !== id);
        await this.writeJSON('prompts.json', this.prompts);
        this.renderLibrary();
        this.showToast('Prompt deleted');
    },


    // ============================================================
    // 7. IMAGE PROCESSING & METADATA
    // ============================================================

    handleImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) return;
        this.currentImageFile = file;
        this.dom.previewImg.src = URL.createObjectURL(file);
        this.dom.previewImg.classList.remove('hidden');
        this.dom.dropZone.querySelector('.drop-msg').classList.add('hidden');
        this.dom.imgActions.classList.remove('hidden');
    },

    clearImage() {
        this.currentImageFile = null;
        this.currentImageName = null;
        this.dom.previewImg.src = '';
        this.dom.previewImg.classList.add('hidden');
        this.dom.dropZone.querySelector('.drop-msg').classList.remove('hidden');
        this.dom.imgActions.classList.add('hidden');
        this.dom.fileInput.value = '';
    },

    /**
     * Resizes and converts image based on settings
     */
    async processImage(file) {
        const { imgFormat, imgQuality, imgMaxRes, stripMeta } = this.settings;
        // If no processing needed
        if (imgFormat === 'original' && imgMaxRes === 0 && !stripMeta) return file;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                // Resize logic
                if (imgMaxRes > 0 && (w > imgMaxRes || h > imgMaxRes)) {
                    const r = Math.min(imgMaxRes / w, imgMaxRes / h);
                    w = Math.round(w * r);
                    h = Math.round(h * r);
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                let type = file.type;
                let ext = file.name.split('.').pop();

                if (imgFormat !== 'original') {
                    type = `image/${imgFormat}`;
                    ext = imgFormat;
                }

                canvas.toBlob(blob => {
                    if (!blob) return reject(new Error('Canvas failed'));
                    const newName = `${file.name.substring(0, file.name.lastIndexOf('.'))}.${ext}`;
                    resolve(new File([blob], newName, { type: type }));
                }, type, imgQuality / 100);
            };
            img.onerror = (e) => reject(e);
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Reads PNG tEXt chunks for Stable Diffusion metadata
     */
    async readPNGMetadata(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const buffer = e.target.result;
                    const view = new DataView(buffer);
                    const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

                    // Check Signature
                    for (let i = 0; i < 8; i++) if (view.getUint8(i) !== magic[i]) return resolve(null);

                    let offset = 8;
                    const txtData = {};

                    while (offset < buffer.byteLength) {
                        const length = view.getUint32(offset);
                        const type = String.fromCharCode(
                            view.getUint8(offset + 4), view.getUint8(offset + 5),
                            view.getUint8(offset + 6), view.getUint8(offset + 7)
                        );

                        if (type === 'tEXt') {
                            let keyword = '';
                            let text = '';
                            let dataOffset = offset + 8;
                            let charCode;

                            // Read Keyword (null terminated)
                            while ((charCode = view.getUint8(dataOffset++)) !== 0) {
                                keyword += String.fromCharCode(charCode);
                            }

                            // Read Text
                            const end = offset + 8 + length;
                            while (dataOffset < end) {
                                text += String.fromCharCode(view.getUint8(dataOffset++));
                            }
                            txtData[keyword] = text;
                        }

                        // Move to next chunk (Length + Type(4) + Data + CRC(4))
                        offset += 12 + length;
                    }
                    resolve(txtData);

                } catch (err) {
                    console.error("Error parsing PNG", err);
                    resolve(null);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    },

    parseSDParameters(rawText) {
        if (!rawText) return { pos: '', neg: '', meta: {} };

        const result = { pos: '', neg: '', meta: {} };
        const lines = rawText.split('\n');
        let posLines = [];
        let negLines = [];
        let isNeg = false;

        const lastLineIndex = lines.length - 1;
        const lastLine = lines[lastLineIndex];
        // A1111 footer detection
        const hasParams = (lastLine.includes('Steps: ') && lastLine.includes('Sampler: ')) || lastLine.startsWith('Steps: ');

        const contentLines = hasParams ? lines.slice(0, -1) : lines;

        for (let line of contentLines) {
            if (line.startsWith('Negative prompt:')) {
                isNeg = true;
                const content = line.substring(16).trim();
                if (content) negLines.push(content);
            } else {
                if (isNeg) negLines.push(line);
                else posLines.push(line);
            }
        }

        result.pos = posLines.join(' ').trim();
        result.neg = negLines.join(' ').trim();

        if (hasParams) {
            // Parse "Key: Value, Key2: Value2"
            const metaParts = lastLine.split(/,\s*(?=[a-zA-Z0-9\s]+:)/);
            metaParts.forEach(part => {
                const separator = part.indexOf(':');
                if (separator !== -1) {
                    const key = part.substring(0, separator).trim();
                    const val = part.substring(separator + 1).trim();

                    if (key === 'Steps') result.meta['steps'] = val;
                    else if (key === 'Sampler') result.meta['sampler'] = val;
                    else if (key === 'CFG scale') result.meta['cfg'] = val;
                    else if (key === 'Seed') result.meta['seed'] = val;
                    else if (key === 'Size') result.meta['size'] = val;
                    else if (key === 'Model' || key === 'Model hash') result.meta[key.toLowerCase()] = val;
                    else result.meta[key] = val;
                }
            });
        }

        return result;
    },

    // ============================================================
    // 8. IMPORT LOGIC
    // ============================================================

    async handleImportImage(files) {
        if (!files || files.length === 0) return;

        // Case 1: Single File -> Editor
        if (files.length === 1) {
            const file = files[0];
            this.showToast('Parsing Metadata...');

            const pngData = await this.readPNGMetadata(file);
            const parsed = pngData && pngData.parameters ? this.parseSDParameters(pngData.parameters) : { pos: '', neg: '', meta: {} };

            this.openEditor();

            const nameInp = document.getElementById('inp-name');
            nameInp.value = file.name.replace(/\.[^/.]+$/, "");

            this.dom.tagList.innerHTML = '';
            this.dom.negTagList.innerHTML = '';

            if (parsed.pos) parsed.pos.split(',').forEach(t => { if (t.trim()) this.addTag(t.trim(), 'tag-list'); });
            if (parsed.neg) parsed.neg.split(',').forEach(t => { if (t.trim()) this.addTag(t.trim(), 'tag-list-neg'); });

            this.handleImageUpload(file);
            this.currentImportMeta = parsed.meta;
            this.showToast('Metadata Imported!');
            this.dom.importInput.value = '';
            return;
        }

        // Case 2: Multiple Files -> Bulk Import
        this.importFilesQueue = Array.from(files);

        if (!this.dirHandle) {
            this.showToast('Please connect a folder first', 'error');
            return;
        }

        // Show Modal
        document.getElementById('import-count').textContent = this.importFilesQueue.length;
        this.dom.importList.innerHTML = '';

        // Preview 5 items
        this.importFilesQueue.slice(0, 5).forEach(f => {
            const div = document.createElement('div');
            div.className = 'import-item';
            div.innerHTML = `<span>${f.name}</span><span>${(f.size / 1024).toFixed(0)}KB</span>`;
            this.dom.importList.appendChild(div);
        });

        if (this.importFilesQueue.length > 5) {
            const div = document.createElement('div');
            div.className = 'import-item';
            div.style.fontStyle = 'italic';
            div.textContent = `...and ${this.importFilesQueue.length - 5} more`;
            this.dom.importList.appendChild(div);
        }

        this.dom.importModal.classList.remove('hidden');
        this.dom.importInput.value = '';
    },

    async executeBulkImport() {
        this.dom.importModal.classList.add('hidden');
        this.showToast(`Starting import of ${this.importFilesQueue.length} files...`);

        let addedCount = 0;

        try {
            const imgDir = await this.dirHandle.getDirectoryHandle('img');

            for (const file of this.importFilesQueue) {
                // Parse
                const pngData = await this.readPNGMetadata(file);
                const parsed = pngData && pngData.parameters ? this.parseSDParameters(pngData.parameters) : { pos: '', neg: '', meta: {} };

                // Save File
                const processedFile = await this.processImage(file);
                const uniqueName = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${processedFile.name.replace(/[^a-z0-9.]/gi, '_')}`;
                const fh = await imgDir.getFileHandle(uniqueName, { create: true });
                const writable = await fh.createWritable();
                await writable.write(processedFile);
                await writable.close();

                // Add to Data
                const tags = parsed.pos ? parsed.pos.split(',').map(t => t.trim()).filter(t => t) : [];
                const negTags = parsed.neg ? parsed.neg.split(',').map(t => t.trim()).filter(t => t) : [];

                this.prompts.unshift({
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    tags: tags,
                    negativeTags: negTags,
                    image: uniqueName,
                    isFavorite: false,
                    createdAt: Date.now(),
                    meta: parsed.meta
                });

                addedCount++;
            }

            await this.writeJSON('prompts.json', this.prompts);
            this.showToast(`Successfully imported ${addedCount} images!`);
            this.refreshData();

        } catch (e) {
            console.error("Import error", e);
            this.showToast("Error during import process", 'error');
        }

        this.importFilesQueue = [];
    },


    // ============================================================
    // 9. WILDCARDS & PLACEHOLDERS
    // ============================================================

    renderWildcardList() {
        this.dom.wildcardList.innerHTML = '';
        this.wildcards.forEach(w => {
            const div = document.createElement('div');
            div.className = 'list-item'; 
            div.textContent = w.name;
            div.onclick = () => this.loadWildcardContent(w, div);
            this.dom.wildcardList.appendChild(div);
        });
    },

    async loadWildcardContent(wildcardObj, uiElement) {
        document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
        uiElement.classList.add('active');
        const file = await wildcardObj.handle.getFile();
        const content = await file.text();
        this.activeWildcard = { ...wildcardObj, content };
        this.dom.wildcardName.textContent = wildcardObj.name;
        this.dom.wildcardEditor.value = content;
    },

    async saveCurrentWildcard() {
        if (!this.activeWildcard) return;
        try {
            const content = this.dom.wildcardEditor.value;
            const writable = await this.activeWildcard.handle.createWritable();
            await writable.write(content);
            await writable.close();
            this.showToast('File saved');
        } catch (e) {
            this.showToast('Error saving file', 'error');
        }
    },

    async createNewWildcard() {
        const name = prompt('Enter filename (e.g. colors.txt):');
        if (!name) return;
        const cleanName = name.endsWith('.txt') ? name : name + '.txt';
        try {
            const wDir = await this.dirHandle.getDirectoryHandle('wildcards');
            const newHandle = await wDir.getFileHandle(cleanName, { create: true });
            this.wildcards.push({ name: cleanName, handle: newHandle });
            this.renderWildcardList();
        } catch (e) {
            this.showToast('Could not create file', 'error');
        }
    },

    renderPlaceholders() {
        this.dom.placeholderList.innerHTML = '';
        this.placeholders.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'ph-row';
            row.innerHTML = `
                <div class="ph-col-key">
                    <input type="text" class="ph-input key" value="${item.key}" placeholder="Key" onchange="app.updatePlaceholder(${index}, 'key', this.value)">
                </div>
                <div class="ph-col-val">
                    <input type="text" class="ph-input" value="${item.value}" placeholder="Value to replace" onchange="app.updatePlaceholder(${index}, 'value', this.value)">
                </div>
                <div class="ph-col-active">
                    <label class="switch">
                        <input type="checkbox" ${item.active ? 'checked' : ''} onchange="app.updatePlaceholder(${index}, 'active', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="ph-col-action">
                    <button class="icon-btn delete" onclick="app.deletePlaceholder(${index})"><svg style="width:16px;height:16px"><use href="#icon-trash"/></svg></button>
                </div>`;
            this.dom.placeholderList.appendChild(row);
        });
    },

    addPlaceholderRow() {
        this.placeholders.push({ id: Date.now(), key: '', value: '', active: true });
        this.renderPlaceholders();
        this.savePlaceholders();
    },

    updatePlaceholder(index, field, value) {
        this.placeholders[index][field] = value;
        this.savePlaceholders();
    },

    deletePlaceholder(index) {
        if (confirm('Delete this placeholder?')) {
            this.placeholders.splice(index, 1);
            this.renderPlaceholders();
            this.savePlaceholders();
        }
    },

    async savePlaceholders() {
        const exportObj = {};
        this.placeholders.forEach(p => {
            if (p.key.trim()) {
                const finalKey = p.active ? p.key.trim() : `_disabled_${p.key.trim()}`;
                exportObj[finalKey] = p.value;
            }
        });
        try {
            await this.writeJSON('placeholders.json', exportObj);
        } catch (e) {
            this.showToast('Error saving placeholders', 'error');
        }
    },


    // ============================================================
    // 10. DICTIONARY
    // ============================================================

    loadDictionary(text) {
        if (!text) { this.dictionary = []; return; }
        const lines = text.split(/\r?\n/);
        const tags = new Set();

        lines.forEach(line => {
            if (!line.trim()) return;
            let tag = '';
            // Handle simple CSV (column 1)
            if (line.startsWith('"')) {
                const endQuote = line.indexOf('"', 1);
                if (endQuote !== -1) tag = line.substring(1, endQuote);
                else tag = line.split(',')[0];
            } else {
                tag = line.split(',')[0];
            }
            tag = tag.trim();
            if (tag && tag.toLowerCase() !== 'tag' && tag.toLowerCase() !== 'name') {
                tags.add(tag);
            }
        });
        this.dictionary = [...tags];
        this.dom.dictStatus.textContent = `Loaded ${this.dictionary.length} unique tags`;
    },

    async handleDictionaryUpload(file) {
        if (!file || !this.dirHandle) return;
        try {
            const text = await file.text();
            const fh = await this.dirHandle.getFileHandle('dictionary.csv', { create: true });
            const writable = await fh.createWritable();
            await writable.write(text);
            await writable.close();

            this.loadDictionary(text);
            this.showToast(`Dictionary imported (${this.dictionary.length} tags found)`);
            this.dom.dictInput.value = '';
        } catch (e) {
            console.error(e);
            this.showToast('Failed to import dictionary', 'error');
        }
    },

    async clearDictionary() {
        if (!this.dirHandle) return;
        if (confirm('Are you sure you want to remove the dictionary file?')) {
            try {
                await this.dirHandle.removeEntry('dictionary.csv');
                this.dictionary = [];
                this.dom.dictStatus.textContent = "No dictionary loaded";
                this.showToast('Dictionary removed');
            } catch (e) {
                this.dictionary = [];
                this.dom.dictStatus.textContent = "No dictionary loaded";
            }
        }
    },


    // ============================================================
    // 11. COPYING & INFO
    // ============================================================

    async copyPrompt(id) {
        const p = this.prompts.find(x => x.createdAt === id);
        if (!p) return;
        let text = p.tags.join(', ');
        this.copyText(text);
    },

    async copyText(text) {
        if (!text) return;

        // 1. Apply Placeholders
        this.placeholders.filter(ph => ph.active).forEach(ph => {
            text = text.replaceAll(`{${ph.key}}`, ph.value);
        });

        // 2. Resolve Wildcards (Random Line)
        const regex = /__([a-zA-Z0-9_.-]+)__/g;
        const matches = [...text.matchAll(regex)];
        for (const match of matches) {
            const wcName = match[1] + '.txt';
            const wcObj = this.wildcards.find(w => w.name === wcName);
            if (wcObj) {
                try {
                    const f = await wcObj.handle.getFile();
                    const c = await f.text();
                    const lines = c.split('\n').map(l => l.trim()).filter(l => l);
                    if (lines.length) {
                        text = text.replace(match[0], lines[Math.floor(Math.random() * lines.length)]);
                    }
                } catch (e) { }
            }
        }

        // 3. Apply Settings Filters
        if (this.settings.copyNoLora) text = text.replace(/<lora:[^>]+>/gi, '');
        if (this.settings.copyNoEmbedding) text = text.replace(/embedding:[^\s,]+/gi, '');
        if (this.settings.copyNoBreak) text = text.replace(/\bBREAK\b/g, '');
        if (this.settings.copyNormalize) {
            text = text.replace(/\(([^:\)]+):[\d\.]+\)/g, '$1'); // Remove weights (text:1.2)
            text = text.replace(/[\(\)\[\]\{\}]/g, ''); // Remove remaining brackets
        }

        // 4. Cleanup
        text = text.replace(/\s+,/g, ',')
            .replace(/,\s*,/g, ', ')
            .replace(/\s+/g, ' ')
            .trim();
        if (text.startsWith(',')) text = text.substring(1).trim();

        navigator.clipboard.writeText(text).then(() => this.showToast('Copied to clipboard'));
    },

    async showInfo(id) {
        const p = this.prompts.find(x => x.createdAt === id);
        if (!p) return;

        this.dom.infoGrid.innerHTML = '<div class="info-label">Loading...</div>';
        this.dom.infoModal.classList.remove('hidden');

        let rows = [
            ['Name', p.name],
            ['Created', new Date(p.createdAt).toLocaleString()]
        ];

        // Advanced Metadata
        if (p.meta) {
            if (p.meta.model) rows.push(['Model', p.meta.model]);
            if (p.meta.seed) rows.push(['Seed', p.meta.seed]);
            if (p.meta.sampler) rows.push(['Sampler', p.meta.sampler]);
            if (p.meta.cfg) rows.push(['CFG Scale', p.meta.cfg]);
            if (p.meta.steps) rows.push(['Steps', p.meta.steps]);
        }

        // File Info
        if (p.image && this.dirHandle) {
            try {
                const imgDir = await this.dirHandle.getDirectoryHandle('img');
                const handle = await imgDir.getFileHandle(p.image);
                const file = await handle.getFile();

                const sizeKB = (file.size / 1024).toFixed(2);
                const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;

                rows.push(['Filename', p.image]);
                rows.push(['File Size', sizeStr]);
                rows.push(['Type', file.type]);

                await new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => {
                        rows.push(['Dimensions', `${img.naturalWidth} x ${img.naturalHeight} px`]);
                        resolve();
                    };
                    img.onerror = () => {
                        rows.push(['Dimensions', 'Unknown']);
                        resolve();
                    }
                    img.src = URL.createObjectURL(file);
                });

            } catch (e) {
                rows.push(['Image', 'Error loading metadata']);
            }
        } else {
            rows.push(['Image', 'No image attached']);
        }

        this.dom.infoGrid.innerHTML = rows.map(([label, val]) => `
            <div class="info-label">${label}</div>
            <div class="info-value">${val}</div>
        `).join('');
    },

    closeInfo() {
        this.dom.infoModal.classList.add('hidden');
    },


    // ============================================================
    // 12. UTILITIES & SETTINGS
    // ============================================================

    switchView(viewName) {
        Object.values(this.dom.views).forEach(el => el.classList.remove('active', 'hidden'));
        Object.values(this.dom.views).forEach(el => el.classList.add('hidden'));
        
        this.dom.views[viewName].classList.remove('hidden');
        this.dom.views[viewName].classList.add('active');
        
        this.dom.navBtns.forEach(btn => {
            if (btn.dataset.view === viewName) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        if (viewName === 'library') this.renderLibrary();
        if (viewName === 'placeholders') this.renderPlaceholders();
    },

    updateFolderStatus(connected, name) {
        const statusEl = document.getElementById('folder-status');
        const nameEl = document.getElementById('folder-name');
        const refreshBtn = document.getElementById('btn-refresh');

        if (connected) {
            statusEl.classList.add('connected');
            nameEl.textContent = name;
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = "1";
        } else {
            statusEl.classList.remove('connected');
            nameEl.textContent = 'No Folder Selected';
            refreshBtn.disabled = true;
            refreshBtn.style.opacity = "0.3";
        }
    },

    loadSettings() {
        const s = localStorage.getItem('local-prompt-settings');
        if (s) this.settings = { ...this.settings, ...JSON.parse(s) };
        
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        
        setCheck('setting-compact', this.settings.compactMode);
        setCheck('setting-del-img', this.settings.deleteWithImage);
        setVal('setting-grid-cols', this.settings.gridColumns);
        setCheck('setting-copy-lora', this.settings.copyNoLora);
        setCheck('setting-copy-embed', this.settings.copyNoEmbedding);
        setCheck('setting-copy-break', this.settings.copyNoBreak);
        setCheck('setting-copy-norm', this.settings.copyNormalize);
        setVal('setting-img-format', this.settings.imgFormat);
        setVal('setting-img-quality', this.settings.imgQuality);
        setVal('setting-img-maxres', this.settings.imgMaxRes);
        setCheck('setting-strip-meta', this.settings.stripMeta);
        setVal('setting-def-pos', this.settings.defaultPositive || '');
        setVal('setting-def-neg', this.settings.defaultNegative || '');
        
        document.getElementById('lbl-cols').textContent = this.settings.gridColumns;
        this.applySettings();
    },

    saveSettings() {
        localStorage.setItem('local-prompt-settings', JSON.stringify(this.settings));
    },

    applySettings() {
        document.documentElement.style.setProperty('--grid-cols', this.settings.gridColumns);
        if (this.settings.compactMode) document.body.classList.add('compact-mode');
        else document.body.classList.remove('compact-mode');
    },

    showToast(msg, type = 'success') {
        const box = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        box.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },

    escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;")
                   .replace(/</g, "&lt;")
                   .replace(/>/g, "&gt;")
                   .replace(/"/g, "&quot;")
                   .replace(/'/g, "&#039;");
    },

    escapeString(text) {
        if (!text) return text;
        return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    },

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // Tour Logic
    startTour() { this.tour.active = true; this.tour.step = 0; this.dom.tourOverlay.classList.remove('hidden'); this.renderTourStep(); },
    endTour() { this.tour.active = false; this.dom.tourOverlay.classList.add('hidden'); this.switchView('tutorial'); },
    nextTourStep() { this.tour.step++; if (this.tour.step >= this.tour.steps.length) { this.endTour(); this.showToast('Tour Completed!'); } else { this.renderTourStep(); } },
    renderTourStep() {
        if (!this.tour.active) return;
        const data = this.tour.steps[this.tour.step];
        if (data.view !== 'any') this.switchView(data.view);
        
        setTimeout(() => {
            const el = document.querySelector(data.sel);
            if (!el) return this.nextTourStep();
            
            const rect = el.getBoundingClientRect();
            const pad = 5;
            this.dom.tourBox.style.top = (rect.top - pad) + 'px';
            this.dom.tourBox.style.left = (rect.left - pad) + 'px';
            this.dom.tourBox.style.width = (rect.width + (pad * 2)) + 'px';
            this.dom.tourBox.style.height = (rect.height + (pad * 2)) + 'px';
            
            const ttW = 300;
            let ttLeft = rect.right + 20;
            let ttTop = rect.top;
            if (ttLeft + ttW > window.innerWidth) { ttLeft = Math.max(10, rect.left); ttTop = rect.bottom + 20; }
            if (ttTop + 150 > window.innerHeight) { ttTop = rect.top - 150; }
            
            this.dom.tourTooltip.style.top = ttTop + 'px';
            this.dom.tourTooltip.style.left = ttLeft + 'px';
            this.dom.tourTitle.textContent = data.title;
            this.dom.tourDesc.textContent = data.desc;
            document.getElementById('btn-tour-next').textContent = (this.tour.step === this.tour.steps.length - 1) ? 'Finish' : 'Next';
        }, 100);
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => app.init());