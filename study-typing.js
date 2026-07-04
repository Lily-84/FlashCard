// study-typing.js
import StudyBase from "./study-base.js";
import Localization from "./localization.js";

const t = (key) => Localization.t(key);

export default class TypingStudy extends StudyBase {
    constructor(setId, cards, batchSize, meaningFirst = false, autoBatchSummaryOnComplete = true) {
        super(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
        this.showAnswer = false;
        this.userInput = '';
        this.isCorrect = null; // true/false/null
        this.caseSensitive = false;
        this.hasAttempted = false;
        this.typingInputId = `typing_input_${Date.now()}`;
    }

    render() {
        const batchCards = this.getCurrentBatchCards();
        const isBatchComplete = this.isBatchComplete();

        if (this.autoBatchSummaryOnComplete && isBatchComplete && this.currentBatch < this.totalBatches) {
            return this.renderBatchSummary();
        }

        if (this.finished) {
            return this.renderSummary();
        }

        const card = this.getCurrentCard();
        if (!card) {
            return `<div class="card"><p>Error loading card.</p></div>`;
        }

        const start = this.currentBatch * this.batchSize;
        const idx = start + this.currentIndex;
        const isMarked = this.learnedStatus[idx] !== undefined;

        // Xác định từ cần hiển thị và từ cần nhập
        let displayText, targetText, displaySpeakCode, targetSpeakCode;
        if (this.meaningFirst) {
            // Hiển thị nghĩa, nhập từ
            displayText = card.meaning;
            targetText = card.word;
            displaySpeakCode = this.getLangCode(this.setId, 'target');
            targetSpeakCode = this.getLangCode(this.setId, 'source');
        } else {
            // Hiển thị từ, nhập nghĩa
            displayText = card.word;
            targetText = card.meaning;
            displaySpeakCode = this.getLangCode(this.setId, 'source');
            targetSpeakCode = this.getLangCode(this.setId, 'target');
        }

        const exampleHtml = super.buildExampleHtml(card);

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

        // Tạo feedback cho người dùng
        let feedbackHtml = '';
        if (this.hasAttempted) {
            if (this.isCorrect === true) {
                feedbackHtml = `
                    <div style="color:#4ecdc4;font-size:20px;margin-top:8px;display:flex;align-items:center;gap:8px;justify-content:center;">
                        <span>✅</span> ${t('correct')}
                    </div>
                `;
            } else if (this.isCorrect === false) {
                feedbackHtml = `
                    <div style="color:#ff6b6b;font-size:20px;margin-top:8px;display:flex;align-items:center;gap:8px;justify-content:center;flex-direction:column;">
                        <div>❌ ${t('incorrect')}</div>
                        <div style="font-size:16px;color:#8888a8;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;">
                            ${t('correctAnswer')}: <span style="color:#4ecdc4;font-weight:bold;">${this.escapeHtml(targetText)}</span>
                            <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(targetText)}', '${targetSpeakCode}')" title="${t('speak')}" style="font-size:16px;">🔊</button>
                        </div>
                    </div>
                `;
            }
        }

        // Tạo HTML cho hiển thị đáp án (nếu showAnswer = true)
        let answerDisplayHtml = '';
        if (this.showAnswer) {
            answerDisplayHtml = `
                <div style="margin-top:12px;padding:12px 16px;background:rgba(108,124,255,0.1);border-radius:8px;border:1px solid rgba(108,124,255,0.3);display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
                    <span style="color:#8af;font-size:16px;">${t('answer')}:</span>
                    <span style="color:#fff;font-size:18px;font-weight:bold;">${this.escapeHtml(targetText)}</span>
                    <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(targetText)}', '${targetSpeakCode}')" title="${t('speak')}" style="font-size:18px;">🔊</button>
                </div>
            `;
        }

        // Tạo input field
        const inputField = `
            <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:500px;margin:0 auto;">
                <div style="display:flex;gap:8px;align-items:center;">
                    <input 
                        id="${this.typingInputId}"
                        type="text" 
                        placeholder="${t('typeHere')}"
                        value="${this.escapeHtml(this.userInput)}"
                        style="flex:1;padding:12px 16px;border-radius:12px;border:2px solid ${this.isCorrect === true ? '#4ecdc4' : this.isCorrect === false ? '#ff6b6b' : 'rgba(255,255,255,0.1)'};background:rgba(255,255,255,0.05);color:#fff;font-size:18px;outline:none;transition:border-color 0.3s;"
                        onkeydown="if(event.key === 'Enter') window.studyManager.studyInstance.checkAnswer();"
                        oninput="window.studyManager.studyInstance.updateInput(this.value)"
                        autofocus
                    >
                    <button class="btn btn-primary" onclick="window.studyManager.studyInstance.checkAnswer();" style="padding:12px 20px;">${t('check')}</button>
                </div>
                ${feedbackHtml}
                ${answerDisplayHtml}
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="window.studyManager.studyInstance.toggleShowAnswer(); window.studyManager.renderStudy();">
                        ${this.showAnswer ? t('hideAnswer') : t('showAnswer')}
                    </button>
                </div>
            </div>
        `;

        return `
            <div class="study-container">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <button class="btn-back" onclick="window.studyManager.exitStudy()">${t('back')}</button>
                    <span style="font-size:14px;color:#8888a8;">${t('remainingCards')}: ${this.allCards.length - this.learnedStatus.filter(v => v !== undefined).length}</span>
                </div>

                <!-- Display area -->
                <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.05);border-radius:12px;margin-bottom:16px;">
                    <div style="font-size:14px;color:#8888a8;margin-bottom:8px;">${this.meaningFirst ? t('typeWord') : t('typeMeaning')}</div>
                    <div style="font-size:28px;font-weight:bold;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
                        ${this.escapeHtml(displayText)}
                        <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(displayText)}', '${displaySpeakCode}')" title="${t('speak')}">🔊</button>
                    </div>
                    <div style="margin-top:12px; display:flex; gap:8px; justify-content:center;">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.studyManager.studyInstance.toggleExample(); window.studyManager.renderStudy();">${this.showExample ? t('hideExample') : t('showExample')}</button>
                    </div>
                    ${exampleHtml}
                </div>

                <!-- Input area -->
                <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:16px;">
                    ${inputField}
                </div>

                <div class="flashcard-progress">${dots}</div>

                <div class="study-counter">${idx + 1} / ${this.allCards.length} (${progress}%)</div>

                <div class="study-actions">
                    ${markButtons}
                </div>
                <div class="study-actions-bottom" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.markAllUnmarked(); window.studyManager.renderStudy();">${t('finishBatch')}</button>
                </div>

                <div class="study-nav">
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.prevCard(); window.studyManager.renderStudy();" ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('previous')}</button>
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.nextCard(); window.studyManager.renderStudy();" ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('next')}</button>
                </div>
            </div>
        `;
    }

    updateInput(value) {
        this.userInput = value;
        // Reset trạng thái khi người dùng thay đổi input
        if (this.hasAttempted) {
            this.hasAttempted = false;
            this.isCorrect = null;
        }
    }

    checkAnswer() {
        const card = this.getCurrentCard();
        if (!card) return;

        // Lấy đáp án đúng
        let targetText;
        if (this.meaningFirst) {
            targetText = card.word;
        } else {
            targetText = card.meaning;
        }

        // So sánh (bỏ qua khoảng trắng đầu cuối)
        const userAnswer = this.userInput.trim();
        const correctAnswer = targetText.trim();

        // Kiểm tra (có thể tùy chọn case sensitive)
        let isCorrect;
        if (this.caseSensitive) {
            isCorrect = userAnswer === correctAnswer;
        } else {
            isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        }

        this.isCorrect = isCorrect;
        this.hasAttempted = true;

        // Nếu đúng, tự động đánh dấu là đã học
        if (isCorrect) {
            const idx = this.currentBatch * this.batchSize + this.currentIndex;
            if (idx < this.learnedStatus.length && this.learnedStatus[idx] === undefined) {
                this.learnedStatus[idx] = true;
            }
        }

        window.studyManager.renderStudy();
        
        // Focus lại input
        setTimeout(() => {
            const input = document.getElementById(this.typingInputId);
            if (input) input.focus();
        }, 50);
    }

    toggleShowAnswer() {
        this.showAnswer = !this.showAnswer;
        window.studyManager.renderStudy();
        
        // Focus lại input
        setTimeout(() => {
            const input = document.getElementById(this.typingInputId);
            if (input) input.focus();
        }, 50);
    }

    // Override các phương thức để reset trạng thái khi chuyển card
    nextCard() {
        super.nextCard();
        this.resetTypingState();
    }

    prevCard() {
        super.prevCard();
        this.resetTypingState();
    }

    markCard(value) {
        const idx = this.currentBatch * this.batchSize + this.currentIndex;
        if (idx >= this.learnedStatus.length) return;
        this.learnedStatus[idx] = value;
        this.resetTypingState();
        
        if (this.isBatchComplete()) {
            // Batch hoàn thành
        } else {
            if (this.currentIndex < this.batchSize - 1) {
                this.currentIndex++;
                this.showExample = false;
            }
        }
        this.resetTypingState();
    }

    resetTypingState() {
        this.userInput = '';
        this.isCorrect = null;
        this.hasAttempted = false;
        this.showAnswer = false;
        this.typingInputId = `typing_input_${Date.now()}`;
    }

    handleKeyPress(e) {
        // Chỉ xử lý khi không focus vào input
        const target = e.target;
        if (target && target.tagName === 'INPUT') {
            // Nếu đang focus vào input, xử lý riêng
            if (e.key === 'Enter') {
                e.preventDefault();
                this.checkAnswer();
            }
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.nextCard();
            window.studyManager.renderStudy();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevCard();
            window.studyManager.renderStudy();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.checkAnswer();
            window.studyManager.renderStudy();
        } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            this.toggleShowAnswer();
            window.studyManager.renderStudy();
        }
    }

    // Override attachEvents để focus vào input
    attachEvents() {
        super.attachEvents();
        
        // Focus vào input sau khi render
        setTimeout(() => {
            const input = document.getElementById(this.typingInputId);
            if (input) {
                input.focus();
                // Đặt cursor ở cuối
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 100);
    }

    // Override renderBatchSummary để reset state
    renderBatchSummary() {
        this.resetTypingState();
        return super.renderBatchSummary();
    }

    // Override renderSummary
    renderSummary() {
        this.resetTypingState();
        return super.renderSummary();
    }

    // Override nextBatch
    nextBatch() {
        this.resetTypingState();
        super.nextBatch();
    }

    // Override retakeBatch
    retakeBatch() {
        this.resetTypingState();
        super.retakeBatch();
    }
}