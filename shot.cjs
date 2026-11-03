const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://blog.artku.my.id/post/cara-deploy-blogku-di-vps', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const article = document.querySelector('article');
    const heads = article ? [...article.querySelectorAll('h2,h3,h4')] : [];
    return {
      articleFound: !!article,
      headings: heads.map((h) => ({ tag: h.tagName, id: h.id, text: h.textContent.trim().slice(0, 40) })),
      htmlHead: article ? article.innerHTML.slice(0, 300) : null,
      dock: !!document.querySelector('button[aria-label="Table of contents"]'),
      dockButtons: [...document.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')).slice(-8),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})();
