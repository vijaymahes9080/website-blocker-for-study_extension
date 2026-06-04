# EduFocus - Student Website Blocker & Pomodoro Timer

EduFocus is a premium Google Chrome Extension designed to keep you focused and eliminate distractions during study sessions. It combines a clean Pomodoro Timer with an intelligent website blocker supporting both standard blocklists (blacklist) and strict allowlists (whitelist).

👉 **Live Demo Website**: [https://vijaymahes9080.github.io/website-blocker-for-study_extension/](https://vijaymahes9080.github.io/website-blocker-for-study_extension/)

---

## Features

- 🎓 **Smart Website Blocker**:
  - **Block Mode (Blocklist)**: Blocks specific distracting domains (e.g., `facebook.com`, `youtube.com`) while a focus session is active.
  - **Strict Mode (Allowlist)**: Blocks *all* domains except a specified list of research/study websites (e.g., `wikipedia.org`, `github.com`).
- ⏱️ **Integrated Pomodoro Timer**: A gorgeous 25-minute study timer with smooth circular progress animations and alarms.
- 📊 **Focused Statistics**: Automatically tracks your total completed study sessions and calculated focused hours.
- 💎 **Premium Modern Dark UI**: Designed with Outfit typography, elegant gradients, and interactive layouts.

---

## Installation Guide (Developer Mode)

Since this extension is hosted as a Git repository, you can load it directly into Google Chrome without using the Web Store:

1. **Download the Extension**:
   - Download the repository as a ZIP file: [Download ZIP](https://github.com/vijaymahes9080/website-blocker-for-study_extension/archive/refs/heads/main.zip)
   - Or clone it using Git:
     ```bash
     git clone https://github.com/vijaymahes9080/website-blocker-for-study_extension.git
     ```
2. **Extract the ZIP**:
   - Extract the downloaded ZIP file to a convenient directory on your computer (e.g., `C:\Users\YourName\Projects\EduFocus`).
3. **Open Chrome Extensions Manager**:
   - In Google Chrome, go to the URL: `chrome://extensions/`
4. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top-right corner to `ON`.
5. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Choose the folder containing the extracted extension files (the directory containing `manifest.json`).
6. **Start Focusing**:
   - Click the extensions puzzle icon in Chrome, pin **EduFocus**, and open it to start your study session!

---

## Repository Files

- `manifest.json`: Configuration, permissions, background worker declaration, and popup files.
- `background.js`: Manages the focus session background timer, state, alarms, and declarative NetRequest rules for blocking.
- `popup.html`: The HTML structure of the extension popup.
- `popup.js`: Script for timer interaction, list management, and message parsing in the popup.
- `popup.css`: Styling for the popup with premium colors and fonts.
- `blocked.html`: The redirection landing page displayed whenever a blocked site is accessed during a focus session.
- `index.html`: The project landing page and interactive simulator hosted on GitHub Pages.
- `icons/`: Image assets for extension icons (16px, 48px, 128px).

---

## Development & Hosting

The landing page of the extension is hosted on **GitHub Pages**. Any changes pushed to the `main` branch will automatically build and publish to the live site.
