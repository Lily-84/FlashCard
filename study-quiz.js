// study-quiz.js
import StudyBase from "./study-base.js";
import Localization from "./localization.js";

const t = (key) => Localization.t(key);

export default class QuizStudy extends StudyBase {
    constructor(setId, cards, batchSize, meaningFirst = false, autoBatchSummaryOnComplete = true) {
        super(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
        this.currentQuestion = 0;
        this.totalQuestions = cards.length;
        this.answers = [];
        this.showResult = false;
        this.selectedAnswer = -1;
        this.quizFinished = false;
        this.showExample = false;

        this.elementExample = null; 
        
        // Generate questions for current batch only
        this.generateQuestionsForBatch();
    }

    generateQuestionsForBatch() {
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.allCards.length);
        const batchCards = this.allCards.slice(start, end);
        
        this.questions = [];
        for (let i = 0; i < batchCards.length; i++) {
            const card = batchCards[i];
            const globalIndex = start + i;
            
            // Get 3 wrong options from all cards (not just batch)
            const wrongOptions = this.getWrongOptions(card, 3);
            
            const options = [];
            if (this.meaningFirst) {
                // Show meaning, ask for word
                options.push({ text: card.word, correct: true });
                for (const wrong of wrongOptions) {
                    options.push({ text: wrong.word, correct: false });
                }
            } else {
                // Show word, ask for meaning
                options.push({ text: card.meaning, correct: true });
                for (const wrong of wrongOptions) {
                    options.push({ text: wrong.meaning, correct: false });
                }
            }
            
            // Shuffle options
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }
            
            this.questions.push({
                card: card,
                globalIndex: globalIndex,
                options: options,
                userAnswer: -1,
                correct: false,
                answered: false
            });
        }
        
        this.totalQuestions = this.questions.length;
        this.currentQuestion = 0;
        this.quizFinished = false;
    }

    getWrongOptions(card, count) {
        const others = this.allCards.filter(c => c.id !== card.id);
        const shuffled = [...others];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

    render() {
        if (this.quizFinished) {
            return this.renderBatchSummary();
        }

        if (this.currentQuestion >= this.totalQuestions) {
            this.quizFinished = true;
            return this.renderBatchSummary();
        }

        const question = this.questions[this.currentQuestion];
        const card = question.card;
        const progress = ((this.currentQuestion) / this.totalQuestions * 100).toFixed(0);

        // Build question text
        let questionText, speakCode, optionSpeakCode;
        if (this.meaningFirst) {
            questionText = card.meaning;
            speakCode = this.getLangCode(this.setId, 'target');
            optionSpeakCode = this.getLangCode(this.setId, 'source');
        } else {
            questionText = card.word;
            speakCode = this.getLangCode(this.setId, 'source');
            optionSpeakCode = this.getLangCode(this.setId, 'target');
        }

        // Build options
        let optionsHtml = '';
        for (let i = 0; i < question.options.length; i++) {
            const opt = question.options[i];
            let className = 'quiz-option';
            if (question.answered) {
                if (opt.correct) className += ' correct';
                else if (i === question.userAnswer && !opt.correct) className += ' wrong';
            }
            optionsHtml += `
                <div class="${className}"
                    style="display:flex; align-items:center;"
                    onclick="window.studyManager.studyInstance.selectOption(${i})">

                    <span>${this.escapeHtml(opt.text)}</span>

                    <span style="margin-left:8px;">
                        ${question.answered && opt.correct ? '✅' : ''}
                        ${question.answered && i === question.userAnswer && !opt.correct ? '❌' : ''}
                    </span>

                    <button
                        class="btn-speak"
                        style="margin-left:auto;"
                        onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(opt.text)}', '${optionSpeakCode}')"
                        title="${t('speak')}">
                        🔊
                    </button>
                </div>
            `;
        }

        let exampleHtml = '';
        if (card.example) {
            exampleHtml = this.buildExampleHtml(card);
        }

        // Progress dots for current batch
        let dots = '';
        const start = this.currentBatch * this.batchSize;
        for (let i = start; i < Math.min(start + this.batchSize, this.allCards.length); i++) {
            let cls = 'dot';
            const localIdx = i - start;
            if (localIdx === this.currentQuestion) cls += ' active';
            else if (this.learnedStatus[i] === true) cls += ' done';
            else if (this.learnedStatus[i] === false) cls += ' wrong';
            dots += `<span class="${cls}"></span>`;
        }

        const isLast = this.currentQuestion === this.totalQuestions - 1;
        const totalLearned = this.learnedStatus.filter(v => v === true).length;
        const totalWrong = this.learnedStatus.filter(v => v === false).length;

        return `
            <div class="study-container quiz-container">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <button class="btn-back" onclick="window.studyManager.exitStudy()">${t('back')}</button>
                    <span style="font-size:14px;color:#8888a8;">
                        ${t('learned')}: ${totalLearned} | ${t('notLearned')}: ${totalWrong} | ${t('remaining')}: ${this.allCards.length - totalLearned - totalWrong}
                    </span>
                </div>

                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill" style="width: ${progress}%;"></div>
                </div>

                <div class="quiz-question">
                    <div style="display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <h3>${questionText}</h3>
                        <button class="btn-speak" onclick="window.speakText('${this.escapeHtml(questionText)}', '${speakCode}')" title="${t('speak')}">🔊</button>
                    </div>
                    ${card.example ? `
                        <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
                            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.studyManager.studyInstance.toggleExample();">${this.showExample ? t('hideExample') : t('showExample')}</button>
                        </div>
                    ` : ''}
                    ${exampleHtml}
                </div>

                <div class="quiz-options">
                    ${optionsHtml}
                </div>

                ${question.answered ? `
                    <div class="quiz-feedback">
                        ${question.correct ? '✅ Correct!' : '❌ Incorrect'}
                    </div>
                    <div class="quiz-actions">
                        <button class="btn btn-primary" onclick="window.studyManager.studyInstance.nextQuestion()">
                            ${isLast ? t('finishBatch') : t('next')}
                        </button>
                    </div>
                ` : ''}

                <div class="flashcard-progress" style="margin-top: 12px;">${dots}</div>
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

    // New method to render final summary
    renderFinalSummary() {
        const correct = this.questions.filter(q => q.correct).length;
        const total = this.questions.length;
        const percentage = Math.round((correct / total) * 100);
        const stats = this.getStats();

        return `
            <div class="card study-container">
                <div class="study-summary">
                    <div class="big-icon">${percentage >= 80 ? '🏆' : '📝'}</div>
                    <h2>${t('finalSummary')}</h2>
                    <div class="quiz-score">
                        <div class="score-number">${correct}/${total}</div>
                        <div class="score-label">${percentage}%</div>
                    </div>
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

    selectOption(index) {
        if (this.currentQuestion >= this.totalQuestions) return;
        const question = this.questions[this.currentQuestion];
        if (question.answered) return;

        question.userAnswer = index;
        question.answered = true;
        question.correct = question.options[index].correct;
        
        // Mark card as learned or not learned
        const cardIndex = question.globalIndex;
        if (cardIndex !== -1) {
            this.learnedStatus[cardIndex] = question.correct;
        }
        
        window.studyManager.renderStudy();
    }

    nextQuestion() {
        this.currentQuestion++;
        this.showResult = false;
        this.selectedAnswer = -1;
        this.showExample = false;
        window.studyManager.renderStudy();
    }

    retakeBatch() {
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.learnedStatus.length);
        for (let i = start; i < end; i++) {
            this.learnedStatus[i] = undefined;
        }
        this.generateQuestionsForBatch();
        this.currentQuestion = 0;
        this.quizFinished = false;
        this.showExample = false;
        window.studyManager.renderStudy();
    }

    nextBatch() {
        if (this.currentBatch < this.totalBatches - 1) {
            this.currentBatch++;
            this.generateQuestionsForBatch();
            this.currentQuestion = 0;
            this.quizFinished = false;
            this.showExample = false;
        } else {
            this.finish();
        }
        window.studyManager.renderStudy();
    }

    finish() {
        // Mark any unmarked cards in current batch as not learned
        const start = this.currentBatch * this.batchSize;
        const end = Math.min(start + this.batchSize, this.learnedStatus.length);
        for (let i = start; i < end; i++) {
            if (this.learnedStatus[i] === undefined) {
                this.learnedStatus[i] = false;
            }
        }
        
        // Check if all cards are learned
        const allLearned = this.learnedStatus.every(v => v === true);
        if (allLearned) {
            this.finished = true;
            window.studyManager.renderStudy();
        } else {
            // Show final summary
            this.quizFinished = true;
            window.studyManager.renderStudy();
        }
    }

    toggleExample() {
        this.showExample = !this.showExample;
        const elementExample = window.document.getElementById('card-example');
        if (elementExample) {
            if (this.showExample) {
                elementExample.classList.add('show');
                elementExample.classList.remove('hide');
            } else {
                elementExample.classList.remove('show');
                elementExample.classList.add('hide');
            }
        }
    }

    restart() {
        // Reset all cards
        this.learnedStatus = new Array(this.allCards.length).fill(undefined);
        this.currentBatch = 0;
        this.generateQuestionsForBatch();
        this.currentQuestion = 0;
        this.quizFinished = false;
        this.finished = false;
        this.showExample = false;
        window.studyManager.renderStudy();
    }

    attachEvents() {
        // Keyboard events handled by StudyManager
    }

    handleKeyPress(e) {
        if (this.quizFinished) return;
        
        const question = this.questions[this.currentQuestion];
        if (!question) return;

        if (!question.answered) {
            // 1-4 for options
            const num = parseInt(e.key);
            if (num >= 1 && num <= 4 && num <= question.options.length) {
                e.preventDefault();
                this.selectOption(num - 1);
            }
        } else {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.nextQuestion();
            }
        }
    }
}