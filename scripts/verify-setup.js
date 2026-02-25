#!/usr/bin/env node

/**
 * Setup verification script
 * Checks if all required dependencies and configurations are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying project setup...\n');

const checks = [
  {
    name: 'Package.json exists',
    check: () => fs.existsSync('package.json'),
  },
  {
    name: 'Node modules installed',
    check: () => fs.existsSync('node_modules'),
  },
  {
    name: 'Prisma schema exists',
    check: () => fs.existsSync('prisma/schema.prisma'),
  },
  {
    name: 'Environment file exists',
    check: () => fs.existsSync('.env'),
  },
  {
    name: 'Docker compose file exists',
    check: () => fs.existsSync('docker-compose.yml'),
  },
  {
    name: 'ESLint config exists',
    check: () => fs.existsSync('eslint.config.mjs'),
  },
  {
    name: 'Prettier config exists',
    check: () => fs.existsSync('.prettierrc'),
  },
  {
    name: 'Jest config exists',
    check: () => fs.existsSync('jest.config.js'),
  },
  {
    name: 'TypeScript config exists',
    check: () => fs.existsSync('tsconfig.json'),
  },
  {
    name: 'PostCSS config exists (Tailwind)',
    check: () => fs.existsSync('postcss.config.mjs'),
  },
];

let allPassed = true;

checks.forEach(({ name, check }) => {
  const passed = check();
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (!passed) allPassed = false;
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All setup checks passed!');
  console.log('\nNext steps:');
  console.log('1. Start Docker services: npm run docker:up');
  console.log('2. Run database migrations: npm run db:migrate');
  console.log('3. Start development server: npm run dev');
} else {
  console.log('❌ Some setup checks failed. Please review the missing items above.');
  process.exit(1);
}

console.log('='.repeat(50));