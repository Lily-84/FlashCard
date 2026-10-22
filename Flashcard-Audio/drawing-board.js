/* drawing-board.js
 * Drawing board module
 * Usage: new DrawingBoard('#board', { background, penColor, penSize })
 */

class DrawingBoard {
  constructor(container, options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!this.container) {
      throw new Error('DrawingBoard: container not found');
    }

    // ---------- options ----------
    this.opts = Object.assign(
      {
        background: '#000000',
        penColor: '#ffffff',
        penSize: 9,
        minSize: 1,
        maxSize: 40,
      },
      options
    );

    // ---------- state ----------
    this.tool = 'pen';        // 'pen' | 'eraser'
    this.color = this.opts.penColor;
    this.size = this.opts.penSize;
    this.drawing = false;
    this.lastPos = null;

    // history: array of snapshots (ImageData)
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    // ---------- DOM ----------
    this.container.style.overflow = 'hidden';
    this.container.style.background = this.opts.background;

    // canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        touch-action: none;
        cursor: crosshair;
    `;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // toolbar
    this._buildToolbar();

    // observe resize of container to adjust canvas size
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);

    // Resize first time
    this._resize();
    this._paintBackground();

    // events
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);

    this.canvas.addEventListener('pointerdown', (e) => { e.stopPropagation(); this._start(e); });
    this.canvas.addEventListener('pointermove', (e) => { e.stopPropagation(); this._move(e); });
    this.canvas.addEventListener('pointerup', (e) => { e.stopPropagation(); this._end(e); });
    this.canvas.addEventListener('pointerleave', (e) => { e.stopPropagation(); this._end(e); });
    this.canvas.addEventListener('pointercancel', (e) => { e.stopPropagation(); this._end(e); });
    this.canvas.addEventListener('click', (e) => e.stopPropagation());

    this._onKey = (e) => this._handleKey(e);
    window.addEventListener('keydown', this._onKey);
  }

  /* =========================================================
   *  TOOLBAR
   * ========================================================= */
  _buildToolbar() {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 12px 8px;
      background: rgba(25,25,32,.92);
      border: 1px solid #333;
      border-radius: 12px;
      backdrop-filter: blur(8px);
      box-shadow: 0 6px 24px rgba(0,0,0,.5);
      font: 13px system-ui, sans-serif;
      color: #ddd;
      user-select: none;
      z-index: 10;
    `;

    const mkBtn = (label, title, onClick) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.style.cssText = `
        background: #2a2a34;
        color: #eee;
        border: 1px solid #3a3a46;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        font: inherit;
        line-height: 1;
      `;
      b.addEventListener('click', onClick);
      b.addEventListener('mouseenter', () => (b.style.background = '#353543'));
      b.addEventListener('mouseleave', () => (b.style.background = '#2a2a34'));
      return b;
    };

    // --- tool: pen / eraser ---
    this.penBtn = mkBtn('✏️', 'Pen', () => this.setTool('pen'));
    this.eraserBtn = mkBtn('🧽', 'Eraser (E)', () => this.setTool('eraser'));
    bar.appendChild(this.penBtn);
    bar.appendChild(this.eraserBtn);


    // --- color ---
    const colorWrap = document.createElement('label');
    colorWrap.title = 'color';
    colorWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const colorLabel = document.createElement('span');
    this.colorInput = document.createElement('input');
    this.colorInput.type = 'color';
    this.colorInput.value = this.color;
    this.colorInput.style.cssText = `
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
    `;

    this.colorInput.addEventListener('input', (e) => {
      e.stopPropagation();
      this.setColor(this.colorInput.value);
      this.setTool('pen');
    });

    colorWrap.appendChild(colorLabel);
    colorWrap.appendChild(this.colorInput);
    bar.appendChild(colorWrap);

    // --- size ---
    const sizeWrap = document.createElement('label');
    sizeWrap.title = 'size';
    sizeWrap.style.cssText =
      'display:flex;align-items:center;gap:6px;';

    const sizeLabel = document.createElement('span');
    this.sizeInput = document.createElement('input');
    this.sizeInput.type = 'range';
    this.sizeInput.min = this.opts.minSize;
    this.sizeInput.max = this.opts.maxSize;
    this.sizeInput.value = this.size;
    this.sizeInput.style.cssText = `
      width: 8px;
      height: 90px;
      cursor: pointer;
      writing-mode: vertical-lr;
      direction: rtl;
    `;

    this.sizeValue = document.createElement('span');
    this.sizeValue.textContent = this.size;
    this.sizeValue.style.cssText =
      'min-width:18px;text-align:center;opacity:.8;';

    this.sizeInput.addEventListener('input', (e) => {
      e.stopPropagation();
      this.setSize(Number(this.sizeInput.value));
    });

    sizeWrap.appendChild(sizeLabel);
    sizeWrap.appendChild(this.sizeInput);
    bar.appendChild(this.sizeValue);
    bar.appendChild(sizeWrap);


    // --- undo / redo / clear ---
    this.undoBtn = mkBtn('↶', 'undo (Ctrl+Z)', () => this.undo());
    this.redoBtn = mkBtn('↷', 'redo (Ctrl+Shift+Z)', () => this.redo());
    this.clearBtn = mkBtn('🗑', 'clear (Ctrl+Shift+X)', () => this.clear());
    bar.appendChild(this.undoBtn);
    bar.appendChild(this.redoBtn);
    bar.appendChild(this.clearBtn);

    this.container.appendChild(bar);
    this.toolbar = bar;

    this._refreshToolButtons();
    this._refreshHistoryButtons();
  }

  _sep() {
    const s = document.createElement('span');
    s.style.cssText = 'width:1px;height:20px;background:#3a3a46;';
    return s;
  }

  _refreshToolButtons() {
    const active = 'background:#4a7dff;border-color:#4a7dff;color:#fff;';
    const idle = 'background:#2a2a34;color:#eee;border-color:#3a3a46;';
    this.penBtn.style.cssText += this.tool === 'pen' ? active : idle;
    this.eraserBtn.style.cssText += this.tool === 'eraser' ? active : idle;
  }

  _refreshHistoryButtons() {
    this.undoBtn.style.opacity = this.undoStack.length ? '1' : '.4';
    this.redoBtn.style.opacity = this.redoStack.length ? '1' : '.4';
  }

  /* =========================================================
   *  PUBLIC API
   * ========================================================= */
  setTool(tool) {
    if (tool !== 'pen' && tool !== 'eraser') return;
    this.tool = tool;
    this._refreshToolButtons();
  }

  setColor(hex) {
    this.color = hex;
    this.colorInput.value = hex;
  }

  setSize(n) {
    this.size = Math.max(this.opts.minSize, Math.min(this.opts.maxSize, n));
    this.sizeInput.value = this.size;
    this.sizeValue.textContent = this.size;
  }

  undo() {
    if (!this.undoStack.length) return;
    const current = this._snapshot();
    const prev = this.undoStack.pop();
    this.redoStack.push(current);
    this._restore(prev);
    this._refreshHistoryButtons();
  }

  redo() {
    if (!this.redoStack.length) return;
    const current = this._snapshot();
    const next = this.redoStack.pop();
    this.undoStack.push(current);
    this._restore(next);
    this._refreshHistoryButtons();
  }

  clear() {
    // push current state so clear can be undone
    this.undoStack.push(this._snapshot());
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
    this._paintBackground();
    this._refreshHistoryButtons();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKey);
    this.container.innerHTML = '';
  }

  /* =========================================================
   *  INTERNAL
   * ========================================================= */
_resize() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    if (this.canvas.width === width && this.canvas.height === height) return;

    // Save current canvas content before resizing
    const prev = this.canvas.width && this.canvas.height
        ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        : null;

    // Update canvas size
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (prev) {
        const tmp = document.createElement('canvas');
        tmp.width = prev.width;
        tmp.height = prev.height;
        tmp.getContext('2d').putImageData(prev, 0, 0);

        this.ctx.drawImage(tmp, 0, 0, rect.width, rect.height);
    } else {
        this._paintBackground();
    }
}

  _paintBackground() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = this.opts.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  _start(e) {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.drawing = true;
    this.lastPos = this._getPos(e);

    // push snapshot BEFORE drawing (so undo returns to state before stroke)
    this.undoStack.push(this._snapshot());
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
    this._refreshHistoryButtons();

    // draw a dot for a click
    this._drawDot(this.lastPos);
  }

  _move(e) {
    e.stopPropagation();
    if (!this.drawing) return;
    const pos = this._getPos(e);
    this._drawLine(this.lastPos, pos);
    this.lastPos = pos;
  }

  _end(e) {
    e.stopPropagation();
    if (!this.drawing) return;
    this.drawing = false;
    this.lastPos = null;
    this._refreshHistoryButtons();
  }

  _applyBrush() {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.size;
    this.ctx.strokeStyle =
      this.tool === 'eraser' ? this.opts.background : this.color;
    this.ctx.fillStyle = this.ctx.strokeStyle;
  }

  _drawLine(from, to) {
    this._applyBrush();
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  _drawDot(pos) {
    this._applyBrush();
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.size / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _snapshot() {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  _restore(imageData) {
    this.ctx.putImageData(imageData, 0, 0);
  }

  _handleKey(e) {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (!isCtrl) return;

    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
    }
  }
}