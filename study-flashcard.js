// study-flashcard.js
import StudyBase from "./study-base.js";
import Localization from "./localization.js";

const t = (key) => Localization.t(key);

// Import type definitions for JSDoc
/**
 * @typedef {import('./types.js').Card} Card
 * @typedef {import('./types.js').FlashcardSet} FlashcardSet
 */

export default class FlashcardStudy extends StudyBase {
    constructor(setId, cards, batchSize, meaningFirst = false, autoBatchSummaryOnComplete = true) {
        super(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
        this.flipped = false;
    }

    render() {
        const batchCards = this.getCurrentBatchCards();
        const isBatchComplete = this.isBatchComplete();

        if (this.autoBatchSummaryOnComplete && isBatchComplete && this.currentBatch < this.totalBatches) {
            return this.renderBatchSummary();
        }

        const card = this.getCurrentCard();
        if (!card) {
            return `<div class="card"><p>Error loading card.</p></div>`;
        }

        const start = this.currentBatch * this.batchSize;
        const idx = start + this.currentIndex;
        const isMarked = this.learnedStatus[idx] !== undefined;

        // Build card content
        let frontLabel, backLabel, frontMain, backMain, frontSpeakCode, backSpeakCode;
        if (this.meaningFirst) {
            frontLabel = t('frontLabelMeaning');
            frontMain = card.meaning;
            backLabel = t('backLabelWord');
            backMain = card.word;
            frontSpeakCode = this.getLangCode(this.setId, 'target');
            backSpeakCode = this.getLangCode(this.setId, 'source');
        } else {
            frontLabel = t('frontLabelWord');
            frontMain = card.word;
            backLabel = t('backLabelMeaning');
            backMain = card.meaning;
            frontSpeakCode = this.getLangCode(this.setId, 'source');
            backSpeakCode = this.getLangCode(this.setId, 'target');
        }

        const exampleHtml = super.buildExampleHtml(card);

        // Thay đổi phần frontContent và backContent

        const frontContent = `
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;width:100%;">
                <div class="main-text" style="font-size:clamp(18px, 5vw, 28px);">${this.escapeHtml(frontMain)}</div>
                <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(frontMain)}', '${frontSpeakCode}')" title="${t('speak')}">🔊</button>
            </div>
            <div style="margin-top:8px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.studyManager.studyInstance.toggleExample(); window.studyManager.renderStudy();">${this.showExample ? t('hideExample') : t('showExample')}</button>
            </div>
            ${exampleHtml}
            <div class="hint">${t('flipHint')}</div>
        `;

        const backContent = `
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;width:100%;">
                <div class="main-text" style="font-size:clamp(18px, 5vw, 28px);">${this.escapeHtml(backMain)}</div>
                <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(backMain)}', '${backSpeakCode}')" title="${t('speak')}">🔊</button>
            </div>
            <div style="margin-top:8px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.studyManager.studyInstance.toggleExample(); window.studyManager.renderStudy();">${this.showExample ? t('hideExample') : t('showExample')}</button>
            </div>
            ${exampleHtml}
            <div class="hint">${t('flipHint')}</div>
        `;

        // Progress dots
        let dots = '';
        for (let i = 0; i < this.allCards.length; i++) {
            let cls = 'dot';
            if (i === idx) cls += ' active';
            else if (this.learnedStatus[i] === true) cls += ' done';
            else if (this.learnedStatus[i] === false) cls += ' wrong';
            dots += `<span class="${cls}"></span>`;
        }

        // Mark buttons
        let markButtons = '';
        if (isMarked) {
            const status = this.learnedStatus[idx];
            markButtons = `
                <span style="color:#8888a8; margin-right:8px;">${status ? '✅' : '❌'} ${status ? t('learned') : t('notLearned')}</span>
                <button class="btn btn-secondary btn-sm" onclick="window.studyManager.studyInstance.unmarkCard(); window.studyManager.renderStudy();">${t('unmark')}</button>
            `;
        } else {
            markButtons = `
                <button class="btn btn-danger btn-sm" onclick="window.studyManager.studyInstance.markCard(false); window.studyManager.renderStudy();">${t('markNotLearned')}</button>
                <button class="btn btn-success btn-sm" onclick="window.studyManager.studyInstance.markCard(true); window.studyManager.renderStudy();">${t('markLearned')}</button>
            `;
        }

        const isFirst = (this.currentBatch === 0 && this.currentIndex === 0);
        const isLast = (this.currentBatch === this.totalBatches - 1 && this.currentIndex === batchCards.length - 1);
        const progress = this.getProgress();

        return `
            <div class="study-container">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <button class="btn-back" onclick="window.studyManager.exitStudy()">${t('back')}</button>
                    <span style="font-size:14px;color:#8888a8;">${t('remainingCards')}: ${this.allCards.length - this.learnedStatus.filter(v => v !== undefined).length}</span>
                </div>

                <div class="flashcard-wrapper" onclick="window.studyManager.studyInstance.flipCard(); window.studyManager.renderStudy();">
                    <div class="flashcard ${this.flipped ? 'flipped' : ''}">
                        <div class="flashcard-face flashcard-front">${frontContent}</div>
                        <div class="flashcard-face flashcard-back">${backContent}</div>
                    </div>
                </div>

                <div class="flashcard-progress">${dots}</div>

                <div class="study-counter">${idx + 1} / ${this.allCards.length} (${progress}%)</div>

                <div class="study-actions">
                    ${markButtons}
                </div>
                <div class="study-actions-bottom">
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.markAllUnmarked(); window.studyManager.renderBatchSummary();">${t('finishBatch')}</button>
                </div>

                <div class="study-nav">
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.prevCard(); window.studyManager.renderStudy();" ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('previous')}</button>
                    <button class="btn btn-primary" onclick="window.studyManager.studyInstance.flipCard(); window.studyManager.renderStudy();">${t('flip')}</button>
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.nextCard(); window.studyManager.renderStudy();" ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('next')}</button>
                </div>
            </div>
        `;
    }

    handleKeyPress(e) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            if (e.key === ' ') this.flipCard();
            else this.nextCard();
            window.studyManager.renderStudy();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevCard();
            window.studyManager.renderStudy();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            this.flipCard();
            window.studyManager.renderStudy();
        }
    }

    onChangeCard(){
        this.flipped = false;
    }
}
