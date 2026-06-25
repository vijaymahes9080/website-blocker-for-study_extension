// EduFocus Chrome API Polyfill for Web/GitHub Pages Hosting
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
    console.log("EduFocus: Chrome Extension APIs not detected. Loading Web Polyfill.");

    // Setup initial default local storage values
    const setupDefaults = () => {
        if (localStorage.getItem('blockedSites') === null) {
            localStorage.setItem('blockedSites', JSON.stringify(['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'netflix.com', 'reddit.com']));
        }
        if (localStorage.getItem('allowedSites') === null) {
            localStorage.setItem('allowedSites', JSON.stringify(['wikipedia.org', 'khanacademy.org', 'scholar.google.com', 'stackoverflow.com', 'github.com', 'google.com']));
        }
        if (localStorage.getItem('isStrictMode') === null) {
            localStorage.setItem('isStrictMode', 'false');
        }
        if (localStorage.getItem('isFocusSessionActive') === null) {
            localStorage.setItem('isFocusSessionActive', 'false');
        }
        if (localStorage.getItem('sessionEndTime') === null) {
            localStorage.setItem('sessionEndTime', '');
        }
        if (localStorage.getItem('totalSessions') === null) {
            localStorage.setItem('totalSessions', '0');
        }
    };
    setupDefaults();

    // Mock timer listener to simulate extension background alarms
    let focusTimeout = null;
    const syncBackgroundTimer = () => {
        if (focusTimeout) clearTimeout(focusTimeout);
        const isActive = localStorage.getItem('isFocusSessionActive') === 'true';
        const endTimeStr = localStorage.getItem('sessionEndTime');
        if (isActive && endTimeStr) {
            const endTime = parseInt(endTimeStr);
            const remaining = endTime - Date.now();
            if (remaining > 0) {
                focusTimeout = setTimeout(() => {
                    // Session Completed
                    localStorage.setItem('isFocusSessionActive', 'false');
                    localStorage.setItem('sessionEndTime', '');
                    const sessions = parseInt(localStorage.getItem('totalSessions') || '0') + 1;
                    localStorage.setItem('totalSessions', sessions.toString());
                    
                    // Synthesize soft complete beep sound
                    try {
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
                        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.8);
                    } catch (e) {
                        console.log("Audio feedback failed:", e);
                    }

                    // Reload page or trigger storage event to force UI sync
                    window.dispatchEvent(new Event('storage'));
                }, remaining);
            } else {
                localStorage.setItem('isFocusSessionActive', 'false');
                localStorage.setItem('sessionEndTime', '');
            }
        }
    };
    syncBackgroundTimer();

    // Export mocked chrome APIs to the window
    window.chrome = {
        runtime: {
            id: "mocked-edufocus-web",
            sendMessage: async function (message, callback) {
                console.log("Mocked runtime.sendMessage received:", message);
                
                if (message.type === 'START_SESSION') {
                    const durationMinutes = message.duration || 25;
                    const endTime = Date.now() + durationMinutes * 60 * 1000;
                    localStorage.setItem('isFocusSessionActive', 'true');
                    localStorage.setItem('sessionEndTime', endTime.toString());
                    syncBackgroundTimer();
                } else if (message.type === 'STOP_SESSION') {
                    localStorage.setItem('isFocusSessionActive', 'false');
                    localStorage.setItem('sessionEndTime', '');
                    if (focusTimeout) clearTimeout(focusTimeout);
                } else if (message.type === 'UPDATE_SITES') {
                    // Handled inside list manager storage hooks
                }

                if (callback) callback({ success: true });
                return { success: true };
            },
            getURL: function (path) {
                return path; // Web relative path
            }
        },
        storage: {
            local: {
                get: async function (keys, callback) {
                    const result = {};
                    const keyArray = Array.isArray(keys) ? keys : [keys];
                    
                    keyArray.forEach(key => {
                        const rawVal = localStorage.getItem(key);
                        if (rawVal === null) {
                            result[key] = undefined;
                        } else {
                            try {
                                result[key] = JSON.parse(rawVal);
                            } catch (e) {
                                result[key] = rawVal;
                            }
                        }
                    });

                    if (callback) callback(result);
                    return result;
                },
                set: async function (items, callback) {
                    Object.keys(items).forEach(key => {
                        const val = items[key];
                        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
                    });
                    
                    if (callback) callback();
                }
            }
        }
    };
}
