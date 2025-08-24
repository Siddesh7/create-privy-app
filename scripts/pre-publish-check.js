#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running pre-publish checks...\n');

const checks = [];
let allPassed = true;

// Check if dist directory exists and has files
function checkDistDirectory() {
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    return { passed: false, message: '❌ dist/ directory does not exist. Run `npm run build` first.' };
  }
  
  const files = fs.readdirSync(distPath);
  if (files.length === 0) {
    return { passed: false, message: '❌ dist/ directory is empty. Run `npm run build` first.' };
  }
  
  // Check if index.js exists and has shebang
  const indexPath = path.join(distPath, 'index.js');
  if (!fs.existsSync(indexPath)) {
    return { passed: false, message: '❌ dist/index.js does not exist.' };
  }
  
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (!indexContent.startsWith('#!/usr/bin/env node')) {
    return { passed: false, message: '❌ dist/index.js is missing shebang line.' };
  }
  
  return { passed: true, message: '✅ dist/ directory is ready' };
}

// Check if required files exist
function checkRequiredFiles() {
  const requiredFiles = ['README.md', 'LICENSE', 'package.json'];
  const missing = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(__dirname, '..', file))) {
      missing.push(file);
    }
  }
  
  if (missing.length > 0) {
    return { passed: false, message: `❌ Missing required files: ${missing.join(', ')}` };
  }
  
  return { passed: true, message: '✅ All required files present' };
}

// Check package.json fields
function checkPackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'keywords', 'author', 'license'];
  const missing = [];
  
  for (const field of requiredFields) {
    if (!pkg[field]) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return { passed: false, message: `❌ Missing package.json fields: ${missing.join(', ')}` };
  }
  
  // Check if version is not 0.0.0 or similar
  if (pkg.version === '0.0.0' || pkg.version === '1.0.0-dev') {
    return { passed: false, message: '❌ Please update version number from default' };
  }
  
  return { passed: true, message: '✅ package.json is properly configured' };
}

// Check if build works
function checkBuild() {
  try {
    console.log('   Building project...');
    execSync('npm run build', { stdio: 'pipe' });
    return { passed: true, message: '✅ Build successful' };
  } catch (error) {
    return { passed: false, message: `❌ Build failed: ${error.message}` };
  }
}

// Check if CLI works
function checkCLI() {
  try {
    console.log('   Testing CLI...');
    const output = execSync('node dist/index.js --help', { encoding: 'utf8', stdio: 'pipe' });
    if (!output.includes('create-privy-app')) {
      return { passed: false, message: '❌ CLI help output seems incorrect' };
    }
    return { passed: true, message: '✅ CLI works correctly' };
  } catch (error) {
    return { passed: false, message: `❌ CLI test failed: ${error.message}` };
  }
}

// Run all checks
checks.push(checkRequiredFiles());
checks.push(checkPackageJson());
checks.push(checkBuild());
checks.push(checkDistDirectory());
checks.push(checkCLI());

// Display results
for (const check of checks) {
  console.log(check.message);
  if (!check.passed) {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Ready to publish.');
  console.log('\nTo publish:');
  console.log('  npm publish');
  console.log('\nFor beta release:');
  console.log('  npm publish --tag beta');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}
