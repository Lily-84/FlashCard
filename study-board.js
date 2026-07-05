// study-drawboard.js
import StudyBase from "./study-base.js";
import Localization from "./localization.js";

const t = (key) => Localization.t(key);

export default class DrawBoardStudy extends StudyBase {
    constructor(setId, cards, batchSize, meaningFirst = false) {
        super(setId, cards, batchSize, meaningFirst, false);
        this.showAnswer = false;
        this.showExample = false;
        this.canvasId = null;
        this.canvasInitialized = false;
        this.resizeHandler = null;

        this.canvasData = new Map(); // key: cardIndex, value: imageData
        this.currentCanvasData = null;
        this.currentCardIndex = -1;
    }

    render() {
        const batchCards = this.getCurrentBatchCards();
        const isBatchComplete = this.isBatchComplete();

        if (isBatchComplete && this.currentBatch < this.totalBatches) {
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

        // Lấy từ và nghĩa
        let wordText, meaningText, wordSpeakCode, meaningSpeakCode;
        if (this.meaningFirst) {
            wordText = card.meaning;
            meaningText = card.word;
            wordSpeakCode = this.getLangCode(this.setId, 'target');
            meaningSpeakCode = this.getLangCode(this.setId, 'source');
        } else {
            wordText = card.word;
            meaningText = card.meaning;
            wordSpeakCode = this.getLangCode(this.setId, 'source');
            meaningSpeakCode = this.getLangCode(this.setId, 'target');
        }

        // Xây dựng HTML cho example overlay
        const exampleOverlayHtml = this.buildExampleOverlay(card);

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

        // Tạo canvas ID duy nhất cho mỗi card
        this.canvasId = `drawCanvas_${Date.now()}_${this.currentBatch}_${this.currentIndex}`;
        // Reset flag để khởi tạo lại canvas
        const cardIndex = this.currentBatch * this.batchSize + this.currentIndex;
        this.canvasId = `drawCanvas_${cardIndex}`;

        // Lưu card index hiện tại
        this.currentCardIndex = cardIndex;

        // Reset flag để khởi tạo lại canvas
        this.canvasInitialized = false;

        return `
            <div class="study-container">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <button class="btn-back" onclick="window.studyManager.exitStudy()">${t('back')}</button>
                    <span style="font-size:14px;color:#8888a8;">${t('remainingCards')}: ${this.allCards.length - this.learnedStatus.filter(v => v !== undefined).length}</span>
                </div>

                <!-- Word display area -->
                <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;margin-bottom:12px;">
                    <div style="font-size:28px;font-weight:bold;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
                        ${this.escapeHtml(wordText)}
                        <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(wordText)}', '${wordSpeakCode}')" title="${t('speak')}">🔊</button>
                    </div>
                    ${this.showAnswer ? `
                        <div style="margin-top:12px;font-size:20px;color:#8af;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
                            ${this.escapeHtml(meaningText)}
                            <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(meaningText)}', '${meaningSpeakCode}')" title="${t('speak')}">🔊</button>
                        </div>
                    ` : ''}
                </div>

                <!-- Canvas -->
                <div style="position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,0.1);">
                    <canvas id="${this.canvasId}" style="width:100%;height:100%;display:block;cursor:crosshair;touch-action:none;"></canvas>
                    
                    <!-- Example Overlay -->
                    ${this.showExample ? exampleOverlayHtml : ''}
                </div>

                <!-- Canvas toolbar -->
                <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.05);border-radius:40px;border:1px solid rgba(255,255,255,0.06);">
                    <button class="btn-tool" data-tool="pen" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;background:rgba(255,255,255,0.06);color:#c8d0e6;font-size:14px;cursor:pointer;transition:0.2s;">✏️</button>
                    <button class="btn-tool" data-tool="eraser" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;background:rgba(255,255,255,0.06);color:#c8d0e6;font-size:14px;cursor:pointer;transition:0.2s;">🧹</button>
                    <button class="btn-tool" data-tool="clear" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;background:rgba(255,255,255,0.06);color:#c8d0e6;font-size:14px;cursor:pointer;transition:0.2s;">🗑️</button>
                    <span style="color:rgba(255,255,255,0.2);">|</span>
                    <input type="range" id="drawSize_${this.canvasId}" min="1" max="40" value="5" style="width:80px;cursor:pointer;">
                    <span style="color:#fff;font-size:14px;font-weight:600;min-width:24px;text-align:center;" id="sizeDisplay_${this.canvasId}">5</span>
                    <span style="color:rgba(255,255,255,0.2);">|</span>
                    <input type="color" id="drawColor_${this.canvasId}" value="#ffffff" style="width:30px;height:30px;border:2px solid rgba(255,255,255,0.15);border-radius:50%;cursor:pointer;padding:0;background:none;">
                    <span style="color:rgba(255,255,255,0.2);">|</span>
                    <button class="btn-tool" data-tool="undo" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;background:rgba(255,255,255,0.06);color:#c8d0e6;font-size:14px;cursor:pointer;transition:0.2s;">↩️</button>
                    <button class="btn-tool" data-tool="redo" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;background:rgba(255,255,255,0.06);color:#c8d0e6;font-size:14px;cursor:pointer;transition:0.2s;">↪️</button>
                </div>

                <div class="flashcard-progress">${dots}</div>

                <div class="study-actions">
                    ${markButtons}
                </div>
                <div class="study-actions">
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.toggleAnswer(); window.studyManager.renderStudy();">${this.showAnswer ? t('hideAnswer') : t('showAnswer')}</button>
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.toggleExampleOverlay(); window.studyManager.renderStudy();">${this.showExample ? t('hideExample') : t('showExample')}</button>
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.markAllUnmarked(); window.studyManager.renderStudy();">${t('finishBatch')}</button>
                </div>

                <div class="study-nav">
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.prevCard(); window.studyManager.renderStudy();" ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('previous')}</button>
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.nextCard(); window.studyManager.renderStudy();" ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>${t('next')}</button>
                </div>
            </div>
        `;
    }

    // Xây dựng overlay cho ví dụ
    buildExampleOverlay(card) {
        const exampleText = card.example || '';
        const exampleTransText = card.exampleTranslation || '';
        const exampleSpeakCode = this.getLangCode(this.setId, 'source');
        const exampleTransSpeakCode = this.getLangCode(this.setId, 'target');

        if (!exampleText && !exampleTransText) {
            return `
                <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;padding:20px;border-radius:12px;">
                    <div style="color:#666;font-size:24px;margin-bottom:16px;">📝</div>
                    <div style="color:#888;font-size:18px;text-align:center;">${t('noExample')}</div>
                    <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.toggleExampleOverlay(); window.studyManager.renderStudy();" style="margin-top:20px;">${t('close')}</button>
                </div>
            `;
        }

        return `
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;padding:30px;border-radius:12px;backdrop-filter:blur(5px);">
                <div style="width:100%;max-width:600px;">
                    <div style="font-size:16px;color:#aaa;margin-bottom:12px;text-transform:uppercase;letter-spacing:2px;text-align:center;">📚 ${t('example')}</div>
                    
                    ${exampleText ? `
                        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px;border-left:3px solid #6c7cff;">
                            <div style="color:#fff;font-size:20px;line-height:1.6;margin-bottom:8px;">${this.escapeHtml(exampleText)}</div>
                            <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(exampleText)}', '${exampleSpeakCode}')" title="${t('speak')}" style="font-size:18px;">🔊</button>
                        </div>
                    ` : ''}
                    
                    ${exampleTransText ? `
                        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;border-left:3px solid #4ecdc4;">
                            <div style="color:#8af;font-size:18px;line-height:1.6;margin-bottom:8px;">${this.escapeHtml(exampleTransText)}</div>
                            <button class="btn-speak" onclick="event.stopPropagation(); window.speakText('${this.escapeHtml(exampleTransText)}', '${exampleTransSpeakCode}')" title="${t('speak')}" style="font-size:18px;">🔊</button>
                        </div>
                    ` : ''}
                    
                    <div style="display:flex;justify-content:center;gap:12px;margin-top:20px;">
                        <button class="btn btn-secondary" onclick="window.studyManager.studyInstance.toggleExampleOverlay(); window.studyManager.renderStudy();">${t('close')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleExampleOverlay() {
        this.saveCurrentCanvas();
        this.showExample = !this.showExample;
    }

    attachEvents() {
        // Xóa event listener resize cũ nếu có
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        // Khởi tạo canvas và khôi phục dữ liệu
        setTimeout(() => {
            if (this.canvasId && !this.canvasInitialized) {
                this.initCanvas();
            } else if (this.canvasId) {
                // THÊM: Nếu canvas đã được khởi tạo, chỉ cần khôi phục dữ liệu
                const canvas = document.getElementById(this.canvasId);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const cardIndex = this.currentBatch * this.batchSize + this.currentIndex;
                    const savedData = this.canvasData.get(cardIndex);
                    if (savedData) {
                        ctx.putImageData(savedData, 0, 0);
                        this.currentCanvasData = savedData;
                        this.currentCardIndex = cardIndex;
                    }
                }
            }
        }, 50);

        // Lắng nghe phím tắt
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    // Phương thức khởi tạo canvas
    initCanvas() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) {
            console.error('Canvas not found:', this.canvasId);
            return;
        }

        if (this.canvasInitialized) {
            console.log('Canvas already initialized');
            return;
        }

        console.log('Initializing canvas:', this.canvasId);
        this.canvasInitialized = true;

        const ctx = canvas.getContext('2d');
        let W, H, drawing = false, lastX, lastY;
        let size = 5, color = '#ffffff', eraser = false;
        let history = [], idx = -1;
        const MAX = 40;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            W = canvas.width = rect.width * dpr;
            H = canvas.height = rect.height * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // THAY ĐỔI: Thử khôi phục dữ liệu hoặc vẽ nền đen
            const cardIndex = this.currentBatch * this.batchSize + this.currentIndex;
            const savedData = this.canvasData.get(cardIndex);
            if (savedData) {
                ctx.putImageData(savedData, 0, 0);
                this.currentCanvasData = savedData;
                this.currentCardIndex = cardIndex;
            } else {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, W, H);
            }
        };

        const save = () => {
            history = history.slice(0, idx + 1);
            const imageData = ctx.getImageData(0, 0, W, H);
            history.push(imageData);
            if (history.length > MAX) history.shift();
            idx = history.length - 1;

            // THÊM: Lưu vào Map khi vẽ
            const cardIndex = this.currentBatch * this.batchSize + this.currentIndex;
            this.canvasData.set(cardIndex, imageData);
            this.currentCanvasData = imageData;
            this.currentCardIndex = cardIndex;
        };

        const drawDot = (x, y) => {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = eraser ? '#000' : color;
            ctx.fill();
        };

        const drawLine = (x1, y1, x2, y2) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = eraser ? '#000' : color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        };

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width;
            const scaleY = H / rect.height;
            let cx, cy;
            if (e.touches) {
                cx = e.touches[0].clientX;
                cy = e.touches[0].clientY;
                e.preventDefault();
            } else {
                cx = e.clientX;
                cy = e.clientY;
            }
            return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
        };

        const startDraw = (e) => {
            e.preventDefault();
            const p = getPos(e);
            drawing = true;
            lastX = p.x;
            lastY = p.y;
            drawDot(p.x, p.y);
        };

        const moveDraw = (e) => {
            e.preventDefault();
            if (!drawing) return;
            const p = getPos(e);
            drawLine(lastX, lastY, p.x, p.y);
            lastX = p.x;
            lastY = p.y;
        };

        const endDraw = (e) => {
            if (drawing) {
                drawing = false;
                save();
            }
        };

        // Gán sự kiện
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', moveDraw, { passive: false });
        canvas.addEventListener('touchend', endDraw, { passive: false });
        canvas.addEventListener('touchcancel', endDraw, { passive: false });

        // Toolbar events
        const canvasId = this.canvasId;
        const sizeSlider = document.getElementById(`drawSize_${canvasId}`);
        const sizeDisplay = document.getElementById(`sizeDisplay_${canvasId}`);
        const colorPicker = document.getElementById(`drawColor_${canvasId}`);

        if (sizeSlider) {
            sizeSlider.oninput = function () {
                size = parseInt(this.value);
                if (sizeDisplay) sizeDisplay.textContent = size;
            };
        }

        if (colorPicker) {
            colorPicker.oninput = function () {
                color = this.value;
                eraser = false;
                // Update tool buttons
                document.querySelectorAll('.btn-tool').forEach(btn => {
                    if (btn.dataset.tool === 'pen') btn.style.background = 'rgba(255,255,255,0.15)';
                    else btn.style.background = 'rgba(255,255,255,0.06)';
                });
            };
        }

        // Tool buttons
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.onclick = function () {
                const tool = this.dataset.tool;
                switch (tool) {
                    case 'pen':
                        eraser = false;
                        this.style.background = 'rgba(255,255,255,0.15)';
                        const eraserBtn = document.querySelector('.btn-tool[data-tool="eraser"]');
                        if (eraserBtn) eraserBtn.style.background = 'rgba(255,255,255,0.06)';
                        break;
                    case 'eraser':
                        eraser = true;
                        this.style.background = 'rgba(255,255,255,0.15)';
                        const penBtn = document.querySelector('.btn-tool[data-tool="pen"]');
                        if (penBtn) penBtn.style.background = 'rgba(255,255,255,0.06)';
                        break;
                    case 'clear':
                        ctx.fillStyle = '#000';
                        ctx.fillRect(0, 0, W, H);
                        save();
                        break;
                    case 'undo':
                        if (idx > 0) {
                            idx--;
                            ctx.putImageData(history[idx], 0, 0);
                        }
                        break;
                    case 'redo':
                        if (idx < history.length - 1) {
                            idx++;
                            ctx.putImageData(history[idx], 0, 0);
                        }
                        break;
                }
            };
        });

        // Phím tắt cho canvas
        const canvasKeyHandler = (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                const undoBtn = document.querySelector('.btn-tool[data-tool="undo"]');
                if (undoBtn) undoBtn.click();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                const redoBtn = document.querySelector('.btn-tool[data-tool="redo"]');
                if (redoBtn) redoBtn.click();
            }
        };
        document.addEventListener('keydown', canvasKeyHandler);

        // Lưu resize handler để cleanup
        this.resizeHandler = resize;
        window.addEventListener('resize', resize);

        // Khởi tạo
        resize();
        save();

        console.log('Canvas initialized successfully');
    }

    // Phương thức khôi phục canvas data
    restoreCanvasData() {
        const cardIndex = this.currentBatch * this.batchSize + this.currentIndex;
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return false;

        const ctx = canvas.getContext('2d');
        const savedData = this.canvasData.get(cardIndex);

        if (savedData) {
            ctx.putImageData(savedData, 0, 0);
            this.currentCanvasData = savedData;
            this.currentCardIndex = cardIndex;
            return true;
        } else {
            // Không có dữ liệu, vẽ nền đen
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return false;
        }
    }

    toggleAnswer() {
        this.saveCurrentCanvas();
        this.showAnswer = !this.showAnswer;
    }

    handleKeyPress(e) {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.nextCard();
            window.studyManager.renderStudy();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevCard();
            window.studyManager.renderStudy();
        } else if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            this.toggleAnswer();
            window.studyManager.renderStudy();
        } else if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            this.toggleExampleOverlay();
            window.studyManager.renderStudy();
        }
    }

    saveCurrentCanvas() {
        if (!this.canvasId) return;
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const cardIndex = this.currentBatch * this.batchSize + this.currentIndex;
        this.canvasData.set(cardIndex, imageData);

        this.currentCanvasData = imageData;
        this.currentCardIndex = cardIndex;
    }

    clearCurrentCanvas() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.saveCurrentCanvas();
    }

    markCard(value) {
        this.clearCurrentCanvas();
        const idx = this.currentBatch * this.batchSize + this.currentIndex;
        if (idx >= this.learnedStatus.length) return;
        this.learnedStatus[idx] = value;
        this.showAnswer = false;
        this.showExample = false;

        if (this.isBatchComplete()) {
            // Batch hoàn thành, giữ nguyên currentBatch để hiển thị summary
        } else {
            if (this.currentIndex < this.batchSize - 1) {
                this.currentIndex++;
            }
        }
    }

    unmarkCard() {
        this.clearCurrentCanvas();
        super.unmarkCard();
    }

    nextCard() {
        this.clearCurrentCanvas();
        super.nextCard();
    }

    prevCard() {
        this.clearCurrentCanvas();
        super.prevCard();
    }


    nextBatch() {
        if (this.currentBatch < this.totalBatches - 1) {
            this.currentBatch++;
            this.currentIndex = 0;
            this.showAnswer = false;
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
        this.showAnswer = false;
        this.showExample = false;
    }

    show

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
}