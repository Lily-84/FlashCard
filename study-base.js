// study-base.js
import Localization from "./localization.js";

// Import type definitions for JSDoc
/**
 * @typedef {import('./types.js').Card} Card
 * @typedef {import('./types.js').FlashcardSet} FlashcardSet
 */

const t = (key) => Localization.t(key);

/**
 * Base class for study modes (Flashcard and Quiz)
 * @class StudyBase
 */

export default class StudyBase {
    /**
     * Create a new study instance
     * @param {string} setId - The ID of the flashcard set
     * @param {Array<Card>} cards - Array of card objects
     * @param {number} batchSize - Number of cards per batch
     * @param {boolean} [meaningFirst=false] - Whether to show meaning before word
     */
    constructor(setId, cards, batchSize, meaningFirst = false, autoBatchSummaryOnComplete = true) {
        /** @type {string} The ID of the flashcard set */
        this.setId = setId;
        /** @type {Array<Card>} All cards in the set */
        this.allCards = cards;
        /** @type {number} Number of cards per batch */
        this.batchSize = Math.min(batchSize, cards.length);
        /** @type {boolean} Whether to show meaning first */
        this.meaningFirst = meaningFirst;
        /** @type {number} Total number of batches */
        this.totalBatches = Math.ceil(cards.length / this.batchSize);
        /** @type {number} Current batch index (0-based) */
        this.currentBatch = 0;
        /** @type {number} Current card index within batch (0-based) */
        this.currentIndex = 0;
        /** @type {Array<boolean|undefined>} Learning status for each card */
        this.learnedStatus = new Array(cards.length).fill(undefined);
        /** @type {boolean} Whether the study session is finished */
        this.finished = false;
        /** @type {boolean} Whether to show example sentences */
        this.showExample = false;
        /** @type {boolean} Whether to automatically move to the next batch when the current batch is complete */
        this.autoBatchSummaryOnComplete = autoBatchSummaryOnComplete;
    }
    attachEvents() {
        // Keyboard events handled by StudyManager
    }

    /**
     * Get cards in the current batch
     * @returns {Array<Card>} Array of cards in current batch
     */
    getCurrentBatchCards() {
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.allCards.length);
        return this.allCards.slice(start, end);
    }

    /**
     * Get the current card being studied
     * @returns {Card|null} Current card object or null if not available
     */
    getCurrentCard() {
        const batchCards = this.getCurrentBatchCards();
        return batchCards[this.currentIndex] || null;
    }

    getProgress() {
        const learned = this.learnedStatus.filter(v => v !== undefined).length;
        return Math.round((learned / this.allCards.length) * 100);
    }

    isBatchComplete() {
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.learnedStatus.length);
        return this.learnedStatus.slice(start, end).every(v => v !== undefined);
    }

    isFinished() {
        return this.finished;
    }

    markCard(value) {
        const idx = this.currentBatch * this.batchSize + this.currentIndex;
        if (idx >= this.learnedStatus.length) return;
        this.learnedStatus[idx] = value;
        
        if (this.isBatchComplete()) {
            if (this.currentBatch < this.totalBatches - 1) {
                this.finished = true;
            }
        } else {
            if (this.currentIndex < this.batchSize - 1) {
                this.currentIndex++;
                this.showExample = false;
            }
        }
    }

    unmarkCard() {
        const idx = this.currentBatch * this.batchSize + this.currentIndex;
        if (idx >= this.learnedStatus.length) return;
        this.learnedStatus[idx] = undefined;
    }

    nextCard() {
        const batchCards = this.getCurrentBatchCards();
        if (this.currentIndex < batchCards.length - 1) {
            this.currentIndex++;
            this.showExample = false;
        }
    }

    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.showExample = false;
        }
    }

    toggleExample() {
        this.showExample = !this.showExample;
    }

    restart() {
        this.learnedStatus = new Array(this.allCards.length).fill(undefined);
        this.currentBatch = 0;
        this.currentIndex = 0;
        this.showExample = false;
        this.finished = false;
    }

    getStats() {
        const learned = this.learnedStatus.filter(v => v === true).length;
        const notLearned = this.learnedStatus.filter(v => v === false).length;
        const remaining = this.allCards.length - learned - notLearned;
        return { learned, notLearned, remaining };
    }

    getLangCode(setId, type = 'source') {
        const data = this.loadData();
        const set = data.sets.find(s => s.id === setId);
        if (!set) return 'en-US';
        const langMap = {
            'english': 'en-US',
            'vietnamese': 'vi-VN',
            'japanese': 'ja-JP',
            'chinese': 'zh-CN',
            'korean': 'ko-KR',
            'spanish': 'es-ES',
            'french': 'fr-FR',
            'german': 'de-DE'
        };
        const lang = type === 'source' ? set.sourceLang : set.targetLang;
        return langMap[lang] || 'en-US';
    }

    loadData() {
        try {
            const raw = localStorage.getItem('flashcard_app_data');
            if (!raw) return { sets: [] };
            return JSON.parse(raw);
        } catch {
            return { sets: [] };
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

        flipCard() {
        this.flipped = !this.flipped;
    }

    markAllUnmarked() {
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.learnedStatus.length);
        for (let i = start; i < end; i++) {
            if (this.learnedStatus[i] === undefined) {
                this.learnedStatus[i] = false;
            }
        }
    }

    nextBatch() {
        if (this.currentBatch < this.totalBatches - 1) {
            this.currentBatch++;
            this.currentIndex = 0;
            this.flipped = false;
            this.showExample = false;
        } else {
            this.finish();
        }
    }

    retakeBatch() {
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.learnedStatus.length);
        for (let i = start; i < end; i++) {
            this.learnedStatus[i] = undefined;
        }
        this.currentIndex = 0;
        this.flipped = false;
        this.showExample = false;
    }

    finish() {
        for (let i = 0; i < this.learnedStatus.length; i++) {
            if (this.learnedStatus[i] === undefined) {
                this.learnedStatus[i] = false;
            }
        }
        this.finished = true;
    }

    buildExampleHtml(card, szOnclick = '') {
        const exampleText = card.example || '';
        const exampleTransText = card.exampleTranslation || '';
        const exampleSpeakCode = this.getLangCode(this.setId, 'source');
        const exampleTransSpeakCode = this.getLangCode(this.setId, 'target');

        if (!exampleText && !exampleTransText) return '';

        return `
            <div id="card-example" class="example-area ${this.showExample ? 'show' : 'hide'}" style="flex-direction:column; gap:12px; align-items:center;">
                ${exampleText ? `<div class="ex-text" style="display:flex; width:100%; justify-content:space-between; align-items:center;">📝 ${this.escapeHtml(exampleText)} <button class="btn-speak" style="margin-left:auto;" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(exampleText)}', '${exampleSpeakCode}')" title="${t('speak')}">🔊</button></div>` : ''}
                ${exampleTransText ? `<div class="ex-trans" style="display:flex; width:100%; justify-content:space-between; align-items:center;">✏️ ${this.escapeHtml(exampleTransText)} <button class="btn-speak" style="margin-left:auto;" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(exampleTransText)}', '${exampleTransSpeakCode}')" title="${t('speak')}">🔊</button></div>` : ''}
            </div>
        `;
    }

    renderSummary() {
        const stats = this.getStats();
        return `
            <div class="card study-container">
                <div class="study-summary">
                    <div class="big-icon">🎉</div>
                    <h2>${t('finalSummary')}</h2>
                    <div class="stats">
                        <div class="stat-item learned">
                            <div class="number">${stats.learned}</div>
                            <div class="label">${t('learned')}</div>
                        </div>
                        <div class="stat-item not-learned">
                            <div class="number">${stats.notLearned}</div>
                            <div class="label">${t('notLearned')}</div>
                        </div>
                        <div class="stat-item remaining">
                            <div class="number">${stats.remaining}</div>
                            <div class="label">${t('remaining')}</div>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-success" onclick="window.studyManager.studyInstance.restart(); window.studyManager.renderStudy();">${t('repeat')}</button>
                        <button class="btn btn-secondary" onclick="window.studyManager.goDashboard()">${t('back')}</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderBatchSummary() {
        const stats = this.getStats();
        const isLastBatch = this.currentBatch === this.totalBatches - 1;
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.allCards.length);
        const batchStats = {
            learned: this.learnedStatus.slice(start, end).filter(v => v === true).length,
            notLearned: this.learnedStatus.slice(start, end).filter(v => v === false).length
        };

        return `
            <div class="card study-container">
                <div class="study-summary">
                    <div class="big-icon">📊</div>
                    <h2>${t('batchSummary')}</h2>
                    <div class="stats">
                        <div class="stat-item learned">
                            <div class="number">${batchStats.learned}</div>
                            <div class="label">${t('learned')}</div>
                        </div>
                        <div class="stat-item not-learned">
                            <div class="number">${batchStats.notLearned}</div>
                            <div class="label">${t('notLearned')}</div>
                        </div>
                        <div class="stat-item remaining">
                            <div class="number">${stats.remaining}</div>
                            <div class="label">${t('remaining')}</div>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.retakeBatch(); window.studyManager.renderStudy();">${t('retakeBatch')}</button>
                        ${!isLastBatch ? `<button class="btn btn-primary" onclick="window.studyManager.studyInstance.nextBatch(); window.studyManager.renderStudy();">${t('continue')}</button>` : `<button class="btn btn-success" onclick="window.studyManager.studyInstance.finish(); window.studyManager.renderStudy();">${t('done')}</button>`}
                        <button class="btn btn-secondary" onclick="window.studyManager.exitStudy()">${t('back')}</button>
                    </div>
                </div>
            </div>
        `;
    }
}