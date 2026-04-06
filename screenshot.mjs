/**
 * Screenshot tool — uses Puppeteer if available, falls back to Python Playwright.
 * Usage:
 *   node screenshot.mjs http://localhost:3000
 *   node screenshot.mjs http://localhost:3000 hero
 */
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT   = path.dirname(fileURLToPath(import.meta.url));
const OUT    = path.join(ROOT, "temporary screenshots");
const URL    = process.argv[2] ?? "http://localhost:3000";
const LABEL  = process.argv[3] ?? "";

fs.mkdirSync(OUT, { recursive: true });

// Auto-increment screenshot number
const existing = fs.readdirSync(OUT).filter(f => f.startsWith("screenshot-") && f.endsWith(".png"));
const nums = existing.map(f => parseInt(f.replace("screenshot-", "").split("-")[0])).filter(n => !isNaN(n));
const n = nums.length ? Math.max(...nums) + 1 : 1;
const name = LABEL ? `screenshot-${n}-${LABEL}.png` : `screenshot-${n}.png`;
const outPath = path.join(OUT, name);

// Try puppeteer first
const puppeteerPaths = [
  "C:/Users/nateh/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer",
  path.join(ROOT, "node_modules/puppeteer"),
];

let usedPuppeteer = false;
for (const p of puppeteerPaths) {
  if (fs.existsSync(p)) {
    try {
      const { default: puppeteer } = await import(p + "/lib/esm/puppeteer/puppeteer.js");
      const browser = await puppeteer.launch({ headless: "new" });
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(URL, { waitUntil: "networkidle2" });
      await page.screenshot({ path: outPath, fullPage: true });
      await browser.close();
      usedPuppeteer = true;
      break;
    } catch { /* try next */ }
  }
}

// Fallback: Python Playwright
if (!usedPuppeteer) {
  const py = [
    "C:/Users/gabri/AppData/Local/Programs/Python/Python311/python.exe",
    "python",
    "python3",
  ].find(p => { try { spawnSync(p, ["--version"]); return true; } catch { return false; } });

  if (!py) { console.error("No screenshot tool available."); process.exit(1); }

  const script = `
import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width":1440,"height":900})
    pg.goto("${URL}", wait_until="networkidle")
    pg.screenshot(path=r"${outPath.replace(/\\/g, "\\\\")}", full_page=True)
    b.close()
`;
  spawnSync(py, ["-c", script], { stdio: "inherit" });
}

console.log(outPath);
