var GAS_URL = 'https://script.google.com/macros/s/AKfycbzLpAY6b3TIh5zfrxN1FHV2kacyRRNW-wQGhVDoshXqi6gFgDjOlPWEZxXZB9SccepfiQ/exec'; // <-- Deploy URL from Google Apps Script

var config = null;
var currentQ = 0;
var answers = [];
var timerInterval = null;
var secondsLeft = 0;
var startTime = null;
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

    if (cfg.isOpen) {
        document.getElementById('form-open').style.display = 'block';
        document.getElementById('form-closed').style.display = 'none';
    } else {
        document.getElementById('form-open').style.display = 'none';
        document.getElementById('form-closed').style.display = 'block';
    }
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
    var name = document.getElementById('input-name').value.trim();
    var subDept = document.getElementById('input-subdept').value;
    var errEl = document.getElementById('reg-error');
    errEl.style.display = 'none';

    if (!name) { showError(errEl, 'Please enter your name.'); return; }
    if (name.length < 2) { showError(errEl, 'Name is too short.'); return; }
    if (!subDept) { showError(errEl, 'Please select a sub-department.'); return; }

    showScreen('screen-loading');
    document.getElementById('screen-loading').innerHTML =
        '<div class="loading"><div class="spin" style="font-size:28px">⟳</div><p style="margin-top:1rem">Memulai sesi penilaian...</p></div>';

    var startUrl = GAS_URL + "?action=startSession&name=" + encodeURIComponent(name) + "&subDept=" + encodeURIComponent(subDept);

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
                
                // Load current configs to form
                document.getElementById('check-assessment-open').checked = !!config.isOpen;
                document.getElementById('check-enforce-whitelist').checked = !!config.enforceWhitelist;
                document.getElementById('input-assessment-title').value = config.title || '';
                document.getElementById('input-new-admin-password').value = '';
                
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

function saveAdminSettings() {
    var isOpen = document.getElementById('check-assessment-open').checked;
    var enforceWhitelist = document.getElementById('check-enforce-whitelist').checked;
    var title = document.getElementById('input-assessment-title').value.trim();
    var newPassword = document.getElementById('input-new-admin-password').value.trim();
    
    var payload = {
        action: 'updateConfig',
        password: adminPasswordSession,
        config: {
            isOpen: isOpen,
            enforceWhitelist: enforceWhitelist,
            title: title
        }
    };
    
    if (newPassword) {
        payload.config.adminPassword = newPassword;
    }
    
    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(res) {
        if (res.success) {
            alert('Settings saved successfully!');
            if (newPassword) {
                adminPasswordSession = newPassword;
            }
            // Reload page config
            location.reload();
        } else {
            alert('Save failed: ' + res.message);
        }
    })
    .catch(function(e) {
        alert('Error saving settings: ' + e.message);
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
                    
                    questions.push({
                        question: questionText,
                        difficulty: parseInt(diffLevel) || 1,
                        type: type,
                        options: options,
                        answer: answer,
                        questionKnowledge: row['Question Knowledge'] || '',
                        keywords: keywords
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
        statusEl.textContent = 'Please paste participant names first.';
        statusEl.className = 'error-msg';
        statusEl.style.display = 'block';
        return;
    }
    
    statusEl.textContent = 'Uploading participant whitelist...';
    statusEl.className = 'text-muted';
    statusEl.style.display = 'block';
    
    var names = rawText.split('\n').map(function(n) { return n.trim(); }).filter(Boolean);
    
    var payload = {
        action: 'importParticipants',
        password: adminPasswordSession,
        names: names
    };
    
    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(res) {
        if (res.success) {
            statusEl.textContent = '✅ Successfully imported ' + names.length + ' participants!';
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

