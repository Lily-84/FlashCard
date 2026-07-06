// study-manager.js
import { openModal } from "./script.js";
import Localization from "./localization.js";

// Import các module con
import FlashcardStudy from "./study-flashcard.js";
import QuizStudy from "./study-quiz.js";
import DrawBoardStudy from "./study-board.js";
import TypingStudy from "./study-typing.js";

const t = (key) => Localization.t(key);

class StudyManager {
    constructor() {
        this.mode = 'flashcard'; // 'flashcard' | 'quiz'
        this.studyInstance = null;
        this.setId = null;
        this.currentView = 'study';
        this.data = null;
        this.studySettings = this.loadStudySettings();
    }

    // Lưu settings của người dùng
    saveStudySettings(settings) {
        try {
            localStorage.setItem('flashcard_study_settings', JSON.stringify(settings));
            this.studySettings = settings;
        } catch (e) {
            console.error('Error saving study settings:', e);
        }
    }

    // Load settings của người dùng
    loadStudySettings() {
        try {
            const raw = localStorage.getItem('flashcard_study_settings');
            if (!raw) {
                // Settings mặc định
                return {
                    mode: 'flashcard',
                    count: '5',
                    direction: 'meaning-first',
                    order: 'top-down',
                    onlyFavorites: false,
                    autoBatchSummaryOnComplete: true
                };
            }
            const settings = JSON.parse(raw);
            // Đảm bảo có đủ các field
            return {
                mode: settings.mode || 'flashcard',
                count: settings.count || '5',
                direction: settings.direction || 'meaning-first',
                order: settings.order || 'top-down',
                onlyFavorites: settings.onlyFavorites || false,
                autoBatchSummaryOnComplete: settings.autoBatchSummaryOnComplete !== undefined ? settings.autoBatchSummaryOnComplete : true
            };
        } catch {
            return {
                mode: 'flashcard',
                count: '5',
                direction: 'meaning-first',
                order: 'top-down',
                onlyFavorites: false,
                autoBatchSummaryOnComplete: true
            };
        }
    }

    startStudy(setId, options = {}) {
        this.setId = setId;
        this.data = this.loadData();
        const set = this.data.sets.find(s => s.id === setId);
        if (!set) {
            showToast('Set not found.', 'error');
            return;
        }

        const cards = set.cards || [];
        if (cards.length === 0) {
            showToast('No cards in this set.', 'error');
            return;
        }

        // Show study options modal
        this.showStudyOptionsModal(setId, cards);
    }

    showStudyOptionsModal(setId, cards) {
        const hasFavorites = cards.some(c => c.favorite);
        const settings = this.studySettings;
        
        const modalHtml = `
            <div class="modal-header">
                <h2>${t('studyOptions')}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="form-group">
                <label>${t('studyMode')}</label>
                <select id="studyModeSelect">
                    <option value="flashcard" ${settings.mode === 'flashcard' ? 'selected' : ''}>${t('flashcardMode')}</option>
                    <option value="quiz" ${settings.mode === 'quiz' ? 'selected' : ''}>${t('quizMode')}</option>
                    <option value="board" ${settings.mode === 'board' ? 'selected' : ''}>${t('boardMode')}</option>
                    <option value="typing" ${settings.mode === 'typing' ? 'selected' : ''}>${t('typingMode')}</option>
                </select>
            </div>
            <div class="form-group">
                <label>${t('cardCount')}</label>
                <select id="studyCount">
                    ${[5, 6, 7, 8, 9, 10].map(n => `
                        <option value="${n}" ${settings.count === String(n) ? 'selected' : ''}>${n}</option>
                    `).join('')}
                    <option value="all" ${settings.count === 'all' ? 'selected' : ''}>${t('all')} (${cards.length})</option>
                </select>
            </div>
            <div class="form-group">
                <label>${t('direction')}</label>
                <select id="studyDirection">
                    <option value="word-first" ${settings.direction === 'word-first' ? 'selected' : ''}>${t('wordFirst')}</option>
                    <option value="meaning-first" ${settings.direction === 'meaning-first' ? 'selected' : ''}>${t('meaningFirst')}</option>
                </select>
            </div>
            <div class="form-group">
                <label>${t('studyOrder')}</label>
                <select id="studyOrder">
                    <option value="random" ${settings.order === 'random' ? 'selected' : ''}>${t('random')}</option>
                    <option value="top-down" ${settings.order === 'top-down' ? 'selected' : ''}>${t('topDown')}</option>
                    <option value="bottom-up" ${settings.order === 'bottom-up' ? 'selected' : ''}>${t('bottomUp')}</option>
                </select>
            </div>
            ${hasFavorites ? `
            <div class="form-group" style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                <input type="checkbox" id="onlyFavorites" style="width:auto;height:20px;accent-color:#7c7cf8;" ${settings.onlyFavorites ? 'checked' : ''} />
                <label for="onlyFavorites" style="margin:0;font-weight:600;color:#b0b0d0;">${t('onlyFavorites')}</label>
            </div>
            ` : ''}
            <label id="autoBatchSummaryOnComplete" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" ${settings.autoBatchSummaryOnComplete ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
                ${t('autoBatchSummaryOnComplete')}
            </label>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
                <button class="btn btn-success" onclick="window.studyManager.handleStartStudy('${setId}')">${t('startStudy')}</button>
            </div>
        `;
        openModal(modalHtml);
    }

    handleStartStudy(setId) {
        // Lấy giá trị từ form
        const mode = document.getElementById('studyModeSelect').value;
        const count = document.getElementById('studyCount').value;
        const order = document.getElementById('studyOrder').value;
        const direction = document.getElementById('studyDirection').value;
        const onlyFavorites = document.getElementById('onlyFavorites')?.checked || false;
        const autoBatchSummaryOnComplete = document.getElementById('autoBatchSummaryOnComplete').querySelector('input').checked;

        // Lưu settings
        this.saveStudySettings({
            mode,
            count,
            direction,
            order,
            onlyFavorites,
            autoBatchSummaryOnComplete
        });

        const batchSize = count === 'all' ? Infinity : parseInt(count, 10);
        const meaningFirst = direction === 'meaning-first';

        // Get cards
        const data = this.loadData();
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

        // Apply order
        if (order === 'random') {
            for (let i = cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cards[i], cards[j]] = [cards[j], cards[i]];
            }
        } else if (order === 'bottom-up') {
            cards.reverse();
        }

        closeModal();

        // Create study instance based on mode
        switch (mode) {
            case 'flashcard':
                this.studyInstance = new FlashcardStudy(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
                break;
            case 'quiz':
                this.studyInstance = new QuizStudy(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
                break;
            case 'board':
                this.studyInstance = new DrawBoardStudy(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
                break;
            case 'typing':
                this.studyInstance = new TypingStudy(setId, cards, batchSize, meaningFirst, autoBatchSummaryOnComplete);
                break;
            default:
                showToast('Invalid study mode.', 'error');
                return;
        }

        this.currentView = 'study';
        this.renderStudy();     
        window.setActiveAppHeader(false);
    }

    renderStudy() {
        if (!this.studyInstance) {
            this.goDashboard();
            return;
        }

        const container = document.getElementById('mainContent');
        container.innerHTML = this.studyInstance.render();

        // Đợi DOM render xong rồi mới attach events
        setTimeout(() => {
            this.studyInstance.attachEvents();
        }, 50);
    }

    renderBatchSummary() {
        if (!this.studyInstance) {
            this.goDashboard();
            return;
        }

        const container = document.getElementById('mainContent');
        container.innerHTML = this.studyInstance.renderBatchSummary();
        this.studyInstance.attachEvents();
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

    goDashboard() {
        this.studyInstance = null;
        this.setId = null;
        this.currentView = 'dashboard';
        window.goDashboard();
    }

    exitStudy() {
        if (this.studyInstance && !this.studyInstance.isFinished()) {
            if (!confirm(t('confirmExit'))) return;
        }
        const setId = this.setId;
        this.studyInstance = null;
        this.setId = null;
        window.viewSet(setId);
    }

    handleKeyPress(e) {
        if (this.studyInstance) {
            this.studyInstance.handleKeyPress(e);
        }
    }
}

// Export singleton
const studyManager = new StudyManager();
window.studyManager = studyManager;
export default studyManager;