import Localization from "./localization.js";

let currentLanguage = 'en';

function t(key) {
    //return LANG[currentLanguage][key] || key;
    return Localization.t(key);
}

function toggleLanguage() {
    currentLanguage = (currentLanguage === 'en') ? 'vi' : 'en';
    const btn = document.getElementById('langToggle');
    btn.textContent = currentLanguage === 'en' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English';
    Localization.setLanguage(currentLanguage);
    render();
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
    { value: 'english', label: 'English' },
    { value: 'vietnamese', label: 'Tiếng Việt' },
    { value: 'japanese', label: '日本語' },
    { value: 'chinese', label: '中文' },
    { value: 'korean', label: '한국어' },
    { value: 'spanish', label: 'Español' },
    { value: 'french', label: 'Français' },
    { value: 'german', label: 'Deutsch' },
];

function getLangCode(langValue) {
    const map = {
        'english': 'en-US',
        'vietnamese': 'vi-VN',
        'japanese': 'ja-JP',
        'chinese': 'zh-CN',
        'korean': 'ko-KR',
        'spanish': 'es-ES',
        'french': 'fr-FR',
        'german': 'de-DE'
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
let studyState = null;

function render() {
    const container = document.getElementById('mainContent');
    if (currentView === 'dashboard') {
        container.innerHTML = renderDashboard();
        attachDashboardEvents();
    } else if (currentView === 'detail') {
        container.innerHTML = renderSetDetail(currentSetId);
        attachDetailEvents();
    } else if (currentView === 'study') {
        container.innerHTML = renderStudy();
        attachStudyEvents();
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
                            <button class="btn btn-success btn-sm" onclick="startStudy('${set.id}')">${t('study')}</button>
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
                            <button class="btn btn-success" onclick="startStudy('${setId}')">${t('study')}</button>
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
//  STUDY
// ============================================================
function renderStudy() {
    if (!studyState) {
        return `<div class="card"><p>${t('noCards')}</p><button class="btn btn-back" onclick="goDashboard()">${t('back')}</button></div>`;
    }

    const {
        allCards,
        currentBatch,
        batchSize,
        learnedStatus,
        totalBatches,
        finished,
        showExample,
        flipped,
        setId,
        meaningFirst
    } = studyState;

    if (finished) {
        const totalLearned = learnedStatus.filter(v => v === true).length;
        const totalNotLearned = learnedStatus.filter(v => v === false).length;
        const totalRemaining = allCards.length - totalLearned - totalNotLearned;
        return `
                    <div class="card study-container">
                        <div class="study-summary">
                            <div class="big-icon">🎉</div>
                            <h2>${t('finalSummary')}</h2>
                            <div class="stats">
                                <div class="stat-item learned">
                                    <div class="number">${totalLearned}</div>
                                    <div class="label">${t('learned')}</div>
                                </div>
                                <div class="stat-item not-learned">
                                    <div class="number">${totalNotLearned}</div>
                                    <div class="label">${t('notLearned')}</div>
                                </div>
                                <div class="stat-item remaining">
                                    <div class="number">${totalRemaining}</div>
                                    <div class="label">${t('remaining')}</div>
                                </div>
                            </div>
                            <div class="actions">
                                <button class="btn btn-success" onclick="restartStudy()">${t('repeat')}</button>
                                <button class="btn btn-secondary" onclick="goDashboard()">${t('back')}</button>
                            </div>
                        </div>
                    </div>
                `;
    }

    const start = currentBatch * batchSize;
    const end = Math.min(start + batchSize, allCards.length);
    const batchCards = allCards.slice(start, end);
    const batchLearned = learnedStatus.slice(start, end);
    const allMarked = batchLearned.every(v => v !== undefined);

    if (allMarked && currentBatch < totalBatches) {
        const learnedInBatch = batchLearned.filter(v => v === true).length;
        const notLearnedInBatch = batchLearned.filter(v => v === false).length;
        const remainingTotal = allCards.length - learnedStatus.filter(v => v !== undefined).length;
        const isLastBatch = (currentBatch === totalBatches - 1);
        return `
                    <div class="card study-container">
                        <div class="study-summary">
                            <div class="big-icon">📊</div>
                            <h2>${t('batchSummary')}</h2>
                            <div class="stats">
                                <div class="stat-item learned">
                                    <div class="number">${learnedInBatch}</div>
                                    <div class="label">${t('learned')}</div>
                                </div>
                                <div class="stat-item not-learned">
                                    <div class="number">${notLearnedInBatch}</div>
                                    <div class="label">${t('notLearned')}</div>
                                </div>
                                <div class="stat-item remaining">
                                    <div class="number">${remainingTotal}</div>
                                    <div class="label">${t('remaining')}</div>
                                </div>
                            </div>
                            <div class="actions">
                                <button class="btn btn-secondary" onclick="retakeBatch()">${t('retakeBatch')}</button>
                                ${!isLastBatch ? `<button class="btn btn-primary" onclick="nextBatch()">${t('continue')}</button>` : `<button class="btn btn-success" onclick="finishStudy()">${t('done')}</button>`}
                                <button class="btn btn-secondary" onclick="exitStudy()">${t('back')}</button>
                            </div>
                        </div>
                    </div>
                `;
    }

    const currentIndexInBatch = studyState.currentIndexInBatch || 0;
    const card = batchCards[currentIndexInBatch];
    if (!card) {
        return `<div class="card"><p>Error loading card.</p></div>`;
    }

    const isFlipped = flipped || false;
    const progress = ((currentBatch * batchSize + currentIndexInBatch + 1) / allCards.length * 100).toFixed(0);

    let frontLabel, backLabel, frontMain, backMain, frontSpeakCode, backSpeakCode;
    if (meaningFirst) {
        frontLabel = t('frontLabelMeaning');
        frontMain = card.meaning;
        backLabel = t('backLabelWord');
        backMain = card.word;
        frontSpeakCode = getTargetLangCode(setId);
        backSpeakCode = getLangCodeForSet(setId);
    } else {
        frontLabel = t('frontLabelWord');
        frontMain = card.word;
        backLabel = t('backLabelMeaning');
        backMain = card.meaning;
        frontSpeakCode = getLangCodeForSet(setId);
        backSpeakCode = getTargetLangCode(setId);
    }

    const exampleText = card.example || '';
    const exampleTransText = card.exampleTranslation || '';
    const exampleSpeakCode = getLangCodeForSet(setId);
    const exampleTransSpeakCode = getTargetLangCode(setId);

    const exampleHtml = `
                <div class="example-area ${showExample ? 'show' : ''}">
                    ${exampleText ? `<div class="ex-text">📝 ${escapeHtml(exampleText)} <button class="btn-speak" onclick="event.stopPropagation(); speakText('${escapeHtml(exampleText)}', '${exampleSpeakCode}')" title="${t('speak')}">${t('speak')}</button></div>` : ''}
                    ${exampleTransText ? `<div class="ex-trans">✏️ ${escapeHtml(exampleTransText)} <button class="btn-speak" onclick="event.stopPropagation(); speakText('${escapeHtml(exampleTransText)}', '${exampleTransSpeakCode}')" title="${t('speak')}">${t('speak')}</button></div>` : ''}
                </div>
            `;

    const frontContent = `
                <div class="card-label">${frontLabel}</div>
                <div style="display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <div class="main-text">${escapeHtml(frontMain)}</div>
                    <button class="btn-speak" onclick="event.stopPropagation(); speakText('${escapeHtml(frontMain)}', '${frontSpeakCode}')" title="${t('speak')}">${t('speak')}</button>
                </div>
                <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toggleExample()">${showExample ? t('hideExample') : t('showExample')}</button>
                </div>
                ${exampleHtml}
                <div class="hint">${t('flipHint')}</div>
            `;

    const backContent = `
                <div class="card-label">${backLabel}</div>
                <div style="display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <div class="main-text" style="font-size:24px;">${escapeHtml(backMain)}</div>
                    <button class="btn-speak" onclick="event.stopPropagation(); speakText('${escapeHtml(backMain)}', '${backSpeakCode}')" title="${t('speak')}">${t('speak')}</button>
                </div>
                <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toggleExample()">${showExample ? t('hideExample') : t('showExample')}</button>
                </div>
                ${exampleHtml}
                <div class="hint">${t('flipHint')}</div>
            `;

    let dots = '';
    for (let i = 0; i < allCards.length; i++) {
        let cls = 'dot';
        if (i === start + currentIndexInBatch) cls += ' active';
        else if (learnedStatus[i] === true) cls += ' done';
        else if (learnedStatus[i] === false) cls += ' wrong';
        dots += `<span class="${cls}"></span>`;
    }

    const isMarked = learnedStatus[start + currentIndexInBatch] !== undefined;
    let markButtons = '';
    if (isMarked) {
        const status = learnedStatus[start + currentIndexInBatch];
        markButtons = `
                    <span style="color:#8888a8; margin-right:8px;">${status ? '✅' : '❌'} ${status ? t('learned') : t('notLearned')}</span>
                    <button class="btn btn-secondary btn-sm" onclick="unmarkCard()">${t('unmark')}</button>
                `;
    } else {
        markButtons = `
                    <button class="btn btn-danger btn-sm" onclick="markCard(false)">${t('markNotLearned')}</button>
                    <button class="btn btn-success btn-sm" onclick="markCard(true)">${t('markLearned')}</button>
                `;
    }

    const isFirst = (currentBatch === 0 && currentIndexInBatch === 0);
    const isLast = (currentBatch === totalBatches - 1 && currentIndexInBatch === batchCards.length - 1);

    return `
                <div class="study-container">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <button class="btn-back" onclick="exitStudy()">${t('back')}</button>
                        <span style="font-size:14px;color:#8888a8;">${t('remainingCards')}: ${allCards.length - learnedStatus.filter(v => v !== undefined).length}</span>
                    </div>

                    <div class="flashcard-wrapper" onclick="flipCard()">
                        <div class="flashcard ${isFlipped ? 'flipped' : ''}">
                            <div class="flashcard-face flashcard-front">${frontContent}</div>
                            <div class="flashcard-face flashcard-back">${backContent}</div>
                        </div>
                    </div>

                    <div class="flashcard-progress">${dots}</div>

                    <div class="study-counter">${(currentBatch * batchSize + currentIndexInBatch + 1)} / ${allCards.length} (${progress}%)</div>

                    <div class="study-actions">
                        ${markButtons}
                    </div>
                    <div class="study-actions-bottom">
                        <button class="btn btn-secondary" onclick="finishBatch()">${t('finishBatch')}</button>
                    </div>

                    <div class="study-nav">
                        <button class="btn btn-secondary" onclick="prevCard()" ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('previous')}</button>
                        <button class="btn btn-primary" onclick="flipCard()">${t('flip')}</button>
                        <button class="btn btn-secondary" onclick="nextCard()" ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('next')}</button>
                    </div>
                </div>
            `;
}

function attachStudyEvents() {
    document.addEventListener('keydown', handleStudyKeys);
}

function handleStudyKeys(e) {
    if (currentView !== 'study') {
        document.removeEventListener('keydown', handleStudyKeys);
        return;
    }
    if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (e.key === ' ') flipCard();
        else nextCard();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
    } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        flipCard();
    }
}

// ============================================================
//  STUDY ACTIONS
// ============================================================
function startStudy(setId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) {
        showToast('Set not found.', 'error');
        return;
    }
    const cards = set.cards || [];
    if (cards.length === 0) {
        showToast('No cards in this set.', 'error');
        return;
    }

    const hasFavorites = cards.some(c => c.favorite);

    openModal(`
                <div class="modal-header">
                    <h2>${t('studyOptions')}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="form-group">
                    <label>${t('cardCount')}</label>
                    <select id="studyCount">
                        ${[5, 6, 7, 8, 9, 10].map(n => `<option value="${n}" ${n === 5 ? 'selected' : ''}>${n}</option>`).join('')}
                        <option value="all">${t('all')} (${cards.length})</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${t('studyMode')}</label>
                    <select id="studyMode">
                        <option value="random">${t('random')}</option>
                        <option value="top-down" selected>${t('topDown')}</option>
                        <option value="bottom-up">${t('bottomUp')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${t('direction')}</label>
                    <select id="studyDirection">
                        <option value="word-first">${t('wordFirst')}</option>
                        <option value="meaning-first" selected>${t('meaningFirst')}</option>
                    </select>
                </div>
                ${hasFavorites ? `
                <div class="form-group" style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                    <input type="checkbox" id="onlyFavorites" style="width:auto;height:20px;accent-color:#7c7cf8;" />
                    <label for="onlyFavorites" style="margin:0;font-weight:600;color:#b0b0d0;">${t('onlyFavorites')}</label>
                </div>
                ` : ''}
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                    <button class="btn btn-success" onclick="handleStartStudy('${setId}')">${t('startStudy')}</button>
                </div>
            `);
}

function handleStartStudy(setId) {
    const countEl = document.getElementById('studyCount');
    const modeEl = document.getElementById('studyMode');
    const directionEl = document.getElementById('studyDirection');
    const onlyFavoritesEl = document.getElementById('onlyFavorites');
    const batchSize = countEl.value === 'all' ? Infinity : parseInt(countEl.value, 10);
    const mode = modeEl.value;
    const meaningFirst = directionEl.value === 'meaning-first';
    const onlyFavorites = onlyFavoritesEl ? onlyFavoritesEl.checked : false;

    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) {
        showToast('Set not found.', 'error');
        closeModal();
        return;
    }

    let cards = [...(set.cards || [])];
    if (cards.length === 0) {
        showToast('No cards.', 'error');
        closeModal();
        return;
    }

    if (onlyFavorites) {
        cards = cards.filter(c => c.favorite);
        if (cards.length === 0) {
            showToast(t('noFavorites'), 'error');
            closeModal();
            return;
        }
    }

    if (mode === 'random') {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    } else if (mode === 'bottom-up') {
        cards.reverse();
    }

    const actualBatchSize = Math.min(batchSize, cards.length);
    const totalBatches = Math.ceil(cards.length / actualBatchSize);

    studyState = {
        setId,
        allCards: cards,
        batchSize: actualBatchSize,
        currentBatch: 0,
        currentIndexInBatch: 0,
        learnedStatus: new Array(cards.length).fill(undefined),
        totalBatches,
        finished: false,
        showExample: false,
        flipped: false,
        meaningFirst: meaningFirst,
    };

    closeModal();
    currentView = 'study';
    render();
}

function flipCard() {
    if (!studyState || studyState.finished) return;
    studyState.flipped = !studyState.flipped;
    render();
}

function toggleExample() {
    if (!studyState) return;
    studyState.showExample = !studyState.showExample;
    render();
}

function markCard(value) {
    if (!studyState || studyState.finished) return;
    const idx = studyState.currentBatch * studyState.batchSize + studyState.currentIndexInBatch;
    if (idx >= studyState.learnedStatus.length) return;
    studyState.learnedStatus[idx] = value;
    const start = studyState.currentBatch * studyState.batchSize;
    const end = Math.min(start + studyState.batchSize, studyState.learnedStatus.length);
    const batchLearned = studyState.learnedStatus.slice(start, end);
    const allMarked = batchLearned.every(v => v !== undefined);
    if (allMarked) {
        render();
    } else {
        if (studyState.currentIndexInBatch < batchLearned.length - 1) {
            studyState.currentIndexInBatch++;
            studyState.flipped = false;
            studyState.showExample = false;
        }
        render();
    }
}

function unmarkCard() {
    if (!studyState || studyState.finished) return;
    const idx = studyState.currentBatch * studyState.batchSize + studyState.currentIndexInBatch;
    if (idx >= studyState.learnedStatus.length) return;
    studyState.learnedStatus[idx] = undefined;
    render();
}

function nextCard() {
    if (!studyState || studyState.finished) return;
    const batchSize = studyState.batchSize;
    const start = studyState.currentBatch * batchSize;
    const batchCards = studyState.allCards.slice(start, start + batchSize);
    if (studyState.currentIndexInBatch < batchCards.length - 1) {
        studyState.currentIndexInBatch++;
        studyState.flipped = false;
        studyState.showExample = false;
        render();
    }
}

function prevCard() {
    if (!studyState || studyState.finished) return;
    if (studyState.currentIndexInBatch > 0) {
        studyState.currentIndexInBatch--;
        studyState.flipped = false;
        studyState.showExample = false;
        render();
    }
}

function finishBatch() {
    if (!studyState || studyState.finished) return;
    const start = studyState.currentBatch * studyState.batchSize;
    const end = Math.min(start + studyState.batchSize, studyState.learnedStatus.length);
    for (let i = start; i < end; i++) {
        if (studyState.learnedStatus[i] === undefined) {
            studyState.learnedStatus[i] = false;
        }
    }
    render();
}

function nextBatch() {
    if (!studyState) return;
    if (studyState.currentBatch < studyState.totalBatches - 1) {
        studyState.currentBatch++;
        studyState.currentIndexInBatch = 0;
        studyState.flipped = false;
        studyState.showExample = false;
        render();
    } else {
        finishStudy();
    }
}

function retakeBatch() {
    if (!studyState) return;
    const start = studyState.currentBatch * studyState.batchSize;
    const end = Math.min(start + studyState.batchSize, studyState.learnedStatus.length);
    for (let i = start; i < end; i++) {
        studyState.learnedStatus[i] = undefined;
    }
    studyState.currentIndexInBatch = 0;
    studyState.flipped = false;
    studyState.showExample = false;
    render();
}

function finishStudy() {
    if (!studyState) return;
    for (let i = 0; i < studyState.learnedStatus.length; i++) {
        if (studyState.learnedStatus[i] === undefined) {
            studyState.learnedStatus[i] = false;
        }
    }
    studyState.finished = true;
    render();
}

function restartStudy() {
    if (!studyState) return;
    studyState.learnedStatus = new Array(studyState.allCards.length).fill(undefined);
    studyState.currentBatch = 0;
    studyState.currentIndexInBatch = 0;
    studyState.flipped = false;
    studyState.showExample = false;
    studyState.finished = false;
    render();
}

function exitStudy() {
    if (!studyState) return;
    if (!studyState.finished) {
        if (!confirm(t('confirmExit'))) return;
    }
    const setId = studyState.setId;
    studyState = null;
    document.removeEventListener('keydown', handleStudyKeys);
    viewSet(setId);
}

function getLangCodeForSet(setId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return 'en-US';
    return getLangCode(set.sourceLang);
}

function getTargetLangCode(setId) {
    const data = loadData();
    const set = data.sets.find(s => s.id === setId);
    if (!set) return 'en-US';
    return getLangCode(set.targetLang);
}

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
                            ${renderLanguageOptions('english')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('targetLang')}</label>
                        <select id="modalTargetLang">
                            ${renderLanguageOptions('vietnamese')}
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
    studyState = null;
    document.removeEventListener('keydown', handleStudyKeys);
    render();
}

function viewSet(id) {
    currentView = 'detail';
    currentSetId = id;
    studyState = null;
    document.removeEventListener('keydown', handleStudyKeys);
    render();
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
window.exitStudy = exitStudy;
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
window.startStudy = startStudy;
window.handleStartStudy = handleStartStudy;
window.flipCard = flipCard;
window.toggleExample = toggleExample;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.markCard = markCard;
window.unmarkCard = unmarkCard;
window.finishBatch = finishBatch;
window.nextBatch = nextBatch;
window.retakeBatch = retakeBatch;
window.finishStudy = finishStudy;
window.restartStudy = restartStudy;
window.speakText = speakText;
window.getLangCodeForSet = getLangCodeForSet;
window.getTargetLangCode = getTargetLangCode;
window.closeModal = closeModal;
window.showToast = showToast;
window.toggleLanguage = toggleLanguage;
window.t = t;
window.toggleFavorite = toggleFavorite;
window.moveCard = moveCard;
window.exportCSV = exportCSV;
window.exportAllData = exportAllData;

// ============================================================
//  INIT
// ============================================================
await Localization.load("./localization.csv");

render();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay.classList.contains('hidden')) {
            closeModal();
        }
    }
});

document.getElementById('langToggle').textContent = '🇻🇳 Tiếng Việt';