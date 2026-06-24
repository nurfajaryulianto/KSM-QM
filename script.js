var GAS_URL = 'https://script.google.com/macros/s/AKfycbzLpAY6b3TIh5zfrxN1FHV2kacyRRNW-wQGhVDoshXqi6gFgDjOlPWEZxXZB9SccepfiQ/exec'; // <-- Deploy URL from Google Apps Script

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

// ---- Boot ----
window.onload = function () {
    fetch(GAS_URL + "?action=getConfig")
        .then(function (res) {
            return res.json();
        })
        .then(onConfigLoaded)
        .catch(function (e) {
            document.getElementById('screen-loading').innerHTML =
                '<div class="loading" style="color:#a32d2d">Failed to load: ' + e.message + '<br><br><button class="btn" onclick="location.reload()">Retry</button></div>';
        });
};

function onConfigLoaded(cfg) {
    config = cfg;
    document.getElementById('reg-title').textContent = cfg.title;

    // Fill sub-department dropdown
    var subdeptSelect = document.getElementById('input-subdept');
    subdeptSelect.innerHTML = '';

    if (cfg.subDepts && cfg.subDepts.length > 0) {
        cfg.subDepts.forEach(function (dept) {
            var opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            subdeptSelect.appendChild(opt);
        });

        // Listen to change to update chips
        subdeptSelect.onchange = function () {
            updateSubDeptMeta(this.value);
        };

        // Initialize with first sub-dept metadata
        updateSubDeptMeta(cfg.subDepts[0]);
    }

    // Dynamic scoring descriptions
    var scorePerQ = cfg.scorePerQuestion || 10;
    var speedBonusVal = cfg.maxSpeedBonus !== undefined ? cfg.maxSpeedBonus : 20;
    document.getElementById('scoring-rule-correct').innerHTML = '&#10003; Each correct answer = ' + scorePerQ + ' points';
    document.getElementById('scoring-rule-bonus').innerHTML = '&#9889; Speed bonus: up to ' + speedBonusVal + ' pts for finishing faster';

    if (cfg.isOpen) {
        document.getElementById('form-open').style.display = 'block';
        document.getElementById('form-closed').style.display = 'none';
    } else {
        document.getElementById('form-open').style.display = 'none';
        document.getElementById('form-closed').style.display = 'block';
    }
    
    setupClosedScreen(cfg);
    showScreen('screen-register');
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

function startAssessment() {
    var nik = document.getElementById('input-nik').value.trim();
    var name = document.getElementById('input-name').value.trim();
    var subDept = document.getElementById('input-subdept').value;
    var errEl = document.getElementById('reg-error');
    errEl.style.display = 'none';

    if (!nik) { showError(errEl, 'Please enter your NIK / Employee ID.'); return; }
    if (!name) { showError(errEl, 'Please enter your name.'); return; }
    if (name.length < 2) { showError(errEl, 'Name is too short.'); return; }
    if (!subDept) { showError(errEl, 'Please select a sub-department.'); return; }

    showScreen('screen-loading');
    document.getElementById('screen-loading').innerHTML =
        '<div class="loading"><div class="spin" style="font-size:28px">⟳</div><p style="margin-top:1rem">Memulai sesi penilaian...</p></div>';

    var startUrl = GAS_URL + "?action=startSession&nik=" + encodeURIComponent(nik) + "&name=" + encodeURIComponent(name) + "&subDept=" + encodeURIComponent(subDept);

    fetch(startUrl)
        .then(function (res) {
            return res.json();
        })
        .then(function (res) {
            if (!res.success) {
                showScreen('screen-register');
                showError(errEl, res.message);
                return;
            }
            myNik = nik;
            myName = name;
            mySubDept = subDept;

            // Set dynamic session config
            config.questions = res.questions;
            config.timeLimit = res.timeLimit;
            config.totalQuestions = res.totalQuestions;
            config.maxScore = res.maxScore;

            initQuiz();
            showScreen('screen-quiz');
        })
        .catch(function (e) {
            showScreen('screen-register');
            showError(errEl, "Gagal terhubung ke server: " + e.message);
        });
}

// ---- Quiz init ----
function initQuiz() {
    currentQ = 0;
    // Essay questions get empty string, others get -1
    answers = config.questions.map(function (q) {
        return q.type === 'essay' ? '' : -1;
    });
    secondsLeft = config.timeLimit;
    startTime = Date.now();
    buildDots();
    renderQuestion();
    startTimer();
}

// Build dots
function buildDots() {
    var el = document.getElementById('q-dots');
    el.innerHTML = '';
    config.questions.forEach(function (_, i) {
        var d = document.createElement('div');
        d.className = 'q-dot';
        d.id = 'dot-' + i;
        el.appendChild(d);
    });
}

function renderQuestion() {
    var q = config.questions[currentQ];
    var n = config.questions.length;

    document.getElementById('q-number').textContent = 'QUESTION ' + (currentQ + 1);
    document.getElementById('q-label-top').textContent = 'Question ' + (currentQ + 1) + ' of ' + n;
    document.getElementById('q-text').textContent = q.question;

    // Update image display
    var imgEl = document.getElementById('q-image');
    if (q.imageUrl && q.imageUrl.trim()) {
        imgEl.src = q.imageUrl.trim();
        imgEl.style.display = 'block';
    } else {
        imgEl.src = '';
        imgEl.style.display = 'none';
    }

    // Update dots status
    config.questions.forEach(function (qItem, i) {
        var d = document.getElementById('dot-' + i);
        var isCurrent = (i === currentQ);
        var isAnswered = false;
        if (qItem.type === 'essay') {
            isAnswered = !!(answers[i] && answers[i].trim());
        } else {
            isAnswered = (answers[i] !== -1);
        }
        d.className = 'q-dot' + (isCurrent ? ' current' : '') + (isAnswered ? ' answered' : '');
    });

    var unanswered = answers.filter(function (a, i) {
        var qItem = config.questions[i];
        if (qItem.type === 'essay') return !a.trim();
        return a === -1;
    }).length;
    document.getElementById('progress-lbl').textContent = (n - unanswered) + ' / ' + n + ' answered';

    var optionsEl = document.getElementById('q-options');
    var essayWrapEl = document.getElementById('q-essay-wrap');
    var essayInput = document.getElementById('input-essay');

    if (q.type === 'essay') {
        optionsEl.style.display = 'none';
        essayWrapEl.style.display = 'block';
        essayInput.value = answers[currentQ] || '';
    } else {
        optionsEl.style.display = 'flex';
        essayWrapEl.style.display = 'none';

        optionsEl.innerHTML = '';
        q.options.forEach(function (opt, i) {
            var div = document.createElement('div');
            div.className = 'option' + (answers[currentQ] === i ? ' selected' : '');
            div.innerHTML =
                '<div class="option-letter">' + LETTERS[i] + '</div>' +
                '<span>' + opt + '</span>';
            div.onclick = function () { selectAnswer(i); };
            optionsEl.appendChild(div);
        });
    }

    // Nav buttons
    document.getElementById('btn-prev').style.visibility = currentQ === 0 ? 'hidden' : 'visible';
    document.getElementById('btn-next').textContent = currentQ === n - 1 ? 'Finish ✓' : 'Next →';
}

function selectAnswer(i) {
    answers[currentQ] = i;
    renderQuestion();
}

function saveEssayAnswer(val) {
    answers[currentQ] = val;

    // Live update progress label and dot
    var n = config.questions.length;
    var unanswered = answers.filter(function (a, i) {
        var qItem = config.questions[i];
        if (qItem.type === 'essay') return !a.trim();
        return a === -1;
    }).length;
    document.getElementById('progress-lbl').textContent = (n - unanswered) + ' / ' + n + ' answered';

    var dot = document.getElementById('dot-' + currentQ);
    var isAnswered = !!val.trim();
    dot.className = 'q-dot current' + (isAnswered ? ' answered' : '');
}

function prevQuestion() {
    if (currentQ > 0) { currentQ--; renderQuestion(); }
}

function nextOrSubmit() {
    if (currentQ < config.questions.length - 1) {
        currentQ++;
        renderQuestion();
    } else {
        confirmSubmit();
    }
}

function confirmSubmit() {
    var unanswered = answers.filter(function (a, i) {
        var qItem = config.questions[i];
        if (qItem.type === 'essay') return !a.trim();
        return a === -1;
    }).length;

    var msg = unanswered > 0
        ? 'Anda memiliki ' + unanswered + ' soal yang belum dijawab. Tetap kirim?'
        : 'Kirim jawaban assessment Anda? Jawaban tidak dapat diubah setelah dikirim.';
    if (!confirm(msg)) return;
    submitNow();
}

// ---- Timer ----
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(function () {
        secondsLeft--;
        updateTimerDisplay();
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            alert('Waktu pengerjaan habis! Jawaban Anda akan otomatis dikirim sekarang.');
            submitNow();
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

// ---- Submit ----
function submitNow() {
    clearInterval(timerInterval);
    var timeTaken = Math.floor((Date.now() - startTime) / 1000);

    showScreen('screen-loading');
    document.getElementById('screen-loading').innerHTML =
        '<div class="loading"><div class="spin" style="font-size:28px">⟳</div><p style="margin-top:1rem">Mengirimkan jawaban Anda...</p></div>';

    var payload = {
        nik: myNik,
        name: myName,
        subDept: mySubDept,
        answers: answers,
        timeTaken: timeTaken
    };

    fetch(GAS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain' // Using text/plain to avoid preflight CORS request complexity
        },
        body: JSON.stringify(payload)
    })
        .then(function (res) {
            return res.json();
        })
        .then(onSubmitResult)
        .catch(function (e) {
            alert('Pengiriman gagal: ' + e.message + '\nSilakan coba lagi.');
            showScreen('screen-quiz');
            startTimer();
        });
}

function onSubmitResult(res) {
    if (!res.success) {
        alert(res.message);
        showScreen('screen-register');
        return;
    }
    myResult = res;
    renderResult(res);
    showScreen('screen-result');
}

function renderResult(res) {
    document.getElementById('result-name-hero').textContent = 'Kerja Bagus, ' + res.name + '!';
    document.getElementById('res-total-score').textContent = res.totalScore;
    document.getElementById('res-correct').textContent = res.correctCount + '/' + res.totalQuestions;
    document.getElementById('res-accuracy').textContent = res.accuracy + '%';
    document.getElementById('res-base').textContent = res.baseScore;
    document.getElementById('res-time').textContent = formatTime(res.timeTaken);

    // Speed bonus
    if (res.speedBonus > 0) {
        document.getElementById('res-bonus').style.display = 'flex';
        document.getElementById('res-bonus-val').textContent = res.speedBonus;
        document.getElementById('res-time-val').textContent = formatTime(res.timeTaken);
    }

    // Badge
    var badge = document.getElementById('res-badge');
    var pct = res.accuracy;
    if (pct === 100) { badge.textContent = '🏅 Nilai Sempurna!'; badge.className = 'result-badge badge-gold'; }
    else if (pct >= 80) { badge.textContent = '★ Sangat Baik!'; badge.className = 'result-badge badge-gold'; }
    else if (pct >= 60) { badge.textContent = '✓ Lulus / Cukup'; badge.className = 'result-badge badge-pass'; }
    else { badge.textContent = '△ Perlu Belajar Lagi'; badge.className = 'result-badge badge-fail'; }
}

// ---- Leaderboard ----
function loadLeaderboard() {
    document.getElementById('lb-content').innerHTML =
        '<div class="loading"><span class="spin">⟳</span></div>';

    fetch(GAS_URL + "?action=getLeaderboard")
        .then(function (res) {
            return res.json();
        })
        .then(renderLeaderboard)
        .catch(function (e) {
            document.getElementById('lb-content').innerHTML =
                '<p class="error-msg">Failed to load: ' + e.message + '</p>';
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
    if (mode === 'me') data = allLbData.filter(function (r) {
        return r.name.toLowerCase() === myName.toLowerCase();
    });

    renderTable(data, mode);
}

function renderTable(data, mode) {
    if (!data || data.length === 0) {
        var msg = mode === 'me'
            ? 'Hasil tidak ditemukan untuk nama Anda. Selesaikan assessment terlebih dahulu.'
            : 'Belum ada pengiriman. Jadilah yang pertama!';
        document.getElementById('lb-content').innerHTML =
            '<div class="empty-state">' + msg + '</div>';
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
            '<td class="score-col">' + row.totalScore + '</td>' +
            '<td><span class="acc-pill">' + row.accuracy + '%</span></td>' +
            '<td class="time-col">' + formatTime(row.timeTaken) + '</td>' +
            '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('lb-content').innerHTML = html;
}

// ---- Helpers ----
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
}

function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function showError(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ---- Admin Panel Logic ----
var adminPasswordSession = '';

function showAdminSubView(viewId) {
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
    document.getElementById('modal-admin').style.display = 'none';
}

function loginAdmin() {
    var password = document.getElementById('input-admin-password').value;
    var errEl = document.getElementById('admin-login-error');
    errEl.style.display = 'none';
    
    if (!password) { showError(errEl, 'Password cannot be empty.'); return; }
    
    // Call GAS verifyAdmin
    fetch(GAS_URL + '?action=verifyAdmin&password=' + encodeURIComponent(password))
        .then(function(res) { return res.json(); })
        .then(function(res) {
            if (res.success) {
                adminPasswordSession = password;
                document.getElementById('admin-login-view').style.display = 'none';
                document.getElementById('admin-dashboard-view').style.display = 'block';
                showAdminSubView('admin-menu-select');
                
                // Load current configs to form
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
            }
        })
        .catch(function(e) {
            showError(errEl, 'Connection error: ' + e.message);
        });
}

function saveParticipantSettings() {
    var enforceWhitelist = document.getElementById('check-enforce-whitelist').checked;
    
    var payload = {
        action: 'updateConfig',
        password: adminPasswordSession,
        config: {
            enforceWhitelist: enforceWhitelist
        }
    };
    
    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(res) {
        if (res.success) {
            alert('Pengaturan whitelist berhasil disimpan!');
            // Update local config value so the form updates without full reload if we just switch sub-views, 
            // but reload is fine too since it refreshes all states. Let's do reload.
            location.reload();
        } else {
            alert('Gagal menyimpan whitelist: ' + res.message);
        }
    })
    .catch(function(e) {
        alert('Error: ' + e.message);
    });
}

function saveAssessmentSettings() {
    var isOpen = document.getElementById('check-assessment-open').checked;
    var title = document.getElementById('input-assessment-title').value.trim();
    var autoOpenTime = document.getElementById('input-auto-open').value;
    var autoCloseTime = document.getElementById('input-auto-close').value;
    var timeLimitMinutes = parseInt(document.getElementById('input-time-limit').value) || 10;
    var scorePerQuestion = parseInt(document.getElementById('input-score-per-q').value) || 10;
    var maxSpeedBonus = parseInt(document.getElementById('input-speed-bonus').value) || 0;

    if (timeLimitMinutes <= 0) {
        alert('Batas waktu pengerjaan kuis harus lebih dari 0 menit.');
        return;
    }
    if (scorePerQuestion <= 0) {
        alert('Skor per soal harus lebih dari 0.');
        return;
    }
    if (maxSpeedBonus < 0) {
        alert('Max bonus kecepatan tidak boleh negatif.');
        return;
    }
    if (autoOpenTime && autoCloseTime) {
        var openD = new Date(autoOpenTime).getTime();
        var closeD = new Date(autoCloseTime).getTime();
        if (closeD <= openD) {
            alert('Jadwal Tutup Otomatis harus setelah Jadwal Buka Otomatis.');
            return;
        }
    }

    var payload = {
        action: 'updateConfig',
        password: adminPasswordSession,
        config: {
            isOpen: isOpen,
            title: title,
            autoOpenTime: autoOpenTime,
            autoCloseTime: autoCloseTime,
            timeLimitMinutes: timeLimitMinutes,
            scorePerQuestion: scorePerQuestion,
            maxSpeedBonus: maxSpeedBonus
        }
    };
    
    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(res) {
        if (res.success) {
            alert('Pengaturan assessment berhasil disimpan!');
            location.reload();
        } else {
            alert('Gagal menyimpan assessment: ' + res.message);
        }
    })
    .catch(function(e) {
        alert('Error saving settings: ' + e.message);
    });
}

function saveAdminPasswordOnly() {
    var newPassword = document.getElementById('input-new-admin-password').value.trim();
    if (!newPassword) {
        alert('Silakan isi password baru terlebih dahulu.');
        return;
    }
    
    var payload = {
        action: 'updateConfig',
        password: adminPasswordSession,
        config: {
            adminPassword: newPassword
        }
    };
    
    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(res) {
        if (res.success) {
            alert('Password admin berhasil diubah!');
            adminPasswordSession = newPassword;
            document.getElementById('input-new-admin-password').value = '';
            location.reload();
        } else {
            alert('Gagal mengubah password: ' + res.message);
        }
    })
    .catch(function(e) {
        alert('Error: ' + e.message);
    });
}

function handleQuestionsUpload() {
    var fileInput = document.getElementById('file-questions-excel');
    var statusEl = document.getElementById('questions-upload-status');
    
    if (fileInput.files.length === 0) {
        statusEl.textContent = 'Please select an Excel file first.';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }
    
    statusEl.textContent = 'Reading excel file...';
    statusEl.className = 'text-muted';
    statusEl.style.display = 'block';
    
    var file = fileInput.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            
            var payloadData = [];
            
            workbook.SheetNames.forEach(function(sheetName) {
                var worksheet = workbook.Sheets[sheetName];
                var rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                
                if (rawJson.length === 0) return;
                
                var questions = [];
                rawJson.forEach(function(row) {
                    var questionText = row['Title'] || row['Question'] || '';
                    if (!questionText) return;
                    
                    var diffLevel = row['Difficulty Level'] || row['Difficulty'] || 1;
                    
                    var typeVal = String(row['Type Questions (Multiple Choice, Essay, Binary)'] || row['Type'] || '').toLowerCase();
                    var type = 'mc';
                    if (typeVal.indexOf('essay') !== -1) {
                        type = 'essay';
                    } else if (typeVal.indexOf('binary') !== -1 || typeVal.indexOf('bin') !== -1) {
                        type = 'binary';
                    }
                    
                    var options = [];
                    var choiceLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                    choiceLetters.forEach(function(letter) {
                        if (row[letter] !== undefined && row[letter] !== null && String(row[letter]).trim() !== '') {
                            options.push(String(row[letter]).trim());
                        }
                    });
                    
                    var answerVal = String(row['Answer'] || '').trim();
                    var answer = 0;
                    
                    if (type === 'binary') {
                        var lowerAns = answerVal.toLowerCase();
                        if (lowerAns === 'ya' || lowerAns === 'benar' || lowerAns === 'a' || lowerAns === '0' || lowerAns === 'true' || lowerAns === 'yes') {
                            answer = 0;
                        } else {
                            answer = 1;
                        }
                    } else if (type === 'mc') {
                        var letterIdx = choiceLetters.indexOf(answerVal.toUpperCase());
                        if (letterIdx !== -1) {
                            answer = letterIdx;
                        } else {
                            var numAns = parseInt(answerVal);
                            answer = isNaN(numAns) ? 0 : numAns;
                        }
                    } else {
                        answer = answerVal;
                    }
                    
                    var keywords = [];
                    if (row['Keywords']) {
                        keywords = String(row['Keywords']).split(',').map(function(k) { return k.trim(); }).filter(Boolean);
                    }
                    
                    var imageUrl = String(row['Image URL'] || row['Image'] || '').trim();

                    questions.push({
                        question: questionText,
                        difficulty: parseInt(diffLevel) || 1,
                        type: type,
                        options: options,
                        answer: answer,
                        questionKnowledge: row['Question Knowledge'] || '',
                        keywords: keywords,
                        imageUrl: imageUrl
                    });
                });
                
                if (questions.length > 0) {
                    payloadData.push({
                        subDept: sheetName,
                        questions: questions
                    });
                }
            });
            
            if (payloadData.length === 0) {
                statusEl.textContent = 'No questions found in Excel sheets.';
                statusEl.className = 'error-msg';
                return;
            }
            
            statusEl.textContent = 'Uploading ' + payloadData.length + ' sub-departments to server...';
            
            var payload = {
                action: 'importQuestions',
                password: adminPasswordSession,
                data: payloadData
            };
            
            fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            })
            .then(function(res) { return res.json(); })
            .then(function(res) {
                if (res.success) {
                    statusEl.textContent = '✅ Questions imported successfully!';
                    statusEl.style.color = '#3b6d11';
                    fileInput.value = '';
                } else {
                    statusEl.textContent = '❌ Upload failed: ' + res.message;
                    statusEl.className = 'error-msg';
                }
            })
            .catch(function(e) {
                statusEl.textContent = '❌ Network error: ' + e.message;
                statusEl.className = 'error-msg';
            });
            
        } catch(err) {
            statusEl.textContent = '❌ Failed to parse excel: ' + err.message;
            statusEl.className = 'error-msg';
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleParticipantsUpload() {
    var txtArea = document.getElementById('textarea-participants');
    var statusEl = document.getElementById('participants-upload-status');
    
    var rawText = txtArea.value.trim();
    if (!rawText) {
        statusEl.textContent = 'Please paste participant data first.';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }
    
    statusEl.textContent = 'Uploading participant whitelist...';
    statusEl.className = 'text-muted';
    statusEl.style.display = 'block';
    
    var lines = rawText.split('\n');
    var participants = [];
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        
        var parts = [];
        if (line.indexOf(',') !== -1) {
            parts = line.split(',');
        } else {
            parts = line.split('\t');
        }
        
        if (parts.length >= 2) {
            var nik = parts[0].trim();
            var name = parts.slice(1).join(',').trim();
            if (nik && name) {
                participants.push({ nik: nik, name: name });
            }
        }
    }
    
    if (participants.length === 0) {
        statusEl.textContent = '❌ Invalid format. Please use: NIK, Name (e.g. 12345, John Doe)';
        statusEl.className = 'error-msg';
        return;
    }
    
    statusEl.textContent = 'Uploading ' + participants.length + ' participants...';
    
    var payload = {
        action: 'importParticipants',
        password: adminPasswordSession,
        participants: participants
    };
    
    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(res) {
        if (res.success) {
            statusEl.textContent = '✅ Successfully imported ' + participants.length + ' participants!';
            statusEl.style.color = '#3b6d11';
            txtArea.value = '';
        } else {
            statusEl.textContent = '❌ Upload failed: ' + res.message;
            statusEl.className = 'error-msg';
        }
    })
    .catch(function(e) {
        statusEl.textContent = '❌ Network error: ' + e.message;
        statusEl.className = 'error-msg';
    });
}

// ---- Auto Scheduling & Formatting helpers ----
var closedCountdownInterval = null;

function setupClosedScreen(cfg) {
    var infoEl = document.getElementById('closed-auto-info');
    if (closedCountdownInterval) {
        clearInterval(closedCountdownInterval);
        closedCountdownInterval = null;
    }
    
    if (cfg.isOpen) {
        infoEl.style.display = 'none';
        return;
    }
    
    if (cfg.autoOpenTime) {
        var openTime = new Date(cfg.autoOpenTime).getTime();
        var closeTime = cfg.autoCloseTime ? new Date(cfg.autoCloseTime).getTime() : null;
        var now = Date.now();
        
        if (!isNaN(openTime) && openTime > now) {
            infoEl.style.display = 'block';
            
            function updateCountdown() {
                var current = Date.now();
                var diff = openTime - current;
                if (diff <= 0) {
                    clearInterval(closedCountdownInterval);
                    infoEl.innerHTML = "🕒 Assessment is opening... Please refresh the page.";
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                    return;
                }
                
                var secs = Math.floor(diff / 1000);
                var days = Math.floor(secs / (24 * 3600));
                secs %= (24 * 3600);
                var hours = Math.floor(secs / 3600);
                secs %= 3600;
                var mins = Math.floor(secs / 60);
                secs %= 60;
                
                var timeStr = "";
                if (days > 0) timeStr += days + "d ";
                if (hours > 0 || days > 0) timeStr += hours + "h ";
                timeStr += mins + "m " + secs + "s";
                
                infoEl.innerHTML = '🕒 Opens in: <strong>' + timeStr + '</strong><br><span style="font-size: 11px; opacity: 0.85;">Scheduled: ' + formatDateTimeString(cfg.autoOpenTime) + '</span>';
            }
            
            updateCountdown();
            closedCountdownInterval = setInterval(updateCountdown, 1000);
        } else if (!isNaN(openTime) && closeTime && !isNaN(closeTime) && now > closeTime) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '🔒 Assessment ended on: <strong>' + formatDateTimeString(cfg.autoCloseTime) + '</strong>';
            infoEl.style.background = 'var(--red-50)';
            infoEl.style.borderColor = 'var(--red-200)';
            infoEl.style.color = 'var(--red-600)';
        } else if (!isNaN(openTime)) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '⚠️ Assessment is temporarily closed by Administrator.';
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
        var d = new Date(str);
        if (isNaN(d.getTime())) return str;
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var day = d.getDate();
        var month = months[d.getMonth()];
        var year = d.getFullYear();
        var hour = d.getHours();
        var min = d.getMinutes();
        if (hour < 10) hour = '0' + hour;
        if (min < 10) min = '0' + min;
        return day + ' ' + month + ' ' + year + ', ' + hour + ':' + min;
    } catch(e) {
        return str;
    }
}

function formatDateTimeLocal(str) {
    if (!str) return '';
    try {
        var d = new Date(str);
        if (isNaN(d.getTime())) return '';
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var min = d.getMinutes();
        if (month < 10) month = '0' + month;
        if (day < 10) day = '0' + day;
        if (hour < 10) hour = '0' + hour;
        if (min < 10) min = '0' + min;
        return year + '-' + month + '-' + day + 'T' + hour + ':' + min;
    } catch(e) {
        return '';
    }
}

function openImageZoom(src) {
    if (!src) return;
    document.getElementById('zoom-img-content').src = src;
    document.getElementById('modal-image-zoom').style.display = 'flex';
}

function closeImageZoom() {
    document.getElementById('modal-image-zoom').style.display = 'none';
    document.getElementById('zoom-img-content').src = '';
}

function downloadExcelTemplate() {
    var headers = [
        "Title", 
        "Difficulty Level", 
        "Type Questions (Multiple Choice, Essay, Binary)", 
        "Answer", 
        "Keywords", 
        "Image URL",
        "A", "B", "C", "D", "E"
    ];
    
    var sampleRows = [
        {
            "Title": "Siapa pendiri organisasi PMI (Palang Merah Indonesia)?",
            "Difficulty Level": 1,
            "Type Questions (Multiple Choice, Essay, Binary)": "Multiple Choice",
            "Answer": "A",
            "Keywords": "",
            "Image URL": "",
            "A": "Drs. Moh. Hatta",
            "B": "Ir. Soekarno",
            "C": "Sutan Sjahrir",
            "D": "Ki Hajar Dewantara",
            "E": "Ki Bagoes Hadikoesoemo"
        },
        {
            "Title": "Apakah gambar logo KSM berwarna biru?",
            "Difficulty Level": 1,
            "Type Questions (Multiple Choice, Essay, Binary)": "Binary",
            "Answer": "Benar",
            "Keywords": "",
            "Image URL": "https://picsum.photos/400/200",
            "A": "Benar",
            "B": "Salah",
            "C": "", "D": "", "E": ""
        },
        {
            "Title": "Jelaskan apa tujuan utama dari Quality Control di unit produksi!",
            "Difficulty Level": 2,
            "Type Questions (Multiple Choice, Essay, Binary)": "Essay",
            "Answer": "Tujuan Quality Control adalah memastikan produk yang dihasilkan memenuhi standar kualitas yang ditetapkan perusahaan, mendeteksi cacat sedini mungkin, dan menjaga kepuasan pelanggan.",
            "Keywords": "standar, kualitas, cacat, kepuasan, pelanggan",
            "Image URL": "",
            "A": "", "B": "", "C": "", "D": "", "E": ""
        }
    ];

    try {
        var ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Question");
        XLSX.writeFile(wb, "questions_template.xlsx");
    } catch(e) {
        alert("Gagal mengunduh template Excel: " + e.message);
    }
}

