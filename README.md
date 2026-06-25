# BigQuery Release Pulse Dashboard

A midnight-themed glassmorphic dashboard built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. The application fetches Google BigQuery's official Release Notes Atom Feed, segments individual updates (features, announcements, deprecations, issues) from feed dates, and includes a live Twitter / X preview composer for easy tweet customization and sharing.

---

## ✨ Features

- **🌐 Server-Side Feed Parsing**: Bypasses CORS browser restrictions by fetching and caching/parsing the Atom XML feed on the backend.
- **✂️ Update Segmentation**: Parses feed entry CDATA blocks and isolates distinct changes (e.g. splitting multiple features/issues published on the same day) using BeautifulSoup.
- **✨ Glassmorphic Midnight UI**: Designed with a sleek, dark-themed UI featuring glowing panels, responsive column distributions, and custom badges.
- **🔍 Search & Filter**: Real-time client-side keyword search and tag filtering (All, Features, Issues, Announcements, Deprecations).
- **🐦 High-Fidelity Twitter / X Composer Mockup**:
  - Live preview card styled exactly like a production Twitter post.
  - Highlighting for links, tags, and mentions inside the preview box.
  - Character counter displaying exact values based on Twitter's URL-shortening rules (all URLs count as exactly 23 characters).
  - Dynamic SVG circular progress limit ring (Blue ➔ Yellow ➔ Red).
  - Secure integration using the official Twitter Web Share Intent.

---

## 📂 Project Structure

```
bq-releases-notes/
│
├── app.py                # Flask server, routing endpoints & feed parser
├── requirements.txt      # Python dependencies list
├── .gitignore            # Git exclusion guidelines
├── test_parse.py         # Static parse testing utility (for parser verification)
│
├── templates/
│   └── index.html        # HTML layout shell and templates
│
└── static/
    ├── css/
    │   └── style.css     # CSS Styling tokens, components & responsive designs
    └── js/
        └── app.js        # Timeline rendering, client filters & tweet counting logic
```

---

## 🚀 Getting Started

### 📋 Prerequisites
Make sure you have Python 3.8+ installed on your system.

### 🔌 Installation
1. Clone the repository or navigate to the directory:
   ```cmd
   cd "C:\Users\iampr\Projects\agy-cli-projects\bq-releases-notes"
   ```

2. Activate the virtual environment:
   * **In Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **In Command Prompt**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 🏃 Running the Application
1. Start the Flask application:
   ```bash
   python app.py
   ```
2. Open your web browser and go to:
   👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 💻 Tech Stack
- **Backend**: Python 3.11, Flask (Routing/API), Requests (HTTP calls), BeautifulSoup4 (HTML parser), ElementTree (XML parser).
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid, Animations), Vanilla ES6 JavaScript (Fetch API, DOM manipulation, SVG progress).
