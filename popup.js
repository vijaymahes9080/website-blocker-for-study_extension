document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timerDisplay = document.getElementById('timer');
    const timerLabel = document.getElementById('timerLabel');
    const progressRing = document.querySelector('.progress-ring__circle');

    // Settings elements
    const settingsBtn = document.getElementById('settingsBtn');
    const backBtn = document.getElementById('backBtn');
    const settingsView = document.getElementById('settingsView');
    const mainView = document.getElementById('mainView');
    const siteList = document.getElementById('siteList');
    const newSiteInput = document.getElementById('newSiteInput');
    const addSiteBtn = document.getElementById('addSiteBtn');
    const modeToggle = document.getElementById('modeToggle');
    const modeLabel = document.getElementById('modeLabel');
    const modeDescription = document.getElementById('modeDescription');
    const tipText = document.getElementById('tipText');

    // Stats elements
    const sessionsTodayEl = document.getElementById('sessionsToday');
    const hoursTodayEl = document.getElementById('hoursToday');

    // Constants
    const FULL_DASH = 502;
    const DEFAULT_TIME = 25; // minutes

    let timerInterval = null;
    let isStrictMode = false;

    // Initialization
    renderStats();
    checkSessionStatus();
    loadSettings();

    // Event Listeners
    startBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'START_SESSION', duration: DEFAULT_TIME });
        checkSessionStatus();
    });

    resetBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
        checkSessionStatus();
    });

    settingsBtn.addEventListener('click', () => {
        settingsView.classList.add('active');
    });

    backBtn.addEventListener('click', () => {
        settingsView.classList.remove('active');
    });

    addSiteBtn.addEventListener('click', addSite);
    newSiteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSite();
    });

    modeToggle.addEventListener('change', async (e) => {
        isStrictMode = e.target.checked;
        updateViewForMode();
        await chrome.storage.local.set({ isStrictMode });
        await chrome.runtime.sendMessage({ type: 'UPDATE_SITES' });
        loadSites();
    });

    // Functions
    async function loadSettings() {
        const { isStrictMode: strict } = await chrome.storage.local.get('isStrictMode');
        isStrictMode = !!strict;
        modeToggle.checked = isStrictMode;
        updateViewForMode();
        loadSites();
    }

    function updateViewForMode() {
        if (isStrictMode) {
            modeLabel.textContent = "Strict Mode (Allowlist)";
            modeDescription.textContent = "ONLY allowed sites work";
            tipText.textContent = "💡 Tip: Add sites you NEED for studying (e.g. wikipedia.org)";
            newSiteInput.placeholder = "allowed-site.com";
        } else {
            modeLabel.textContent = "Block Mode (Blocklist)";
            modeDescription.textContent = "Blocks listed sites";
            tipText.textContent = "💡 Tip: Add social media and entertainment sites here.";
            newSiteInput.placeholder = "blocked-site.com";
        }
    }

    async function checkSessionStatus() {
        const { isFocusSessionActive, sessionEndTime } = await chrome.storage.local.get(['isFocusSessionActive', 'sessionEndTime']);

        if (isFocusSessionActive && sessionEndTime) {
            startUIUpdates(sessionEndTime);
            toggleControls(true);
        } else {
            stopUIUpdates();
            toggleControls(false);
            setTimerUI(DEFAULT_TIME * 60, DEFAULT_TIME * 60); // Reset UI
        }
    }

    function startUIUpdates(endTime) {
        if (timerInterval) clearInterval(timerInterval);

        updateTimer(); // run once immediately
        timerInterval = setInterval(updateTimer, 1000);

        function updateTimer() {
            const now = Date.now();
            const timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));
            const totalDuration = DEFAULT_TIME * 60; // Assuming fixed duration for now or retrieve stored duration if variable

            setTimerUI(timeLeft, totalDuration);

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                checkSessionStatus(); // Re-check to sync with bg
            }
        }
    }

    function stopUIUpdates() {
        if (timerInterval) clearInterval(timerInterval);
    }

    function setTimerUI(timeLeftSeconds, totalSeconds) {
        const minutes = Math.floor(timeLeftSeconds / 60);
        const seconds = timeLeftSeconds % 60;

        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Update progress ring
        // offset = dash - (dash * fraction)
        const fraction = timeLeftSeconds / totalSeconds;
        const offset = FULL_DASH - (FULL_DASH * fraction);
        progressRing.style.strokeDashoffset = offset;
    }

    function toggleControls(isActive) {
        if (isActive) {
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline-block';
            timerLabel.textContent = 'Stay Focused';
        } else {
            startBtn.style.display = 'inline-block';
            resetBtn.style.display = 'none';
            timerLabel.textContent = 'Focus Time';
        }
    }

    async function loadSites() {
        const key = isStrictMode ? 'allowedSites' : 'blockedSites';
        const result = await chrome.storage.local.get(key);
        const sites = result[key] || [];

        siteList.innerHTML = '';
        sites.forEach(site => {
            renderSiteItem(site);
        });
    }

    function renderSiteItem(site) {
        const li = document.createElement('li');
        li.className = isStrictMode ? 'site-item allowed' : 'site-item';
        li.innerHTML = `
        <span>${site}</span>
        <button class="remove-btn" title="Remove">×</button>
      `;
        li.querySelector('.remove-btn').addEventListener('click', async () => {
            removeSite(site);
        });
        siteList.appendChild(li);
    }

    async function addSite() {
        const rawSite = newSiteInput.value.trim().toLowerCase();
        if (!rawSite) return;

        const site = rawSite.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

        const key = isStrictMode ? 'allowedSites' : 'blockedSites';
        const result = await chrome.storage.local.get(key);
        const sites = result[key] || [];

        if (!sites.includes(site)) {
            sites.push(site);
            await chrome.storage.local.set({ [key]: sites });

            // Notify background to update rules if session is active
            chrome.runtime.sendMessage({ type: 'UPDATE_SITES' });

            renderSiteItem(site);
            newSiteInput.value = '';
        }
    }

    async function removeSite(site) {
        const key = isStrictMode ? 'allowedSites' : 'blockedSites';
        const result = await chrome.storage.local.get(key);
        const sites = (result[key] || []).filter(s => s !== site);

        await chrome.storage.local.set({ [key]: sites });

        // Notify background
        chrome.runtime.sendMessage({ type: 'UPDATE_SITES' });

        loadSites();
    }

    async function renderStats() {
        const { totalSessions } = await chrome.storage.local.get('totalSessions');
        sessionsTodayEl.textContent = totalSessions || 0;
        // Approximation for demo
        hoursTodayEl.textContent = Math.round(((totalSessions || 0) * 25 / 60) * 10) / 10 + 'h';
    }
});
