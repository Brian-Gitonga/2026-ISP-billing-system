/**
 * Voucher Code Generator
 * 
 * This script generates random voucher codes that you can upload to the system.
 * 
 * Usage:
 *   node scripts/generate-vouchers.js [count] [prefix]
 * 
 * Examples:
 *   node scripts/generate-vouchers.js 100
 *   node scripts/generate-vouchers.js 50 DAILY
 *   node scripts/generate-vouchers.js 200 PREMIUM
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 10;
const prefix = args[1] || 'WIFI';

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking chars
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Generate a voucher code
 */
function generateVoucherCode(prefix) {
  const randomPart = generateRandomString(8);
  return `${prefix}-${randomPart}`;
}

/**
 * Generate multiple unique voucher codes
 */
function generateVouchers(count, prefix) {
  const vouchers = new Set();
  
  while (vouchers.size < count) {
    vouchers.add(generateVoucherCode(prefix));
  }
  
  return Array.from(vouchers);
}

/**
 * Save vouchers to file
 */
function saveVouchers(vouchers, filename) {
  const content = vouchers.join('\n');
  const outputDir = path.join(__dirname, '..', 'output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  
  return filepath;
}

/**
 * Main function
 */
function main() {
  console.log('🎫 Voucher Code Generator\n');
  console.log(`Generating ${count} voucher codes with prefix "${prefix}"...\n`);
  
  const startTime = Date.now();
  const vouchers = generateVouchers(count, prefix);
  const endTime = Date.now();
  
  const filename = `vouchers-${prefix}-${Date.now()}.txt`;
  const filepath = saveVouchers(vouchers, filename);
  
  console.log('✅ Generation complete!\n');
  console.log(`📊 Statistics:`);
  console.log(`   - Total vouchers: ${vouchers.length}`);
  console.log(`   - Prefix: ${prefix}`);
  console.log(`   - Time taken: ${endTime - startTime}ms`);
  console.log(`   - File saved: ${filepath}\n`);
  
  console.log('📋 Sample vouchers:');
  vouchers.slice(0, 5).forEach((voucher, index) => {
    console.log(`   ${index + 1}. ${voucher}`);
  });
  
  if (vouchers.length > 5) {
    console.log(`   ... and ${vouchers.length - 5} more\n`);
  }
  
  console.log('💡 Next steps:');
  console.log('   1. Open the generated file');
  console.log('   2. Copy all voucher codes');
  console.log('   3. Go to Dashboard > Vouchers');
  console.log('   4. Click "Upload Vouchers"');
  console.log('   5. Select a plan');
  console.log('   6. Paste the voucher codes');
  console.log('   7. Click "Upload"\n');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

