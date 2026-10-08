import { execSync } from 'child_process';
import path from 'path';

const testFiles = [
  'test-lora-parser.ts',
  'test-ble-connection.ts',
  'test-thorough-ble-e2e.ts',
  'test-mobile-sqlite.ts',
  'test-public-chat-jess-thanu.ts',
  'test-private-chat-jess-thanu.ts',
  'test-personal-antenna-mesh.ts',
  'test-offline-bluetooth-only.ts',
  'test-end-to-end-mvp.ts',
  'test-live-connection.ts'
];

async function runAllTests() {
  console.log('===========================================================');
  console.log('    RUNNING ALL MOBILE SUITE INTEGRATION & UNIT TESTS      ');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    const testPath = path.join(__dirname, file);
    console.log(`▶ Executing test: ${file}...`);
    try {
      execSync(`npx ts-node "${testPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log(`\n✅ ${file} PASSED\n-----------------------------------------------------------\n`);
      passed++;
    } catch (err: any) {
      console.error(`\n❌ ${file} FAILED\n-----------------------------------------------------------\n`);
      failed++;
    }
  }

  console.log('===========================================================');
  console.log(`TEST SUMMARY: Total: ${testFiles.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
