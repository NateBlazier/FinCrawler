# Response: Website Crawler README

Below is a README file tailored to explain what your provided script does and how to use it. It’s written in a clear, concise, and user-friendly manner, assuming the audience might include developers or technical users who want to run or modify the script. The content is now formatted as Markdown (`.md`) for better readability in tools like GitHub.

## Generated README Content

### Website Crawler

This is a Node.js-based website crawler built with [Playwright](https://playwright.dev/). It recursively explores a website starting from a given URL or sitemap, checks for common issues (e.g., broken links, missing metadata, placeholder text), and generates detailed reports about the site’s structure and health.

#### Features

- **Crawls websites** up to a configurable depth or via a sitemap.
- **Detects issues** such as:
  - Broken links (HTTP 400+ status codes)
  - Missing or empty page titles
  - Placeholder text (e.g., "lorem ipsum", "todo")
  - Slow page load times (>5 seconds)
  - Images missing alt text
  - Absolute internal links that could be relative
- **Generates reports**:
  - JSON crawl report with issues and stats
  - JSON site graph showing page-link relationships
  - CSV file listing all detected issues
- **Graceful shutdown** on Ctrl+C, saving results before exiting

#### Prerequisites

- **Node.js**: Version 14 or higher
- **npm**: Comes with Node.js for installing dependencies

#### Installation

1. Clone or download this repository to your local machine.
2. Open a terminal in the project directory.
3. Install the required dependencies:
   ```bash
   npm install playwright xml2js
This installs Playwright (for browser automation) and xml2js (for parsing sitemaps).

Configuration
Edit the config object at the top of the script to customize the crawl:

javascript

Collapse

Wrap

Copy
const config = {
  startUrl: 'https://example.com',
  maxDepth: 2,
  timeout: 20000,
  outputDir: './my-crawl-results',
  useSitemap: false
};
startUrl: The website to begin crawling (e.g., 'https://author.parisregionalhealth.com').
maxDepth: Maximum link depth to follow (default: 3).
timeout: Timeout for page loads and requests in milliseconds (default: 30000).
outputDir: Directory to save results (default: './crawl-results').
useSitemap: If true, crawls URLs from the site’s sitemap.xml instead of following links recursively (default: true).
How to Use
Save the script as crawler.js (or any name you prefer).
Configure the config object as needed.
Run the script:
bash

Collapse

Wrap

Copy
node crawler.js
The crawler will:
Start at startUrl or fetch URLs from the sitemap (if useSitemap is true).
Visit pages, check for issues, and log progress to the console.
Save results in the outputDir when complete or interrupted (Ctrl+C).
Output
Results are saved in the specified outputDir (e.g., ./crawl-results) with a timestamp:

crawl-report-<timestamp>.json: Full report with stats and issues.
site-graph-<timestamp>.json: Graph of pages and their links.
issues-<timestamp>.csv: List of issues in CSV format for easy analysis.
Example console output:

text

Collapse

Wrap

Copy
Starting crawl of https://example.com
🔍 [Depth 0] Visiting: https://example.com
✅ Completed: https://example.com (5 links found)
🏁 Crawl completed in 12.34s
📊 Stats: 10 pages visited, 3 issues found
📋 Issue Summary:
Missing or empty title: 1
Broken link (Status: 404): 2
Customization
Add new checks: Modify the crawl function to detect additional issues (e.g., missing meta tags, duplicate content).
Change placeholder detection: Update the placeholderRegex to match different patterns.
Adjust timeouts: Tweak timeout in config or page.setDefaultNavigationTimeout for slower sites.
Notes
The crawler runs in headless mode (no browser UI) for efficiency.
It respects the target site by using a custom user agent (SiteCrawlerBot/1.0).
If the sitemap fails to load or is empty, it falls back to crawling from startUrl.
Large sites may require increasing maxDepth or disabling useSitemap for a full crawl.
Troubleshooting
"TimeoutError": Increase timeout in the config or check the site’s availability.
"Module not found": Ensure dependencies are installed with npm install.
No output files: Verify outputDir exists or is writable.