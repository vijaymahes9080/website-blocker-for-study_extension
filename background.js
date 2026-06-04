const DYNAMIC_RULE_ID_OFFSET = 1000;
const BLOCK_ALL_RULE_ID = 999;

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    blockedSites: ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com'],
    allowedSites: ['wikipedia.org', 'khanacademy.org', 'scholar.google.com', 'stackoverflow.com', 'github.com'],
    isStrictMode: false,
    isFocusSessionActive: false,
    sessionEndTime: null,
    totalSessions: 0,
    totalHours: 0
  });
});

// Alarm for timer checks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'focusSessionEnd') {
    await endSession(true);
  }
});

// Message Handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SESSION') {
    startSession(request.duration).then(() => sendResponse({ success: true }));
    return true; // async response
  } else if (request.type === 'STOP_SESSION') {
    endSession(false).then(() => sendResponse({ success: true }));
    return true;
  } else if (request.type === 'UPDATE_SITES') {
    updateBlockingRules().then(() => sendResponse({ success: true }));
    return true;
  }
});

async function startSession(minutes) {
  const durationMs = minutes * 60 * 1000;
  const endTime = Date.now() + durationMs;

  await chrome.storage.local.set({
    isFocusSessionActive: true,
    sessionEndTime: endTime
  });

  chrome.alarms.create('focusSessionEnd', { when: endTime });

  await updateBlockingRules(true);
}

async function endSession(completed) {
  const { isFocusSessionActive } = await chrome.storage.local.get(['isFocusSessionActive']);

  if (!isFocusSessionActive) return;

  await chrome.storage.local.set({
    isFocusSessionActive: false,
    sessionEndTime: null
  });

  chrome.alarms.clear('focusSessionEnd');
  await updateBlockingRules(false);

  if (completed) {
    const stats = await chrome.storage.local.get(['totalSessions', 'totalHours']);
    const newSessions = (stats.totalSessions || 0) + 1;
    await chrome.storage.local.set({ totalSessions: newSessions });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Session Complete! 🎉',
      message: 'Great job! Take a small break.'
    });
  }
}

async function updateBlockingRules(active = undefined) {
  if (active === undefined) {
    const state = await chrome.storage.local.get('isFocusSessionActive');
    active = state.isFocusSessionActive;
  }

  // Clear existing dynamic rules first (everything)
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentRuleIds = currentRules.map(rule => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: currentRuleIds
  });

  if (!active) return; // If session not active, no rules needed

  const { isStrictMode, blockedSites, allowedSites } = await chrome.storage.local.get(['isStrictMode', 'blockedSites', 'allowedSites']);
  const redirectUrl = chrome.runtime.getURL('blocked.html');

  if (isStrictMode) {
    // STRICT MODE: Block ALL except Allowed
    // Rule 1: Block All (Priority 1)
    // Rule 2+: Allow Specific (Priority 2)

    // We can't redirect * to blocked.html endlessly on the blocked page itself.
    // The extension pages are usually exempt, but let's be safe.
    // Actually, extension pages (chrome-extension://...) are not intercepted by DNR usually.

    const rules = [];

    // 1. Redirect EVERYTHING
    rules.push({
      id: BLOCK_ALL_RULE_ID,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: redirectUrl }
      },
      condition: {
        urlFilter: "*",
        resourceTypes: ['main_frame'],
        // Exclude our own extension page to avoid loops if needed, though usually automatic
        excludedDomains: [chrome.runtime.id]
      }
    });

    // 2. Allow whitelisted sites
    if (allowedSites && allowedSites.length > 0) {
      allowedSites.forEach((site, index) => {
        rules.push({
          id: DYNAMIC_RULE_ID_OFFSET + index,
          priority: 2, // Higher priority than the block-all rule
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${site}`,
            resourceTypes: ['main_frame']
          }
        });
      });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });

  } else {
    // BLOCK MODE: Block ONLY Blocklist
    if (!blockedSites || blockedSites.length === 0) return;

    const rules = blockedSites.map((site, index) => {
      return {
        id: DYNAMIC_RULE_ID_OFFSET + index,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { url: redirectUrl }
        },
        condition: {
          urlFilter: `||${site}`,
          resourceTypes: ['main_frame']
        }
      };
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
  }
}
