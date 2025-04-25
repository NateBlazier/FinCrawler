# 🕷️ Site Crawler

A powerful website crawler built with **Playwright**, capable of recursively crawling pages, checking links, detecting placeholder content, and generating structured reports in multiple formats.

---

## 🚀 Features

- ✅ Recursive crawling from a URL or sitemap
- ✅ Detects broken links, SEO issues, placeholder content, and more
- ✅ Outputs results in **JSON**, **CSV**, and **HTML** formats
- ✅ Skips unwanted pages and links using flexible rules
- ✅ Supports custom placeholder detection and link validation

---

## 📁 Project Structure

```
site-crawler/
├── crawl-results/        # Output reports (ignored by Git except .gitkeep)
│   └── .gitkeep
├── config.template.js    # Sample configuration file
├── config.js             # Your actual config (ignored by Git)
├── index.js              # Main crawler script
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Configuration

All crawler behavior is controlled via `config.js` (which is **not tracked** by Git). A sample config is provided as `config.template.js`.

### Sample: `config.template.js`

```js
module.exports = {
  startUrl: "https://example.com/sitemap",
  maxDepth: 4,
  timeout: 10000,
  outputDir: "./crawl-results",
  useSitemap: true,
  skipRepeatedNavLinks: true,
  navSelector: "nav a[href]",
  requestDelay: 1000,
  placeholders: [
    "Lorem ipsum", "000.000.0000", "ADDRESS", "CITY", "STATE", "ZIP", ...
  ],
  excludeUrls: ["https://www.facebook.com/"],
  excludePatterns: ["login", "logout"],
  checks: {
    title: true,
    httpStatus: false,
    seo: false,
    placeholders: true,
    links: true,
    performance: false,
    images: false,
    telLinks: true
  },
  telCountryCodes: ["+1"]
};
```

### 📌 To begin:

```bash
cp config.template.js config.js
```

Modify `config.js` with your desired crawling options.

---

## 📦 Installation

```bash
npm install
```

---

## 🏁 Usage

```bash
node index.js
```

The script will begin crawling from the URL defined in your config.

---

## 📂 Output

All reports are saved to the `crawl-results/` directory:

| File | Description |
|------|-------------|
| `crawl-report-*.json` | Structured crawl results |
| `issues-*.csv` | Spreadsheet-friendly report |
| `report-*.html` | Visual HTML report |
| `site-graph-*.json` | Page-to-page link graph |

---

## 🙈 Gitignore Setup

The `.gitignore` includes:

- `node_modules/` – npm dependencies
- `crawl-results/*` – all results (except `.gitkeep`)
- `config.js` – your private configuration

Only `config.template.js` and `crawl-results/.gitkeep` are tracked by Git.

---

## 🧠 Notes

- Use `Ctrl+C` to stop crawling gracefully — it will still save a report.
- Customize depth, exclusions, and checks in `config.js`.
- Ideal for internal site audits, QA testing, and content cleanup.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 💬 Questions or Suggestions?

Open an issue or start a discussion! Contributions are welcome.