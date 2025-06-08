require('dotenv').config();
const GeminiService = require('./services/geminiService');
const SheetsService = require('./services/sheetsService');
const WhatsAppService = require('./services/whatsappService');
const QueryService = require('./services/queryService');

async function main() {
    try {
        console.log('🚀 Memulai Bot Keuangan WhatsApp...');

        // Validate environment variables
        const requiredEnvVars = ['GEMINI_API_KEY', 'GOOGLE_SHEETS_CREDENTIALS', 'SPREADSHEET_ID', 'USER_ID'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Variabel lingkungan yang diperlukan tidak ada: ${envVar}`);
            }
        }

        // Parse authorized numbers
        const authorizedNumbers = process.env.AUTHORIZED_NUMBERS 
            ? process.env.AUTHORIZED_NUMBERS.split(',').map(num => num.trim())
            : [];
        
        if (authorizedNumbers.length > 0) {
            console.log(`🔐 Bot akan merespons ${authorizedNumbers.length} nomor yang diotorisasi`);
        } else {
            console.log('⚠️  Tidak ada nomor yang diotorisasi - bot akan merespons semua pesan');
        }

        // Initialize services
        console.log('📊 Menginisialisasi layanan Gemini AI...');
        const geminiService = new GeminiService(process.env.GEMINI_API_KEY);

        console.log('🔍 Menginisialisasi layanan Query AI...');
        const queryService = new QueryService(process.env.GEMINI_API_KEY);

        console.log('📈 Menginisialisasi layanan Google Sheets...');
        const sheetsService = new SheetsService(
            process.env.GOOGLE_SHEETS_CREDENTIALS,
            process.env.SPREADSHEET_ID,
            process.env.USER_ID
        );
        await sheetsService.initialize();

        console.log('💬 Menginisialisasi layanan WhatsApp...');
        const whatsappService = new WhatsAppService(geminiService, sheetsService, authorizedNumbers, queryService);

        // Start the WhatsApp bot
        await whatsappService.start();

        console.log('✅ Bot Keuangan WhatsApp sedang berjalan!');
        console.log('📱 Scan kode QR dengan WhatsApp Anda untuk terhubung');
        console.log('💡 Kirim pesan teks atau gambar untuk melacak keuangan Anda');
        console.log('🔍 Tanyakan data keuangan: "transaksi hari ini", "pengeluaran bulan ini"');
        console.log('📊 Laporan bulanan: /report untuk bulan ini, /report [bulan] [tahun]');
        console.log('🔧 Perintah yang tersedia: /help, /total, /list, /delete [id], /report');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Mematikan bot...');
            await whatsappService.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Mematikan bot...');
            await whatsappService.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error starting the bot:', error.message);
        console.error('💡 Make sure all environment variables are set correctly in .env file');
        console.error('💡 Make sure credentials.json file exists and is valid');
        process.exit(1);
    }
}

// Start the application
main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
}); 