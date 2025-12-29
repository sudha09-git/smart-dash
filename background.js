// ================= ENVIRONMENT SAFETY CHECK =================
if (typeof chrome === 'undefined') {
    console.error('This file must run inside a Chrome Extension service worker.');
} else {

// ================= BACKGROUND SERVICE WORKER =================

// Initialize extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);

    if (details.reason === 'install') {
        const defaultSettings = {
            autoSave: true,
            notifications: false,
            analytics: true,
            quickNote: '',
            pageViews: 0,
            timeSaved: 0,
            autoStart: false,
            showBadge: true,
            themeColor: '#667eea',
            fontSize: 'medium',
            dataCollection: true,
            clearOnExit: false,
            storageLimit: 100
        };

        chrome.storage.sync.set(defaultSettings, () => {
            console.log('Default settings initialized');
        });
    }
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.type) {
        case 'UPDATE_STATS':
            handleStatsUpdate(message.data);
            break;
        case 'CAPTURE_PAGE':
            handlePageCapture(message.data);
            break;
        case 'GET_DATA':
            handleGetData(message.key, sendResponse);
            return true;
    }
});

// Handle statistics updates
function handleStatsUpdate(data) {
    chrome.storage.sync.get(['pageViews', 'timeSaved'], (result) => {
        chrome.storage.sync.set({
            pageViews: (result.pageViews || 0) + (data.pageViews || 1),
            timeSaved: (result.timeSaved || 0) + (data.timeSaved || 0)
        });
    });
}

// Handle page capture
function handlePageCapture(data) {
    chrome.storage.local.get(['capturedPages'], (result) => {
        const pages = result.capturedPages || [];
        pages.unshift({
            ...data,
            timestamp: new Date().toISOString()
        });

        if (pages.length > 50) pages.pop();

        chrome.storage.local.set({ capturedPages: pages });
    });
}

// Handle data retrieval
function handleGetData(key, sendResponse) {
    chrome.storage.sync.get(key, (result) => {
        sendResponse(result[key]);
    });
}

// Track page views
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        chrome.storage.sync.get(['analytics', 'pageViews', 'showBadge'], (result) => {
            if (result.analytics) {
                const views = (result.pageViews || 0) + 1;
                chrome.storage.sync.set({ pageViews: views });

                if (result.showBadge) {
                    chrome.action.setBadgeText({ text: views.toString() });
                    chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
                }
            }
        });
    }
});

// On browser startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.sync.get(['clearOnExit'], (result) => {
        if (result.clearOnExit) {
            chrome.storage.sync.clear();
        }
    });
});

// Suspend handler
chrome.runtime.onSuspend.addListener(() => {
    console.log('Service worker suspended');
});

} // ===== END SAFETY CHECK =====
