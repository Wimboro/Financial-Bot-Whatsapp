const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment');
const { formatRupiahSimple } = require('../utils/currencyUtils');

class WhatsAppService {
    constructor(geminiService, sheetsService, authorizedNumbers = [], queryService = null) {
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './whatsapp-auth'
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        
        this.geminiService = geminiService;
        this.sheetsService = sheetsService;
        this.authorizedNumbers = authorizedNumbers;
        this.queryService = queryService;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('QR Code received, scan it with your WhatsApp app:');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('WhatsApp client is ready!');
        });

        this.client.on('message_create', async (message) => {
            // Only process messages sent to the bot (not from the bot)
            if (message.fromMe) return;

            // Check if sender is authorized (if authorization is enabled)
            if (this.authorizedNumbers.length > 0) {
                const senderNumber = message.from.replace('@c.us', '');
                const isAuthorized = this.authorizedNumbers.includes(senderNumber);
                
                if (!isAuthorized) {
                    console.log(`Unauthorized message from: ${senderNumber}`);
                    return; // Ignore messages from unauthorized numbers
                }
                
                console.log(`Authorized message from: ${senderNumber}`);
            }

            try {
                await this.handleMessage(message);
            } catch (error) {
                console.error('Error handling message:', error);
                await message.reply('Sorry, I encountered an error processing your message. Please try again.');
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp client disconnected:', reason);
        });
    }

    async handleMessage(message) {
        const messageBody = message.body.trim();
        const phoneNumber = message.from.replace('@c.us', '');
        console.log(`Received message: ${messageBody}`);



        // Handle commands
        if (messageBody.startsWith('/')) {
            await this.handleCommand(message, messageBody);
            return;
        }

        // Handle media messages (images)
        if (message.hasMedia) {
            await this.handleMediaMessage(message);
            return;
        }

        // Handle text messages for financial data
        if (messageBody.length > 0) {
            await this.handleTextMessage(message, messageBody);
        }
    }

    async handleCommand(message, command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();

        switch (cmd) {
            case '/help':
                const helpText = await this.geminiService.generateHelp();
                await message.reply(helpText);
                break;

            case '/total':
                await this.handleTotalCommand(message);
                break;

            case '/delete':
                const transactionId = parseInt(parts[1]);
                if (isNaN(transactionId)) {
                    await message.reply('Please provide a valid transaction ID. Usage: /delete [number]');
                    return;
                }
                await this.handleDeleteCommand(message, transactionId);
                break;

            case '/list':
                await this.handleListCommand(message);
                break;

            case '/report':
                await this.handleReportCommand(message, parts);
                break;

            default:
                await message.reply('Perintah tidak dikenal. Ketik /help untuk melihat perintah yang tersedia.');
        }
    }

    async handleTextMessage(message, messageBody) {
        try {
            const phoneNumber = message.from.replace('@c.us', '');
            
            // First, check if this is a query for financial data
            if (this.queryService) {
                console.log('Analyzing message intent...');
                const queryAnalysis = await this.queryService.analyzeQuery(messageBody);
                
                if (queryAnalysis.intent === 'QUERY' && queryAnalysis.confidence > 0.7) {
                    console.log('Detected financial query:', queryAnalysis);
                    await this.handleFinancialQuery(message, queryAnalysis);
                    return;
                }
            }

            console.log('Processing text message with Gemini...');
            const transactions = await this.geminiService.processTextMessage(messageBody);

            if (transactions.length === 0) {
                await message.reply('Saya tidak dapat menemukan informasi keuangan dalam pesan Anda. Coba jelaskan pendapatan atau pengeluaran seperti "belanja makan siang Rp25.000" atau "terima gaji Rp1.000.000".\n\nAtau tanyakan informasi keuangan seperti "transaksi hari ini" atau "pengeluaran bulan ini".');
                return;
            }

            // Process and validate transactions
            const validTransactions = transactions.map(t => ({
                date: t.date || moment().format('YYYY-MM-DD'),
                amount: parseFloat(t.amount) || 0,
                category: t.category || 'Other',
                description: t.description || 'No description'
            })).filter(t => t.amount !== 0);

            if (validTransactions.length === 0) {
                await message.reply('Saya menemukan transaksi potensial tetapi tidak dapat mengekstrak jumlah yang valid. Silakan coba lagi dengan informasi yang lebih jelas.');
                return;
            }

            // Save to Google Sheets with phone number
            if (validTransactions.length === 1) {
                await this.sheetsService.addTransaction(validTransactions[0], phoneNumber);
            } else {
                await this.sheetsService.addMultipleTransactions(validTransactions, phoneNumber);
            }

            // Send confirmation
            let response = `✅ Tercatat ${validTransactions.length} transaksi:\n\n`;
            validTransactions.forEach((t, index) => {
                const amountText = formatRupiahSimple(t.amount);
                response += `${index + 1}. ${amountText} - ${t.category}\n   ${t.description}\n   Tanggal: ${t.date}\n\n`;
            });

            await message.reply(response);

        } catch (error) {
            console.error('Error processing text message:', error);
            await message.reply('Maaf, saya mengalami masalah memproses pesan Anda. Silakan coba lagi.');
        }
    }

    async handleMediaMessage(message) {
        try {
            const phoneNumber = message.from.replace('@c.us', '');
            
            console.log('Processing image message...');
            const media = await message.downloadMedia();
            
            if (!media || !media.mimetype.startsWith('image/')) {
                await message.reply('Silakan kirim file gambar (struk/nota) untuk diproses.');
                return;
            }

            const imageBuffer = Buffer.from(media.data, 'base64');
            const transactions = await this.geminiService.processImageMessage(imageBuffer);

            if (transactions.length === 0) {
                await message.reply('Saya tidak dapat mengekstrak informasi keuangan dari gambar ini. Pastikan itu foto yang jelas dari struk atau nota.');
                return;
            }

            // Process and validate transactions
            const validTransactions = transactions.map(t => ({
                date: t.date || moment().format('YYYY-MM-DD'),
                amount: parseFloat(t.amount) || 0,
                category: t.category || 'Other',
                description: t.description || 'From receipt'
            })).filter(t => t.amount !== 0);

            if (validTransactions.length === 0) {
                await message.reply('Saya menemukan transaksi potensial tetapi tidak dapat mengekstrak jumlah yang valid dari gambar.');
                return;
            }

            // Save to Google Sheets with phone number
            if (validTransactions.length === 1) {
                await this.sheetsService.addTransaction(validTransactions[0], phoneNumber);
            } else {
                await this.sheetsService.addMultipleTransactions(validTransactions, phoneNumber);
            }

            // Send confirmation
            let response = `📸 Struk diproses dan tercatat ${validTransactions.length} transaksi:\n\n`;
            validTransactions.forEach((t, index) => {
                const amountText = formatRupiahSimple(t.amount);
                response += `${index + 1}. ${amountText} - ${t.category}\n   ${t.description}\n   Tanggal: ${t.date}\n\n`;
            });

            await message.reply(response);

        } catch (error) {
            console.error('Error processing image message:', error);
            await message.reply('Maaf, saya mengalami masalah memproses gambar Anda. Silakan coba lagi dengan foto struk atau nota yang jelas.');
        }
    }

    async handleTotalCommand(message) {
        try {
            console.log('Handling /total command...');
            const summary = await this.sheetsService.getTotalSummary();
            console.log('Summary received:', summary);
            
            if (!summary) {
                console.log('No summary data received');
                await message.reply('Maaf, saya tidak dapat mengambil ringkasan transaksi. Silakan coba lagi.');
                return;
            }

            let response = `📊 *Ringkasan Keuangan (Semua Pengguna)*\n\n`;
            response += `💰 Total Pendapatan: ${formatRupiahSimple(summary.totalIncome)}\n`;
            response += `💸 Total Pengeluaran: ${formatRupiahSimple(-summary.totalExpenses)}\n`;
            response += `📈 Jumlah Bersih: ${formatRupiahSimple(summary.netAmount)}\n`;
            response += `📝 Total Transaksi: ${summary.totalTransactions}\n\n`;

            if (Object.keys(summary.categories).length > 0) {
                response += `*Kategori:*\n`;
                Object.entries(summary.categories)
                    .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                    .forEach(([category, amount]) => {
                        response += `• ${category}: ${formatRupiahSimple(amount)}\n`;
                    });
                response += `\n`;
            }

            if (Object.keys(summary.userBreakdown).length > 0) {
                response += `*Per Pengguna:*\n`;
                Object.entries(summary.userBreakdown)
                    .sort(([,a], [,b]) => b.totalTransactions - a.totalTransactions)
                    .forEach(([userId, userData]) => {
                        const netAmount = userData.income - userData.expenses;
                        response += `👤 Pengguna ${userId}:\n`;
                        response += `   Transaksi: ${userData.totalTransactions}\n`;
                        response += `   Pendapatan: ${formatRupiahSimple(userData.income)}\n`;
                        response += `   Pengeluaran: ${formatRupiahSimple(-userData.expenses)}\n`;
                        response += `   Bersih: ${formatRupiahSimple(netAmount)}\n\n`;
                    });
            }

            await message.reply(response);

        } catch (error) {
            console.error('Error getting total summary:', error);
            await message.reply('Maaf, saya tidak dapat mengambil ringkasan transaksi Anda. Silakan coba lagi.');
        }
    }

    async handleListCommand(message) {
        try {
            console.log('Handling /list command...');
            const transactions = await this.sheetsService.getAllTransactions();
            console.log('Transactions received:', transactions);
            
            if (transactions.length === 0) {
                console.log('No transactions found');
                await message.reply('Tidak ada transaksi yang tercatat dalam sistem.');
                return;
            }

            let response = `📋 *Transaksi Terbaru (Semua Pengguna)*\n\n`;
            const recentTransactions = transactions.slice(-10).reverse(); // Last 10 transactions

            recentTransactions.forEach((t, index) => {
                const amountText = formatRupiahSimple(t.amount);
                response += `${t.id}. ${amountText} - ${t.category}\n   ${t.description}\n   👤 Pengguna: ${t.userId}\n   📅 ${t.date}\n\n`;
            });

            if (transactions.length > 10) {
                response += `\n... dan ${transactions.length - 10} transaksi lainnya.\nGunakan /total untuk ringkasan lengkap.`;
            }

            await message.reply(response);

        } catch (error) {
            console.error('Error listing transactions:', error);
            await message.reply('Maaf, saya tidak dapat mengambil transaksi Anda. Silakan coba lagi.');
        }
    }

    async handleDeleteCommand(message, transactionId) {
        try {
            const success = await this.sheetsService.deleteTransaction(transactionId);
            
            if (success) {
                await message.reply(`✅ Transaksi #${transactionId} telah dihapus.`);
            } else {
                await message.reply(`❌ Tidak dapat menemukan transaksi #${transactionId}. Gunakan /list untuk melihat transaksi yang tersedia.`);
            }

        } catch (error) {
            console.error('Error deleting transaction:', error);
            await message.reply('Maaf, saya tidak dapat menghapus transaksi. Silakan coba lagi.');
        }
    }

    async start() {
        console.log('Starting WhatsApp bot...');
        await this.client.initialize();
    }

    async handleFinancialQuery(message, queryAnalysis) {
        try {
            console.log('Handling financial query...');
            const transactions = await this.sheetsService.getAllTransactions();
            
            if (!this.queryService) {
                await message.reply('Maaf, layanan query tidak tersedia saat ini.');
                return;
            }

            const response = await this.queryService.compileFinancialData(queryAnalysis, transactions);
            await message.reply(response);

        } catch (error) {
            console.error('Error handling financial query:', error);
            await message.reply('Maaf, saya mengalami masalah memproses permintaan Anda. Silakan coba lagi.');
        }
    }

    async handleReportCommand(message, parts) {
        try {
            if (!this.queryService) {
                await message.reply('Maaf, layanan laporan tidak tersedia saat ini.');
                return;
            }

            console.log('Handling /report command...');
            const transactions = await this.sheetsService.getAllTransactions();
            
            // Parse command parameters
            let month = null;
            let year = null;
            
            if (parts.length > 1) {
                // Handle formats like /report 12 2024 or /report 2024-12
                if (parts.length === 3) {
                    month = parseInt(parts[1]);
                    year = parseInt(parts[2]);
                } else if (parts[1].includes('-')) {
                    const dateParts = parts[1].split('-');
                    if (dateParts.length === 2) {
                        year = parseInt(dateParts[0]);
                        month = parseInt(dateParts[1]);
                    }
                } else {
                    // Single parameter could be year or month
                    const param = parseInt(parts[1]);
                    if (param > 12) {
                        year = param; // Assume it's a year
                    } else {
                        month = param; // Assume it's a month
                    }
                }
            }

            const report = await this.queryService.generateMonthlyReport(transactions, month, year);
            await message.reply(report);

        } catch (error) {
            console.error('Error generating monthly report:', error);
            await message.reply('Maaf, saya tidak dapat membuat laporan bulanan. Silakan coba lagi.');
        }
    }

    async stop() {
        await this.client.destroy();
    }
}

module.exports = WhatsAppService; 