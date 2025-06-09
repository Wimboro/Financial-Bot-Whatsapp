const { google } = require('googleapis');
const moment = require('moment');

class SheetsService {
    constructor(credentialsPath, spreadsheetId, userId) {
        this.spreadsheetId = spreadsheetId;
        this.userId = userId;
        this.auth = null;
        this.sheets = null;
        this.credentialsPath = credentialsPath;
    }

    async initialize() {
        try {
            console.log('Initializing Google Sheets service...');
            console.log('Credentials path:', this.credentialsPath);
            console.log('Spreadsheet ID:', this.spreadsheetId);
            console.log('User ID:', this.userId);
            
            // Load credentials from file
            const credentials = require(`../../${this.credentialsPath}`);
            console.log('Credentials loaded successfully');
            
            this.auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            
            // Ensure headers exist
            await this.ensureHeaders();
            console.log('Google Sheets service initialized successfully');
        } catch (error) {
            console.error('Error initializing Google Sheets:', error);
            console.error('Error details:', error);
            throw error;
        }
    }

    async ensureHeaders() {
        try {
            // Check if headers exist
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A1:F1',
            });

            if (!response.data.values || response.data.values.length === 0) {
                // Add headers
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: 'A1:F1',
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [['Date', 'Amount', 'Category', 'Description', 'User ID', 'Timestamp']]
                    }
                });
                console.log('Headers added to spreadsheet');
            }
        } catch (error) {
            console.error('Error ensuring headers:', error);
        }
    }

    async addTransaction(transaction, phoneNumber = null) {
        try {
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
            const userIdentifier = phoneNumber || this.userId; // Use phone number if provided, fallback to userId
            const row = [
                transaction.date,
                transaction.amount,
                transaction.category,
                transaction.description,
                userIdentifier,
                timestamp
            ];

            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'A:F',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [row]
                }
            });

            console.log('Transaction added to sheet:', transaction, 'User:', userIdentifier);
            return response.data;
        } catch (error) {
            console.error('Error adding transaction to sheet:', error);
            throw error;
        }
    }

    async addMultipleTransactions(transactions, phoneNumber = null) {
        try {
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
            const userIdentifier = phoneNumber || this.userId; // Use phone number if provided, fallback to userId
            const rows = transactions.map(transaction => [
                transaction.date,
                transaction.amount,
                transaction.category,
                transaction.description,
                userIdentifier,
                timestamp
            ]);

            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'A:F',
                valueInputOption: 'RAW',
                requestBody: {
                    values: rows
                }
            });

            console.log(`${transactions.length} transactions added to sheet for user:`, userIdentifier);
            return response.data;
        } catch (error) {
            console.error('Error adding multiple transactions to sheet:', error);
            throw error;
        }
    }

    async getAllTransactions() {
        try {
            console.log('Getting all transactions from spreadsheet...');
            console.log('Spreadsheet ID:', this.spreadsheetId);
            
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A:F',
            });

            console.log('Raw response from sheets:', response.data.values);

            if (!response.data.values || response.data.values.length <= 1) {
                console.log('No data found in spreadsheet');
                return [];
            }

            // Skip header row and include ALL transactions (no user filtering)
            const allRows = response.data.values.slice(1);
            console.log('All rows (excluding header):', allRows);
            
            const transactions = allRows.map((row, index) => ({
                id: index + 1,
                date: row[0] || '',
                amount: parseFloat(row[1]) || 0,
                category: row[2] || '',
                description: row[3] || '',
                userId: row[4] || '',
                timestamp: row[5] || ''
            }));

            console.log('Processed transactions (all users):', transactions);
            return transactions;
        } catch (error) {
            console.error('Error getting transactions from sheet:', error);
            console.error('Error details:', error);
            return [];
        }
    }

    async deleteTransaction(transactionId) {
        try {
            // Get all data to find the row to delete
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A:F',
            });

            if (!response.data.values || response.data.values.length <= 1) {
                return false;
            }

            // Find the row index (no user filtering - delete any transaction by ID)
            let rowToDelete = -1;

            // The transactionId corresponds to the row number (excluding header)
            if (transactionId > 0 && transactionId < response.data.values.length) {
                rowToDelete = transactionId + 1; // +1 because we need to account for header row
            }

            if (rowToDelete === -1 || rowToDelete > response.data.values.length) {
                console.log(`Transaction ${transactionId} not found`);
                return false;
            }

            // Delete the row
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                requestBody: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: 0,
                                dimension: 'ROWS',
                                startIndex: rowToDelete - 1,
                                endIndex: rowToDelete
                            }
                        }
                    }]
                }
            });

            console.log(`Transaction ${transactionId} deleted (all users)`);
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            return false;
        }
    }

    async getTotalSummary() {
        try {
            const transactions = await this.getAllTransactions();
            
            const summary = {
                totalTransactions: transactions.length,
                totalIncome: 0,
                totalExpenses: 0,
                netAmount: 0,
                categories: {},
                userBreakdown: {}
            };

            transactions.forEach(transaction => {
                const amount = transaction.amount;
                
                if (amount > 0) {
                    summary.totalIncome += amount;
                } else {
                    summary.totalExpenses += Math.abs(amount);
                }
                
                summary.netAmount += amount;

                // Category breakdown
                if (!summary.categories[transaction.category]) {
                    summary.categories[transaction.category] = 0;
                }
                summary.categories[transaction.category] += amount;

                // User breakdown
                if (!summary.userBreakdown[transaction.userId]) {
                    summary.userBreakdown[transaction.userId] = {
                        totalTransactions: 0,
                        totalAmount: 0,
                        income: 0,
                        expenses: 0
                    };
                }
                summary.userBreakdown[transaction.userId].totalTransactions++;
                summary.userBreakdown[transaction.userId].totalAmount += amount;
                if (amount > 0) {
                    summary.userBreakdown[transaction.userId].income += amount;
                } else {
                    summary.userBreakdown[transaction.userId].expenses += Math.abs(amount);
                }
            });

            return summary;
        } catch (error) {
            console.error('Error calculating summary:', error);
            return null;
        }
    }
}

module.exports = SheetsService; 