// ================== ENVIRONMENT SAFETY CHECK ==================
if (typeof document === 'undefined' || typeof chrome === 'undefined') {
    console.error('This script must be executed inside a Chrome Extension popup.');
    // Prevent Node.js crash
    module?.exports && (module.exports = {});
} else {

// ================== INITIALIZE EXTENSION ==================
document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    initializeEventListeners();
    updateStatistics();
});

// ================== LOAD SETTINGS ==================
async function loadSettings() {
    try {
        const data = await chrome.storage.sync.get([
            'autoSave',
            'notifications',
            'analytics',
            'quickNote',
            'pageViews',
            'timeSaved'
        ]);

        document.getElementById('autoSave').checked = data.autoSave !== false;
        document.getElementById('notifications').checked = data.notifications === true;
        document.getElementById('analytics').checked = data.analytics !== false;

        if (data.quickNote) {
            document.getElementById('quickNote').value = data.quickNote;
        }

        if (data.pageViews) {
            document.getElementById('pageViews').textContent = data.pageViews;
        }
        if (data.timeSaved) {
            document.getElementById('timeSaved').textContent = data.timeSaved + 'h';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ================== SAVE SETTINGS ==================
async function saveSettings() {
    const settings = {
        autoSave: document.getElementById('autoSave').checked,
        notifications: document.getElementById('notifications').checked,
        analytics: document.getElementById('analytics').checked,
        quickNote: document.getElementById('quickNote').value
    };

    try {
        await chrome.storage.sync.set(settings);
        showNotification('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', true);
    }
}

// ================== EVENT LISTENERS ==================
function initializeEventListeners() {
    document.getElementById('capturePage').addEventListener('click', capturePage);
    document.getElementById('darkMode').addEventListener('click', toggleDarkMode);
    document.getElementById('clearData').addEventListener('click', clearData);
    document.getElementById('refreshAll').addEventListener('click', refreshAll);
    document.getElementById('saveNote').addEventListener('click', saveNote);
    document.getElementById('processURL').addEventListener('click', processURL);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('helpBtn').addEventListener('click', openHelp);

    document.getElementById('autoSave').addEventListener('change', saveSettings);
    document.getElementById('notifications').addEventListener('change', saveSettings);
    document.getElementById('analytics').addEventListener('change', saveSettings);

    let noteTimeout;
    document.getElementById('quickNote').addEventListener('input', function () {
        clearTimeout(noteTimeout);
        noteTimeout = setTimeout(saveSettings, 1000);
    });

    document.getElementById('customURL').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') processURL();
    });
}

// ================== QUICK ACTIONS ==================
async function capturePage() {
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        // 🚫 Prevent chrome:// pages
        if (tab.url.startsWith("chrome://")) {
            showNotification("Cannot capture Chrome system pages", true);
            return;
        }

        // Execute script in webpage
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: capturePageContent
        });

        showNotification('Page captured successfully!');
    } catch (error) {
        console.error(error);
        showNotification('Error capturing page', true);
    }
}

function capturePageContent() {
    chrome.runtime.sendMessage({
        type: 'PAGE_CAPTURED',
        data: {
            url: location.href,
            title: document.title,
            text: document.body.innerText.substring(0, 1000)
        }
    });
}


// ================== UI ACTIONS ==================
function toggleDarkMode() {
    document.body.classList.toggle('dark');
}

async function clearData() {
    if (confirm('Clear all data?')) {
        await chrome.storage.sync.clear();
        loadSettings();
    }
}

async function refreshAll() {
    await updateStatistics();
    showNotification('All data refreshed!');
}

async function saveNote() {
    await saveSettings();
    showNotification('Note saved!');
}

async function processURL() {
    const url = document.getElementById('customURL').value.trim();
    if (!url) return showNotification('Enter URL', true);

    try {
        new URL(url);
        await chrome.tabs.create({ url });
    } catch {
        showNotification('Invalid URL', true);
    }
}

function openSettings() {
    chrome.runtime.openOptionsPage();
}

function openHelp() {
    chrome.tabs.create({ url: 'https://example.com/help' });
}

// ================== STATISTICS ==================
async function updateStatistics() {
    const data = await chrome.storage.sync.get(['pageViews', 'timeSaved']);
    const pageViews = (data.pageViews || 0) + 1;
    const timeSaved = (data.timeSaved || 0) + 1;

    await chrome.storage.sync.set({ pageViews, timeSaved });

    document.getElementById('pageViews').textContent = pageViews;
    document.getElementById('timeSaved').textContent = timeSaved + 'h';
}

// ================== NOTIFICATION ==================
function showNotification(msg, isError = false) {
    alert((isError ? '❌ ' : '✅ ') + msg);
}

// ================== MESSAGE LISTENER ==================
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PAGE_CAPTURED') {
        console.log('Captured:', msg.data);
    }
});

// ================== KEYBOARD SHORTCUT ==================
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNote();
    }
});

} // 🔚 END ENVIRONMENT CHECK
