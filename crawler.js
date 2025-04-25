const { chromium } = require('playwright');
const fs = require('fs');
const url = require('url');
const https = require('https');
const { parseStringPromise } = require('xml2js');
const path = require('path');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const visited = new Set();
const checkedNavLinks = new Set();
const domain = new URL(config.startUrl).hostname;
const issues = [];
const graph = {};
// Escape special regex characters in placeholders and join with '|'
const escapedPlaceholders = config.placeholders.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const placeholderRegex = new RegExp(escapedPlaceholders.join('|'), 'gi');
console.log(`DEBUG: Placeholder regex: ${placeholderRegex.source}`);
let totalUrls = 1;

async function fetchXML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function loadSitemapUrls(sitemapUrl) {
  try {
    const xml = await fetchXML(sitemapUrl);
    const parsed = await parseStringPromise(xml);
    console.log(`DEBUG: Sitemap fetched from ${sitemapUrl}`);
    if (parsed.urlset && parsed.urlset.url) {
      return parsed.urlset.url.map(entry => entry.loc[0]);
    } else if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const nestedUrls = parsed.sitemapindex.sitemap.map(s => s.loc[0]);
      const allUrls = [];
      for (const nested of nestedUrls) {
        const nestedXml = await fetchXML(nested);
        const nestedParsed = await parseStringPromise(nestedXml);
        if (nestedParsed.urlset && nestedParsed.urlset.url) {
          allUrls.push(...nestedParsed.urlset.url.map(entry => entry.loc[0]));
        }
      }
      return allUrls;
    } else {
      console.warn('⚠️ Unexpected sitemap format.');
      return [];
    }
  } catch (e) {
    console.warn('⚠️ Failed to parse sitemap.xml:', e.message);
    return [];
  }
}

async function withRetry(fn, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying (${i + 1}/${retries}) after error: ${err.message}`);
      await delay(delayMs);
    }
  }
}

async function crawl(page, currentUrl, depth = 0) {
  const normalizedUrl = currentUrl.split('#')[0];
  if (visited.has(normalizedUrl) || depth > config.maxDepth) return;
  if (config.excludeUrls?.some(ex => normalizedUrl.includes(ex)) || 
      config.excludePatterns?.some(ex => normalizedUrl.includes(ex))) {
    console.log(`Skipping excluded URL: ${normalizedUrl}`);
    return;
  }
  visited.add(normalizedUrl);
  graph[normalizedUrl] = [];

  console.log(`\n🔍 [Depth ${depth}] Visiting: ${normalizedUrl}`);
  await delay(config.requestDelay || 1000);

  try {
    const response = await withRetry(() => page.goto(normalizedUrl, { waitUntil: 'networkidle', timeout: config.timeout }));
    const status = response?.status();
    const finalUrl = response?.url();

    console.log(`DEBUG: Status for ${normalizedUrl}: ${status}`);
    if (finalUrl !== normalizedUrl) {
      console.log(`DEBUG: Redirected to: ${finalUrl}`);
      await crawl(page, finalUrl, depth);
      return;
    }

    const loadTime = response?._request.timing?.responseEnd || 0;

    if (config.checks.title) {
      const title = await page.title();
      console.log(`DEBUG: Page title: ${title}`);
      if (!title || title === 'Untitled') {
        issues.push({ page: normalizedUrl, type: 'Missing or empty title', severity: 'medium' });
      }
    }

    if (config.checks.httpStatus && status >= 400) {
      issues.push({ page: normalizedUrl, type: `HTTP Error ${status}`, severity: 'high' });
    }

    if (config.checks.seo) {
      const metaDescription = await page.$eval('meta[name="description"]', el => el?.content || '').catch(() => '');
      if (!metaDescription) {
        issues.push({ page: normalizedUrl, type: 'Missing meta description', severity: 'medium' });
      } else if (metaDescription.length > 160) {
        issues.push({ page: normalizedUrl, type: 'Meta description too long', details: `${metaDescription.length} chars`, severity: 'low' });
      }

      const h1Count = await page.$$eval('h1', hs => hs.length);
      if (h1Count === 0) {
        issues.push({ page: normalizedUrl, type: 'Missing H1 tag', severity: 'medium' });
      } else if (h1Count > 1) {
        issues.push({ page: normalizedUrl, type: 'Multiple H1 tags', details: `${h1Count} found`, severity: 'low' });
      }
    }

    if (config.checks.placeholders) {
      const bodyText = await page.textContent('body') || '';
      console.log(`DEBUG: Body content (first 100 chars): ${bodyText.substring(0, 100)}`);
      if (placeholderRegex.test(bodyText)) {
        const matches = bodyText.match(placeholderRegex) || [];
        console.log(`DEBUG: Detected placeholders in body (via match): ${matches.length > 0 ? matches.join(', ') : 'None extracted'}`);
        if (matches.length > 0) {
          issues.push({
            page: normalizedUrl,
            type: 'Placeholder text detected',
            details: `Found: ${matches.join(', ')}`,
            severity: 'low'
          });
        } else {
          console.warn(`⚠️ Placeholder regex matched but no placeholders captured on ${normalizedUrl}`);
          issues.push({
            page: normalizedUrl,
            type: 'Placeholder text detected',
            details: 'Found: Unknown (regex matched but no specific placeholders identified)',
            severity: 'low'
          });
        }
      }
    }

    const allLinks = config.checks.links || config.checks.placeholders 
      ? await page.$$eval('a[href]', (as) => as.map(a => ({ href: a.href, text: a.textContent.trim() }))) 
      : [];

    if (config.checks.placeholders) {
      for (const link of allLinks) {
        const cleanedHref = link.href.split('#')[0];
        if (placeholderRegex.test(cleanedHref)) {
          const hrefMatches = cleanedHref.match(placeholderRegex) || [];
          console.log(`DEBUG: Detected placeholders in link URL: ${cleanedHref} - ${hrefMatches.join(', ')}`);
          issues.push({
            page: normalizedUrl,
            link: cleanedHref,
            type: 'Placeholder in link URL',
            details: `Found: ${hrefMatches.join(', ')}`,
            severity: 'low'
          });
        }
        if (placeholderRegex.test(link.text)) {
          const textMatches = link.text.match(placeholderRegex) || [];
          console.log(`DEBUG: Detected placeholders in link text: ${cleanedHref} - ${textMatches.join(', ')}`);
          issues.push({
            page: normalizedUrl,
            link: cleanedHref,
            type: 'Placeholder in link text',
            details: `Found: ${textMatches.join(', ')}`,
            severity: 'low'
          });
        }
      }
    }

    if (config.checks.performance && loadTime > 5000) {
      issues.push({ page: normalizedUrl, type: 'Slow page load', details: `${(loadTime / 1000).toFixed(2)}s`, severity: 'medium' });
    }

    if (config.checks.images) {
      const images = await page.$$eval('img', imgs => imgs.map(img => ({ src: img.src, alt: img.alt })));
      images.forEach(img => {
        if (!img.alt) {
          issues.push({ page: normalizedUrl, type: 'Image missing alt text', details: img.src, severity: 'medium' });
        }
      });
    }

    if (config.checks.links) {
      let navLinks = [];
      if (config.skipRepeatedNavLinks) {
        navLinks = await page.$$eval(config.navSelector, (as) => as.map(a => ({ href: a.href, text: a.textContent.trim() })));
      }
    
      for (const link of allLinks) {
        const cleanedHref = link.href.split('#')[0];
    
        // Check for tel: links with invalid country codes or format
        if (config.checks.telLinks && cleanedHref.toLowerCase().startsWith('tel:')) {
          // Normalize case for country code check
          const lowerHref = cleanedHref.toLowerCase();
          const isValidCountryCode = config.telCountryCodes.some(code => lowerHref.startsWith(`tel:${code.toLowerCase()}`));
          if (!isValidCountryCode) {
            issues.push({
              page: normalizedUrl,
              link: cleanedHref,
              type: 'Invalid tel: link format',
              details: `Telephone link does not start with allowed country codes: ${config.telCountryCodes.join(', ')}`,
              severity: 'medium'
            });
          }
        
          // Validate href format: tel:+1 followed by exactly 10 digits
          const hrefRegex = /^tel:\+1\d{10}$/i;
          if (!hrefRegex.test(cleanedHref)) {
            issues.push({
              page: normalizedUrl,
              link: cleanedHref,
              type: 'Incorrect tel: link href format',
              details: `Expected tel:+1 followed by exactly 10 digits (e.g., tel:+11234567890), got ${cleanedHref}`,
              severity: 'medium'
            });
          }
        
          // Validate display text format: xxx.xxx.xxxx
          const displayText = link.text.trim();
          const displayRegex = /^\d{3}\.\d{3}\.\d{4}$/;
          if (!displayRegex.test(displayText)) {
            issues.push({
              page: normalizedUrl,
              link: cleanedHref,
              type: 'Incorrect tel: link display format',
              details: `Expected xxx.xxx.xxxx (e.g., 123.456.7890), got ${displayText}`,
              severity: 'medium'
            });
          }
        }
    
        if (!cleanedHref.startsWith('http')) continue;
    
        if (config.excludeUrls?.some(ex => cleanedHref.startsWith(ex))) {
          console.log(`↪️  Skipping excluded link: ${cleanedHref}`);
          continue;
        }
    
        const isNavLink = config.skipRepeatedNavLinks && navLinks.some(n => n.href === link.href);
        if (isNavLink && checkedNavLinks.has(cleanedHref)) {
          console.log(`↪️  Skipping repeated nav link: ${cleanedHref}`);
          continue;
        }
    
        console.log(`↪️  Checking link: ${cleanedHref}`);
        graph[normalizedUrl].push(cleanedHref);
    
        const parsed = new URL(cleanedHref, normalizedUrl);
        const isInternal = parsed.hostname === domain;
        if (isInternal) {
          totalUrls += !visited.has(parsed.href) ? 1 : 0;
        }
    
        if (isNavLink) {
          checkedNavLinks.add(cleanedHref);
        }
    
        try {
          const res = await withRetry(() => page.request.get(cleanedHref, { timeout: config.timeout }));
          const linkStatus = res.status();
    
          if (linkStatus >= 400) {
            issues.push({
              page: normalizedUrl,
              link: cleanedHref,
              type: `Broken link (Status: ${linkStatus})`,
              severity: 'high'
            });
          }
    
          if (isInternal && parsed.href.startsWith('http')) {
            issues.push({
              page: normalizedUrl,
              link: cleanedHref,
              type: 'Absolute internal link (should be relative)',
              severity: 'low'
            });
          }
    
          if (!link.text) {
            issues.push({
              page: normalizedUrl,
              link: cleanedHref,
              type: 'Link missing text',
              severity: 'medium'
            });
          }
    
          if (isInternal && !visited.has(parsed.href)) {
            await crawl(page, parsed.href, depth + 1);
          }
        } catch (err) {
          issues.push({
            page: normalizedUrl,
            link: cleanedHref,
            type: 'Link check failed',
            details: err.message,
            severity: 'medium'
          });
        }
      }
    }

    console.log(`✅ Completed: ${normalizedUrl} (${allLinks.length} links found) - Progress: ${visited.size}/${totalUrls} (${((visited.size / totalUrls) * 100).toFixed(1)}%)`);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.log(`Timeout on ${normalizedUrl}, skipping...`);
      issues.push({ page: normalizedUrl, type: 'Timeout exceeded', details: err.message, severity: 'medium' });
      return;
    }
    issues.push({
      page: normalizedUrl,
      type: 'Crawl failed',
      details: err.message,
      severity: 'high'
    });
    console.log(`❌ Failed to crawl ${normalizedUrl}: ${err.message}`);
  }
}

(async () => {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
  });
  const page = await context.newPage();

  let shuttingDown = false;
  const startTime = Date.now();

  async function saveResultsAndExit() {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🏁 Crawl completed in ${duration}s`);
    console.log(`📊 Stats: ${visited.size} pages visited, ${issues.length} issues found`);

    const report = {
      timestamp: new Date().toISOString(),
      startUrl: config.startUrl,
      pagesCrawled: visited.size,
      totalIssues: issues.length,
      issuesByType: {},
      issues: issues
    };

    issues.forEach(issue => {
      report.issuesByType[issue.type] = (report.issuesByType[issue.type] || 0) + 1;
    });

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    fs.writeFileSync(`${config.outputDir}/crawl-report-${timestamp}.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${config.outputDir}/site-graph-${timestamp}.json`, JSON.stringify(graph, null, 2));

    const csvRows = [
      'Page,Link,Type,Details,Severity',
      ...issues.map(i => `"${i.page}","${i.link || ''}","${i.type}","${i.details || ''}","${i.severity || 'low'}"`)
    ];
    fs.writeFileSync(`${config.outputDir}/issues-${timestamp}.csv`, csvRows.join('\n'));

    const html = `
      <html>
        <body>
          <h1>Crawl Report - ${config.startUrl}</h1>
          <p>Pages: ${visited.size}, Issues: ${issues.length}, Duration: ${duration}s</p>
          <table border="1">
            <tr><th>Page</th><th>Link</th><th>Type</th><th>Details</th><th>Severity</th></tr>
            ${issues.map(i => `<tr><td>${i.page}</td><td>${i.link || ''}</td><td>${i.type}</td><td>${i.details || ''}</td><td>${i.severity || 'low'}</td></tr>`).join('')}
          </table>
        </body>
      </html>`;
    fs.writeFileSync(`${config.outputDir}/report-${timestamp}.html`, html);

    console.log('\n📋 Issue Summary:');
    Object.entries(report.issuesByType).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

    return report;
  }

  process.on('SIGINT', async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Gracefully shutting down...');
    await browser.close();
    await saveResultsAndExit();
    process.exit(0);
  });

  await page.setDefaultNavigationTimeout(config.timeout);

  console.log(`Starting crawl of ${config.startUrl}`);

  try {
    const startUrls = config.useSitemap 
      ? await loadSitemapUrls(`${config.startUrl}/sitemap.xml`) 
      : [config.startUrl];
    
    if (startUrls.length === 0) {
      console.warn('⚠️ No URLs to crawl. Using startUrl as fallback.');
      startUrls.push(config.startUrl);
    }

    for (const url of startUrls) {
      await crawl(page, url);
    }
  } catch (err) {
    console.error('❌ Error during crawl setup:', err.message);
    issues.push({
      page: config.startUrl,
      type: 'Crawl setup failed',
      details: err.message,
      severity: 'high'
    });
  }

  await browser.close();
  const finalReport = await saveResultsAndExit();
})();