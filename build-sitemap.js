
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://binary-horizons.pages.dev';
const KEY = '22f83cabcaef4a4891b36c3cb039dcf6';

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const URLS_FILE = path.join(ROOT, 'urls.txt');
const REDIRECTS_FILE = path.join(PUBLIC_DIR, '_redirects');
const SITEMAP_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');
const KEY_FILE = path.join(PUBLIC_DIR, `${KEY}.txt`);

if (!fs.existsSync(URLS_FILE)) {
  throw new Error('urls.txt missing. Build stopped.');
}

if (!fs.existsSync(REDIRECTS_FILE)) {
  throw new Error('public/_redirects missing. Deployment stopped.');
}

const redirectLines = fs.readFileSync(REDIRECTS_FILE, 'utf8')
  .split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith('#'));

if (redirectLines.length > 2000) {
  throw new Error(`Redirect rules exceed 2000: ${redirectLines.length}`);
}

const inputUrls = fs.readFileSync(URLS_FILE, 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);

const uniqueUrls = new Set();

for (const value of inputUrls) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }

  if (url.origin !== DOMAIN) {
    throw new Error(`Unexpected URL domain: ${value}`);
  }

  // Normalize duplicate slashes in the pathname.
  url.pathname = '/' + url.pathname.split('/').filter(Boolean).join('/');

  uniqueUrls.add(url.href);
}

if (uniqueUrls.size === 0) {
  throw new Error('No valid URLs found. Sitemap not generated.');
}

const lastmod = new Date().toISOString();

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

for (const url of uniqueUrls) {
  xml += '  <url>\n';
  xml += `    <loc>${escapeXml(url)}</loc>\n`;
  xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += '    <changefreq>hourly</changefreq>\n';
  xml += '  </url>\n';
}

xml += '</urlset>\n';

// Only write generated files. Never overwrite _redirects.
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');

// Publish the same IndexNow key used by ping-indexnow.js.
fs.writeFileSync(KEY_FILE, KEY, 'utf8');

console.log(`Sitemap URLs: ${uniqueUrls.size}`);
console.log(`lastmod: ${lastmod}`);
console.log('changefreq: hourly');
console.log(`Redirect rules preserved: ${redirectLines.length}`);
console.log('IndexNow key file generated.');
