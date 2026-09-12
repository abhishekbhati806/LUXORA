// scripts/render-probe.mjs — headless render verification against the served app.
// Loads every key route (plus guest/admin authenticated flows) in a real browser and
// fails if the expected post-skeleton content never appears. Run: `node scripts/render-probe.mjs`
// Optional env: PROBE_BASE=http://127.0.0.1:5173
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:4000';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

let errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 250)));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 250)));
page.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url().slice(BASE.length, 120)}`));

let ok = 0, n = 0;
async function visit(name, path, want, timeout = 20000) {
  n++; errors = [];
  const t0 = Date.now();
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForSelector(`text=${want}`, { timeout });
    console.log(`PASS  ${name.padEnd(15)} ${Date.now() - t0}ms`);
    ok++;
  } catch {
    const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log(`FAIL  ${name.padEnd(15)} want="${want}"\n      errors: ${errors.slice(0, 4).join(' | ') || 'none'}\n      body: ${body.replace(/\n/g, ' / ').slice(0, 220)}`);
  }
}
async function login(email, password) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700); // let React hydrate before submitting
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => Boolean(localStorage.getItem('luxora.token')), null, { timeout: 15000 });
}

await visit('home', '/', 'Stay somewhere unforgettable');
await visit('home-featured', '/', 'Exceptional stays, carefully selected');
await visit('discover', '/discover', 'Find your perfect stay');
await visit('hotel', '/stay/desert-oasis-camp', 'Guests');
await visit('hotel-reviews', '/stay/desert-oasis-camp', 'What guests said');
await visit('destinations', '/destinations', 'Paris');
await visit('experiences', '/experiences', 'The small things');
await visit('about', '/about', 'LUXORA');
await visit('login', '/login', 'Welcome back');
await visit('wishlist-anon', '/wishlist', 'Saved stays');

await login('aarav@me.com', 'LuxoraGuest#26');
await visit('account', '/account', 'Lifetime value');
await visit('trips', '/account/trips', 'Bay Glow Tower');
await visit('wishlist', '/wishlist', 'Saved stays');
await visit('book', '/stay/desert-oasis-camp/book', 'First name');

await page.evaluate(() => localStorage.clear());
await fetch(BASE + '/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
await login('admin@luxora.travel', 'LuxoraAdmin#26');
await visit('admin-dash', '/admin', 'Occupancy');
await visit('admin-hotels', '/admin/hotels', 'Desert Oasis Camp');
await visit('admin-bookings', '/admin/bookings', 'LX-');
await visit('admin-users', '/admin/users', 'luxora.travel');
await visit('admin-reviews', '/admin/reviews', 'stars');

console.log(`\n${ok}/${n} routes render with live data`);
await browser.close();
process.exit(ok === n ? 0 : 1);
