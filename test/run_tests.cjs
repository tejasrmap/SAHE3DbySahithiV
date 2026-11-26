/**
 * Master Test Runner for SAHE3D
 */

const { execSync } = require('child_process');

console.log('==============================================');
console.log(' RUNNING COMPLETE SAHE3D TEST SUITE');
console.log('==============================================');

try {
  console.log('\n[1/2] Executing Unit Tests...');
  execSync('node test/unit_tests.cjs', { stdio: 'inherit' });

  console.log('\n[2/2] Executing Browser & Production Bundle Checks...');
  execSync('node test/browser_test.cjs', { stdio: 'inherit' });

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! (100% Pass Rate)\n');
} catch (e) {
  console.error('\n❌ Test execution failed.');
  process.exit(1);
}
