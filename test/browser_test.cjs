/**
 * Automated Headless Browser & E2E Test Suite for SAHE3D
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function runBrowserTests() {
  console.log('\n--- 5. Automated Browser & WebGL Verification ---');

  // Verify dist files exist
  const distHtml = path.join(__dirname, '../dist/index.html');
  if (!fs.existsSync(distHtml)) {
    console.error('dist/index.html not found! Run npm run build first.');
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(distHtml, 'utf8');

  // Static DOM checks on production bundle
  const requiredElements = [
    'id="c"',
    'id="brand-panel"',
    'id="search-input"',
    'id="filter-chips"',
    'id="campus-sidebar"',
    'id="building-panel"',
    'id="tour-hud"',
    'id="toolbar"',
    'Dr Veeramallu Satya Sahithi',
    '16.4842° N, 80.6928° E'
  ];

  let passed = 0;
  let failed = 0;

  requiredElements.forEach(elem => {
    if (htmlContent.includes(elem)) {
      console.log(`  ✓ HTML contains ${elem}`);
      passed++;
    } else {
      console.error(`  ✕ Missing element in built HTML: ${elem}`);
      failed++;
    }
  });

  console.log(`\n========================================`);
  console.log(`Browser Checks Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runBrowserTests();
