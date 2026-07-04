// script.js
// script.js
import Localization from "./localization.js";
import studyManager from "./study-manager.js";
export { 
    t, toggleLanguage, getLangCode, getLanguageLabel, renderLanguageOptions, 
    speakText, showToast, openModal, closeModal, exportAllData, 
    openImportAllModal, handleImportFile, loadData, saveData, generateId,
    handleLanguageChange
};

let currentLanguage = 'en';

// Language display names for the dropdown
const LANGUAGE_DISPLAY = {
    'en': '🇬🇧 English',
    'vi': '🇻🇳 Tiếng Việt',
    'ja': '🇯🇵 日本語',
    'zh': '🇨🇳 中文',
    'ko': '🇰🇷 한국어',
    'es': '🇪🇸 Español',
    'fr': '🇫🇷 Français',
    'de': '🇩🇪 Deutsch'
};

function t(key) {
    return Localization.t(key);
}

function toggleLanguage(lang) {
    if (lang) {
        currentLanguage = lang;
    } else {
        currentLanguage = (currentLanguage === 'en') ? 'vi' : 'en';
    }
    Localization.setLanguage(currentLanguage);
    // Update dropdown
    const select = document.getElementById('langSelect');
    if (select) {
        select.value = currentLanguage;
    }
    render();
}

function handleLanguageChange(value) {
    // Save preference
    localStorage.setItem('preferred_language', value);
    toggleLanguage(value);
}

// ============================================================
//  DATA LAYER
// ============================================================
const STORAGE_KEY = 'flashcard_app_data';

function getDefaultData() {
    return { sets: [] };
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultData();
        const data = JSON.parse(raw);
        if (!data.sets || !Array.isArray(data.sets)) return getDefaultData();
        for (const set of data.sets) {
            if (set.cards) {
                for (const card of set.cards) {
                    if (card.favorite === undefined) card.favorite = false;
                }
            }
        }
        return data;
    } catch {
        return getDefaultData();
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// ============================================================
//  LANGUAGE OPTIONS
// ============================================================
const LANGUAGE_OPTIONS = [
    { value: 'en', label: '🇬🇧 English' },
    { value: 'vi', label: '🇻🇳 Tiếng Việt' },
    { value: 'ja', label: '🇯🇵 日本語' },
    { value: 'zh', label: '🇨🇳 中文' },
    { value: 'ko', label: '🇰🇷 한국어' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
];

function getLangCode(langValue) {
    const map = {
        'en': 'en-US',
        'vi': 'vi-VN',
        'ja': 'ja-JP',
        'zh': 'zh-CN',
        'ko': 'ko-KR',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE'
    };
    return map[langValue] || 'en-US';
}

function getLanguageLabel(value) {
    const opt = LANGUAGE_OPTIONS.find(o => o.value === value);
    return opt ? opt.label : value;
}

function renderLanguageOptions(selected) {
    return LANGUAGE_OPTIONS.map(o =>
        `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`
    ).join('');
}

// Render dropdown in header
function renderHeaderLanguageDropdown() {
    const select = document.getElementById('langSelect');
    if (!select) return;
    
    // Get saved preference or default to 'en'
    const savedLang = localStorage.getItem('preferred_language') || 'en';
    
    // Build options
    select.innerHTML = LANGUAGE_OPTIONS.map(o =>
        `<option value="${o.value}" ${o.value === savedLang ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    
    // Set current language
    currentLanguage = savedLang;
    Localization.setLanguage(currentLanguage);
}

// ============================================================
//  TTS
// ============================================================
function speakText(text, langCode) {
    if (!window.speechSynthesis) {
        showToast('TTS not supported.', 'error');
        return;
    }
    if (!text || text.trim() === '') return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

// ============================================================
//  TOAST
// ============================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
                <span>${message}</span>
                <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            `;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

// ============================================================
//  MODAL
// ============================================================
function openModal(html) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    document.addEventListener('keydown', handleModalEscape);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.removeEventListener('keydown', handleModalEscape);
}

function handleModalEscape(e) {
    if (e.key === 'Escape') closeModal();
}

// ============================================================
//  EXPORT ALL DATA
// ============================================================
function exportAllData() {
    const data = loadData();
    if (data.sets.length === 0) {
        showToast('No data to export.', 'error');
        return;
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcard_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.sets.length} sets.`, 'success');
}

// ============================================================
//  IMPORT ALL DATA
// ============================================================
function openImportAllModal() {
    openModal(`
                <div class="modal-header">
                    <h2>${t('importAll')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('importAllDesc')}</label>
                    <div class="drop-zone" id="importDropZone">
                        <div class="icon">📂</div>
                        <p>${t('dropOrClick')}</p>
                        <button class="btn btn-primary" onclick="document.getElementById('importFileInput').click()">${t('chooseFile')}</button>
                        <input type="file" id="importFileInput" accept=".json" style="display:none" />
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                </div>
            `);

    // Setup drag and drop
    const dropZone = document.getElementById('importDropZone');
    const fileInput = document.getElementById('importFileInput');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImportFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleImportFile(fileInput.files[0]);
        }
    });
}

function handleImportFile(file) {
    if (!file.name.endsWith('.json')) {
        showToast('Please select a JSON file.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.sets || !Array.isArray(data.sets)) {
                showToast(t('importFail'), 'error');
                return;
            }
            // Validate data structure
            let valid = true;
            for (const set of data.sets) {
                if (!set.id || !set.name || !set.sourceLang || !set.targetLang) {
                    valid = false;
                    break;
                }
                if (set.cards && Array.isArray(set.cards)) {
                    for (const card of set.cards) {
                        if (!card.id || !card.word || !card.meaning) {
                            valid = false;
                            break;
                        }
                    }
                }
                if (!valid) break;
            }
            if (!valid) {
                showToast(t('importFail'), 'error');
                return;
            }
            // Save data
            saveData(data);
            closeModal();
            showToast(t('importSuccess').replace('{count}', data.sets.length), 'success');
            render();
        } catch (err) {
            showToast(t('importFail'), 'error');
        }
    };
    reader.readAsText(file);
}

// ============================================================
//  RENDER ENGINE
// ============================================================
let currentView = 'dashboard';
let currentSetId = null;

function render() {
    // Check if study is active
    if (studyManager.studyInstance) {
        studyManager.renderStudy();
        return;
    }

    const container = document.getElementById('mainContent');
    if (currentView === 'dashboard') {
        container.innerHTML = renderDashboard();
        attachDashboardEvents();
        setActiveAppHeader(false);
    } else if (currentView === 'detail') {
        container.innerHTML = renderSetDetail(currentSetId);
        attachDetailEvents();
        setActiveAppHeader(true);
    }
    document.getElementById('btnCreateSet').innerHTML = t('addNewCardSet');
    document.getElementById('btnExportAllModal').innerHTML = t('exportAll');
    document.getElementById('btnImportAllModal').innerHTML = t('importAll');
}

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard() {
    const data = loadData();
    const sets = data.sets;
    if (sets.length === 0) {
        return `
                    <div class="card">
                        <div class="empty-state">
                            <div class="icon">📖</div>
                            <h3>${t('noCards')}</h3>
                            <p>${currentLanguage === 'en' ? 'Create your first set to start learning!' : 'Tạo bộ thẻ đầu tiên để bắt đầu học!'}</p>
                            <button class="btn btn-primary" onclick="openCreateSetModal()">${t('createSet')}</button>
                        </div>
                    </div>
                `;
    }
    let html = `<div class="card-grid">`;
    for (const set of sets) {
        const count = set.cards ? set.cards.length : 0;
        html += `
                    <div class="set-card" onclick="viewSet('${set.id}')">
                        <h3>${escapeHtml(set.name)}</h3>
                        <div class="lang-tags">
                            <span>${escapeHtml(getLanguageLabel(set.sourceLang))}</span>
                            <span>→</span>
                            <span>${escapeHtml(getLanguageLabel(set.targetLang))}</span>
                        </div>
                        <div class="card-count">${count} ${t('remainingCards')}</div>
                        <div class="actions">
                            <button class="btn btn-primary btn-sm" onclick="viewSet('${set.id}')">${t('view')}</button>
                            <button class="btn btn-success btn-sm" onclick="window.studyManager.startStudy('${set.id}')">${t('study')}</button>
                            <button class="btn btn-secondary btn-sm" onclick="openEditSetModal('${set.id}')">${t('edit')}</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteSet('${set.id}')">${t('delete')}</button>
                        </div>
                    </div>
                `;
    }
    html += `</div>`;
    return html;
}

function attachDashboardEvents() { }

// ============================================================
//  SET DETAIL
// ============================================================
function renderSetDetail(setId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) {
        return `<div class="card"><p>${t('noCards')}</p><button class="btn btn-back" onclick="goDashboard()">${t('back')}</button></div>`;
    }
    const cards = set.cards || [];
    const count = cards.length;
    const sourceLangCode = getLangCode(set.sourceLang);
    const targetLangCode = getLangCode(set.targetLang);

    let gridItems = '';
    if (cards.length === 0) {
        gridItems = `<div style="text-align:center;color:#666688;padding:30px 0;">${t('noCards')}</div>`;
    } else {
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const fav = card.favorite ? 'active' : '';
            const favIcon = card.favorite ? '⭐' : '☆';
            const isFirst = i === 0;
            const isLast = i === cards.length - 1;

            const cellWithSpeak = (text, langCode, isEmpty = false) => {
                if (isEmpty || !text || text.trim() === '') {
                    return `<span class="empty-cell">(empty)</span>`;
                }
                return `
                            <span class="text-content">${escapeHtml(text)}</span>
                            <button class="btn-speak btn-speak-sm" onclick="event.stopPropagation(); speakText('${escapeHtml(text)}', '${langCode}')" title="${t('speak')}">🔊</button>
                        `;
            };

            gridItems += `
                        <div class="word-item">
                            <div class="col-fav">
                                <button class="btn-fav ${fav}" onclick="toggleFavorite('${setId}','${card.id}')">${favIcon}</button>
                            </div>
                            <div class="col-word">
                                ${cellWithSpeak(card.word, sourceLangCode)}
                            </div>
                            <div class="col-meaning">
                                ${cellWithSpeak(card.meaning, targetLangCode)}
                            </div>
                            <div class="col-example">
                                ${cellWithSpeak(card.example, sourceLangCode, !card.example)}
                            </div>
                            <div class="col-example-trans">
                                ${cellWithSpeak(card.exampleTranslation, targetLangCode, !card.exampleTranslation)}
                            </div>
                            <div class="col-actions">
                                <button class="btn-move" onclick="moveCard('${setId}','${card.id}',-1)" ${isFirst ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''} title="${t('moveUp')}">⬆</button>
                                <button class="btn-move" onclick="moveCard('${setId}','${card.id}',1)" ${isLast ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''} title="${t('moveDown')}">⬇</button>
                                <button class="btn btn-secondary btn-xs" onclick="openEditCardModal('${setId}','${card.id}')">${t('edit')}</button>
                                <button class="btn btn-danger btn-xs" onclick="deleteCard('${setId}','${card.id}')">${t('delete')}</button>
                            </div>
                        </div>
                    `;
        }
    }

    return `
                <div class="card">
                    <div class="detail-header">
                        <div class="left">
                            <button class="btn-back" onclick="goDashboard()">${t('back')}</button>
                            <h2>${escapeHtml(set.name)}</h2>
                            <span class="lang-badge">${escapeHtml(getLanguageLabel(set.sourceLang))} → ${escapeHtml(getLanguageLabel(set.targetLang))}</span>
                            <span style="font-size:14px;color:#8888a8;">${count} ${t('remainingCards')}</span>
                        </div>
                        <div class="detail-actions">
                            <button class="btn btn-success" onclick="window.studyManager.startStudy('${setId}')">${t('study')}</button>
                            <button class="btn btn-secondary" onclick="openImportCSVModal('${setId}')">${t('importCSV')}</button>
                            <button class="btn btn-secondary" onclick="exportCSV('${setId}')">${t('exportCSV')}</button>
                            <button class="btn btn-primary" onclick="openAddCardModal('${setId}')">${t('addCard')}</button>
                        </div>
                    </div>
                    <div class="word-grid">${gridItems}</div>
                    <div class="add-card-form" id="inlineAddForm">
                        <div class="form-row">
                            <label>${t('word')}</label>
                            <input type="text" id="inlineWord" placeholder="${currentLanguage === 'en' ? 'e.g. apple' : 'Ví dụ: apple'}" />
                        </div>
                        <div class="form-row">
                            <label>${t('meaning')}</label>
                            <input type="text" id="inlineMeaning" placeholder="${currentLanguage === 'en' ? 'e.g. quả táo' : 'Ví dụ: quả táo'}" />
                        </div>
                        <div class="form-row">
                            <label>${t('example')}</label>
                            <input type="text" id="inlineExample" placeholder="${currentLanguage === 'en' ? 'e.g. I eat an apple' : 'Ví dụ: I eat an apple'}" />
                        </div>
                        <div class="form-row">
                            <label>${t('exampleTrans')}</label>
                            <input type="text" id="inlineExampleTrans" placeholder="${currentLanguage === 'en' ? 'e.g. Tôi ăn một quả táo' : 'Ví dụ: Tôi ăn một quả táo'}" />
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-primary" onclick="handleInlineAdd('${setId}')">${t('add')}</button>
                        </div>
                    </div>
                </div>
            `;
}

function attachDetailEvents() { }

// ============================================================
//  FAVORITE TOGGLE
// ============================================================
function toggleFavorite(setId, cardId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;
    const card = set.cards.find(c => c.id === cardId);
    if (!card) return;
    card.favorite = !card.favorite;
    saveData(data);
    render();
    showToast(card.favorite ? 'Added to favorites' : 'Removed from favorites', 'info');
}

// ============================================================
//  MOVE CARD (reorder)
// ============================================================
function moveCard(setId, cardId, direction) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;
    const idx = set.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= set.cards.length) return;
    const temp = set.cards[idx];
    set.cards[idx] = set.cards[newIdx];
    set.cards[newIdx] = temp;
    saveData(data);
    render();
}

// ============================================================
//  EXPORT CSV
// ============================================================
function exportCSV(setId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) {
        showToast('Set not found.', 'error');
        return;
    }
    const cards = set.cards || [];
    if (cards.length === 0) {
        showToast(t('exportFail'), 'error');
        return;
    }

    let csvContent = '';
    for (const card of cards) {
        const word = escapeCsvField(card.word);
        const meaning = escapeCsvField(card.meaning);
        const example = escapeCsvField(card.example || '');
        const exampleTrans = escapeCsvField(card.exampleTranslation || '');
        csvContent += `${word},${meaning},${example},${exampleTrans}\n`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${set.name}_cards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(t('exportSuccess').replace('{count}', cards.length), 'success');
}

function escapeCsvField(field) {
    if (field === undefined || field === null) return '""';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// ============================================================
//  IMPORT CSV (with drag and drop)
// ============================================================
function openImportCSVModal(setId) {
    openModal(`
                <div class="modal-header">
                    <h2>${t('importCSV')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('importCSV')}</label>
                    <div class="drop-zone" id="csvDropZone">
                        <div class="icon">📄</div>
                        <p>${t('dropOrClick')}</p>
                        <button class="btn btn-primary" onclick="document.getElementById('csvFileInput').click()">${t('chooseFile')}</button>
                        <input type="file" id="csvFileInput" accept=".csv,.txt" style="display:none" />
                    </div>
                    <div class="hint" style="margin-top:12px;">${t('csvHint')}</div>
                </div>
                <div class="form-group">
                    <label>${t('inputDataDirectly')}</label>
                    <textarea id="modalCsvInput" placeholder="${t('csvPlaceholder')}" style="min-height:150px;"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button class="btn btn-primary" onclick="handleImportCsv('${setId}')">${t('import')}</button>
                </div>
            `);

    // Setup drag and drop for CSV
    const dropZone = document.getElementById('csvDropZone');
    const fileInput = document.getElementById('csvFileInput');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleCSVFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleCSVFile(fileInput.files[0]);
        }
    });
}

function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const textarea = document.getElementById('modalCsvInput');
        if (textarea) {
            textarea.value = e.target.result;
            showToast('File loaded successfully!', 'success');
        }
    };
    reader.readAsText(file);
}

function handleImportCsv(setId) {
    const raw = document.getElementById('modalCsvInput').value;
    if (!raw.trim()) {
        showToast('Please enter CSV data or upload a file.', 'error');
        return;
    }

    const lines = raw.split('\n').filter(line => line.trim() !== '');
    let added = 0;
    let errors = 0;
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) {
        showToast('Set not found.', 'error');
        return;
    }

    for (const line of lines) {
        const parts = parseCSVLine(line);
        if (parts.length < 2) {
            errors++;
            continue;
        }
        const word = parts[0].trim();
        const meaning = parts[1].trim();
        if (!word || !meaning) {
            errors++;
            continue;
        }
        const example = parts[2] ? parts[2].trim() : '';
        const exampleTranslation = parts[3] ? parts[3].trim() : '';

        set.cards.push({
            id: generateId(),
            word,
            meaning,
            example,
            exampleTranslation,
            favorite: false
        });
        added++;
    }

    saveData(data);
    closeModal();
    showToast(`Imported ${added} cards. ${errors > 0 ? errors + ' lines skipped.' : ''}`, 'success');
    render();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    result.push(current);
    return result;
}

// ============================================================
//  EDIT CARD
// ============================================================
function openEditCardModal(setId, cardId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;
    const card = set.cards.find(c => c.id === cardId);
    if (!card) return;

    openModal(`
                <div class="modal-header">
                    <h2>${t('editCard')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('word')}</label>
                    <input type="text" id="editWord" value="${escapeHtml(card.word)}" />
                </div>
                <div class="form-group">
                    <label>${t('meaning')}</label>
                    <input type="text" id="editMeaning" value="${escapeHtml(card.meaning)}" />
                </div>
                <div class="form-group">
                    <label>${t('example')}</label>
                    <input type="text" id="editExample" value="${escapeHtml(card.example)}" />
                </div>
                <div class="form-group">
                    <label>${t('exampleTrans')}</label>
                    <input type="text" id="editExampleTrans" value="${escapeHtml(card.exampleTranslation)}" />
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button class="btn btn-primary" onclick="handleEditCard('${setId}','${cardId}')">${t('saveCard')}</button>
                </div>
            `);
}

function handleEditCard(setId, cardId) {
    const word = document.getElementById('editWord').value.trim();
    const meaning = document.getElementById('editMeaning').value.trim();
    const example = document.getElementById('editExample').value.trim();
    const exampleTranslation = document.getElementById('editExampleTrans').value.trim();

    if (!word || !meaning) {
        showToast(t('word') + ' and ' + t('meaning') + ' are required.', 'error');
        return;
    }

    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;
    const card = set.cards.find(c => c.id === cardId);
    if (!card) return;
    card.word = word;
    card.meaning = meaning;
    card.example = example;
    card.exampleTranslation = exampleTranslation;
    saveData(data);
    closeModal();
    showToast('Card updated.', 'success');
    render();
}

// ============================================================
//  SET CRUD
// ============================================================
function openCreateSetModal() {
    openModal(`
                <div class="modal-header">
                    <h2>${t('createSetTitle')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('setName')}</label>
                    <input type="text" id="modalSetName" placeholder="${currentLanguage === 'en' ? 'e.g. Basic English' : 'Ví dụ: Tiếng Anh cơ bản'}" />
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label>${t('sourceLang')}</label>
                        <select id="modalSourceLang">
                            ${renderLanguageOptions('en')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('targetLang')}</label>
                        <select id="modalTargetLang">
                            ${renderLanguageOptions('vi')}
                        </select>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button class="btn btn-primary" onclick="handleCreateSet()">${t('create')}</button>
                </div>
            `);
    setTimeout(() => {
        const el = document.getElementById('modalSetName');
        if (el) el.focus();
    }, 100);
}

function handleCreateSet() {
    const name = document.getElementById('modalSetName').value.trim();
    const sourceLang = document.getElementById('modalSourceLang').value;
    const targetLang = document.getElementById('modalTargetLang').value;
    if (!name) {
        showToast(t('setName') + ' is required.', 'error');
        return;
    }
    const data = loadData();
    const newSet = {
        id: generateId(),
        name,
        sourceLang,
        targetLang,
        cards: []
    };
    data.sets.push(newSet);
    saveData(data);
    closeModal();
    showToast(`Set "${name}" created.`, 'success');
    render();
}

function openEditSetModal(id) {
    const data = loadData();
    const set = data.sets.find(s => s.id === id);
    if (!set) return;
    openModal(`
                <div class="modal-header">
                    <h2>${t('editSet')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('setName')}</label>
                    <input type="text" id="modalSetName" value="${escapeHtml(set.name)}" />
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label>${t('sourceLang')}</label>
                        <select id="modalSourceLang">
                            ${renderLanguageOptions(set.sourceLang)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('targetLang')}</label>
                        <select id="modalTargetLang">
                            ${renderLanguageOptions(set.targetLang)}
                        </select>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button class="btn btn-primary" onclick="handleEditSet('${id}')">${t('save')}</button>
                </div>
            `);
}

function handleEditSet(id) {
    const name = document.getElementById('modalSetName').value.trim();
    const sourceLang = document.getElementById('modalSourceLang').value;
    const targetLang = document.getElementById('modalTargetLang').value;
    if (!name) {
        showToast(t('setName') + ' is required.', 'error');
        return;
    }
    const data = loadData();
    const set = data.sets.find(s => s.id === id);
    if (!set) return;
    set.name = name;
    set.sourceLang = sourceLang;
    set.targetLang = targetLang;
    saveData(data);
    closeModal();
    showToast('Set updated.', 'success');
    render();
}

function deleteSet(id) {
    if (!confirm(t('deleteSetConfirm'))) return;
    const data = loadData();
    data.sets = data.sets.filter(s => s.id !== id);
    saveData(data);
    showToast('Set deleted.', 'info');
    if (currentView === 'detail' && currentSetId === id) {
        goDashboard();
    } else {
        render();
    }
}

// ============================================================
//  CARD CRUD
// ============================================================
function openAddCardModal(setId) {
    openModal(`
                <div class="modal-header">
                    <h2>${t('addCard')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('word')}</label>
                    <input type="text" id="modalCardWord" placeholder="${currentLanguage === 'en' ? 'e.g. apple' : 'Ví dụ: apple'}" />
                </div>
                <div class="form-group">
                    <label>${t('meaning')}</label>
                    <input type="text" id="modalCardMeaning" placeholder="${currentLanguage === 'en' ? 'e.g. quả táo' : 'Ví dụ: quả táo'}" />
                </div>
                <div class="form-group">
                    <label>${t('example')}</label>
                    <input type="text" id="modalCardExample" placeholder="${currentLanguage === 'en' ? 'e.g. I eat an apple' : 'Ví dụ: I eat an apple'}" />
                    <div class="hint">${currentLanguage === 'en' ? 'Optional' : 'Có thể để trống'}</div>
                </div>
                <div class="form-group">
                    <label>${t('exampleTrans')}</label>
                    <input type="text" id="modalCardExampleTrans" placeholder="${currentLanguage === 'en' ? 'e.g. Tôi ăn một quả táo' : 'Ví dụ: Tôi ăn một quả táo'}" />
                    <div class="hint">${currentLanguage === 'en' ? 'Optional' : 'Có thể để trống'}</div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button class="btn btn-primary" onclick="handleAddCard('${setId}')">${t('add')}</button>
                </div>
            `);
    setTimeout(() => {
        const el = document.getElementById('modalCardWord');
        if (el) el.focus();
    }, 100);
}

function handleAddCard(setId) {
    const word = document.getElementById('modalCardWord').value.trim();
    const meaning = document.getElementById('modalCardMeaning').value.trim();
    const example = document.getElementById('modalCardExample').value.trim();
    const exampleTranslation = document.getElementById('modalCardExampleTrans').value.trim();

    if (!word || !meaning) {
        showToast(t('word') + ' and ' + t('meaning') + ' are required.', 'error');
        return;
    }

    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;

    set.cards.push({
        id: generateId(),
        word,
        meaning,
        example,
        exampleTranslation,
        favorite: false
    });
    saveData(data);
    closeModal();
    showToast('Card added.', 'success');
    render();
}

function deleteCard(setId, cardId) {
    if (!confirm(t('deleteCardConfirm'))) return;
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;
    set.cards = set.cards.filter(c => c.id !== cardId);
    saveData(data);
    showToast('Card deleted.', 'info');
    render();
}

function handleInlineAdd(setId) {
    const word = document.getElementById('inlineWord').value.trim();
    const meaning = document.getElementById('inlineMeaning').value.trim();
    const example = document.getElementById('inlineExample').value.trim();
    const exampleTranslation = document.getElementById('inlineExampleTrans').value.trim();

    if (!word || !meaning) {
        showToast(t('word') + ' and ' + t('meaning') + ' are required.', 'error');
        return;
    }

    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return;

    set.cards.push({
        id: generateId(),
        word,
        meaning,
        example,
        exampleTranslation,
        favorite: false
    });
    saveData(data);
    document.getElementById('inlineWord').value = '';
    document.getElementById('inlineMeaning').value = '';
    document.getElementById('inlineExample').value = '';
    document.getElementById('inlineExampleTrans').value = '';
    showToast('Card added.', 'success');
    render();
}

// ============================================================
//  NAVIGATION
// ============================================================
function goDashboard() {
    currentView = 'dashboard';
    currentSetId = null;
    if (studyManager.studyInstance) {
        studyManager.studyInstance = null;
    }
    render();
}

function viewSet(id) {
    currentView = 'detail';
    currentSetId = id;
    if (studyManager.studyInstance) {
        studyManager.studyInstance = null;
    }
    render();
}

function setActiveAppHeader(active){
    const header = document.querySelector('.app-header');
    if(header){
        if(active){
            header.style.display = 'none';
        } else {
            header.style.display = 'flex';
        }
    }
}

// ============================================================
//  UTILITY
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
//  GLOBAL EXPOSE
// ============================================================
window.goDashboard = goDashboard;
window.viewSet = viewSet;
window.openCreateSetModal = openCreateSetModal;
window.openEditSetModal = openEditSetModal;
window.openAddCardModal = openAddCardModal;
window.openImportCSVModal = openImportCSVModal;
window.openImportAllModal = openImportAllModal;
window.openEditCardModal = openEditCardModal;
window.handleEditCard = handleEditCard;
window.handleCreateSet = handleCreateSet;
window.handleEditSet = handleEditSet;
window.handleAddCard = handleAddCard;
window.handleImportCsv = handleImportCsv;
window.handleInlineAdd = handleInlineAdd;
window.deleteSet = deleteSet;
window.deleteCard = deleteCard;
window.speakText = speakText;
window.closeModal = closeModal;
window.showToast = showToast;
window.toggleLanguage = toggleLanguage;
window.handleLanguageChange = handleLanguageChange;
window.t = t;
window.toggleFavorite = toggleFavorite;
window.moveCard = moveCard;
window.exportCSV = exportCSV;
window.exportAllData = exportAllData;
window.studyManager = studyManager;
window.setActiveAppHeader = setActiveAppHeader;

// ============================================================
//  INIT
// ============================================================
await Localization.load("./localization.csv");

// Render language dropdown in header
renderHeaderLanguageDropdown();

render();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay.classList.contains('hidden')) {
            closeModal();
        }
    }
    // Pass key events to study manager
    studyManager.handleKeyPress(e);
});