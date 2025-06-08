#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
    console.log('🚀 WhatsApp Financial Bot Setup\n');
    console.log('This script will help you configure your environment variables.\n');

    try {
        // Check if .env already exists
        if (fs.existsSync('.env')) {
            const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('Setup cancelled.');
                rl.close();
                return;
            }
        }

        // Collect environment variables
        console.log('📊 Please provide the following information:\n');

        const geminiApiKey = await question('🤖 Gemini API Key: ');
        if (!geminiApiKey.trim()) {
            throw new Error('Gemini API Key is required');
        }

        const spreadsheetId = await question('📈 Google Spreadsheet ID: ');
        if (!spreadsheetId.trim()) {
            throw new Error('Spreadsheet ID is required');
        }

        const userId = await question('👤 User ID (unique identifier for you): ');
        if (!userId.trim()) {
            throw new Error('User ID is required');
        }

        const authorizedNumbers = await question('📱 Authorized phone numbers (comma-separated with country code, e.g., 6281234567890,6289876543210): ');
        
        const credentialsPath = await question('🔑 Path to credentials.json (default: ./credentials.json): ') || './credentials.json';

        // Check if credentials file exists
        if (!fs.existsSync(credentialsPath)) {
            console.log(`⚠️  Warning: Credentials file not found at ${credentialsPath}`);
            console.log('Make sure to place your Google service account credentials at this location.');
        }

        // Create .env file
        const envContent = `# Gemini AI API Key
GEMINI_API_KEY=${geminiApiKey}

# Google Sheets Credentials (path to credentials.json file)
GOOGLE_SHEETS_CREDENTIALS=${credentialsPath}

# Google Spreadsheet ID
SPREADSHEET_ID=${spreadsheetId}

# User ID for the bot
USER_ID=${userId}

# Authorized phone numbers (comma-separated, with country code)
# Example: 6281234567890,6289876543210
AUTHORIZED_NUMBERS=${authorizedNumbers}
`;

        fs.writeFileSync('.env', envContent);

        console.log('\n✅ Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Make sure credentials.json is in the correct location');
        console.log('2. Run: npm install');
        console.log('3. Run: npm start');
        console.log('4. Scan the QR code with WhatsApp');
        console.log('\n📖 For detailed instructions, see README.md');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.log('\n💡 You can manually edit the .env file or run this setup again.');
    }

    rl.close();
}

// Run setup if this file is executed directly
if (require.main === module) {
    setup();
}

module.exports = { setup }; 