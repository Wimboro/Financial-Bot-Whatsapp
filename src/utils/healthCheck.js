const fs = require('fs');
const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');
const TimeService = require('./timeService');

class HealthCheck {
    static async checkEnvironmentVariables() {
        const requiredVars = ['GEMINI_API_KEY', 'GOOGLE_SHEETS_CREDENTIALS', 'SPREADSHEET_ID', 'USER_ID'];
        const missing = [];

        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missing.push(varName);
            }
        }

        return {
            success: missing.length === 0,
            missing,
            message: missing.length === 0 ? 'All environment variables present' : `Missing: ${missing.join(', ')}`
        };
    }

    static async checkCredentialsFile() {
        try {
            const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS || './credentials.json';
            
            if (!fs.existsSync(credentialsPath)) {
                return {
                    success: false,
                    message: `Credentials file not found at ${credentialsPath}`
                };
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            
            if (!credentials.type || credentials.type !== 'service_account') {
                return {
                    success: false,
                    message: 'Invalid credentials file format'
                };
            }

            return {
                success: true,
                message: 'Credentials file found and valid'
            };
        } catch (error) {
            return {
                success: false,
                message: `Error reading credentials: ${error.message}`
            };
        }
    }

    static async checkGoogleSheets() {
        try {
            const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS || './credentials.json';
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            const sheets = google.sheets({ version: 'v4', auth });
            
            // Try to access the spreadsheet
            await sheets.spreadsheets.get({
                spreadsheetId: process.env.SPREADSHEET_ID
            });

            return {
                success: true,
                message: 'Google Sheets connection successful'
            };
        } catch (error) {
            return {
                success: false,
                message: `Google Sheets error: ${error.message}`
            };
        }
    }

    static async checkGeminiAPI() {
        try {
            const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            // Simple test prompt
            const result = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: "Hello, respond with 'API working'",
            });
            const text = result.text;

            return {
                success: true,
                message: `Gemini API working: ${text.substring(0, 50)}...`
            };
        } catch (error) {
            return {
                success: false,
                message: `Gemini API error: ${error.message}`
            };
        }
    }

    static async checkTimeAPI() {
        try {
            const timeService = new TimeService();
            const timeData = await timeService.getCurrentTime();
            
            return {
                success: true,
                message: `Time API working: ${timeData.currentTime} (${timeData.timezone})`
            };
        } catch (error) {
            return {
                success: false,
                message: `Time API error: ${error.message}`
            };
        }
    }

    static async runAllChecks() {
        console.log('🔍 Running health checks...\n');

        const checks = [
            { name: 'Environment Variables', check: this.checkEnvironmentVariables },
            { name: 'Credentials File', check: this.checkCredentialsFile },
            { name: 'Google Sheets', check: this.checkGoogleSheets },
            { name: 'Gemini API', check: this.checkGeminiAPI },
            { name: 'Time API', check: this.checkTimeAPI }
        ];

        const results = [];
        let allPassed = true;

        for (const { name, check } of checks) {
            try {
                console.log(`Checking ${name}...`);
                const result = await check();
                results.push({ name, ...result });
                
                const status = result.success ? '✅' : '❌';
                console.log(`${status} ${name}: ${result.message}`);
                
                if (!result.success) {
                    allPassed = false;
                }
            } catch (error) {
                const errorResult = {
                    name,
                    success: false,
                    message: `Unexpected error: ${error.message}`
                };
                results.push(errorResult);
                console.log(`❌ ${name}: ${errorResult.message}`);
                allPassed = false;
            }
            console.log('');
        }

        console.log(`🎯 Overall Status: ${allPassed ? '✅ All checks passed' : '❌ Some checks failed'}`);
        
        if (!allPassed) {
            console.log('\n💡 Tips:');
            console.log('- Run `npm run setup` to configure environment variables');
            console.log('- Make sure credentials.json is properly configured');
            console.log('- Check that your spreadsheet is shared with the service account');
            console.log('- Verify your Gemini API key is valid');
        }

        return { allPassed, results };
    }
}

module.exports = HealthCheck; 