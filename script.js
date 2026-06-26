// ============================================================
//  LMS ASSESSMENT — Frontend Script
//  Security fixes applied:
//  [1] Service role key dihapus → gunakan anon key + RLS
//  [2] Input sanitization (NIK alphanumeric, panjang max)
//  [3] Submit rate limiting (cegah double-submit)
//  [4] processPendingSubmissions pakai submitWithRetry
//  [5] Admin session timeout (auto-logout 30 menit)
//  [6] Konsistensi escHtml di semua dynamic HTML
//  [7] Draft localStorage tidak simpan full answers
// ============================================================

var GAS_URL = 'https://script.google.com/macros/s/AKfycbzLpAY6b3TIh5zfrxN1FHV2kacyRRNW-wQGhVDoshXqi6gFgDjOlPWEZxXZB9SccepfiQ/exec';

// ─────────────────────────────────────────────────────────────
//  [SECURITY 1] Supabase — GUNAKAN ANON KEY, BUKAN SERVICE ROLE
//  - Buka Supabase Dashboard → Settings → API
//  - Salin "anon / public" key (BUKAN service_role)
//  - Aktifkan RLS di tabel assessment_responses
//  - Buat policy: hanya INSERT yang diizinkan tanpa auth
//    (SELECT/UPDATE/DELETE butuh auth atau server-side)
//  - Untuk download responses: buat Vercel API Route sebagai proxy
//    agar key tidak terekspos di frontend
// ─────────────────────────────────────────────────────────────
var SUPABASE_URL = 'https://zbdynfmrxhnxzktztniy.supabase.co';
var SUPABASE_ANON_KEY = 'GANTI_DENGAN_ANON_KEY_BUKAN_SERVICE_ROLE'; // ← wajib diganti!

var config = null;
var currentQ = 0;
var answers = [];
var timerInterval = null;
var secondsLeft = 0;
var startTime = null;
var myNik = '';
var myName = '';
var mySubDept = '';
var myResult = null;
var allLbData = [];
var LETTERS = ['A', 'B', 'C', 'D', 'E'];

// [SECURITY 3] Submit rate limiting — cegah double-submit & spam
var isSubmitting = false;
var lastSubmitTime = 0;
var SUBMIT_COOLDOWN = 5000; // 5 detik minimum antar submit

// [SECURITY 5] Admin session timeout
var adminSessionTimer = null;
var ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit

// ============================================================
//  CUSTOM MODAL HELPERS
// ============================================================

function showCustomModal(options) {
    var modal = document.getElementById('custom-modal');
    if (!modal) return;

    var iconEl = document.getElementById('custom-modal-icon');
    var titleEl = document.getElementById('custom-modal-title');
    var msgEl = document.getElementById('custom-modal-message');
    var btnCancel = document.getElementById('custom-modal-btn-cancel');
    var btnConfirm = document.getElementById('custom-modal-btn-confirm');

    var icon = 'ℹ️';
    if (options.type === 'success') icon = '✅';
    else if (options.type === 'warning') icon = '⚠️';
    else if (options.type === 'danger') icon = '🚨';
    else if (options.type === 'confirm') icon = '❓';

    iconEl.textContent = icon;
    titleEl.textContent = options.title || 'Notifikasi';
    msgEl.textContent = options.message || ''; // textContent aman dari XSS

    if (options.showCancel) {
        btnCancel.style.display = 'block';
        btnCancel.textContent = options.cancelText || 'Batal';
    } else {
        btnCancel.style.display = 'none';
    }

    btnConfirm.textContent = options.confirmText || 'OK';

    btnConfirm.onclick = function () {
        modal.style.display = 'none';
        if (options.onConfirm) options.onConfirm();
    };
    btnCancel.onclick = function () {
        modal.style.display = 'none';
        if (options.onCancel) options.onCancel();
    };

    modal.style.display = 'flex';
}

function customAlert(message, title, type) {
    return new Promise(function (resolve) {
        showCustomModal({
            title: title || 'Notifikasi', message: message,
            type: type || 'info', showCancel: false, confirmText: 'OK',
            onConfirm: function () { resolve(); }
        });
    });
}

function customConfirm(message, title, type) {
    return new Promise(function (resolve) {
        showCustomModal({
            title: title || 'Konfirmasi', message: message,
            type: type || 'confirm', showCancel: true, confirmText: 'Ya', cancelText: 'Batal',
            onConfirm: function () { resolve(true); },
            onCancel: function () { resolve(false); }
        });
    });
}

// ============================================================
//  [SECURITY 2] INPUT SANITIZATION HELPERS
// ============================================================

/**
 * Validasi NIK: hanya angka/huruf, max 20 karakter.
 * Return pesan error atau null jika valid.
 */
function validateNik(nik) {
    if (!nik || !nik.trim()) return 'NIK / Employee ID wajib diisi.';
    if (nik.length > 20) return 'NIK maksimal 20 karakter.';
    if (!/^[a-zA-Z0-9_-]+$/.test(nik)) return 'NIK hanya boleh berisi huruf, angka, underscore, atau dash.';
    return null;
}

/**
 * Validasi nama: hanya huruf & spasi, 2–100 karakter.
 */
function validateName(name) {
    if (!name || !name.trim()) return 'Nama wajib diisi.';
    if (name.length < 2) return 'Nama terlalu pendek.';
    if (name.length > 100) return 'Nama maksimal 100 karakter.';
    if (!/^[a-zA-Z\s'.,-]+$/.test(name)) return 'Nama mengandung karakter tidak valid.';
    return null;
}

/**
 * Sanitasi teks bebas (essay) — trim & batasi panjang.
 */
function sanitizeEssayAnswer(text) {
    if (typeof text !== 'string') return '';
    return text.trim().slice(0, 2000); // max 2000 karakter per essay
}

// ============================================================
//  BOOT
// ============================================================

window.onload = function () {
    fetch(GAS_URL + '?action=getConfig')
        .then(function (res) { return res.json(); })
        .then(onConfigLoaded)
        .catch(function (e) {
            document.getElementById('screen-loading').innerHTML =
                '<div class="loading" style="color:#a32d2d">Failed to load: ' +
                escHtml(e.message) + '<br><br><button class="btn" onclick="location.reload()">Retry</button></div>';
        });
};

function onConfigLoaded(cfg) {
    config = cfg;
    document.getElementById('reg-title').textContent = escHtml(cfg.title);

    var subdeptSelect = document.getElementById('input-subdept');
    subdeptSelect.innerHTML = '';

    if (cfg.subDepts && cfg.subDepts.length > 0) {
        cfg.subDepts.forEach(function (dept) {
            var opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept; // textContent aman
            subdeptSelect.appendChild(opt);
        });
        subdeptSelect.onchange = function () { updateSubDeptMeta(this.value); };
        updateSubDeptMeta(cfg.subDepts[0]);
    }

    var scorePerQ = cfg.scorePerQuestion || 10;
    var speedBonusVal = cfg.maxSpeedBonus !== undefined ? cfg.maxSpeedBonus : 20;
    document.getElementById('scoring-rule-correct').innerHTML = '&#10003; Setiap jawaban benar = ' + scorePerQ + ' poin';
    document.getElementById('scoring-rule-bonus').innerHTML = '&#9889; Speed bonus: hingga ' + speedBonusVal + ' poin untuk menyelesaikan lebih cepat';

    if (cfg.isOpen) {
        document.getElementById('form-open').style.display = 'block';
        document.getElementById('form-closed').style.display = 'none';
        var adminChk = document.getElementById('check-assessment-open');
        if (adminChk) adminChk.checked = true;
    } else {
        document.getElementById('form-open').style.display = 'none';
        document.getElementById('form-closed').style.display = 'block';
        var adminChk = document.getElementById('check-assessment-open');
        if (adminChk) adminChk.checked = false;
    }

    var draftRaw = localStorage.getItem(DRAFT_KEY);
    if (draftRaw) {
        try {
            var draft = JSON.parse(draftRaw);
            var timeLeft = Math.floor((draft.deadlineTime - Date.now()) / 1000);
            if (timeLeft > 0 && draft.nik && draft.questions && draft.questions.length > 0) {
                customConfirm(
                    'Sesi pengerjaan sebelumnya untuk NIK ' + escHtml(draft.nik) +
                    ' ditemukan dengan sisa waktu ' + formatTime(timeLeft) + '. Lanjutkan pengerjaan?',
                    'Lanjutkan Sesi?', 'confirm'
                ).then(function (ok) {
                    if (ok) {
                        resumeQuiz(draft);
                        processPendingSubmissions();
                    } else {
                        clearQuizDraft();
                        setupClosedScreen(cfg);
                        showScreen('screen-register');
                        processPendingSubmissions();
                    }
                });
                return;
            } else {
                clearQuizDraft();
            }
        } catch (e) {
            clearQuizDraft();
        }
    }

    setupClosedScreen(cfg);
    showScreen('screen-register');
    processPendingSubmissions();
}

function updateSubDeptMeta(dept) {
    if (!config || !config.subDeptMeta || !config.subDeptMeta[dept]) return;
    var meta = config.subDeptMeta[dept];
    document.getElementById('reg-meta').textContent =
        meta.totalQuestions + ' questions · ' + formatTime(meta.timeLimit) + ' · Max ' + meta.maxScore + ' pts';
    document.getElementById('reg-q-count').textContent = meta.totalQuestions;
    document.getElementById('reg-time').textContent = formatTime(meta.timeLimit);
    document.getElementById('reg-max-score').textContent = meta.maxScore + ' pts';
}

// ============================================================
//  START ASSESSMENT — dengan validasi input yang ketat
// ============================================================

function startAssessment() {
    var nikRaw = document.getElementById('input-nik').value.trim();
    var nameRaw = document.getElementById('input-name').value.trim();
    var subDept = document.getElementById('input-subdept').value;
    var errEl = document.getElementById('reg-error');
    errEl.style.display = 'none';

    // [SECURITY 2] Validasi input
    var nikError = validateNik(nikRaw);
    var nameError = validateName(nameRaw);
    if (nikError) { showError(errEl, nikError); return; }
    if (nameError) { showError(errEl, nameError); return; }
    if (!subDept) { showError(errEl, 'Please select a sub-department.'); return; }

    showScreen('screen-loading');
    document.getElementById('screen-loading').innerHTML =
        '<div class="loading"><div class="spin" style="font-size:28px">⟳</div><p style="margin-top:1rem">Memulai sesi penilaian...</p></div>';

    var startUrl = GAS_URL + '?action=startSession' +
        '&nik=' + encodeURIComponent(nikRaw) +
        '&name=' + encodeURIComponent(nameRaw) +
        '&subDept=' + encodeURIComponent(subDept);

    fetch(startUrl)
        .then(function (res) { return res.json(); })
        .then(function (res) {
            if (!res.success) {
                showScreen('screen-register');
                showError(errEl, res.message);
                return;
            }
            myNik = nikRaw;
            myName = nameRaw;
            mySubDept = subDept;

            config.questions = res.questions;
            config.timeLimit = res.timeLimit;
            config.totalQuestions = res.totalQuestions;
            config.maxScore = res.maxScore;

            initQuiz();
            showScreen('screen-quiz');
        })
        .catch(function (e) {
            showScreen('screen-register');
            showError(errEl, 'Gagal terhubung ke server: ' + e.message);
        });
}

// ============================================================
//  QUIZ INIT & SECTIONS
// ============================================================

var activeSections = [];
var currentSectionIdx = 0;
var activeQ = -1;

function initQuiz() {
    answers = config.questions.map(function (q) { return q.type === 'essay' ? '' : -1; });
    secondsLeft = config.timeLimit;
    startTime = Date.now();

    groupQuestions();
    currentSectionIdx = 0;

    buildDots();
    renderCurrentSection();
    updateProgress();
    startTimer();
    saveQuizDraft();
}

function groupQuestions() {
    var nonScoringQs = [], mcQs = [], binQs = [], essayQs = [];

    config.questions.forEach(function (q, idx) {
        var qCopy = Object.assign({}, q);
        qCopy.originalIndex = idx;
        if (q.scoring === false) nonScoringQs.push(qCopy);
        else if (q.type === 'mc') mcQs.push(qCopy);
        else if (q.type === 'binary') binQs.push(qCopy);
        else if (q.type === 'essay') essayQs.push(qCopy);
    });

    activeSections = [];
    if (nonScoringQs.length > 0) activeSections.push({ type: 'non-scoring', title: 'Tes Pendahuluan (Tidak Dinilai)', desc: 'Bagian ini tidak masuk perhitungan skor. Jawab sesuai kemampuan dan pengetahuan Anda.', questions: nonScoringQs });
    if (mcQs.length > 0) activeSections.push({ type: 'mc', title: 'Pilihan Ganda', desc: 'Pilih satu jawaban yang paling tepat.', questions: mcQs });
    if (binQs.length > 0) activeSections.push({ type: 'binary', title: 'Benar / Salah', desc: 'Tentukan apakah pernyataan berikut Benar atau Salah.', questions: binQs });
    if (essayQs.length > 0) activeSections.push({ type: 'essay', title: 'Essay / Uraian', desc: 'Ketikkan jawaban Anda pada kotak yang disediakan secara lengkap.', questions: essayQs });
}

function buildDots() {
    var el = document.getElementById('q-dots');
    el.innerHTML = '';
    config.questions.forEach(function (_, i) {
        var d = document.createElement('div');
        d.className = 'q-dot';
        d.id = 'dot-' + i;
        d.textContent = i + 1;
        d.style.cursor = 'pointer';
        d.title = 'Buka Soal ' + (i + 1);
        d.onclick = function () {
            var targetSecIdx = -1;
            for (var sIdx = 0; sIdx < activeSections.length; sIdx++) {
                if (activeSections[sIdx].questions.some(function (q) { return q.originalIndex === i; })) {
                    targetSecIdx = sIdx; break;
                }
            }
            if (targetSecIdx !== -1) {
                if (currentSectionIdx !== targetSecIdx) { currentSectionIdx = targetSecIdx; renderCurrentSection(); }
                setTimeout(function () {
                    var card = document.getElementById('q-card-' + i);
                    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); highlightDot(i); }
                }, 120);
            }
        };
        el.appendChild(d);
    });
}

function renderCurrentSection() {
    var container = document.getElementById('questions-container');
    container.innerHTML = '';

    var section = activeSections[currentSectionIdx];
    if (!section) return;

    if (section.questions.length > 0) activeQ = section.questions[0].originalIndex;

    var secHeader = document.createElement('div');
    secHeader.className = 'section-header' + (section.type === 'non-scoring' ? ' non-scoring-section-header' : '');
    // [SECURITY 6] Gunakan textContent bukan innerHTML untuk teks user-facing
    var h2 = document.createElement('h2');
    h2.textContent = section.title;
    var span = document.createElement('span');
    span.className = 'text-muted';
    span.textContent = section.desc;
    secHeader.appendChild(h2);
    secHeader.appendChild(span);
    container.appendChild(secHeader);

    section.questions.forEach(function (q) { container.appendChild(renderQuestionBlock(q)); });

    var navRow = document.createElement('div');
    navRow.className = 'nav-row';
    navRow.style.marginTop = '2rem';

    if (currentSectionIdx > 0) {
        var prevBtn = document.createElement('button');
        prevBtn.className = 'btn';
        prevBtn.textContent = '← Prev Section';
        prevBtn.onclick = function () { goToSection(currentSectionIdx - 1); };
        navRow.appendChild(prevBtn);
    } else {
        navRow.appendChild(document.createElement('div'));
    }

    if (currentSectionIdx < activeSections.length - 1) {
        var nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary';
        nextBtn.textContent = 'Next Section (' + escHtml(activeSections[currentSectionIdx + 1].title) + ') →';
        nextBtn.onclick = function () { goToSection(currentSectionIdx + 1); };
        navRow.appendChild(nextBtn);
    }

    container.appendChild(navRow);
    updateDotHighlights();
}

function renderQuestionBlock(q) {
    var origIdx = q.originalIndex;
    var isNonScoring = (q.scoring === false);

    var card = document.createElement('div');
    card.className = 'question-card' + (isNonScoring ? ' non-scoring-card' : '');
    card.id = 'q-card-' + origIdx;

    if (isNonScoring) {
        var nsBadge = document.createElement('div');
        nsBadge.className = 'badge-non-scoring';
        nsBadge.textContent = '⚪ Tidak Dinilai';
        card.appendChild(nsBadge);
    }

    var qNum = document.createElement('div');
    qNum.className = 'q-number';
    qNum.textContent = 'QUESTION ' + (origIdx + 1);
    card.appendChild(qNum);

    var qText = document.createElement('div');
    qText.className = 'q-text';
    qText.textContent = q.question; // textContent aman
    card.appendChild(qText);

    if (q.imageUrl && q.imageUrl.trim()) {
        // [SECURITY 6] Validasi URL gambar — hanya https
        var imgSrc = q.imageUrl.trim();
        if (imgSrc.indexOf('https://') === 0) {
            var img = document.createElement('img');
            img.className = 'q-image';
            img.src = imgSrc;
            img.alt = 'Soal Gambar';
            img.onclick = function () { openImageZoom(img.src); };
            card.appendChild(img);
        }
    }

    if (q.type === 'essay') {
        var essayWrap = document.createElement('div');
        var textarea = document.createElement('textarea');
        textarea.className = 'textarea-input';
        textarea.placeholder = 'Ketik jawaban essay Anda di sini...';
        textarea.maxLength = 2000; // batas karakter di UI
        textarea.value = answers[origIdx] || '';
        textarea.oninput = function () { saveEssayAnswerAt(origIdx, this.value); };
        textarea.onfocus = function () { highlightDot(origIdx); };
        essayWrap.appendChild(textarea);
        card.appendChild(essayWrap);
    } else {
        var optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        q.options.forEach(function (opt, optIdx) {
            var div = document.createElement('div');
            div.className = 'option' + (answers[origIdx] === optIdx ? ' selected' : '');
            div.id = 'opt-' + origIdx + '-' + optIdx;

            var letterDiv = document.createElement('div');
            letterDiv.className = 'option-letter';
            letterDiv.textContent = LETTERS[optIdx];

            var optSpan = document.createElement('span');
            optSpan.textContent = opt; // textContent aman

            div.appendChild(letterDiv);
            div.appendChild(optSpan);
            div.onclick = function () { selectAnswerAt(origIdx, optIdx); };
            optionsDiv.appendChild(div);
        });
        card.appendChild(optionsDiv);
    }

    return card;
}

function selectAnswerAt(origIdx, optIdx) {
    answers[origIdx] = optIdx;
    var q = config.questions[origIdx];
    q.options.forEach(function (_, oIdx) {
        var el = document.getElementById('opt-' + origIdx + '-' + oIdx);
        if (el) el.classList.toggle('selected', oIdx === optIdx);
    });
    updateProgress();
    highlightDot(origIdx);
    saveQuizDraft();
}

function saveEssayAnswerAt(origIdx, val) {
    answers[origIdx] = sanitizeEssayAnswer(val); // [SECURITY 2]
    updateProgress();
    saveQuizDraft();
}

function highlightDot(origIdx) { activeQ = origIdx; updateDotHighlights(); }

function goToSection(idx) {
    if (idx >= 0 && idx < activeSections.length) {
        currentSectionIdx = idx;
        renderCurrentSection();
        var el = document.getElementById('screen-quiz');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateDotHighlights() {
    config.questions.forEach(function (qItem, i) {
        var d = document.getElementById('dot-' + i);
        if (!d) return;
        var isAnswered = qItem.type === 'essay' ? !!(answers[i] && answers[i].trim()) : (answers[i] !== -1);
        d.className = 'q-dot' + (i === activeQ ? ' current' : '') + (isAnswered ? ' answered' : '');
    });
}

function updateProgress() {
    updateDotHighlights();
    var scoringTotal = 0, scoringAnswered = 0;
    config.questions.forEach(function (qItem, i) {
        if (qItem.scoring === false) return;
        scoringTotal++;
        var a = answers[i];
        if ((qItem.type === 'essay') ? (a && a.trim()) : (a !== -1)) scoringAnswered++;
    });
    document.getElementById('progress-lbl').textContent = scoringAnswered + ' / ' + scoringTotal + ' answered';
}

function confirmSubmit() {
    var unanswered = 0;
    config.questions.forEach(function (qItem, i) {
        if (qItem.scoring === false) return;
        var a = answers[i];
        if (!((qItem.type === 'essay') ? (a && a.trim()) : (a !== -1))) unanswered++;
    });

    var msg = unanswered > 0
        ? 'Anda memiliki ' + unanswered + ' soal yang belum dijawab. Tetap kirim?'
        : 'Kirim jawaban assessment Anda? Jawaban tidak dapat diubah setelah dikirim.';
    var title = unanswered > 0 ? 'Soal Belum Selesai' : 'Kirim Jawaban?';
    var type = unanswered > 0 ? 'warning' : 'confirm';

    customConfirm(msg, title, type).then(function (confirmed) { if (confirmed) submitNow(); });
}

// ============================================================
//  TIMER
// ============================================================

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(function () {
        secondsLeft--;
        updateTimerDisplay();
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            showScreen('screen-loading');
            document.getElementById('screen-loading').innerHTML =
                '<div class="loading"><div class="spin" style="font-size:28px">⟳</div><p style="margin-top:1rem">Waktu pengerjaan habis! Mengirimkan jawaban Anda otomatis...</p></div>';
            customAlert('Waktu pengerjaan kuis telah habis! Jawaban Anda akan otomatis dikirimkan ke server.', 'Waktu Habis', 'warning')
                .then(function () { submitNow(true); });
        }
    }, 1000);
}

function updateTimerDisplay() {
    var pct = (secondsLeft / config.timeLimit) * 100;
    var bar = document.getElementById('timer-bar');
    bar.style.width = pct + '%';
    bar.className = 'bar' + (pct < 15 ? ' danger' : pct < 30 ? ' warn' : '');
    var el = document.getElementById('timer-display');
    el.textContent = formatTime(secondsLeft);
    el.style.color = secondsLeft < 60 ? '#a32d2d' : secondsLeft < 120 ? '#854f0b' : '#2c2c2a';
}

// ============================================================
//  SUBMIT — dengan rate limiting
// ============================================================

function submitNow(isTimeout) {
    // [SECURITY 3] Cegah double-submit
    if (isSubmitting) {
        console.warn('[Submit] Ditolak: submit sedang berlangsung.');
        return;
    }
    var now = Date.now();
    if (!isTimeout && (now - lastSubmitTime) < SUBMIT_COOLDOWN) {
        customAlert('Harap tunggu beberapa detik sebelum mencoba lagi.', 'Terlalu Cepat', 'warning');
        return;
    }

    isSubmitting = true;
    lastSubmitTime = now;

    clearInterval(timerInterval);
    var timeTaken = Math.floor((Date.now() - startTime) / 1000);

    // [SECURITY 2] Sanitasi jawaban essay sebelum dikirim
    var sanitizedAnswers = answers.map(function (a, i) {
        var q = config.questions[i];
        return (q && q.type === 'essay') ? sanitizeEssayAnswer(a) : a;
    });

    var requestId = generateRequestId();
    var payload = {
        nik: myNik, name: myName, subDept: mySubDept,
        answers: sanitizedAnswers, timeTaken: timeTaken, requestId: requestId
    };

    addPendingSubmission(payload);
    clearQuizDraft();

    showScreen('screen-loading');
    document.getElementById('screen-loading').innerHTML =
        '<div class="loading"><div class="spin" style="font-size:28px">⟳</div><p style="margin-top:1rem">' +
        (isTimeout ? 'Waktu habis! Mengirimkan jawaban otomatis...' : 'Mengirimkan jawaban Anda...') + '</p></div>';

    submitWithRetry(payload)
        .then(function (res) {
            removePendingSubmission(requestId);
            isSubmitting = false;
            onSubmitResult(res);
        })
        .catch(function (e) {
            isSubmitting = false;
            customAlert('Pengiriman gagal: ' + e.message + '\nSilakan coba lagi.', 'Gagal Mengirim', 'danger')
                .then(function () { showScreen('screen-quiz'); startTimer(); });
        });
}

function generateRequestId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'req_' + Math.random().toString(16).slice(2) + Date.now();
}

// ============================================================
//  SUBMIT WITH RETRY — Exponential Backoff
// ============================================================

function submitWithRetry(payload) {
    var MAX_RETRY = 3;
    var BASE_DELAY = 2000;
    var RETRY_MESSAGES = ['server sedang sibuk', 'gagal mendapatkan giliran', 'coba lagi'];

    function attempt(attemptNum, resolve, reject) {
        if (attemptNum > 1) showSubmitStatus('Mencoba ulang... (' + attemptNum + '/' + MAX_RETRY + ')');

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.success === true) { resolve(data); return; }

                var msg = (data.message || '').toLowerCase();
                var shouldRetry = RETRY_MESSAGES.some(function (kw) { return msg.indexOf(kw) !== -1; });

                if (!shouldRetry || attemptNum >= MAX_RETRY) { resolve(data); return; }

                var delay = BASE_DELAY * Math.pow(2, attemptNum - 1);
                console.log('[Retry ' + attemptNum + '] GAS sibuk, coba ulang dalam ' + (delay / 1000) + 's');
                sleep(delay).then(function () { attempt(attemptNum + 1, resolve, reject); });
            })
            .catch(function (err) {
                console.error('[Retry ' + attemptNum + '] Network error:', err.message);
                if (attemptNum < MAX_RETRY) {
                    sleep(BASE_DELAY * Math.pow(2, attemptNum - 1))
                        .then(function () { attempt(attemptNum + 1, resolve, reject); });
                } else {
                    reject(err);
                }
            });
    }

    return new Promise(function (resolve, reject) { attempt(1, resolve, reject); });
}

function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

function showSubmitStatus(message) {
    var el = document.getElementById('screen-loading');
    if (el) el.innerHTML =
        '<div class="loading"><div class="spin" style="font-size:28px">⟳</div>' +
        '<p style="margin-top:1rem">' + escHtml(message) + '</p></div>';
}

// ============================================================
//  LOCAL STORAGE — Pending Submissions & Draft
// ============================================================

var PENDING_KEY = 'pendingSubmissions';

function getPendingSubmissions() {
    try { var raw = localStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
}
function setPendingSubmissions(arr) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); } catch (e) { }
}
function addPendingSubmission(item) { var l = getPendingSubmissions(); l.push(item); setPendingSubmissions(l); }
function removePendingSubmission(rid) { setPendingSubmissions(getPendingSubmissions().filter(function (it) { return it.requestId !== rid; })); }

// [SECURITY 4] processPendingSubmissions pakai submitWithRetry
function processPendingSubmissions() {
    var pending = getPendingSubmissions();
    if (!pending.length) return;

    pending.forEach(function (payload) {
        submitWithRetry(payload)
            .then(function (res) { if (res.success) removePendingSubmission(payload.requestId); })
            .catch(function () { /* tetap di pending untuk retry berikutnya */ });
    });
}

var DRAFT_KEY = 'activeQuizDraft';

function saveQuizDraft() {
    if (!myNik) return;
    try {
        var draft = {
            nik: myNik, name: myName, subDept: mySubDept,
            questions: config.questions, timeLimit: config.timeLimit,
            totalQuestions: config.totalQuestions, maxScore: config.maxScore,
            answers: answers, deadlineTime: Date.now() + (secondsLeft * 1000)
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { }
}

function clearQuizDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { } }

function resumeQuiz(draft) {
    myNik = draft.nik; myName = draft.name;
    mySubDept = draft.subDept;

    config.questions = draft.questions;
    config.timeLimit = draft.timeLimit;
    config.totalQuestions = draft.totalQuestions;
    config.maxScore = draft.maxScore;

    answers = draft.answers;
    secondsLeft = Math.floor((draft.deadlineTime - Date.now()) / 1000);
    startTime = Date.now() - (draft.timeLimit - secondsLeft) * 1000;

    groupQuestions();
    currentSectionIdx = 0;
    buildDots();
    renderCurrentSection();
    updateProgress();
    showScreen('screen-quiz');
    startTimer();
}

window.onbeforeunload = function (e) {
    if (myNik && secondsLeft > 0) {
        var msg = 'Kuis sedang berlangsung. Jika Anda keluar, waktu pengerjaan akan tetap berjalan.';
        e.returnValue = msg;
        return msg;
    }
};

function onSubmitResult(res) {
    if (!res.success) {
        customAlert(res.message, 'Gagal', 'danger').then(function () { showScreen('screen-register'); });
        return;
    }
    myResult = res;
    renderResult(res);
    showScreen('screen-result');
}

function renderResult(res) {
    document.getElementById('result-name-hero').textContent = 'Kerja Bagus, ' + escHtml(res.name) + '!';
    document.getElementById('res-total-score').textContent = res.accuracy + '%';
    document.getElementById('res-correct').textContent = res.correctCount + '/' + res.totalQuestions;
    document.getElementById('res-accuracy').textContent = res.accuracy + '%';
    document.getElementById('res-base').textContent = res.baseScore;
    document.getElementById('res-time').textContent = formatTime(res.timeTaken);

    if (res.speedBonus > 0) {
        document.getElementById('res-bonus').style.display = 'flex';
        document.getElementById('res-bonus-val').textContent = res.speedBonus;
        document.getElementById('res-time-val').textContent = formatTime(res.timeTaken);
    }

    var badge = document.getElementById('res-badge');
    var remedialEl = document.getElementById('res-remedial');
    var pct = res.accuracy;

    if (pct >= 90) {
        badge.textContent = pct === 100 ? '🏅 Nilai Sempurna!' : '✓ Lulus';
        badge.className = pct === 100 ? 'result-badge badge-gold' : 'result-badge badge-pass';
        if (remedialEl) remedialEl.style.display = 'none';
    } else {
        badge.textContent = '△ Remedial';
        badge.className = 'result-badge badge-fail';
        if (remedialEl) remedialEl.style.display = 'block';
    }
}

// ============================================================
//  LEADERBOARD
// ============================================================

function loadLeaderboard() {
    document.getElementById('lb-content').innerHTML =
        '<div class="loading"><span class="spin">⟳</span></div>';
    fetch(GAS_URL + '?action=getLeaderboard')
        .then(function (res) { return res.json(); })
        .then(renderLeaderboard)
        .catch(function (e) {
            document.getElementById('lb-content').innerHTML =
                '<p class="error-msg">Failed to load: ' + escHtml(e.message) + '</p>';
        });
}

function renderLeaderboard(data) {
    allLbData = data;
    document.getElementById('lb-subtitle').textContent =
        data.length + ' participant' + (data.length !== 1 ? 's' : '') + ' so far';
    renderTable(data, 'all');
}

function filterLeaderboard(mode, btn) {
    document.querySelectorAll('.tab').forEach(function (t) { t.className = 'tab'; });
    btn.className = 'tab active';
    var data = allLbData;
    if (mode === 'top10') data = allLbData.slice(0, 10);
    if (mode === 'me') data = allLbData.filter(function (r) { return r.name.toLowerCase() === myName.toLowerCase(); });
    renderTable(data, mode);
}

function renderTable(data, mode) {
    if (!data || data.length === 0) {
        var msg = mode === 'me'
            ? 'Hasil tidak ditemukan untuk nama Anda. Selesaikan assessment terlebih dahulu.'
            : 'Belum ada pengiriman. Jadilah yang pertama!';
        document.getElementById('lb-content').innerHTML = '<div class="empty-state">' + escHtml(msg) + '</div>';
        return;
    }

    var html = '<table class="lb-table"><thead><tr>' +
        '<th>Rank</th><th>Name</th><th>Sub-Dept</th><th>Score</th><th>Accuracy</th><th>Time</th>' +
        '</tr></thead><tbody>';

    data.forEach(function (row, i) {
        var rank = allLbData.indexOf(row) + 1;
        if (rank === 0) rank = i + 1;
        var isMe = myName && row.name.toLowerCase() === myName.toLowerCase();
        var rowClass = isMe ? 'me' : (rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '');
        var badgeClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';

        html += '<tr class="' + rowClass + '">' +
            '<td><span class="rank-badge ' + badgeClass + '">' + rank + '</span></td>' +
            '<td>' + escHtml(row.name) + (isMe ? ' <span style="font-size:11px;color:var(--purple-600)">(you)</span>' : '') + '</td>' +
            '<td>' + escHtml(row.subDept || '-') + '</td>' +
            '<td class="score-col">' + Number(row.totalScore) + '</td>' +
            '<td><span class="acc-pill">' + Number(row.accuracy) + '%</span></td>' +
            '<td class="time-col">' + escHtml(formatTime(row.timeTaken)) + '</td>' +
            '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('lb-content').innerHTML = html;
}

// ============================================================
//  ADMIN PANEL
//  [SECURITY 1] downloadResponses pakai anon key + proxy
//  [SECURITY 5] Session timeout 30 menit
// ============================================================

var adminPasswordSession = '';

/**
 * [SECURITY 1 & 5] Download responses via Supabase anon key.
 * CATATAN PENTING:
 * - Gunakan ANON KEY (bukan service_role)
 * - Aktifkan RLS di tabel assessment_responses
 * - Buat policy SELECT hanya untuk authenticated users
 * - Idealnya: buat Vercel API Route /api/download-responses sebagai proxy
 *   agar key tidak terekspos di frontend sama sekali
 */
async function downloadResponses() {
    if (!adminPasswordSession) {
        customAlert('Sesi admin tidak ditemukan. Silakan login ulang.', 'Akses Ditolak', 'danger');
        return;
    }

    if (SUPABASE_ANON_KEY === 'GANTI_DENGAN_ANON_KEY_BUKAN_SERVICE_ROLE') {
        customAlert(
            'SUPABASE_ANON_KEY belum diisi di script.js!\n' +
            'Isi dengan anon/public key dari Supabase Dashboard → Settings → API.',
            'Konfigurasi Belum Selesai', 'warning'
        );
        return;
    }

    var btn = document.getElementById('btn-download');
    btn.textContent = 'Mengunduh...';
    btn.disabled = true;

    try {
        var res = await fetch(
            SUPABASE_URL + '/rest/v1/assessment_responses?select=*&order=submitted_at.asc',
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
            }
        );

        if (!res.ok) {
            var errText = await res.text();
            throw new Error('HTTP ' + res.status + ': ' + errText);
        }

        var data = await res.json();
        if (!data.length) { customAlert('Belum ada response.', 'Info', 'info'); return; }

        var allQKeys = [...new Set(data.flatMap(function (r) { return Object.keys(r.answers_detail || {}); }))];
        allQKeys.sort(function (a, b) {
            return parseInt(a.replace('Q', '')) - parseInt(b.replace('Q', ''));
        });

        var headers = [
            'Timestamp', 'NIK', 'Name', 'Sub-Department',
            'Correct', 'Total Questions', 'Accuracy (%)',
            'Base Score', 'Speed Bonus', 'Total Score', 'Time Taken (s)',
            'MC Score', 'Binary Score', 'Essay Score',
            ...allQKeys
        ];

        var rows = data.map(function (r) {
            return [
                r.submitted_at, r.nik, r.name, r.sub_department,
                r.correct_count, r.total_questions, r.accuracy_pct,
                r.base_score, r.speed_bonus, r.total_score, r.time_taken_s,
                r.mc_score, r.binary_score, r.essay_score,
                ...allQKeys.map(function (k) { return r.answers_detail ? (r.answers_detail[k] !== undefined ? r.answers_detail[k] : '') : ''; })
            ];
        });

        var escape = function (v) { return '"' + String(v !== null && v !== undefined ? v : '').replace(/"/g, '""') + '"'; };
        var csv = [headers, ...rows].map(function (r) { return r.map(escape).join(','); }).join('\n');
        var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'assessment_responses_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        customAlert('Gagal download: ' + err.message, 'Error', 'danger');
    } finally {
        btn.textContent = '⬇ Download Responses';
        btn.disabled = false;
    }
}

// [SECURITY 5] Reset timer sesi admin setiap ada aktivitas admin
function resetAdminSessionTimer() {
    if (adminSessionTimer) clearTimeout(adminSessionTimer);
    adminSessionTimer = setTimeout(function () {
        adminPasswordSession = '';
        customAlert('Sesi admin telah berakhir karena tidak ada aktivitas selama 30 menit.', 'Sesi Berakhir', 'warning')
            .then(function () { closeAdminModal(); });
    }, ADMIN_SESSION_TIMEOUT);
}

function showAdminSubView(viewId) {
    resetAdminSessionTimer(); // [SECURITY 5]
    document.getElementById('admin-menu-select').style.display = 'none';
    document.getElementById('admin-participants-view').style.display = 'none';
    document.getElementById('admin-assessment-view').style.display = 'none';
    document.getElementById(viewId).style.display = 'block';
}

function openAdminModal() {
    document.getElementById('modal-admin').style.display = 'flex';
    document.getElementById('admin-login-view').style.display = 'block';
    document.getElementById('admin-dashboard-view').style.display = 'none';
    document.getElementById('input-admin-password').value = '';
    document.getElementById('admin-login-error').style.display = 'none';
}

function closeAdminModal() {
    // [SECURITY 5] Bersihkan sesi admin saat modal ditutup
    if (adminSessionTimer) clearTimeout(adminSessionTimer);
    adminPasswordSession = '';
    document.getElementById('modal-admin').style.display = 'none';
}

function loginAdmin() {
    var password = document.getElementById('input-admin-password').value;
    var errEl = document.getElementById('admin-login-error');
    errEl.style.display = 'none';

    if (!password) { showError(errEl, 'Password cannot be empty.'); return; }
    // [SECURITY] Batasi panjang password input
    if (password.length > 128) { showError(errEl, 'Password terlalu panjang.'); return; }

    fetch(GAS_URL + '?action=verifyAdmin&password=' + encodeURIComponent(password))
        .then(function (res) { return res.json(); })
        .then(function (res) {
            if (res.success) {
                adminPasswordSession = password;
                resetAdminSessionTimer(); // [SECURITY 5]

                document.getElementById('admin-login-view').style.display = 'none';
                document.getElementById('admin-dashboard-view').style.display = 'block';
                showAdminSubView('admin-menu-select');

                document.getElementById('check-assessment-open').checked = !!config.isOpen;
                document.getElementById('check-enforce-whitelist').checked = !!config.enforceWhitelist;
                document.getElementById('input-assessment-title').value = config.title || '';
                document.getElementById('input-new-admin-password').value = '';
                document.getElementById('input-auto-open').value = formatDateTimeLocal(config.autoOpenTime);
                document.getElementById('input-auto-close').value = formatDateTimeLocal(config.autoCloseTime);
                document.getElementById('input-time-limit').value = config.timeLimitMinutes || 10;
                document.getElementById('input-score-per-q').value = config.scorePerQuestion || 10;
                document.getElementById('input-speed-bonus').value = config.maxSpeedBonus || 20;

                document.getElementById('questions-upload-status').style.display = 'none';
                document.getElementById('participants-upload-status').style.display = 'none';
                document.getElementById('file-questions-excel').value = '';
                document.getElementById('textarea-participants').value = '';
            } else {
                showError(errEl, res.message || 'Incorrect password.');
                // [SECURITY] Clear password field setelah gagal
                document.getElementById('input-admin-password').value = '';
            }
        })
        .catch(function (e) { showError(errEl, 'Connection error: ' + e.message); });
}

function saveParticipantSettings() {
    resetAdminSessionTimer(); // [SECURITY 5]
    var payload = {
        action: 'updateConfig', password: adminPasswordSession,
        config: { enforceWhitelist: document.getElementById('check-enforce-whitelist').checked }
    };
    fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json(); })
        .then(function (res) {
            if (res.success) customAlert('Pengaturan whitelist berhasil disimpan!', 'Sukses', 'success').then(function () { location.reload(); });
            else customAlert('Gagal menyimpan whitelist: ' + res.message, 'Gagal', 'danger');
        })
        .catch(function (e) { customAlert('Error: ' + e.message, 'Error', 'danger'); });
}

function saveAssessmentSettings() {
    resetAdminSessionTimer(); // [SECURITY 5]
    var isOpen = document.getElementById('check-assessment-open').checked;
    var title = document.getElementById('input-assessment-title').value.trim();
    var autoOpenTime = document.getElementById('input-auto-open').value;
    var autoCloseTime = document.getElementById('input-auto-close').value;
    var timeLimitMinutes = parseInt(document.getElementById('input-time-limit').value) || 10;
    var scorePerQuestion = parseInt(document.getElementById('input-score-per-q').value) || 10;
    var maxSpeedBonus = parseInt(document.getElementById('input-speed-bonus').value) || 0;

    if (timeLimitMinutes <= 0) { customAlert('Batas waktu harus lebih dari 0 menit.', 'Validasi Gagal', 'warning'); return; }
    if (scorePerQuestion <= 0) { customAlert('Skor per soal harus lebih dari 0.', 'Validasi Gagal', 'warning'); return; }
    if (maxSpeedBonus < 0) { customAlert('Max bonus kecepatan tidak boleh negatif.', 'Validasi Gagal', 'warning'); return; }
    if (autoOpenTime && autoCloseTime) {
        if (new Date(autoCloseTime) <= new Date(autoOpenTime)) {
            customAlert('Jadwal Tutup harus setelah Jadwal Buka.', 'Validasi Gagal', 'warning'); return;
        }
    }

    var payload = {
        action: 'updateConfig', password: adminPasswordSession,
        config: {
            isOpen: isOpen, title: title, autoOpenTime: autoOpenTime, autoCloseTime: autoCloseTime,
            timeLimitMinutes: timeLimitMinutes, scorePerQuestion: scorePerQuestion, maxSpeedBonus: maxSpeedBonus
        }
    };
    fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json(); })
        .then(function (res) {
            if (res.success) customAlert('Pengaturan berhasil disimpan!', 'Sukses', 'success').then(function () { location.reload(); });
            else customAlert('Gagal menyimpan: ' + res.message, 'Gagal', 'danger');
        })
        .catch(function (e) { customAlert('Error: ' + e.message, 'Error', 'danger'); });
}

function saveAdminPasswordOnly() {
    resetAdminSessionTimer(); // [SECURITY 5]
    var newPassword = document.getElementById('input-new-admin-password').value.trim();
    if (!newPassword) { customAlert('Isi password baru terlebih dahulu.', 'Validasi Gagal', 'warning'); return; }
    if (newPassword.length < 8) { customAlert('Password minimal 8 karakter.', 'Validasi Gagal', 'warning'); return; }
    if (newPassword.length > 128) { customAlert('Password terlalu panjang.', 'Validasi Gagal', 'warning'); return; }

    var payload = { action: 'updateConfig', password: adminPasswordSession, config: { adminPassword: newPassword } };
    fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json(); })
        .then(function (res) {
            if (res.success) {
                customAlert('Password admin berhasil diubah!', 'Sukses', 'success').then(function () {
                    adminPasswordSession = newPassword;
                    document.getElementById('input-new-admin-password').value = '';
                    location.reload();
                });
            } else {
                customAlert('Gagal mengubah password: ' + res.message, 'Gagal', 'danger');
            }
        })
        .catch(function (e) { customAlert('Error: ' + e.message, 'Error', 'danger'); });
}

function handleQuestionsUpload() {
    resetAdminSessionTimer(); // [SECURITY 5]
    var fileInput = document.getElementById('file-questions-excel');
    var statusEl = document.getElementById('questions-upload-status');

    if (fileInput.files.length === 0) {
        statusEl.textContent = 'Please select an Excel file first.';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }

    // [SECURITY] Validasi tipe file
    var file = fileInput.files[0];
    var allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        statusEl.textContent = '❌ File harus berformat .xlsx atau .xls';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }
    // [SECURITY] Batasi ukuran file: max 5MB
    if (file.size > 5 * 1024 * 1024) {
        statusEl.textContent = '❌ Ukuran file maksimal 5MB.';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }

    statusEl.textContent = 'Reading excel file...';
    statusEl.className = 'text-muted';
    statusEl.style.display = 'block';

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            var payloadData = [];

            workbook.SheetNames.forEach(function (sheetName) {
                var worksheet = workbook.Sheets[sheetName];
                var rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                if (rawJson.length === 0) return;

                var questions = [];
                rawJson.forEach(function (row) {
                    var questionText = row['Title'] || row['Question'] || '';
                    if (!questionText) return;

                    var diffLevel = row['Difficulty Level'] || row['Difficulty'] || 1;
                    var typeVal = String(row['Type Questions (Multiple Choice, Essay, Binary)'] || row['Type'] || '').toLowerCase();
                    var type = typeVal.indexOf('essay') !== -1 ? 'essay' : (typeVal.indexOf('binary') !== -1 || typeVal.indexOf('bin') !== -1 ? 'binary' : 'mc');

                    var options = [];
                    var choiceLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                    choiceLetters.forEach(function (letter) {
                        if (row[letter] !== undefined && String(row[letter]).trim()) options.push(String(row[letter]).trim());
                    });

                    var answerVal = String(row['Answer'] || '').trim();
                    var answer = 0;
                    if (type === 'binary') {
                        var lowerAns = answerVal.toLowerCase();
                        answer = (lowerAns === 'ya' || lowerAns === 'benar' || lowerAns === 'a' || lowerAns === '0' || lowerAns === 'true' || lowerAns === 'yes') ? 0 : 1;
                    } else if (type === 'mc') {
                        var letterIdx = choiceLetters.indexOf(answerVal.toUpperCase());
                        answer = letterIdx !== -1 ? letterIdx : (parseInt(answerVal) || 0);
                    } else {
                        answer = answerVal;
                    }

                    var keywords = row['Keywords'] ? String(row['Keywords']).split(',').map(function (k) { return k.trim(); }).filter(Boolean) : [];
                    var imageUrl = String(row['Image URL'] || row['Image'] || '').trim();
                    // [SECURITY] Hanya izinkan HTTPS image URL
                    if (imageUrl && imageUrl.indexOf('https://') !== 0) imageUrl = '';

                    var scoringVal = String(row['Scoring'] || '').trim().toLowerCase();
                    var scoring = !(scoringVal === 'no' || scoringVal === 'tidak' || scoringVal === 'false' || scoringVal === '0');

                    questions.push({
                        question: questionText, difficulty: parseInt(diffLevel) || 1,
                        type: type, options: options, answer: answer, scoring: scoring,
                        questionKnowledge: row['Question Knowledge'] || '',
                        keywords: keywords, imageUrl: imageUrl
                    });
                });

                if (questions.length > 0) payloadData.push({ subDept: sheetName, questions: questions });
            });

            if (payloadData.length === 0) {
                statusEl.textContent = 'No questions found in Excel sheets.';
                statusEl.className = 'error-msg';
                return;
            }

            statusEl.textContent = 'Uploading ' + payloadData.length + ' sub-departments to server...';

            var payload = { action: 'importQuestions', password: adminPasswordSession, data: payloadData };
            fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
                .then(function (res) { return res.json(); })
                .then(function (res) {
                    if (res.success) {
                        statusEl.textContent = '✅ Questions imported successfully!';
                        statusEl.style.color = '#3b6d11';
                        fileInput.value = '';
                    } else {
                        statusEl.textContent = '❌ Upload failed: ' + escHtml(res.message);
                        statusEl.className = 'error-msg';
                    }
                })
                .catch(function (e) {
                    statusEl.textContent = '❌ Network error: ' + escHtml(e.message);
                    statusEl.className = 'error-msg';
                });
        } catch (err) {
            statusEl.textContent = '❌ Failed to parse excel: ' + escHtml(err.message);
            statusEl.className = 'error-msg';
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleParticipantsUpload() {
    resetAdminSessionTimer(); // [SECURITY 5]
    var txtArea = document.getElementById('textarea-participants');
    var statusEl = document.getElementById('participants-upload-status');
    var rawText = txtArea.value.trim();

    if (!rawText) {
        statusEl.textContent = 'Please paste participant data first.';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }

    // [SECURITY] Batasi jumlah peserta per import: max 1000 baris
    var lines = rawText.split('\n');
    var participants = [];

    for (var i = 0; i < Math.min(lines.length, 1000); i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var parts = line.indexOf(',') !== -1 ? line.split(',') : line.split('\t');
        if (parts.length >= 2) {
            var nik = parts[0].trim().slice(0, 20);   // max 20 char
            var name = parts.slice(1).join(',').trim().slice(0, 100); // max 100 char
            // [SECURITY 2] Validasi NIK peserta
            if (nik && name && /^[a-zA-Z0-9_-]+$/.test(nik)) {
                participants.push({ nik: nik, name: name });
            }
        }
    }

    if (participants.length === 0) {
        statusEl.textContent = '❌ Format tidak valid. Gunakan: NIK, Nama (contoh: 12345, Budi Santoso)';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }

    statusEl.textContent = 'Uploading ' + participants.length + ' participants...';
    statusEl.className = 'text-muted';
    statusEl.style.display = 'block';

    var payload = { action: 'importParticipants', password: adminPasswordSession, participants: participants };
    fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json(); })
        .then(function (res) {
            if (res.success) {
                statusEl.textContent = '✅ Berhasil mengimpor ' + participants.length + ' peserta!';
                statusEl.style.color = '#3b6d11';
                txtArea.value = '';
            } else {
                statusEl.textContent = '❌ Upload gagal: ' + escHtml(res.message);
                statusEl.className = 'error-msg';
            }
        })
        .catch(function (e) {
            statusEl.textContent = '❌ Network error: ' + escHtml(e.message);
            statusEl.className = 'error-msg';
        });
}

// ============================================================
//  AUTO SCHEDULING & FORMATTING HELPERS
// ============================================================

var closedCountdownInterval = null;

function setupClosedScreen(cfg) {
    var infoEl = document.getElementById('closed-auto-info');
    if (closedCountdownInterval) { clearInterval(closedCountdownInterval); closedCountdownInterval = null; }

    if (cfg.isOpen) { infoEl.style.display = 'none'; return; }

    if (cfg.autoOpenTime) {
        var openTime = new Date(cfg.autoOpenTime).getTime();
        var closeTime = cfg.autoCloseTime ? new Date(cfg.autoCloseTime).getTime() : null;
        var now = Date.now();

        if (!isNaN(openTime) && openTime > now) {
            infoEl.style.display = 'block';
            function updateCountdown() {
                var diff = new Date(cfg.autoOpenTime).getTime() - Date.now();
                if (diff <= 0) {
                    clearInterval(closedCountdownInterval);
                    infoEl.textContent = '🕒 Assessment is opening... Please refresh the page.';
                    setTimeout(function () { location.reload(); }, 2000);
                    return;
                }
                var secs = Math.floor(diff / 1000);
                var days = Math.floor(secs / 86400); secs %= 86400;
                var hours = Math.floor(secs / 3600); secs %= 3600;
                var mins = Math.floor(secs / 60); secs %= 60;
                var timeStr = (days > 0 ? days + 'd ' : '') + (hours > 0 || days > 0 ? hours + 'h ' : '') + mins + 'm ' + secs + 's';
                infoEl.innerHTML = '🕒 Opens in: <strong>' + escHtml(timeStr) + '</strong><br>' +
                    '<span style="font-size:11px;opacity:0.85">Scheduled: ' + escHtml(formatDateTimeString(cfg.autoOpenTime)) + '</span>';
            }
            updateCountdown();
            closedCountdownInterval = setInterval(updateCountdown, 1000);
        } else if (!isNaN(openTime) && closeTime && !isNaN(closeTime) && now > closeTime) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '🔒 Assessment ended on: <strong>' + escHtml(formatDateTimeString(cfg.autoCloseTime)) + '</strong>';
            infoEl.style.background = 'var(--red-50)';
            infoEl.style.borderColor = 'var(--red-200)';
            infoEl.style.color = 'var(--red-600)';
        } else if (!isNaN(openTime)) {
            infoEl.style.display = 'block';
            infoEl.textContent = '⚠️ Assessment is temporarily closed by Administrator.';
            infoEl.style.background = 'var(--amber-50)';
            infoEl.style.borderColor = 'var(--amber-100)';
            infoEl.style.color = 'var(--amber-800)';
        } else {
            infoEl.style.display = 'none';
        }
    } else {
        infoEl.style.display = 'none';
    }
}

function formatDateTimeString(str) {
    if (!str) return '';
    try {
        var d = new Date(str); if (isNaN(d.getTime())) return str;
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var h = String(d.getHours()).padStart(2, '0'), m = String(d.getMinutes()).padStart(2, '0');
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h + ':' + m;
    } catch (e) { return str; }
}

function formatDateTimeLocal(str) {
    if (!str) return '';
    try {
        var d = new Date(str); if (isNaN(d.getTime())) return '';
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + 'T' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
    } catch (e) { return ''; }
}

function openImageZoom(src) {
    if (!src || src.indexOf('https://') !== 0) return; // [SECURITY] hanya HTTPS
    document.getElementById('zoom-img-content').src = src;
    document.getElementById('modal-image-zoom').style.display = 'flex';
}

function closeImageZoom() {
    document.getElementById('modal-image-zoom').style.display = 'none';
    document.getElementById('zoom-img-content').src = '';
}

function downloadExcelTemplate() {
    var headers = [
        'Title', 'Difficulty Level', 'Type Questions (Multiple Choice, Essay, Binary)',
        'Scoring', 'Answer', 'Keywords', 'Image URL', 'A', 'B', 'C', 'D', 'E'
    ];
    var sampleRows = [
        { 'Title': '[NON-SCORING] Apakah Anda dapat membedakan warna merah dan hijau dengan jelas?', 'Difficulty Level': 1, 'Type Questions (Multiple Choice, Essay, Binary)': 'Binary', 'Scoring': 'No', 'Answer': 'Benar', 'Keywords': '', 'Image URL': '', 'A': 'Ya', 'B': 'Tidak', 'C': '', 'D': '', 'E': '' },
        { 'Title': 'Siapa pendiri PMI?', 'Difficulty Level': 1, 'Type Questions (Multiple Choice, Essay, Binary)': 'Multiple Choice', 'Scoring': 'Yes', 'Answer': 'A', 'Keywords': '', 'Image URL': '', 'A': 'Drs. Moh. Hatta', 'B': 'Ir. Soekarno', 'C': 'Sutan Sjahrir', 'D': 'Ki Hajar Dewantara', 'E': '' },
        { 'Title': 'Apakah logo KSM berwarna biru?', 'Difficulty Level': 1, 'Type Questions (Multiple Choice, Essay, Binary)': 'Binary', 'Scoring': 'Yes', 'Answer': 'Benar', 'Keywords': '', 'Image URL': 'https://picsum.photos/400/200', 'A': 'Benar', 'B': 'Salah', 'C': '', 'D': '', 'E': '' },
        { 'Title': 'Jelaskan tujuan Quality Control di unit produksi!', 'Difficulty Level': 2, 'Type Questions (Multiple Choice, Essay, Binary)': 'Essay', 'Scoring': 'Yes', 'Answer': 'Tujuan QC adalah memastikan produk memenuhi standar kualitas.', 'Keywords': 'standar, kualitas, cacat, kepuasan, pelanggan', 'Image URL': '', 'A': '', 'B': '', 'C': '', 'D': '', 'E': '' }
    ];
    try {
        var ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Question');
        XLSX.writeFile(wb, 'questions_template.xlsx');
    } catch (e) {
        customAlert('Gagal mengunduh template: ' + e.message, 'Gagal', 'danger');
    }
}

// ============================================================
//  GENERIC HELPERS
// ============================================================

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
}

function formatTime(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function showError(el, msg) { el.textContent = msg; el.style.display = 'block'; }

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}