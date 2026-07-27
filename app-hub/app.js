/* ============================================
   我的工作台 - App 壳
   数据全部存 localStorage，纯前端无后端
   ============================================ */

(function () {
  'use strict';

  // ---------- 存储 ----------
  const Store = {
    get(key, def) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
      catch { return def; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  };

  // ---------- 韩语语音合成（TTS）----------
  const KR_TTS = {
    voice: null,
    ready: false,
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,

    init() {
      if (!this.supported) return;
      const pick = () => {
        const voices = speechSynthesis.getVoices();
        // 优先 ko-KR，退而求其次任何韩语 voice
        this.voice = voices.find(v => /ko[-_]KR/i.test(v.lang)) ||
                     voices.find(v => /^ko/i.test(v.lang)) ||
                     null;
        this.ready = true;
      };
      pick();
      // voices 异步加载，监听一次
      if (!this.ready) speechSynthesis.onvoiceschanged = pick;
    },

    // 朗读文本：text 是要读的韩文，rate 控制语速
    speak(text, rate = 0.85) {
      if (!this.supported) { toast('当前浏览器不支持语音'); return; }
      // 取消上一句，避免排队堆叠
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = rate;
      if (this.voice) u.voice = this.voice;
      // iOS 需要稍微延迟才能在 cancel 后正常播放
      setTimeout(() => speechSynthesis.speak(u), 50);
    },

    // 单元音/复合元音 TTS 无法直接读单个字符，
    // 用"ㅇ + 元音"组成的最短音节来朗读（如 ㅏ → 아，ㅗ → 오）
    // 这样发音纯粹是该元音的音，TTS 又能识别
    VOWEL_MAP: {
      'ㅏ':'아','ㅑ':'야','ㅓ':'어','ㅕ':'여','ㅗ':'오','ㅛ':'요',
      'ㅜ':'우','ㅠ':'유','ㅡ':'으','ㅣ':'이',
      'ㅐ':'애','ㅒ':'얘','ㅔ':'에','ㅖ':'예','ㅘ':'와','ㅙ':'왜',
      'ㅚ':'외','ㅝ':'워','ㅞ':'웨','ㅟ':'위','ㅢ':'의'
    },

    // 辅音 TTS 直接读字母会读成字母名（如 ㄱ 读成"기역"），
    // 而不是它在词里的实际发音。用"辅音+ㅏ"组成音节朗读，
    // 才是它作为初声的真实发音（如 ㄱ → 가 = ga）
    CONSONANT_MAP: {
      'ㄱ':'가','ㄴ':'나','ㄷ':'다','ㄹ':'라','ㅁ':'마','ㅂ':'바','ㅅ':'사',
      'ㅇ':'아','ㅈ':'자','ㅊ':'차','ㅋ':'카','ㅌ':'타','ㅍ':'파','ㅎ':'하',
      // 紧辅音
      'ㄲ':'까','ㄸ':'따','ㅃ':'빠','ㅆ':'싸','ㅉ':'짜'
    },

    // 读单个字母的原音
    speakRaw(letter) {
      let text = letter;
      // 元音：转成 ㅇ+元音 的音节，TTS 才能发声
      if (this.VOWEL_MAP[letter]) text = this.VOWEL_MAP[letter];
      // 辅音：转成 辅音+ㅏ 的音节，读初声真实发音（而非字母名）
      else if (this.CONSONANT_MAP[letter]) text = this.CONSONANT_MAP[letter];
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.6;
      if (this.voice) u.voice = this.voice;
      speechSynthesis.cancel();
      setTimeout(() => speechSynthesis.speak(u), 50);
    },

    // 读单个字母：单字母 TTS 可能不识别，用例词代替更可靠
    speakLetter(letter, example) {
      // 如果例词里有该字母，读例词；否则硬读字母
      const word = (example || '').replace(/\s.*$/, '').replace(/[（）()].*$/, '');
      this.speak(word || letter, 0.75);
    }
  };
  KR_TTS.init();

  // ---------- 跟读录音对比 ----------
  const KR_REC = {
    mediaRecorder: null,
    chunks: [],
    audioURL: null,
    stream: null,
    analyser: null,
    rafId: null,
    canvasCtx: null,
    recording: false,
    supported: typeof window !== 'undefined' &&
               navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
               typeof MediaRecorder !== 'undefined',

    async start(canvas) {
      if (!this.supported) { toast('当前浏览器不支持录音'); return false; }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        toast('麦克风权限被拒绝');
        return false;
      }
      this.chunks = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      this.mediaRecorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : {});
      this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.chunks.push(e.data); };

      // 波形可视化
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.canvasCtx = canvas.getContext('2d');
      this.recording = true;
      this.drawWave(canvas);
      this.mediaRecorder.start();
      return true;
    },

    drawWave(canvas) {
      if (!this.recording || !this.analyser) return;
      const ctx = this.canvasCtx;
      const w = canvas.width, h = canvas.height;
      const buf = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(buf);

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#818cf8';
      ctx.beginPath();
      const slice = w / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      this.rafId = requestAnimationFrame(() => this.drawWave(canvas));
    },

    stop() {
      return new Promise(resolve => {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
          resolve(null); return;
        }
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          if (this.audioURL) URL.revokeObjectURL(this.audioURL);
          this.audioURL = URL.createObjectURL(blob);
          this.cleanup();
          resolve(this.audioURL);
        };
        this.mediaRecorder.stop();
      });
    },

    cleanup() {
      this.recording = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    },

    reset() {
      if (this.audioURL) { URL.revokeObjectURL(this.audioURL); this.audioURL = null; }
    }
  };

  // ---------- 工具函数 ----------
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function fmtDate(d = new Date()) {
    const w = ['日','一','二','三','四','五','六'][d.getDay()];
    return `${d.getMonth()+1}月${d.getDate()}日 星期${w}`;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 13) return '中午好';
    if (h < 18) return '下午好';
    if (h < 22) return '晚上好';
    return '夜深了';
  }

  // ---------- Tab 切换 ----------
  const tabs = ['home', 'korean', 'english', 'inspire', 'me'];
  let currentTab = 'home';

  function switchTab(name) {
    if (!tabs.includes(name)) return;
    currentTab = name;
    $$('.tab-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    renderPage(name);
    $('#content').scrollTop = 0;
  }

  $$('#tabbar .tab-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ---------- 页面渲染 ----------
  function renderPage(name) {
    const c = $('#content');
    c.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page active';
    c.appendChild(page);

    switch (name) {
      case 'home': renderHome(page); break;
      case 'korean': renderKorean(page); break;
      case 'english': renderEnglish(page); break;
      case 'inspire': renderInspire(page); break;
      case 'me': renderMe(page); break;
    }
  }

  // ===== 首页 =====
  function renderHome(p) {
    const todos = Store.get('todos', []);
    const pending = todos.filter(t => !t.done).slice(0, 3);

    p.innerHTML = `
      <div class="greeting-card">
        <div class="hello">${greeting()} 👋</div>
        <div class="date">${fmtDate()}</div>
        <div class="weather" id="weather">📅 今天有 ${todos.filter(t=>!t.done).length} 件待办</div>
      </div>

      <div class="quick-grid">
        <button class="quick-item" data-go="korean">
          <div class="qi-icon bg-rose"><svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg></div>
          <span>韩语</span>
        </button>
        <button class="quick-item" data-go="english">
          <div class="qi-icon bg-blue"><svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg></div>
          <span>英语</span>
        </button>
        <button class="quick-item" data-go="inspire">
          <div class="qi-icon bg-purple"><svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7c0 .89.23 1.72.63 2.45L4 13.08V17h4v4h4v-2h2v2h4v-4h4v-3.92l-3.63-3.63c.4-.73.63-1.56.63-2.45 0-2.76-2.24-5-5-5z"/></svg></div>
          <span>灵感</span>
        </button>
        <button class="quick-item" data-action="newNote">
          <div class="qi-icon bg-green"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></div>
          <span>新笔记</span>
        </button>
      </div>

      <!-- 待办区（可直接操作） -->
      <div class="section-header"><h3>📝 待办</h3></div>
      <div class="home-todo-input">
        <input type="text" id="homeTodoInput" placeholder="添加待办..." maxlength="100">
        <button id="homeTodoAdd">+</button>
      </div>
      <ul class="todo-list" id="homeTodoList">
        ${renderHomeTodoList(todos)}
      </ul>

      <!-- 笔记区（可直接操作） -->
      <div class="section-header"><h3>📔 笔记</h3><button class="more" id="homeNewNoteBtn" style="font-size:13px;color:var(--primary);background:none;border:none;font-family:inherit">+ 新建</button></div>
      <div id="homeNotes">
        ${renderHomeNotes()}
      </div>

      <!-- 工具区 -->
      <div class="section-header"><h3>🔧 工具</h3></div>
      <div class="home-tools-grid" id="homeTools">
        ${renderHomeTools()}
      </div>
      <div class="tool-result" id="toolResult"></div>

      <!-- 韩语进度 -->
      <div class="section-header"><h3>📚 韩语40音</h3><button class="more" data-go="korean">去学习 ›</button></div>
      <div class="card" id="homeKrProgress">
        ${renderHomeKr()}
      </div>
    `;

    // 绑定 Tab 跳转
    p.querySelectorAll('[data-go]').forEach(el => {
      el.addEventListener('click', () => switchTab(el.dataset.go));
    });
    // 新笔记按钮
    p.querySelector('[data-action="newNote"]')?.addEventListener('click', () => { openNoteModal(); });
    p.querySelector('#homeNewNoteBtn')?.addEventListener('click', () => { openNoteModal(); });

    // 首页待办操作
    const todoInput = p.querySelector('#homeTodoInput');
    p.querySelector('#homeTodoAdd').addEventListener('click', () => homeAddTodo(todoInput));
    todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') homeAddTodo(todoInput); });
    p.querySelectorAll('.home-todo-check').forEach(el => {
      el.addEventListener('click', () => { toggleTodo(+el.dataset.id); refreshHomeTodos(); });
    });
    p.querySelectorAll('.home-todo-del').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); delTodo(+el.dataset.id); refreshHomeTodos(); });
    });

    // 首页笔记点击编辑
    p.querySelectorAll('#homeNotes .note-item').forEach(el => {
      el.addEventListener('click', () => openNoteModal(+el.dataset.id));
    });

    // 首页工具
    p.querySelectorAll('.home-tool-card').forEach(c => {
      c.addEventListener('click', () => openTool(c.dataset.tool, p.querySelector('#toolResult')));
    });

    // 加载天气
    loadWeather();
  }

  function renderHomeTodoList(todos) {
    const list = todos.slice(0, 5);
    if (!list.length) return '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:14px">🎉 暂无待办</div>';
    return list.map(t => `
      <li class="todo-item ${t.done?'done':''}">
        <div class="check home-todo-check ${t.done?'done':''}" data-id="${t.id}"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z"/></svg></div>
        <div class="todo-text">${esc(t.text)}</div>
        <button class="del home-todo-del" data-id="${t.id}">✕</button>
      </li>`).join('');
  }

  function refreshHomeTodos() {
    const todos = Store.get('todos', []);
    const el = document.getElementById('homeTodoList');
    if (el) el.innerHTML = renderHomeTodoList(todos);
    // 重新绑定事件
    document.querySelectorAll('.home-todo-check').forEach(el => {
      el.addEventListener('click', () => { toggleTodo(+el.dataset.id); refreshHomeTodos(); });
    });
    document.querySelectorAll('.home-todo-del').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); delTodo(+el.dataset.id); refreshHomeTodos(); });
    });
  }

  function homeAddTodo(input) {
    const text = input.value.trim();
    if (!text) return toast('请输入内容');
    const todos = Store.get('todos', []);
    todos.unshift({ id: Date.now(), text, done: false, createdAt: Date.now() });
    Store.set('todos', todos);
    input.value = '';
    refreshHomeTodos();
    toast('已添加');
  }

  function renderHomeTools() {
    const tools = [
      { id: 'calc', name: '计算器', icon: '🔢', bg: 'bg-indigo' },
      { id: 'unit', name: '单位换算', icon: '📏', bg: 'bg-green' },
      { id: 'qr', name: '二维码', icon: '📱', bg: 'bg-purple' },
      { id: 'color', name: '取色器', icon: '🎨', bg: 'bg-pink' },
      { id: 'day', name: '日期计算', icon: '📅', bg: 'bg-orange' },
      { id: 'pwd', name: '密码生成', icon: '🔐', bg: 'bg-cyan' }
    ];
    return tools.map(t => `
      <button class="home-tool-card" data-tool="${t.id}">
        <div class="home-tool-icon ${t.bg}">${t.icon}</div>
        <span>${t.name}</span>
      </button>`).join('');
  }


  function renderHomeKr() {
    const progress = Store.get('krProgress', { completedDays: [], quizScores: {} });
    const done = progress.completedDays;
    const total = HANGUL_DATA.plan.filter(d => !d.isReview).reduce((s, d) => s + d.count, 0);
    const learned = HANGUL_DATA.plan.filter(d => !d.isReview && done.includes(d.day)).reduce((s, d) => s + d.count, 0);
    const pct = Math.round(learned / total * 100);
    const nextDay = HANGUL_DATA.plan.find(d => !done.includes(d.day));
    const quizCount = Object.keys(progress.quizScores || {}).length;
    const bestScore = quizCount ? Math.max(...Object.values(progress.quizScores)) : 0;
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;color:var(--text-secondary)">进度 ${learned}/${total}</span>
        <span style="font-size:13px;color:var(--primary);font-weight:600">${pct}%</span>
      </div>
      <div class="kr-progress" style="background:var(--border)"><div class="kr-progress-bar" style="background:linear-gradient(90deg,#f43f5e,#be123c);width:${pct}%"></div></div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:8px">
        ${nextDay ? `下一步：Day ${nextDay.day} · ${nextDay.title}` : '🎉 7天计划已全部完成！'}
        ${quizCount ? ` · 测验最高 ${bestScore}分` : ''}
      </div>
    `;
  }

  function renderHomeNotes() {
    const notes = Store.get('notes', []).slice(-2).reverse();
    if (!notes.length) return '<div class="card" style="text-align:center;color:var(--text-secondary);font-size:14px">还没有笔记</div>';
    return notes.map(n => `
      <div class="note-item" data-note="${n.id}">
        <div class="note-title">${esc(n.title || '无标题')}</div>
        <div class="note-preview">${esc(n.content || '')}</div>
        <div class="note-date">${n.date}</div>
      </div>`).join('');
  }

  async function loadWeather() {
    const el = $('#weather');
    if (!el) return;
    const todoPart = el.textContent.split('·')[1] || '';
    try {
      // 用 JSON 格式避免 wttr.in 返回 HTML
      const res = await fetch('https://wttr.in/?format=j1', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      const cur = data && data.current_condition && data.current_condition[0];
      const area = data && data.nearest_area && data.nearest_area[0];
      if (cur) {
        const temp = cur.temp_C + '°C';
        const desc = (cur.lang_zh && cur.lang_zh[0] && cur.lang_zh[0].value) ||
                     (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || '';
        const city = (area && area.areaName && area.areaName[0] && area.areaName[0].value) || '';
        const weatherTxt = (city ? city + ' ' : '') + desc + ' ' + temp;
        // 纯文本写入，避免任何 HTML 注入
        el.textContent = '🌤 ' + weatherTxt + (todoPart ? ' · ' + todoPart.trim() : '');
      }
    } catch {
      // 接口失败则保持原样，不显示天气
    }
  }

  // ===== 待办页 =====
  let todoFilter = 'all';

  function renderTodo(p) {
    p.innerHTML = `
      <div class="page-title">待办事项</div>
      <div class="page-subtitle">记录每一件要做的事</div>

      <div class="todo-input-row">
        <input type="text" id="todoInput" placeholder="添加一个待办..." maxlength="100">
        <button id="todoAdd">添加</button>
      </div>

      <div class="todo-filter">
        <button class="${todoFilter==='all'?'active':''}" data-f="all">全部</button>
        <button class="${todoFilter==='pending'?'active':''}" data-f="pending">未完成</button>
        <button class="${todoFilter==='done'?'active':''}" data-f="done">已完成</button>
      </div>

      <ul class="todo-list" id="todoList"></ul>
      <div class="todo-empty" id="todoEmpty" style="display:none">
        <svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4L9 16.2z"/></svg>
        <div>还没有待办，添加一个吧</div>
      </div>
    `;

    const input = p.querySelector('#todoInput');
    p.querySelector('#todoAdd').addEventListener('click', () => addTodo(input));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(input); });

    p.querySelectorAll('.todo-filter button').forEach(b => {
      b.addEventListener('click', () => {
        todoFilter = b.dataset.f;
        renderTodo(p);
      });
    });

    renderTodoList();
  }

  function addTodo(input) {
    const text = input.value.trim();
    if (!text) return toast('请输入内容');
    const todos = Store.get('todos', []);
    todos.unshift({ id: Date.now(), text, done: false, createdAt: Date.now() });
    Store.set('todos', todos);
    input.value = '';
    renderTodoList();
    toast('已添加');
  }

  function renderTodoList() {
    const todos = Store.get('todos', []);
    const filtered = todos.filter(t => {
      if (todoFilter === 'pending') return !t.done;
      if (todoFilter === 'done') return t.done;
      return true;
    });

    const list = $('#todoList');
    const empty = $('#todoEmpty');
    if (!list) return;

    if (!filtered.length) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = filtered.map(t => `
      <li class="todo-item ${t.done?'done':''}" data-id="${t.id}">
        <div class="check ${t.done?'done':''}"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z"/></svg></div>
        <div class="todo-text">${esc(t.text)}</div>
        <button class="del">✕</button>
      </li>`).join('');

    list.querySelectorAll('.todo-item').forEach(li => {
      li.querySelector('.check').addEventListener('click', () => toggleTodo(+li.dataset.id));
      li.querySelector('.del').addEventListener('click', (e) => { e.stopPropagation(); delTodo(+li.dataset.id); });
    });
  }

  function toggleTodo(id) {
    const todos = Store.get('todos', []);
    const t = todos.find(x => x.id === id);
    if (t) { t.done = !t.done; Store.set('todos', todos); renderTodoList(); }
  }

  function delTodo(id) {
    let todos = Store.get('todos', []);
    todos = todos.filter(x => x.id !== id);
    Store.set('todos', todos);
    renderTodoList();
    toast('已删除');
  }

  // ===== 笔记页 =====
  function renderNotes(p) {
    const notes = Store.get('notes', []).reverse();
    p.innerHTML = `
      <div class="page-title">我的笔记</div>
      <div class="page-subtitle">随手记下灵感与想法</div>
      <button class="note-new" id="noteNew">+ 写笔记</button>
      <div id="notesList">
        ${notes.length ? notes.map(n => `
          <div class="note-item" data-id="${n.id}">
            <div class="note-title">${esc(n.title || '无标题')}</div>
            <div class="note-preview">${esc(n.content || '')}</div>
            <div class="note-date">${n.date}</div>
          </div>`).join('') : '<div class="card" style="text-align:center;color:var(--text-secondary)">还没有笔记，点击上方按钮开始记录</div>'}
      </div>
    `;

    p.querySelector('#noteNew').addEventListener('click', () => openNoteModal());
    p.querySelectorAll('.note-item').forEach(el => {
      el.addEventListener('click', () => openNoteModal(+el.dataset.id));
    });
  }

  function openNoteModal(id) {
    const notes = Store.get('notes', []);
    const note = id ? notes.find(n => n.id === id) : null;

    let mask = $('#noteMask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'noteMask';
      mask.className = 'modal-mask';
      document.body.appendChild(mask);
    }
    mask.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <h3>${note ? '编辑笔记' : '写笔记'}</h3>
        <input type="text" id="noteTitle" placeholder="标题" value="${note ? esc(note.title) : ''}">
        <textarea id="noteContent" placeholder="写点什么...">${note ? esc(note.content) : ''}</textarea>
        <div class="modal-actions">
          ${note ? '<button class="btn-cancel" id="noteDel" style="color:var(--danger)">删除</button>' : '<button class="btn-cancel" id="noteCancel">取消</button>'}
          <button class="btn-save" id="noteSave">保存</button>
        </div>
      </div>`;

    mask.classList.add('show');

    const close = () => mask.classList.remove('show');
    mask.querySelector('#noteSave').addEventListener('click', () => {
      const title = mask.querySelector('#noteTitle').value.trim();
      const content = mask.querySelector('#noteContent').value.trim();
      if (!title && !content) { toast('内容不能为空'); return; }
      const arr = Store.get('notes', []);
      if (note) {
        note.title = title; note.content = content; note.date = fmtDate();
      } else {
        arr.push({ id: Date.now(), title, content, date: fmtDate() });
      }
      Store.set('notes', arr);
      close();
      renderPage(currentTab);
      toast('已保存');
    });

    if (note) {
      mask.querySelector('#noteDel').addEventListener('click', () => {
        const arr = Store.get('notes', []).filter(n => n.id !== id);
        Store.set('notes', arr);
        close();
        renderPage(currentTab);
        toast('已删除');
      });
    } else {
      mask.querySelector('#noteCancel').addEventListener('click', close);
    }
    mask.addEventListener('click', e => { if (e.target === mask) close(); }, { once: true });
  }

  // ===== 韩语学习页 =====
  let krView = 'plan'; // plan | day | quiz
  let krCurrentDay = 1;

  function renderKorean(p) {
    if (krView === 'plan') renderKrPlan(p);
    else if (krView === 'day') renderKrDay(p, krCurrentDay);
    else if (krView === 'quiz') renderKrQuiz(p);
  }

  function renderKrPlan(p) {
    const progress = Store.get('krProgress', { completedDays: [], quizScores: {} });
    const done = progress.completedDays;
    const totalLetters = HANGUL_DATA.plan.filter(d => !d.isReview).reduce((s, d) => s + d.count, 0);
    const learned = HANGUL_DATA.plan.filter(d => !d.isReview && done.includes(d.day)).reduce((s, d) => s + d.count, 0);
    const pct = Math.round(learned / totalLetters * 100);

    p.innerHTML = `
      <div class="kr-overview">
        <div class="kr-title">韩语40音</div>
        <div class="kr-sub">${HANGUL_DATA.meta.desc} · 7天计划</div>
        <div class="kr-progress"><div class="kr-progress-bar" style="width:${pct}%"></div></div>
        <div class="kr-progress-text">
          <span>已学 ${learned}/${totalLetters} 个</span>
          <span>${pct}%</span>
        </div>
      </div>

      <div class="section-header"><h3>7天学习计划</h3></div>
      <div class="kr-day-list">
        ${HANGUL_DATA.plan.map((d, i) => {
          const isDone = done.includes(d.day);
          const prevDone = d.day === 1 || done.includes(d.day - 1);
          const isCurrent = !isDone && prevDone;
          const isLocked = !isDone && !prevDone;
          return `
            <div class="kr-day-card ${isDone?'done':''} ${isCurrent?'current':''} ${isLocked?'locked':''}" data-day="${d.day}">
              <div class="kr-day-num">${isDone ? '✓' : d.day}</div>
              <div class="kr-day-info">
                <div class="kr-day-title">Day ${d.day} · ${d.title}</div>
                <div class="kr-day-meta">${d.isReview ? '复习+拼读' : d.count + '个字母'} · ${d.isReview ? d.practice.length + '个练习词' : '约15分钟'}</div>
              </div>
              <div class="kr-day-status">${isDone ? '✅' : isLocked ? '🔒' : '▶️'}</div>
            </div>`;
        }).join('')}
      </div>

      <button class="kr-complete-btn" style="background:var(--primary);margin-top:14px" id="krQuizBtn">🧪 开始测验</button>

      <div class="kr-tip" style="margin-top:14px">
        💡 <b>学习方法</b>：每天15-20分钟，先看字母卡认读音，再点卡片看罗马音和例词。建议边读边用手写几遍，7天就能认全40音。
      </div>
    `;

    p.querySelectorAll('.kr-day-card').forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('locked')) { toast('请先完成前一天的学习'); return; }
        krCurrentDay = +el.dataset.day;
        krView = 'day';
        renderKorean(p);
        $('#content').scrollTop = 0;
      });
    });
    p.querySelector('#krQuizBtn').addEventListener('click', () => {
      krView = 'quiz';
      renderKorean(p);
      $('#content').scrollTop = 0;
    });
  }

  function renderKrDay(p, dayNum) {
    const day = HANGUL_DATA.plan.find(d => d.day === dayNum);
    if (!day) return;
    const progress = Store.get('krProgress', { completedDays: [], quizScores: {} });
    const isDone = progress.completedDays.includes(dayNum);

    let body = '';
    if (day.isReview) {
      // 复习日：展示练习词
      body = `
        <div class="kr-tip">💡 ${day.tip}</div>
        <div class="kr-section-title">拼读练习 <button class="kr-play-all" data-idx="0" style="float:right;font-size:12px;background:none;border:none;color:var(--primary);font-family:inherit;cursor:pointer">🔊 依次朗读</button></div>
        <div class="kr-practice-list">
          ${day.practice.map((w, i) => `
            <div class="kr-practice-item">
              <div class="kr-pw">${w.word}</div>
              <div class="kr-pi">
                <div class="kr-pr">${w.roman}</div>
                <div class="kr-pm">${w.mean}</div>
              </div>
              <div class="kr-practice-actions">
                <button class="kr-play-btn" data-word="${esc(w.word)}" title="朗读">🔊</button>
                <button class="kr-play-btn kr-rec-sm" data-word="${esc(w.word)}" data-roman="${esc(w.roman)}" title="跟读">🎤</button>
              </div>
            </div>`).join('')}
        </div>
        <div class="kr-section-title">40音速览 <span style="font-size:12px;color:var(--text-secondary);font-weight:400">点击卡片查看，🔊朗读</span></div>
        <div class="kr-letters">
          ${HANGUL_DATA.plan.filter(d => !d.isReview).flatMap(d => d.letters).map(l => `
            <div class="kr-letter-card" data-letter="${l.letter}" data-example="${esc(l.example)}">
              <div class="kr-lc-type">${l.type}</div>
              <div class="kr-lc-letter">${l.letter}</div>
              <div class="kr-lc-sound">点击翻转</div>
            </div>`).join('')}
        </div>
      `;
    } else {
      body = `
        <div class="kr-tip">💡 ${day.tip}</div>
        <div class="kr-section-title">今日字母（${day.count}个）<span style="font-size:12px;color:var(--text-secondary);font-weight:400">点击翻转，🔊朗读</span></div>
        <div class="kr-letters">
          ${day.letters.map(l => `
            <div class="kr-letter-card" data-letter="${l.letter}" data-example="${esc(l.example)}">
              <div class="kr-lc-type">${l.type}</div>
              <div class="kr-lc-letter">${l.letter}</div>
              <div class="kr-lc-sound">点击翻转</div>
            </div>`).join('')}
        </div>
      `;
    }

    p.innerHTML = `
      <button class="kr-back" id="krBack">‹ 返回计划</button>
      <div class="page-title">Day ${day.day} · ${day.title}</div>
      <div class="page-subtitle">${day.isReview ? '复习巩固，尝试拼读' : day.count + '个字母 · 约15分钟'}</div>
      ${body}
      <button class="kr-complete-btn" id="krDone" ${isDone?'disabled':''}>
        ${isDone ? '✅ 今日已完成' : '标记今日完成'}
      </button>
    `;

    // 翻转卡片
    p.querySelectorAll('.kr-letter-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // 点击发音/跟读按钮时不翻转
        if (e.target.classList.contains('kr-card-speak') || e.target.classList.contains('kr-card-raw')) {
          e.stopPropagation();
          const letter = card.dataset.letter;
          const example = card.dataset.example;
          if (e.target.classList.contains('kr-card-raw')) {
            KR_TTS.speakRaw(letter);
          } else {
            KR_TTS.speakLetter(letter, example);
          }
          return;
        }
        if (e.target.classList.contains('kr-card-rec')) {
          e.stopPropagation();
          const letter = card.dataset.letter;
          const all = HANGUL_DATA.plan.filter(d => !d.isReview).flatMap(d => d.letters);
          const l = all.find(x => x.letter === letter);
          openRecPanel(l);
          return;
        }
        const letter = card.dataset.letter;
        const all = HANGUL_DATA.plan.filter(d => !d.isReview).flatMap(d => d.letters);
        const l = all.find(x => x.letter === letter);
        if (!l) return;
        const flipped = card.classList.toggle('flipped');
        if (flipped) {
          card.innerHTML = `
            <div class="kr-lc-type" style="background:rgba(255,255,255,.2);color:#fff">${l.type}</div>
            <div class="kr-lc-letter">${l.letter}</div>
            <div class="kr-lc-zh">谐音：${l.sound}</div>
            <div class="kr-lc-tip">${l.tip || ''}</div>
            <div class="kr-lc-roman">罗马音 ${l.roman}</div>
            <div class="kr-lc-ex">${l.example}</div>
            <div class="kr-card-actions">
              <button class="kr-card-raw" title="朗读字母原音">🔊 原音</button>
              <button class="kr-card-speak" title="朗读例词">📖 例词</button>
              <button class="kr-card-rec" title="跟读">🎤 跟读</button>
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="kr-lc-type">${l.type}</div>
            <div class="kr-lc-letter">${l.letter}</div>
            <div class="kr-lc-sound">点击翻转</div>
          `;
        }
      });
    });

    // 拼读练习的朗读按钮
    p.querySelectorAll('.kr-play-btn:not(.kr-rec-sm)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        KR_TTS.speak(btn.dataset.word, 0.8);
      });
    });

    // 拼读练习的跟读按钮
    p.querySelectorAll('.kr-rec-sm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRecPanel({
          letter: btn.dataset.word,
          roman: btn.dataset.roman,
          sound: btn.dataset.roman,
          example: btn.dataset.word
        });
      });
    });

    // 依次朗读所有练习词
    const playAllBtn = p.querySelector('.kr-play-all');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => {
        const words = day.practice.map(w => w.word);
        let i = 0;
        const playNext = () => {
          if (i >= words.length) { playAllBtn.textContent = '🔊 依次朗读'; return; }
          playAllBtn.textContent = `🔊 朗读中 ${i+1}/${words.length}`;
          KR_TTS.speak(words[i], 0.8);
          // 估算读完时间：每字约 400ms + 间隔
          const wait = Math.max(1200, words[i].length * 500 + 400);
          setTimeout(() => { i++; playNext(); }, wait);
        };
        speechSynthesis.cancel();
        playNext();
      });
    }

    p.querySelector('#krBack').addEventListener('click', () => {
      krView = 'plan';
      renderKorean(p);
      $('#content').scrollTop = 0;
    });

    p.querySelector('#krDone').addEventListener('click', () => {
      const prog = Store.get('krProgress', { completedDays: [], quizScores: {} });
      if (!prog.completedDays.includes(dayNum)) {
        prog.completedDays.push(dayNum);
        Store.set('krProgress', prog);
        toast('🎉 完成 Day ' + dayNum);
        renderKorean(p);
      }
    });
  }

  // 跟读录音对比面板
  function openRecPanel(letterData) {
    KR_REC.reset();
    let mask = $('#recMask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'recMask';
      mask.className = 'modal-mask';
      document.body.appendChild(mask);
    }

    function renderPanel(state, audioURL) {
      // state: idle | recording | recorded
      mask.innerHTML = `
        <div class="modal rec-panel">
          <div class="modal-handle"></div>
          <h3>🎤 跟读对比 · ${letterData.letter}</h3>
          <div class="rec-letter-display">
            <div class="rec-letter-big">${letterData.letter}</div>
            <div class="rec-letter-info">
              <div class="rec-roman">${letterData.roman}</div>
              <div class="rec-sound">${letterData.sound}</div>
              <div class="rec-ex">${letterData.example}</div>
            </div>
          </div>

          <div class="rec-wave-wrap">
            <canvas id="recWave" width="280" height="80"></canvas>
            ${state === 'idle' ? '<div class="rec-wave-placeholder">点击下方按钮开始录音</div>' : ''}
            ${state === 'recorded' && audioURL ? '<audio id="recAudio" src="'+audioURL+'" controls style="width:100%;margin-top:8px"></audio>' : ''}
          </div>

          <div class="rec-controls">
            ${state === 'idle' ? `
              <button class="rec-btn rec-btn-primary" id="recStart">🎤 开始录音</button>
              <button class="rec-btn rec-btn-ghost" id="recRaw">🔊 原音</button>
              <button class="rec-btn rec-btn-ghost" id="recStd">📖 例词</button>
            ` : ''}
            ${state === 'recording' ? `
              <button class="rec-btn rec-btn-danger" id="recStop">⏹ 停止录音</button>
            ` : ''}
            ${state === 'recorded' ? `
              <button class="rec-btn rec-btn-primary" id="recReplay">▶ 我的录音</button>
              <button class="rec-btn rec-btn-ghost" id="recRaw2">🔊 原音</button>
              <button class="rec-btn rec-btn-ghost" id="recStd2">📖 例词</button>
              <button class="rec-btn rec-btn-ghost" id="recRedo">🔄 重录</button>
            ` : ''}
          </div>

          ${state === 'recorded' ? `
            <div class="rec-tip">
              💡 对比要点：听标准音和你的录音，注意①音高是否一致 ②长短是否相当 ③元音口型是否到位
            </div>
          ` : ''}

          <div class="modal-actions">
            <button class="btn-cancel" id="recClose">关闭</button>
          </div>
        </div>
      `;

      const canvas = mask.querySelector('#recWave');

      // 绑定事件
      mask.querySelector('#recClose').addEventListener('click', () => {
        if (KR_REC.recording) KR_REC.cleanup();
        KR_REC.reset();
        mask.classList.remove('show');
      });

      const stdBtn = mask.querySelector('#recStd') || mask.querySelector('#recStd2');
      if (stdBtn) stdBtn.addEventListener('click', () => KR_TTS.speakLetter(letterData.letter, letterData.example));

      const rawBtn = mask.querySelector('#recRaw') || mask.querySelector('#recRaw2');
      if (rawBtn) rawBtn.addEventListener('click', () => KR_TTS.speakRaw(letterData.letter));

      const startBtn = mask.querySelector('#recStart');
      if (startBtn) startBtn.addEventListener('click', async () => {
        const ok = await KR_REC.start(canvas);
        if (ok) renderPanel('recording');
      });

      const stopBtn = mask.querySelector('#recStop');
      if (stopBtn) stopBtn.addEventListener('click', async () => {
        const url = await KR_REC.stop();
        renderPanel('recorded', url);
      });

      const replayBtn = mask.querySelector('#recReplay');
      if (replayBtn) replayBtn.addEventListener('click', () => {
        const audio = mask.querySelector('#recAudio');
        if (audio) audio.play();
      });

      const redoBtn = mask.querySelector('#recRedo');
      if (redoBtn) redoBtn.addEventListener('click', () => {
        KR_REC.reset();
        renderPanel('idle');
      });
    }

    renderPanel('idle');
    mask.classList.add('show');
    // 点击遮罩关闭
    mask.onclick = (e) => {
      if (e.target === mask) {
        if (KR_REC.recording) KR_REC.cleanup();
        KR_REC.reset();
        mask.classList.remove('show');
      }
    };
  }

  function renderKrQuiz(p) {
    const allLetters = HANGUL_DATA.plan.filter(d => !d.isReview).flatMap(d => d.letters);
    // 随机抽 10 题
    const questions = [...allLetters].sort(() => Math.random() - 0.5).slice(0, 10).map(l => {
      const options = new Set([l.sound]);
      while (options.size < 4) {
        const rand = allLetters[Math.floor(Math.random() * allLetters.length)];
        options.add(rand.sound);
      }
      return {
        letter: l.letter,
        answer: l.sound,
        example: l.example,
        options: [...options].sort(() => Math.random() - 0.5)
      };
    });

    let idx = 0;
    let score = 0;

    function showQ() {
      if (idx >= questions.length) {
        const prog = Store.get('krProgress', { completedDays: [], quizScores: {} });
        prog.quizScores[Date.now()] = score;
        Store.set('krProgress', prog);
        p.innerHTML = `
          <button class="kr-back" id="krBack">‹ 返回计划</button>
          <div style="text-align:center;padding:40px 20px">
            <div style="font-size:64px;margin-bottom:12px">${score >= 8 ? '🏆' : score >= 6 ? '👍' : '💪'}</div>
            <div style="font-size:28px;font-weight:700;margin-bottom:6px">${score} / ${questions.length}</div>
            <div style="color:var(--text-secondary);font-size:14px;margin-bottom:24px">
              ${score >= 9 ? '太棒了！40音已经很熟了' : score >= 7 ? '不错，继续加油' : '多复习几天再来挑战吧'}
            </div>
            <button class="kr-complete-btn" style="background:var(--primary)" id="krRetry">再做一次</button>
          </div>
        `;
        p.querySelector('#krBack').addEventListener('click', () => { krView = 'plan'; renderKorean(p); });
        p.querySelector('#krRetry').addEventListener('click', () => renderKrQuiz(p));
        return;
      }
      const q = questions[idx];
      p.innerHTML = `
        <button class="kr-back" id="krBack">‹ 返回计划</button>
        <div class="page-title">40音测验</div>
        <div class="page-subtitle">第 ${idx + 1} / ${questions.length} 题 · 当前得分 ${score}</div>
        <div class="kr-quiz">
          <div class="kr-quiz-q">这个字母怎么读？点 🔊 听发音</div>
          <div class="kr-quiz-letter">
            ${q.letter}
            <button class="kr-quiz-play" id="krQPlay" title="听发音" style="background:none;border:none;font-size:24px;cursor:pointer;color:#fff;background:var(--primary);border-radius:50%;width:36px;height:36px;vertical-align:middle;margin-left:8px">🔊</button>
          </div>
          <div class="kr-quiz-options" id="krOpts">
            ${q.options.map(o => `<button class="kr-quiz-opt" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}
          </div>
        </div>
      `;
      p.querySelector('#krBack').addEventListener('click', () => { krView = 'plan'; renderKorean(p); });
      p.querySelector('#krQPlay').addEventListener('click', () => {
        KR_TTS.speakLetter(q.letter, q.example || '');
      });
      p.querySelectorAll('.kr-quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = btn.dataset.opt;
          const correct = chosen === q.answer;
          if (correct) { score++; btn.classList.add('correct'); }
          else {
            btn.classList.add('wrong');
            p.querySelectorAll('.kr-quiz-opt').forEach(b => { if (b.dataset.opt === q.answer) b.classList.add('correct'); });
          }
          p.querySelectorAll('.kr-quiz-opt').forEach(b => b.style.pointerEvents = 'none');
          setTimeout(() => { idx++; showQ(); }, 900);
        });
      });
    }
    showQ();
  }



  // ===== 英语学习页 =====
  let enView = 'plan'; // plan | scene | word | resource
  let enSceneIdx = 0;

  function renderEnglish(p) {
    if (enView === 'plan') renderEnPlan(p);
    else if (enView === 'scene') renderEnScene(p);
    else if (enView === 'word') renderEnWord(p);
    else if (enView === 'resource') renderEnResource(p);
  }

  function renderEnPlan(p) {
    const progress = Store.get('enProgress', { days: [], stage: 1, startDate: null });
    const today = new Date().toISOString().slice(0,10);
    const todayDone = progress.days.includes(today);
    const totalDays = progress.days.length;
    const stage = ENGLISH_DATA.stages.find(s => s.id === progress.stage) || ENGLISH_DATA.stages[0];

    p.innerHTML = `
      <div class="en-overview">
        <div class="en-title">${ENGLISH_DATA.meta.title}</div>
        <div class="en-sub">${ENGLISH_DATA.meta.desc}</div>
        <div class="en-progress"><div class="en-progress-bar" style="width:${Math.min(totalDays/180*100,100)}%"></div></div>
        <div class="en-progress-text">
          <span>已坚持 ${totalDays} 天</span>
          <span>${Math.round(totalDays/180*100)}% / 180天</span>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;color:var(--text-secondary)">当前阶段</span>
          <span style="font-size:12px;background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:8px">${stage.months}</span>
        </div>
        <div style="font-size:18px;font-weight:700;color:var(--primary);margin-bottom:4px">${stage.name}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${stage.goal}</div>
        <div style="background:#eff6ff;border-radius:8px;padding:10px;font-size:12px;color:#1e40af;line-height:1.6;margin-bottom:12px">💡 ${stage.tip}</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:6px">每日任务（约${stage.dailyTime}分钟）</div>
        ${stage.tasks.map((t,i) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px"><div style="width:18px;height:18px;border-radius:50%;background:var(--primary);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>${t}</div>`).join('')}
      </div>

      <div class="section-header"><h3>今日学习</h3></div>
      <div class="en-quick-grid">
        <button class="en-quick-card" data-view="scene">
          <div class="en-qc-icon" style="background:#3b82f6">💬</div>
          <div class="en-qc-name">场景对话</div>
          <div class="en-qc-desc">30个生活场景</div>
        </button>
        <button class="en-quick-card" data-view="word">
          <div class="en-qc-icon" style="background:#10b981">📖</div>
          <div class="en-qc-name">每日词汇</div>
          <div class="en-qc-desc">高频实用词</div>
        </button>
        <button class="en-quick-card" data-view="resource">
          <div class="en-qc-icon" style="background:#f59e0b">🔗</div>
          <div class="en-qc-name">学习资源</div>
          <div class="en-qc-desc">推荐工具</div>
        </button>
      </div>

      <button class="en-checkin-btn ${todayDone?'done':''}" id="enCheckin">
        ${todayDone ? '✅ 今日已打卡' : '📅 今日打卡'}
      </button>

      <div class="en-tip-card">
        <b>🎯 6个月路线图</b><br>
        <b>第1-2月 激活期</b>：影子跟读+场景对话，重启听说回路<br>
        <b>第3-4月 输出期</b>：自由复述+话题输出，开始自由表达<br>
        <b>第5-6月 实战期</b>：原版材料+真人对话，流利交流<br><br>
        <b>核心原则</b>：每天40分钟 > 每周3小时。开口说从第1天开始，允许犯错。
      </div>
    `;

    p.querySelectorAll('.en-quick-card').forEach(c => {
      c.addEventListener('click', () => {
        enView = c.dataset.view;
        if (enView === 'scene') enSceneIdx = 0;
        renderEnglish(p);
        $('#content').scrollTop = 0;
      });
    });

    p.querySelector('#enCheckin').addEventListener('click', () => {
      if (todayDone) return;
      const prog = Store.get('enProgress', { days: [], stage: 1, startDate: null });
      if (!prog.startDate) prog.startDate = today;
      prog.days.push(today);
      // 自动升级阶段
      if (prog.days.length >= 120) prog.stage = 3;
      else if (prog.days.length >= 60) prog.stage = 2;
      Store.set('enProgress', prog);
      toast('🎉 打卡成功！已坚持' + prog.days.length + '天');
      renderEnglish(p);
    });
  }

  function renderEnScene(p) {
    const scene = ENGLISH_DATA.scenes[enSceneIdx];
    p.innerHTML = `
      <button class="kr-back" id="enBack">‹ 返回</button>
      <div class="page-title">场景对话</div>
      <div class="page-subtitle">${enSceneIdx+1} / ${ENGLISH_DATA.scenes.length} · ${scene.category}</div>

      <div class="en-scene-card">
        <div class="en-scene-label">🗣 对方说</div>
        <div class="en-scene-en">${scene.en}</div>
        <div class="en-scene-zh">${scene.zh}</div>
        <div class="en-scene-actions">
          <button class="en-play-btn" data-text="${scene.en}" title="朗读">🔊 听</button>
          <button class="en-rec-btn" data-text="${scene.en}" title="跟读">🎤 跟读</button>
        </div>
      </div>

      <div class="en-scene-card" style="border-left-color:var(--success)">
        <div class="en-scene-label" style="color:var(--success)">💬 你可以回答</div>
        <div class="en-scene-en">${scene.reply_en}</div>
        <div class="en-scene-zh">${scene.reply_zh}</div>
        <div class="en-scene-actions">
          <button class="en-play-btn" data-text="${scene.reply_en}" title="朗读">🔊 听</button>
          <button class="en-rec-btn" data-text="${scene.reply_en}" title="跟读">🎤 跟读</button>
        </div>
      </div>

      <div class="en-scene-nav">
        <button class="en-nav-btn" id="enPrev" ${enSceneIdx===0?'disabled':''}>‹ 上一个</button>
        <button class="en-nav-btn" id="enNext" ${enSceneIdx===ENGLISH_DATA.scenes.length-1?'disabled':''}>下一个 ›</button>
      </div>
    `;

    p.querySelector('#enBack').addEventListener('click', () => { enView='plan'; renderEnglish(p); });
    p.querySelector('#enPrev')?.addEventListener('click', () => { if(enSceneIdx>0){enSceneIdx--;renderEnglish(p);$('#content').scrollTop=0;} });
    p.querySelector('#enNext')?.addEventListener('click', () => { if(enSceneIdx<ENGLISH_DATA.scenes.length-1){enSceneIdx++;renderEnglish(p);$('#content').scrollTop=0;} });

    // 朗读按钮（用英语TTS）
    p.querySelectorAll('.en-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        speakEnglish(btn.dataset.text);
      });
    });
    // 跟读按钮（复用录音面板）
    p.querySelectorAll('.en-rec-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openEnRecPanel(btn.dataset.text);
      });
    });
  }

  function renderEnWord(p) {
    // 按日期轮换词汇
    const dayIdx = Math.floor(Date.now() / 86400000) % ENGLISH_DATA.words.length;
    const words = [];
    // 显示当天+后面4个，共5个
    for (let i = 0; i < 5; i++) {
      words.push(ENGLISH_DATA.words[(dayIdx + i) % ENGLISH_DATA.words.length]);
    }

    p.innerHTML = `
      <button class="kr-back" id="enBack">‹ 返回</button>
      <div class="page-title">每日词汇</div>
      <div class="page-subtitle">高频实用词 · 在句子里记</div>
      ${words.map(w => `
        <div class="en-word-card">
          <div class="en-word-header">
            <div class="en-word-en">${w.en}</div>
            <button class="en-play-btn en-word-play" data-text="${w.en}">🔊</button>
          </div>
          <div class="en-word-zh">${w.zh}</div>
          <div class="en-word-example">${w.example}</div>
        </div>
      `).join('')}
      <div class="en-tip-card" style="margin-top:14px">
        💡 <b>记词方法</b>：不要背单词本身，背例句。把例句读5遍，读到能脱口而出，这个词就是你的了。
      </div>
    `;

    p.querySelector('#enBack').addEventListener('click', () => { enView='plan'; renderEnglish(p); });
    p.querySelectorAll('.en-word-play').forEach(btn => {
      btn.addEventListener('click', () => speakEnglish(btn.dataset.text));
    });
  }

  function renderEnResource(p) {
    p.innerHTML = `
      <button class="kr-back" id="enBack">‹ 返回</button>
      <div class="page-title">学习资源</div>
      <div class="page-subtitle">精选英语学习工具</div>
      <div class="inspire-sites">
        ${ENGLISH_DATA.resources.map(r => `
          <a class="inspire-site-card" href="${r.url}" target="_blank" rel="noopener">
            <div class="inspire-site-icon" style="background:var(--primary)">${r.name[0]}</div>
            <div class="inspire-site-info">
              <div class="inspire-site-name">${r.name}</div>
              <div class="inspire-site-desc">${r.desc}</div>
            </div>
            <div class="inspire-site-cat">${r.type}</div>
          </a>`).join('')}
      </div>
      <div class="en-tip-card">
        <b>推荐使用方式</b><br>
        • <b>听力</b>：每天看1个YouTube英文视频，开英文字幕<br>
        • <b>口语</b>：第3个月开始用 HelloTalk 找语伴，每周2次<br>
        • <b>发音</b>：不确定的词用 YouGlish 搜真实发音<br>
        • <b>写作</b>：用 Grammarly 写英文日记，每天3句话
      </div>
    `;
    p.querySelector('#enBack').addEventListener('click', () => { enView='plan'; renderEnglish(p); });
  }

  // 英语TTS朗读
  function speakEnglish(text, rate) {
    rate = rate || 0.85;
    if (!('speechSynthesis' in window)) { toast('不支持语音'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    const voices = speechSynthesis.getVoices();
    const v = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
    if (v) u.voice = v;
    setTimeout(() => speechSynthesis.speak(u), 50);
  }

  // 英语跟读录音面板（复用KR_REC）
  function openEnRecPanel(text) {
    let mask = document.createElement('div');
    mask.className = 'modal-mask';
    document.body.appendChild(mask);
    let recording = false;
    let audioURL = null;

    function render(state) {
      mask.innerHTML = `
        <div class="modal rec-panel">
          <div class="modal-handle"></div>
          <h3>🎤 英语跟读</h3>
          <div class="en-rec-text">${text}</div>
          <div class="rec-wave-wrap">
            <canvas id="enWave" width="280" height="80"></canvas>
            ${state === 'idle' ? '<div class="rec-wave-placeholder">点击开始录音</div>' : ''}
            ${state === 'recorded' && audioURL ? '<audio src="'+audioURL+'" controls style="width:100%;margin-top:8px"></audio>' : ''}
          </div>
          <div class="rec-controls">
            ${state === 'idle' ? '<button class="rec-btn rec-btn-primary" id="enRecStart">🎤 开始录音</button><button class="rec-btn rec-btn-ghost" id="enRecPlay">🔊 听原文</button>' : ''}
            ${state === 'recording' ? '<button class="rec-btn rec-btn-danger" id="enRecStop">⏹ 停止</button>' : ''}
            ${state === 'recorded' ? '<button class="rec-btn rec-btn-primary" id="enRecReplay">▶ 我的录音</button><button class="rec-btn rec-btn-ghost" id="enRecPlay2">🔊 原文</button><button class="rec-btn rec-btn-ghost" id="enRecRedo">🔄 重录</button>' : ''}
          </div>
          <div class="modal-actions"><button class="btn-cancel" id="enRecClose">关闭</button></div>
        </div>`;

      mask.querySelector('#enRecClose').onclick = () => { if(recording) KR_REC.cleanup(); mask.remove(); };
      const playBtn = mask.querySelector('#enRecPlay') || mask.querySelector('#enRecPlay2');
      if (playBtn) playBtn.onclick = () => speakEnglish(text, 0.85);

      const startBtn = mask.querySelector('#enRecStart');
      if (startBtn) startBtn.onclick = async () => {
        const canvas = mask.querySelector('#enWave');
        const ok = await KR_REC.start(canvas);
        if (ok) { recording = true; render('recording'); }
      };
      const stopBtn = mask.querySelector('#enRecStop');
      if (stopBtn) stopBtn.onclick = async () => { audioURL = await KR_REC.stop(); recording = false; render('recorded'); };
      const replayBtn = mask.querySelector('#enRecReplay');
      if (replayBtn) replayBtn.onclick = () => { const a = mask.querySelector('audio'); if(a) a.play(); };
      const redoBtn = mask.querySelector('#enRecRedo');
      if (redoBtn) redoBtn.onclick = () => { KR_REC.reset(); audioURL = null; render('idle'); };
    }

    mask.classList.add('show');
    render('idle');
    mask.onclick = (e) => { if (e.target === mask) { if(recording) KR_REC.cleanup(); mask.remove(); } };
  }

  // ===== 灵感页 =====
  function renderInspire(p) {
    // 按日期轮换美学概念
    const dayIdx = Math.floor(Date.now() / 86400000) % INSPIRE_DATA.concepts.length;
    const concept = INSPIRE_DATA.concepts[dayIdx];
    const today = fmtDate();

    // 用日期作为种子，决定今天展示哪些图片（从博物馆API获取）
    const seed = new Date().toISOString().slice(0,10);

    p.innerHTML = `
      <div class="page-title">每日灵感</div>
      <div class="page-subtitle">${today} · 培养美感，从每天看一张好图开始</div>

      <div class="inspire-concept-card">
        <div class="inspire-concept-label">📚 今日美学概念</div>
        <div class="inspire-concept-title">${concept.title}</div>
        <div class="inspire-concept-desc">${concept.desc}</div>
      </div>

      <div class="section-header"><h3>今日推荐画作</h3></div>
      <div id="inspireArt" class="inspire-art-loading">
        <div style="text-align:center;padding:30px;color:var(--text-secondary)">
          <div style="font-size:24px;margin-bottom:8px">🎨</div>
          正在从博物馆获取今日画作...
        </div>
      </div>

      <div class="section-header"><h3>每日一图</h3></div>
      <div class="inspire-photo-card" id="inspirePhoto">
        <div style="text-align:center;padding:30px;color:var(--text-secondary)">
          <div style="font-size:24px;margin-bottom:8px">📷</div>
          正在加载...
        </div>
      </div>

      <div class="section-header"><h3>美学网站收藏</h3></div>
      <div class="inspire-sites">
        ${INSPIRE_DATA.sites.map(s => `
          <a class="inspire-site-card" href="${s.url}" target="_blank" rel="noopener">
            <div class="inspire-site-icon" style="background:${s.color}">${s.name[0]}</div>
            <div class="inspire-site-info">
              <div class="inspire-site-name">${s.name}</div>
              <div class="inspire-site-desc">${s.desc}</div>
            </div>
            <div class="inspire-site-cat">${s.cat}</div>
          </a>`).join('')}
      </div>

      <div class="inspire-tip-card">
        💡 <b>如何培养美感</b><br>
        • 每天花5分钟看好图，建立视觉记忆<br>
        • 看到喜欢的就保存，积累自己的审美库<br>
        • 问自己：这张图好在哪里？色彩？构图？光影？<br>
        • 尝试用文字描述美，能描述才能理解
      </div>
    `;

    // 异步加载艺术画作（用 Art Institute of Chicago API，免费免key）
    loadInspireArt();
    // 异步加载每日一图
    loadInspirePhoto();
  }

  async function loadInspireArt() {
    const el = document.getElementById('inspireArt');
    if (!el) return;
    try {
      // 用日期做种子，每天稳定推荐不同的画
      const today = new Date();
      const pageSeed = (today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate()) % 200;
      const res = await fetch('https://api.artic.edu/api/v1/artworks/search?q=landscape&fields=id,title,artist_display,image_id,date_display,medium_display&limit=3&page=' + (pageSeed % 10 + 1));
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.data || !data.data.length) throw new Error();

      el.classList.remove('inspire-art-loading');
      el.innerHTML = data.data.map(art => {
        const img = art.image_id ? `https://www.artic.edu/iiif/2/${art.image_id}/full/400,/0/default.jpg` : '';
        return `
          <div class="inspire-art-card">
            ${img ? `<img src="${img}" alt="${art.title}" loading="lazy" onerror="this.parentElement.style.display='none'">` : ''}
            <div class="inspire-art-info">
              <div class="inspire-art-title">${art.title || '无题'}</div>
              <div class="inspire-art-artist">${art.artist_display || '未知艺术家'}</div>
              <div class="inspire-art-meta">${art.date_display || ''} · ${art.medium_display || ''}</div>
            </div>
          </div>`;
      }).join('');
    } catch {
      el.classList.remove('inspire-art-loading');
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px">画作加载失败，可访问下方博物馆网站浏览</div>';
    }
  }

  async function loadInspirePhoto() {
    const el = document.getElementById('inspirePhoto');
    if (!el) return;
    try {
      // 用 Unsplash Source 获取每日图片（免key）
      const seed = new Date().toISOString().slice(0,10);
      el.innerHTML = `
        <img src="https://picsum.photos/seed/${seed}/600/400" alt="每日一图" loading="lazy" style="width:100%;border-radius:12px 12px 0 0;display:block" onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;color:var(--text-secondary);text-align:center\\'>图片加载失败</div>'">
        <div class="inspire-photo-info">
          📷 每日随机美图 · 点击 <a href="https://unsplash.com" target="_blank" style="color:var(--primary)">Unsplash</a> 看更多
        </div>
      `;
    } catch {
      el.innerHTML = '<div style="padding:20px;color:var(--text-secondary);text-align:center">图片加载失败</div>';
    }
  }

  // ===== 工具页 =====
  function renderTools(p) {
    p.innerHTML = `
      <div class="page-title">实用工具</div>
      <div class="page-subtitle">日常小工具合集</div>

      <div class="tool-grid">
        <button class="tool-card" data-tool="calc">
          <div class="tc-icon bg-indigo"><svg viewBox="0 0 24 24"><path d="M7 2h10c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm0 6h10v2H7V8zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4 0h6v2h-6v-2zm0-4h6v2h-6v-2z"/></svg></div>
          <div class="tc-name">计算器</div>
          <div class="tc-desc">日常计算</div>
        </button>
        <button class="tool-card" data-tool="unit">
          <div class="tc-icon bg-green"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg></div>
          <div class="tc-name">单位换算</div>
          <div class="tc-desc">长度/重量/温度</div>
        </button>
        <button class="tool-card" data-tool="qr">
          <div class="tc-icon bg-purple"><svg viewBox="0 0 24 24"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v3h-3v2h3v3h2v-3h3v-2h-3v-3z"/></svg></div>
          <div class="tc-name">二维码</div>
          <div class="tc-desc">生成二维码</div>
        </button>
        <button class="tool-card" data-tool="color">
          <div class="tc-icon bg-pink"><svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2-1 2-2v-1c0-1.1.9-2 2-2h1c2.2 0 4-1.8 4-4 0-5.5-4.5-9-10-9zm-5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg></div>
          <div class="tc-name">取色器</div>
          <div class="tc-desc">颜色参考</div>
        </button>
        <button class="tool-card" data-tool="day">
          <div class="tc-icon bg-orange"><svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/></svg></div>
          <div class="tc-name">日期计算</div>
          <div class="tc-desc">天数/倒计时</div>
        </button>
        <button class="tool-card" data-tool="pwd">
          <div class="tc-icon bg-cyan"><svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9H9V6c0-1.7 1.3-3 3-3s3 1.3 3 3v2z"/></svg></div>
          <div class="tc-name">密码生成</div>
          <div class="tc-desc">随机密码</div>
        </button>
      </div>

      <div class="tool-result" id="toolResult"></div>
    `;

    p.querySelectorAll('.tool-card').forEach(c => {
      c.addEventListener('click', () => openTool(c.dataset.tool));
    });
  }

  function openTool(name, container) {
    const r = container || $('#toolResult');
    const map = { calc: toolCalc, unit: toolUnit, qr: toolQR, color: toolColor, day: toolDay, pwd: toolPwd };
    map[name] && map[name](r);
    r.classList.add('show');
  }

  function toolCalc(r) {
    r.innerHTML = `
      <h3 style="margin-bottom:12px">计算器</h3>
      <input type="text" id="calcExpr" placeholder="输入算式，如 1+2*3" style="width:100%;border:1.5px solid var(--border);border-radius:10px;padding:11px;font-size:16px;margin-bottom:8px;outline:none" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
      <div id="calcOut" style="font-size:20px;font-weight:600;color:var(--primary);min-height:28px">=</div>
      <button id="calcBtn" style="margin-top:10px;background:var(--primary);color:#fff;border:none;border-radius:10px;padding:11px;width:100%;font-size:15px;font-weight:600">计算</button>
    `;
    const calc = () => {
      const expr = r.querySelector('#calcExpr').value.trim();
      if (!expr) return;
      try {
        if (!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error();
        const out = Function('"use strict";return (' + expr + ')')();
        r.querySelector('#calcOut').textContent = '= ' + out;
      } catch { r.querySelector('#calcOut').textContent = '⚠ 算式有误'; }
    };
    r.querySelector('#calcBtn').addEventListener('click', calc);
    r.querySelector('#calcExpr').addEventListener('keydown', e => { if (e.key === 'Enter') calc(); });
    r.querySelector('#calcExpr').focus();
  }

  function toolUnit(r) {
    const types = [
      { k: 'length', name: '长度', units: { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.34, ft:0.3048, in:0.0254 } },
      { k: 'weight', name: '重量', units: { kg:1, g:0.001, lb:0.4536, oz:0.0283, t:1000 } },
      { k: 'temp', name: '温度', units: { '°C':'C', '°F':'F', 'K':'K' } }
    ];
    r.innerHTML = `
      <h3 style="margin-bottom:12px">单位换算</h3>
      <select id="uType" style="width:100%;border:1.5px solid var(--border);border-radius:10px;padding:11px;margin-bottom:8px;font-size:15px;background:var(--card)">
        ${types.map(t => `<option value="${t.k}">${t.name}</option>`).join('')}
      </select>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" id="uFrom" value="1" style="flex:1;border:1.5px solid var(--border);border-radius:10px;padding:11px;font-size:15px;outline:none">
        <select id="uFromUnit" style="border:1.5px solid var(--border);border-radius:10px;padding:11px;font-size:15px;background:var(--card)"></select>
      </div>
      <div style="text-align:center;font-size:20px;margin:6px 0">↓</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="uTo" readonly style="flex:1;border:1.5px solid var(--primary);border-radius:10px;padding:11px;font-size:15px;background:var(--bg);font-weight:600;color:var(--primary)">
        <select id="uToUnit" style="border:1.5px solid var(--border);border-radius:10px;padding:11px;font-size:15px;background:var(--card)"></select>
      </div>
    `;
    const typeSel = r.querySelector('#uType');
    const fromSel = r.querySelector('#uFromUnit');
    const toSel = r.querySelector('#uToUnit');
    const fromIn = r.querySelector('#uFrom');
    const toIn = r.querySelector('#uTo');

    function fillUnits() {
      const t = types.find(x => x.k === typeSel.value);
      const opts = Object.keys(t.units).map(u => `<option>${u}</option>`).join('');
      fromSel.innerHTML = opts; toSel.innerHTML = opts;
      toSel.selectedIndex = Math.min(1, Object.keys(t.units).length - 1);
      calc();
    }
    function calc() {
      const t = types.find(x => x.k === typeSel.value);
      const v = parseFloat(fromIn.value);
      if (isNaN(v)) { toIn.value = ''; return; }
      const fu = fromSel.value, tu = toSel.value;
      let result;
      if (t.k === 'temp') {
        let c;
        if (fu === '°C') c = v;
        else if (fu === '°F') c = (v - 32) * 5/9;
        else c = v - 273.15;
        if (tu === '°C') result = c;
        else if (tu === '°F') result = c * 9/5 + 32;
        else result = c + 273.15;
        result = result.toFixed(2);
      } else {
        result = (v * t.units[fu] / t.units[tu]);
        result = Math.abs(result) < 0.01 ? result.toExponential(4) : +result.toFixed(6);
      }
      toIn.value = result;
    }
    typeSel.addEventListener('change', fillUnits);
    [fromSel, toSel, fromIn].forEach(el => el.addEventListener('input', calc));
    fillUnits();
  }

  function toolQR(r) {
    r.innerHTML = `
      <h3 style="margin-bottom:12px">生成二维码</h3>
      <input type="text" id="qrInput" placeholder="输入文字或链接" style="width:100%;border:1.5px solid var(--border);border-radius:10px;padding:11px;font-size:15px;margin-bottom:10px;outline:none">
      <div id="qrOut" style="text-align:center;min-height:100px"></div>
    `;
    const gen = () => {
      const v = r.querySelector('#qrInput').value.trim();
      if (!v) { r.querySelector('#qrOut').innerHTML = ''; return; }
      r.querySelector('#qrOut').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(v)}" style="width:200px;height:200px;border-radius:8px" alt="QR">`;
    };
    r.querySelector('#qrInput').addEventListener('input', gen);
    r.querySelector('#qrInput').focus();
  }

  function toolColor(r) {
    const presets = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#64748b','#1e293b','#000000','#ffffff'];
    r.innerHTML = `
      <h3 style="margin-bottom:12px">取色器</h3>
      <input type="color" id="colorPick" value="#6366f1" style="width:100%;height:60px;border:none;border-radius:10px;cursor:pointer;margin-bottom:10px">
      <div id="colorInfo" style="font-family:monospace;font-size:14px;line-height:1.8"></div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:10px">
        ${presets.map(c => `<div data-c="${c}" style="background:${c};height:32px;border-radius:6px;cursor:pointer;border:1px solid rgba(0,0,0,.08)"></div>`).join('')}
      </div>
    `;
    const show = (hex) => {
      const rgb = hexToRgb(hex);
      r.querySelector('#colorInfo').innerHTML = `
        <div>HEX: <b>${hex.toUpperCase()}</b></div>
        <div>RGB: <b>${rgb.r}, ${rgb.g}, ${rgb.b}</b></div>
        <div>点击下方色块可复制</div>`;
    };
    r.querySelector('#colorPick').addEventListener('input', e => show(e.target.value));
    r.querySelectorAll('[data-c]').forEach(el => {
      el.addEventListener('click', () => {
        const c = el.dataset.c;
        r.querySelector('#colorPick').value = c;
        show(c);
        navigator.clipboard?.writeText(c);
        toast('已复制 ' + c);
      });
    });
    show('#6366f1');
  }

  function hexToRgb(hex) {
    hex = hex.replace('#','');
    return { r: parseInt(hex.substr(0,2),16), g: parseInt(hex.substr(2,2),16), b: parseInt(hex.substr(4,2),16) };
  }

  function toolDay(r) {
    r.innerHTML = `
      <h3 style="margin-bottom:12px">日期计算</h3>
      <div style="margin-bottom:10px">
        <label style="font-size:13px;color:var(--text-secondary)">选择日期</label>
        <input type="date" id="dayPick" style="width:100%;border:1.5px solid var(--border);border-radius:10px;padding:11px;font-size:15px;margin-top:4px;outline:none">
      </div>
      <div id="dayOut" style="background:var(--bg);border-radius:10px;padding:14px;font-size:14px;line-height:1.8"></div>
    `;
    const calc = () => {
      const v = r.querySelector('#dayPick').value;
      if (!v) return;
      const target = new Date(v + 'T00:00:00');
      const today = new Date(); today.setHours(0,0,0,0);
      const diff = Math.round((target - today) / 86400000);
      const abs = Math.abs(diff);
      r.querySelector('#dayOut').innerHTML = `
        <div>📅 目标日期：<b>${target.toLocaleDateString('zh-CN')}</b></div>
        <div>${diff > 0 ? `还有 <b style="color:var(--primary);font-size:18px">${abs}</b> 天` : diff < 0 ? `已过去 <b style="color:var(--text-secondary);font-size:18px">${abs}</b> 天` : `🎯 就是今天！`}</div>
        <div style="color:var(--text-secondary);font-size:12px;margin-top:4px">约合 ${Math.round(abs/30)} 个月 / ${Math.round(abs/7)} 周</div>`;
    };
    r.querySelector('#dayPick').addEventListener('change', calc);
    r.querySelector('#dayPick').valueAsDate = new Date(Date.now() + 7*86400000);
    calc();
  }

  function toolPwd(r) {
    r.innerHTML = `
      <h3 style="margin-bottom:12px">密码生成</h3>
      <div style="margin-bottom:10px">
        <label style="font-size:13px">长度: <span id="pwdLenV" style="color:var(--primary);font-weight:600">16</span></label>
        <input type="range" id="pwdLen" min="6" max="32" value="16" style="width:100%;margin-top:4px">
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <label style="font-size:14px"><input type="checkbox" id="pwdUpper" checked> 大写</label>
        <label style="font-size:14px"><input type="checkbox" id="pwdLower" checked> 小写</label>
        <label style="font-size:14px"><input type="checkbox" id="pwdNum" checked> 数字</label>
        <label style="font-size:14px"><input type="checkbox" id="pwdSym"> 符号</label>
      </div>
      <div id="pwdOut" style="background:var(--bg);border-radius:10px;padding:14px;font-family:monospace;font-size:18px;text-align:center;word-break:break-all;letter-spacing:1px"></div>
      <button id="pwdGen" style="margin-top:10px;background:var(--primary);color:#fff;border:none;border-radius:10px;padding:11px;width:100%;font-size:15px;font-weight:600">重新生成</button>
      <button id="pwdCopy" style="margin-top:6px;background:var(--card);color:var(--primary);border:1.5px solid var(--primary);border-radius:10px;padding:11px;width:100%;font-size:15px">复制</button>
    `;
    const gen = () => {
      const len = +r.querySelector('#pwdLen').value;
      r.querySelector('#pwdLenV').textContent = len;
      let pool = '';
      if (r.querySelector('#pwdUpper').checked) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (r.querySelector('#pwdLower').checked) pool += 'abcdefghijklmnopqrstuvwxyz';
      if (r.querySelector('#pwdNum').checked) pool += '0123456789';
      if (r.querySelector('#pwdSym').checked) pool += '!@#$%^&*()-_=+[]{}';
      if (!pool) { r.querySelector('#pwdOut').textContent = '请至少选择一项'; return; }
      let pwd = '';
      const arr = new Uint32Array(len);
      crypto.getRandomValues(arr);
      for (let i = 0; i < len; i++) pwd += pool[arr[i] % pool.length];
      r.querySelector('#pwdOut').textContent = pwd;
    };
    r.querySelector('#pwdLen').addEventListener('input', () => r.querySelector('#pwdLenV').textContent = r.querySelector('#pwdLen').value);
    ['pwdUpper','pwdLower','pwdNum','pwdSym','pwdLen'].forEach(id => r.querySelector('#'+id).addEventListener('change', gen));
    r.querySelector('#pwdGen').addEventListener('click', gen);
    r.querySelector('#pwdCopy').addEventListener('click', () => {
      const t = r.querySelector('#pwdOut').textContent;
      navigator.clipboard?.writeText(t); toast('已复制');
    });
    gen();
  }

  // ===== 我的页 =====
  function renderMe(p) {
    const todos = Store.get('todos', []);
    const notes = Store.get('notes', []);
    const settings = Store.get('settings', { name: '我', joined: fmtDate() });

    p.innerHTML = `
      <div class="profile-card">
        <div class="avatar">${(settings.name||'我')[0]}</div>
        <div class="profile-info">
          <div class="name">${esc(settings.name || '我')}</div>
          <div class="sub">使用工作台 · ${settings.joined}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card"><div class="num">${todos.length}</div><div class="label">待办</div></div>
        <div class="stat-card"><div class="num">${todos.filter(t=>t.done).length}</div><div class="label">已完成</div></div>
        <div class="stat-card"><div class="num">${notes.length}</div><div class="label">笔记</div></div>
      </div>

      <div class="menu-list">
        <div class="menu-item" data-action="setName">
          <div class="mi-icon bg-indigo"><svg viewBox="0 0 24 24"><path d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4z"/></svg></div>
          <div class="mi-text">修改昵称</div>
          <div class="mi-arrow">›</div>
        </div>
        <div class="menu-item" data-action="export">
          <div class="mi-icon bg-green"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
          <div class="mi-text">导出数据</div>
          <div class="mi-arrow">›</div>
        </div>
        <div class="menu-item" data-action="import">
          <div class="mi-icon bg-orange"><svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg></div>
          <div class="mi-text">导入数据</div>
          <div class="mi-arrow">›</div>
        </div>
        <div class="menu-item" data-action="clear">
          <div class="mi-icon bg-red"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></div>
          <div class="mi-text" style="color:var(--danger)">清空所有数据</div>
          <div class="mi-arrow">›</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:24px;color:var(--text-secondary);font-size:12px">
        我的工作台 v1.0<br>纯前端 · 数据本地存储
      </div>
    `;

    p.querySelectorAll('.menu-item').forEach(el => {
      el.addEventListener('click', () => meAction(el.dataset.action));
    });
  }

  function meAction(action) {
    if (action === 'setName') {
      const name = prompt('输入昵称', Store.get('settings',{}).name || '');
      if (name !== null && name.trim()) {
        const s = Store.get('settings', {}); s.name = name.trim(); Store.set('settings', s);
        renderPage('me'); toast('已修改');
      }
    } else if (action === 'export') {
      const data = { todos: Store.get('todos',[]), notes: Store.get('notes',[]), settings: Store.get('settings',{}), _exported: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `工作台备份_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      toast('已导出');
    } else if (action === 'import') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = () => {
        const file = input.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (data.todos) Store.set('todos', data.todos);
            if (data.notes) Store.set('notes', data.notes);
            if (data.settings) Store.set('settings', data.settings);
            toast('导入成功'); renderPage('me');
          } catch { toast('文件格式错误'); }
        };
        reader.readAsText(file);
      };
      input.click();
    } else if (action === 'clear') {
      if (confirm('确定清空所有待办、笔记和设置吗？此操作不可恢复')) {
        ['todos','notes','settings'].forEach(k => localStorage.removeItem(k));
        toast('已清空'); renderPage('me');
      }
    }
  }

  // ---------- 工具 ----------
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  // ---------- 启动 ----------
  // 首次访问初始化示例数据
  if (!Store.get('inited', false)) {
    Store.set('todos', [
      { id: 1, text: '体验一下工作台的各个功能', done: false },
      { id: 2, text: '试着添加一条笔记', done: false },
      { id: 3, text: '试试工具页的计算器', done: true }
    ]);
    Store.set('notes', [
      { id: 1, title: '欢迎使用 👋', content: '这是你的个人工作台。\n\n你可以：\n• 在「待办」里记录要做的事\n• 在「笔记」里写下想法\n• 在「工具」里使用各种小工具\n\n所有数据都保存在本地，不会上传。', date: fmtDate() }
    ]);
    Store.set('settings', { name: '我', joined: fmtDate() });
    Store.set('inited', true);
  }

  switchTab('home');

  // 支持 iOS 添加到主屏幕后全屏
  document.addEventListener('gesturestart', e => e.preventDefault());
})();
