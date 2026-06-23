import fs from 'fs';
import path from 'path';

const runFile = path.resolve(process.cwd(), 'artifacts', 'screenshots', '.current-run');
const dir = path.dirname(runFile);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let nextRun = 'run-001';
if (fs.existsSync(runFile)) {
  const currentRun = fs.readFileSync(runFile, 'utf8').trim();
  const match = currentRun.match(/run-(\d+)/);
  const num = match ? parseInt(match[1], 10) + 1 : 2;
  nextRun = `run-${String(num).padStart(3, '0')}`;
} else {
  const base = path.resolve(process.cwd(), 'artifacts', 'screenshots');
  let max = 0;
  if (fs.existsSync(base)) {
    const entries = fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    for (const name of entries) {
      const m = name.match(/^run-(\d{3})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
  }
  nextRun = `run-${String(max + 1).padStart(3, '0')}`;
}
const outputDirBase = path.resolve(process.cwd(), 'artifacts', 'screenshots', nextRun);

const browsers = ['Chrome', 'Edge', 'Chromium', 'Firefox', 'WebKit', 'Mobile Chrome'];
for (const browser of browsers) {
  const browserDir = path.join(outputDirBase, browser);
  if (!fs.existsSync(browserDir)) {
    fs.mkdirSync(browserDir, { recursive: true });
  }
}

fs.writeFileSync(runFile, nextRun);
