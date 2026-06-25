document.addEventListener('DOMContentLoaded', () => {
    switchTab('scanner');
    setupAuthStates();
});

function switchTab(tabId) {
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.add('hidden'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNavItem = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (activeNavItem) activeNavItem.classList.add('active');
}

function setupAuthStates() {
    const isMockAuth = localStorage.getItem('isMockAuth') === 'true';
    document.querySelectorAll('.lock-overlay').forEach(overlay => {
        overlay.style.display = isMockAuth ? 'none' : 'flex';
    });
    document.querySelectorAll('.profile-content-secured').forEach(content => {
        content.style.display = isMockAuth ? 'block' : 'none';
    });
}

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuthView() {
    const loginView = document.getElementById('form-login-view');
    const registerView = document.getElementById('form-register-view');
    loginView.classList.toggle('hidden');
    registerView.classList.toggle('hidden');
}

function handleMockLogin(event) {
    event.preventDefault();
    localStorage.setItem('isMockAuth', 'true');
    closeAuthModal();
    setupAuthStates();
}

function handleMockRegistration(event) {
    event.preventDefault();
    localStorage.setItem('isMockAuth', 'true');
    closeAuthModal();
    setupAuthStates();
}

function executeLogOut() {
    localStorage.removeItem('isMockAuth');
    setupAuthStates();
}

let activeScanMode = 'SCAN';
function setScanMode(mode) {
    activeScanMode = mode;
    document.getElementById('btn-mode-scan').classList.toggle('active', mode === 'SCAN');
    document.getElementById('btn-mode-health').classList.toggle('active', mode === 'DIAGNOSE_HEALTH');
}

async function previewAndAnalyze(event) {
    const file = event.target.files[0];
    if (!file) return;

    const outputContainer = document.getElementById('ai-output-container');
    const resultDiv = document.getElementById('ai-output-results');

    outputContainer.classList.remove('hidden');
    resultDiv.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">Processing botanical specimen image stream...</p>`;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            resultDiv.innerHTML = `<p style="color: #ff4a4a; font-weight: bold; padding: 10px 0;">${data.error}</p>`;
            return;
        }

        resultDiv.innerHTML = `<div style="line-height: 1.6; color: var(--text-main); white-space: pre-line;">${data.result}</div>`;
    } catch (error) {
        console.error('Frontend System Error:', error);
        resultDiv.innerHTML = `<p style="color: #ff4a4a; font-weight: bold; padding: 10px 0;">Network execution link failure.</p>`;
    }
}
