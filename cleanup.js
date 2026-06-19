const fs = require('fs');
const path = require('path');

function removeDirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const stat = fs.lstatSync(dirPath);
  if (!stat.isDirectory()) {
    // Not a directory — attempt unlink
    try { fs.unlinkSync(dirPath); } catch (e) {}
    return;
  }
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    try {
      const st = fs.lstatSync(full);
      if (st.isDirectory()) {
        removeDirRecursive(full);
      } else {
        fs.unlinkSync(full);
      }
    } catch (e) {
      console.warn('Failed to remove', full, e.message);
    }
  }
  try {
    fs.rmdirSync(dirPath);
  } catch (e) {
    console.warn('Failed to rmdir', dirPath, e.message);
  }
}

function deleteTimestampedRuns() {
  const screenshotsBase = path.join(process.cwd(), 'artifacts', 'screenshots');
  if (!fs.existsSync(screenshotsBase)) {
    console.log('No screenshots directory found:', screenshotsBase);
    return;
  }
  const entries = fs.readdirSync(screenshotsBase, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;
    // match run- followed by 3 digits -> keep
    if (/^run-\d{3}$/.test(name)) {
      // keep
      continue;
    }
    // match run-YYYY-... or run-2026... timestamp style (contains T)
    if (/^run-\d{4}.*$/.test(name) || /^run-.*T.*Z$/.test(name)) {
      const full = path.join(screenshotsBase, name);
      console.log('Removing timestamped run folder:', full);
      removeDirRecursive(full);
    }
  }
}

function deleteTestArtifacts() {
  const target = path.join(process.cwd(), 'artifacts', 'test-artifacts');
  if (fs.existsSync(target)) {
    console.log('Removing test-artifacts:', target);
    removeDirRecursive(target);
  } else {
    console.log('No test-artifacts folder to remove');
  }
}

function deletePlaywrightArtifacts() {
  const target = path.join(process.cwd(), 'artifacts', 'playwright-output', '.playwright-artifacts-0');
  if (fs.existsSync(target)) {
    console.log('Removing playwright artifacts folder:', target);
    removeDirRecursive(target);
  } else {
    console.log('No playwright artifacts folder to remove at', target);
  }
}

function main() {
  try {
    deleteTimestampedRuns();
    deleteTestArtifacts();
    deletePlaywrightArtifacts();
    console.log('Cleanup complete.');
  } catch (e) {
    console.error('Cleanup failed:', e && e.message ? e.message : e);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = { removeDirRecursive, deleteTimestampedRuns, deleteTestArtifacts, deletePlaywrightArtifacts };
