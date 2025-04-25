# 🕷️ Site Crawler

A powerful website crawler built with [Playwright](https://playwright.dev/), designed to recursively scan websites, detect broken links and placeholder text, and generate detailed reports in multiple formats.

---

## 🚀 Features

- 🔗 **Link Validation** – Detects broken, redirected, or absolute internal links
- 🧠 **Placeholder Detection** – Finds common filler text and templated content
- ⚙️ **SEO Checks** – Optionally check titles, meta descriptions, and heading structure
- 📸 **Image Auditing** – Find images missing `alt` text
- ☎️ **Tel Link Validation** – Verify `tel:` links for correct country code and format
- 📈 **Report Generation** – Outputs results in JSON, CSV, and HTML formats
- 🌐 **Sitemap Support** – Start crawling from a sitemap if configured

---

## 📁 Project Structure

```
site-crawler/
├── crawl-results/          # Output folder for reports
│   └── .gitkeep            # Ensures the folder is committed but remains empty
├── config.template.js      # Sample config file
├── config.js               # Your actual config file (ignored by Git)
├── crawler.js              # Main crawler script
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Configuration

The crawler uses a local `config.js` file. A sample is provided as `config.template.js`.

### 📝 Create Your Config

```bash
cp config.template.js config.js
```

### Example Configuration

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
  placeholders: ["Lorem ipsum", "000.000.0000", "ADDRESS", "CITY", "ZIP"],
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

---

## 📆 Installation

```bash
npm install
```

---

## ▶️ Running the Crawler

```bash
node crawler.js
```

Interrupt with `Ctrl+C` to stop and save results early.

---

## 📂 Output Files

Crawl results are saved to the `crawl-results/` folder:

| File | Description |
|------|-------------|
| `crawl-report-*.json` | Structured crawl results |
| `issues-*.csv` | Spreadsheet-friendly report |
| `report-*.html` | Visual HTML report |
| `site-graph-*.json` | Page-to-page link graph |

---

## 🙈 .gitignore Highlights

```gitignore
# Ignore dependencies and temp files
node_modules/
.vscode/
*.log

# Ignore personal config and results
config.js
crawl-results/*
!crawl-results/.gitkeep
```

---

## 💡 Tips

- Customize `placeholder` terms for your brand or CMS.
- Use in CI pipelines for automated link/SEO validation.
- Run on staging environments before production release.

---

## 📄 License

MIT — free to use, modify, and contribute.

---

## 🤝 Contributions

Pull requests and suggestions are welcome! Open an issue to discuss major changes.

---

## ✉️ Author

Built with ❤️ by Nathaniel Blazier

