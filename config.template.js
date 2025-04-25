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
      "https://SITENAME.com/",
      "SITENAME.com",
      "GOES HERE",
      "XX",
      "https://www.placeholder1.com/",
      "https://placeholder2.com/",
      "placeholdertext.",
      "Lorem ipsum",
      "000",
      "000.000.0000",
      "XXX.XXX.XXXX",
      "ADDRESS",
      "CITY",
      "STATE",
      "ZIP",
      "placeholder",
      "placeholders"
    ],
    excludeUrls: ["https://exampleToExclude.com/"],
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
  