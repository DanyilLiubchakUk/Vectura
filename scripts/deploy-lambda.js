/**
 * Build and package Lambda for deployment
 * Combines tsup build + zip packaging into one command
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.join(process.cwd(), 'dist-lambda');
const outputFile = path.join(process.cwd(), 'backtest-lambda.zip');

console.log('Building Lambda...');

try {
    // Run tsup build
    execSync('npx tsup --config tsup.config.lambda.ts', {
        stdio: 'inherit',
        cwd: process.cwd()
    });
} catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
}

// Verify build output exists
if (!fs.existsSync(distDir)) {
    console.error('Error: dist-lambda directory not found after build');
    process.exit(1);
}

console.log('\nPackaging Lambda...');

// Create zip
const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    const sizeKB = Math.round(archive.pointer() / 1024);
    console.log(`\n✓ Created backtest-lambda.zip (${sizeKB} KB)`);
    console.log('\nNext steps:');
    console.log('  1. Go to AWS Lambda console');
    console.log('  2. Upload backtest-lambda.zip');
    console.log('  3. Set handler to: backtest-handler.handler');
});

archive.on('error', (err) => {
    console.error('Packaging failed:', err);
    process.exit(1);
});

archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();