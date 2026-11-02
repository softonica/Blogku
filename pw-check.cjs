const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const failed = [], errors = [], api = [];
  page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()||{}).errorText));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  page.on('response', r => { if (r.url().includes('/api/')) api.push(r.status() + ' ' + r.url()); });
  await page.goto('https://blog.artku.my.id/', { waitUntil: 'networkidle', timeout: 45000 }).catch(e=>errors.push('GOTO:'+e.message));
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body.innerText);
  console.log('HAS_ERROR_TEXT:', text.includes('Unable to reach the server'));
  console.log('FAILED:', JSON.stringify(failed, null, 1));
  console.log('API:', JSON.stringify(api, null, 1));
  console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0,8), null, 1));
  console.log('BODY_HEAD:', text.slice(0,400).replace(/\n+/g,' | '));
  await browser.close();
})();
