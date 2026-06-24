let currentScanMode = 'SCAN';
let timerInterval = null;
let currentUser = null; 
let appSavedAnalyses = []; 

function checkAuthState() {
    const authHeader = document.getElementById('auth-header-state');
    if (currentUser) {
        authHeader.innerHTML = `<span style="font-size:0.85rem; color:#2ea44f; font-weight:600;">👤 ${currentUser}</span>`;
        document.getElementById('profile-restricted-banner').classList.add('hidden');
        document.getElementById('profile-content-secured').classList.remove('hidden');
        document.getElementById('user-display-name').textContent = currentUser + "'s Secure Vault";
        document.getElementById('market-restricted-banner').classList.add('hidden');
        document.getElementById('market-content-secured').classList.remove('hidden');
        renderProfileSavedScans();
    } else {
        authHeader.innerHTML = `<button class="btn-primary" style="padding:4px 10px; font-size:0.8rem;" onclick=\"openAuthModal()\">Sign In</button>`;
        document.getElementById('profile-restricted-banner').classList.remove('hidden');
        document.getElementById('profile-content-secured').classList.add('hidden');
        document.getElementById('market-restricted-banner').classList.remove('hidden');
        document.getElementById('market-content-secured').classList.add('hidden');
    }
    renderGlobalCommunityFeed(); // Synchronize view state shifts
}

function openAuthModal() { toggleAuthForm('LGN'); document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }

function toggleAuthForm(targetView) {
    const title = document.getElementById('auth-modal-title');
    const lgn = document.getElementById('form-login-view');
    const reg = document.getElementById('form-register-view');
    lgn.classList.add('hidden'); reg.classList.add('hidden');
    if (targetView === 'LGN') { title.textContent = "Sign In"; lgn.classList.remove('hidden'); }
    if (targetView === 'REG') { title.textContent = "Create Account"; reg.classList.remove('hidden'); }
}

function submitRegistration() {
    const username = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    if(!username || !email || !password) return alert("Fill out all inputs.");

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) return alert(data.error);
        alert("Account created successfully! You can sign in now.");
        toggleAuthForm('LGN');
    });
}

function submitLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) return alert(data.error);
        currentUser = data.username;
        closeAuthModal(); checkAuthState(); switchTab('tab-scanner');
    });
}

function simulateGoogleLogin() {
    currentUser = "Google Botanist"; 
    closeAuthModal(); checkAuthState(); switchTab('tab-scanner');
    alert("Connected via one-click Google access!");
}

function executeLogout() { currentUser = null; checkAuthState(); switchTab('tab-scanner'); }

function switchTab(targetTabId) {
    const tabs = document.querySelectorAll('.app-tab');
    tabs.forEach(tab => tab.classList.add('hidden'));
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.getElementById(targetTabId).classList.remove('hidden');

    if (targetTabId === 'tab-scanner') { document.getElementById('nav-scan').classList.add('active'); renderGlobalCommunityFeed(); }
    if (targetTabId === 'tab-marketplace') { document.getElementById('nav-market').classList.add('active'); if(currentUser) fetchMarketplaceData(); }
    if (targetTabId === 'tab-chatbot') document.getElementById('nav-chat').classList.add('active');
    if (targetTabId === 'tab-reminders') { document.getElementById('nav-remind').classList.add('active'); checkAuthState(); }
}

function setScanMode(mode) {
    currentScanMode = mode;
    document.getElementById('btn-mode-scan').classList.remove('active');
    document.getElementById('btn-mode-health').classList.remove('active');
    if (mode === 'SCAN') document.getElementById('btn-mode-scan').classList.add('active');
    else document.getElementById('btn-mode-health').classList.add('active');
}

// REMOVES ALL RENDERED AI ASTEIRSK OR MARKDOWN ARTIFACT SYMBOLS
function cleanAIFormatting(text) {
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '');
}

// --- FILE PARSER, CANVAS COMPRESSION PIPELINE AND MILLISECOND COUNTDOWN ---
function previewAndAnalyze(event) {
    const file = event.target.files[0];
    if (!file) return;

    const outputCard = document.getElementById('ai-output-card');
    const resultsDiv = document.getElementById('output-results');
    outputCard.classList.remove('hidden');
    
    clearInterval(timerInterval);
    let countTime = 0;
    resultsDiv.innerHTML = `<div style="padding:24px; text-align:center; color:#8b949e;"><p style="font-size:1.5rem; color:#2ea44f; font-weight:700; margin-bottom:4px;" id="live-ai-timer">0.0s</p><p>Processing plant photo details...</p></div>`;

    timerInterval = setInterval(() => { countTime += 0.1; const el = document.getElementById('live-ai-timer'); if (el) el.textContent = countTime.toFixed(1) + 's'; }, 100);

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_BOUND = 800;
            let w = img.width, h = img.height;
            if (w > h ? w > MAX_BOUND : h > MAX_BOUND) { w > h ? (h *= MAX_BOUND / w, w = MAX_BOUND) : (w *= MAX_BOUND / h, h = MAX_BOUND); }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            const dataUrlSnapshot = canvas.toDataURL('image/jpeg', 0.7);

            fetch('/api/ai/analyze-plant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBuffer: compressedBase64, requestType: currentScanMode })
            })
            .then(res => res.json())
            .then(data => {
                clearInterval(timerInterval);
                if (data.error) return resultsDiv.innerHTML = `<p style="color:#da3633; padding:10px;">${data.error}</p>`;

                const rawLines = data.resultText.split('\n');
                let extractedHeadingName = currentScanMode === 'SCAN' ? "Identified Specimen Variant" : "Pathology Diagnostic Report";
                if (rawLines[0] && rawLines[0].length < 60) extractedHeadingName = cleanAIFormatting(rawLines[0]);
                
                const finalCleanDescription = cleanAIFormatting(data.resultText).replace(/\n/g, '<br>');
                const scanRecord = { id: 'scan-' + Date.now(), title: extractedHeadingName, image: dataUrlSnapshot, description: finalCleanDescription, comments: [], isPublic: false, author: currentUser || "Guest" };
                
                appSavedAnalyses.push(scanRecord);
                renderScanCard(resultsDiv, scanRecord, false);
            }).catch(() => { clearInterval(timerInterval); resultsDiv.innerHTML = `<p style="color:#da3633; padding:10px;">Network execution link failure.</p>`; });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderScanCard(targetElement, scan, isProfileView) {
    targetElement.innerHTML = `
        <div class="result-display-node">
            <div class="result-heading-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>${scan.title}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">Captured by: ${scan.author}</span>
            </div>
            <img class="result-snapshot-frame" src="${scan.image}" alt="Plant Snapshot">
            <div class="result-body-description">${scan.description}</div>
            
            <div style="padding: 10px 14px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end;">
                ${!scan.isPublic ? `<button class="btn-primary" style="padding:4px 10px; font-size:0.8rem;" onclick="publishScanToCommunity('${scan.id}')">Post Publicly</button>` : `<span style="font-size:0.8rem; color:var(--primary-accent); font-weight:600;">🌐 Posted to Feed</span>`}
            </div>

            <div class="comment-box-section">
                <h4>Discussion Feed</h4>
                <div class="comment-composer-form">
                    <input type="text" id="input-comm-${scan.id}" placeholder="${currentUser ? 'Add a comment...' : '🔒 Log in to comment'}" ${!currentUser ? 'disabled' : ''}>
                    <button onclick="submitComment('${scan.id}')" ${!currentUser ? 'disabled' : ''}>Send</button>
                </div>
                <div class="comment-stream-node" id="comments-stream-${scan.id}">
                    ${scan.comments.length === 0 ? '<p style="color:#8b949e; font-size:0.8rem;">No entries logged.</p>' : scan.comments.map(c => `<div class="single-comment"><strong>${c.author}</strong>: ${c.text}</div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function publishScanToCommunity(scanId) {
    if(!currentUser) { openAuthModal(); return; }
    const item = appSavedAnalyses.find(s => s.id === scanId);
    if(item) {
        item.isPublic = true;
        item.author = currentUser; 
        alert("Posted successfully to the dynamic global community dashboard board feed!");
        renderProfileSavedScans();
        renderGlobalCommunityFeed();
        
        const currentOutput = document.getElementById('output-results');
        if(currentOutput && currentOutput.innerHTML !== "") renderScanCard(currentOutput, item, false);
    }
}

function renderGlobalCommunityFeed() {
    const container = document.getElementById('community-feed-container');
    const sharedItems = appSavedAnalyses.filter(s => s.isPublic === true);
    if(!container) return;
    if(sharedItems.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:20px 0;">No public specimen shares logged yet. Be the first to post!</p>';
        return;
    }
    container.innerHTML = '';
    sharedItems.forEach(scan => {
        const wrap = document.createElement('div'); wrap.style.marginBottom = "20px";
        container.appendChild(wrap);
        renderScanCard(wrap, scan, false);
    });
}

function submitComment(scanId) {
    if (!currentUser) return;
    const inp = document.getElementById(`input-comm-${scanId}`);
    const txt = inp.value.trim();
    if (!txt) return;

    const item = appSavedAnalyses.find(s => s.id === scanId);
    if(item) {
        item.comments.push({ author: currentUser, text: txt });
        inp.value = '';
        document.getElementById(`comments-stream-${scanId}`).innerHTML = item.comments.map(c => `<div class="single-comment"><strong>${c.author}</strong>: ${c.text}</div>`).join('');
        renderGlobalCommunityFeed(); 
    }
}

function renderProfileSavedScans() {
    const container = document.getElementById('saved-scans-container');
    const myScans = appSavedAnalyses.filter(s => s.author === currentUser);
    if(myScans.length === 0) return container.innerHTML = '<p style="color:#8b949e; font-size:0.85rem;">Your processed history captures will show here.</p>';
    container.innerHTML = '';
    myScans.forEach(scan => {
        const wrap = document.createElement('div'); wrap.style.marginBottom = "20px"; container.appendChild(wrap);
        renderScanCard(wrap, scan, true);
    });
}

// --- CORE AI CONSULT CHATBOT INTERACTION ---
document.getElementById('chat-composer-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const inputField = document.getElementById('chat-input-text');
    const messageText = inputField.value.trim();
    if (!messageText) return;

    const streamBox = document.getElementById('chat-stream-box');
    const userMsg = document.createElement('div'); userMsg.className = 'msg user'; userMsg.textContent = messageText; streamBox.appendChild(userMsg);
    inputField.value = ''; streamBox.scrollTop = streamBox.scrollHeight;

    fetch('/api/ai/chatbot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: messageText }) })
    .then(res => res.json()).then(data => {
        const botMsg = document.createElement('div'); botMsg.className = 'msg bot'; botMsg.innerHTML = cleanAIFormatting(data.reply).replace(/\n/g, '<br>');
        streamBox.appendChild(botMsg); streamBox.scrollTop = streamBox.scrollHeight;
    });
});

function fetchMarketplaceData() {
    const container = document.getElementById('market-list-container'); container.innerHTML = '<p style="color:#8b949e;">Syncing regional market grids...</p>';
    fetch('/api/marketplace').then(res => res.json()).then(items => {
        container.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div'); el.style.cssText = "background:#0d1117; border:1px solid #21262d; padding:12px; border-radius:8px; display:flex; justify-content:space-between; margin-bottom:10px;";
            el.innerHTML = `<div><h4>${item.name}</h4><p style="font-size:0.8rem; color:#8b949e;">📍 ${item.location}</p></div><div style="color:#2ea44f; font-weight:700;">₹${item.price}</div>`;
            container.appendChild(el);
        });
    });
}

document.getElementById('reminder-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const plantName = document.getElementById('remind-plant-name').value;
    const intervalDays = parseInt(document.getElementById('remind-interval').value);
    fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plantName, intervalDays }) })
    .then(res => res.json()).then(() => { document.getElementById('reminder-form').reset(); fetchUserReminders(); });
});

function fetchUserReminders() {
    const container = document.getElementById('reminders-timeline-container');
    fetch('/api/reminders').then(res => res.json()).then(reminders => {
        if(reminders.length === 0) return container.innerHTML = '<p style="color:#8b949e; font-size:0.8rem;">No tracking loops active.</p>';
        container.innerHTML = '';
        reminders.forEach(r => {
            const el = document.createElement('div'); el.style.cssText = "background:#0d1117; border:1px solid #21262d; padding:10px; border-radius:6px; margin-top:8px; display:flex; justify-content:space-between; font-size:0.85rem;";
            el.innerHTML = `<div><h4>${r.plantName}</h4></div><div style="color:#2ea44f;">📅 Every ${r.intervalDays} Days</div>`;
            container.appendChild(el);
        });
    });
}

checkAuthState();

