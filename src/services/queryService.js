const { GoogleGenAI } = require('@google/genai');
const moment = require('moment');
const { formatRupiahSimple } = require('../utils/currencyUtils');
const TimeService = require('../utils/timeService');

class QueryService {
    constructor(apiKey) {
        this.genAI = new GoogleGenAI({ apiKey: apiKey });
        this.timeService = new TimeService();
    }

    async analyzeQuery(query) {
        try {
            // Get current time context
            const timeContext = await this.timeService.formatTimeForPrompt();
            
            const prompt = `
${timeContext}

Analisis pesan pengguna dan tentukan apakah ini adalah:
1. QUERY - permintaan informasi keuangan (seperti "transaksi hari ini", "pengeluaran bulan ini", "total pendapatan")
2. TRANSACTION - data transaksi keuangan untuk dicatat
3. OTHER - pesan lain

Jika ini adalah QUERY, ekstrak informasi berikut:
- type: "daily", "weekly", "monthly", "yearly", "category", "summary", "recent"
- period: tanggal spesifik atau periode (hari ini, minggu ini, bulan ini, dll)
- category: kategori spesifik jika disebutkan
- limit: jumlah data yang diminta jika disebutkan

PENTING: Gunakan informasi waktu di atas untuk memahami konteks temporal dengan benar.
Contoh:
- "transaksi hari ini" -> gunakan tanggal saat ini dari informasi waktu
- "pengeluaran kemarin" -> hitung tanggal kemarin berdasarkan waktu saat ini
- "minggu ini" -> tentukan rentang minggu berdasarkan hari saat ini
- "bulan lalu" -> tentukan bulan sebelumnya berdasarkan bulan saat ini

Contoh query yang dipahami:
- "transaksi hari ini" -> type: daily, period: today
- "pengeluaran minggu ini" -> type: weekly, period: this_week
- "total pendapatan bulan ini" -> type: monthly, period: this_month
- "transaksi makanan" -> type: category, category: Makanan
- "5 transaksi terakhir" -> type: recent, limit: 5
- "ringkasan keuangan" -> type: summary

Kembalikan JSON dengan format:
{
  "intent": "QUERY" | "TRANSACTION" | "OTHER",
  "queryType": "daily" | "weekly" | "monthly" | "yearly" | "category" | "summary" | "recent",
  "period": "today" | "yesterday" | "this_week" | "this_month" | "this_year" | "last_week" | "last_month" | "YYYY-MM-DD",
  "category": "kategori jika disebutkan",
  "limit": number,
  "confidence": 0.0-1.0
}

User message: "${query}"
`;

            const result = await this.genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });
            
            const text = result.text;
            
            try {
                const cleanText = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanText);
            } catch (parseError) {
                console.error('Error parsing query analysis:', parseError);
                return { intent: 'OTHER', confidence: 0 };
            }
        } catch (error) {
            console.error('Error analyzing query:', error);
            return { intent: 'OTHER', confidence: 0 };
        }
    }

    async compileFinancialData(queryAnalysis, transactions) {
        try {
            const { queryType, period, category, limit } = queryAnalysis;
            let filteredTransactions = [...transactions];
            let title = '';

            // Filter by period using TimeService for accurate current time
            if (period) {
                const timeData = await this.timeService.getCurrentTime();
                const now = moment(timeData.currentTime);
                let startDate, endDate;

                switch (period) {
                    case 'today':
                        startDate = now.clone().startOf('day');
                        endDate = now.clone().endOf('day');
                        title = 'Hari Ini';
                        break;
                    case 'yesterday':
                        startDate = now.clone().subtract(1, 'day').startOf('day');
                        endDate = now.clone().subtract(1, 'day').endOf('day');
                        title = 'Kemarin';
                        break;
                    case 'this_week':
                        startDate = now.clone().startOf('week');
                        endDate = now.clone().endOf('week');
                        title = 'Minggu Ini';
                        break;
                    case 'last_week':
                        startDate = now.clone().subtract(1, 'week').startOf('week');
                        endDate = now.clone().subtract(1, 'week').endOf('week');
                        title = 'Minggu Lalu';
                        break;
                    case 'this_month':
                        startDate = now.clone().startOf('month');
                        endDate = now.clone().endOf('month');
                        title = 'Bulan Ini';
                        break;
                    case 'last_month':
                        startDate = now.clone().subtract(1, 'month').startOf('month');
                        endDate = now.clone().subtract(1, 'month').endOf('month');
                        title = 'Bulan Lalu';
                        break;
                    case 'this_year':
                        startDate = now.clone().startOf('year');
                        endDate = now.clone().endOf('year');
                        title = 'Tahun Ini';
                        break;
                    default:
                        // Try to parse as specific date
                        if (moment(period, 'YYYY-MM-DD', true).isValid()) {
                            startDate = moment(period).startOf('day');
                            endDate = moment(period).endOf('day');
                            title = moment(period).format('DD MMMM YYYY');
                        }
                }

                if (startDate && endDate) {
                    filteredTransactions = filteredTransactions.filter(t => {
                        const transactionDate = moment(t.date);
                        return transactionDate.isBetween(startDate, endDate, null, '[]');
                    });
                }
            }

            // Filter by category
            if (category) {
                filteredTransactions = filteredTransactions.filter(t => 
                    t.category.toLowerCase().includes(category.toLowerCase())
                );
                title += (title ? ' - ' : '') + `Kategori ${category}`;
            }

            // Apply limit for recent transactions
            if (queryType === 'recent' && limit) {
                filteredTransactions = filteredTransactions.slice(-limit).reverse();
                title = `${limit} Transaksi Terakhir`;
            }

            // Compile response based on query type
            return await this.formatResponse(queryType, filteredTransactions, title);

        } catch (error) {
            console.error('Error compiling financial data:', error);
            return 'Maaf, saya tidak dapat mengompilasi data keuangan saat ini.';
        }
    }

    async formatResponse(queryType, transactions, title) {
        if (transactions.length === 0) {
            return `📊 *${title}*\n\nTidak ada transaksi ditemukan untuk periode ini.`;
        }

        // Add time context for better user understanding
        const timeData = await this.timeService.getCurrentTime();
        const currentTimeStr = moment(timeData.currentTime).format('DD MMMM YYYY, HH:mm');
        
        let response = `📊 *${title}*\n`;
        response += `🕐 Diambil pada: ${currentTimeStr} WIB\n\n`;

        // Calculate totals
        const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const netAmount = totalIncome - totalExpenses;

        // Summary section
        response += `💰 Total Pendapatan: ${formatRupiahSimple(totalIncome)}\n`;
        response += `💸 Total Pengeluaran: ${formatRupiahSimple(totalExpenses)}\n`;
        response += `📈 Jumlah Bersih: ${formatRupiahSimple(netAmount)}\n`;
        response += `📝 Total Transaksi: ${transactions.length}\n\n`;

        // Category breakdown for summary or monthly reports
        if (queryType === 'summary' || queryType === 'monthly') {
            const categories = {};
            transactions.forEach(t => {
                if (!categories[t.category]) {
                    categories[t.category] = 0;
                }
                categories[t.category] += t.amount;
            });

            if (Object.keys(categories).length > 0) {
                response += `*Breakdown Kategori:*\n`;
                Object.entries(categories)
                    .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                    .forEach(([category, amount]) => {
                        response += `• ${category}: ${formatRupiahSimple(amount)}\n`;
                    });
                response += `\n`;
            }
        }

        // Transaction list for daily, recent, or category queries
        if (queryType === 'daily' || queryType === 'recent' || queryType === 'category') {
            response += `*Detail Transaksi:*\n`;
            const displayTransactions = transactions.slice(0, 10); // Limit to 10 for readability
            
            displayTransactions.forEach((t, index) => {
                const amountText = formatRupiahSimple(t.amount);
                response += `${index + 1}. ${amountText} - ${t.category}\n   ${t.description}\n   📅 ${t.date}\n\n`;
            });

            if (transactions.length > 10) {
                response += `... dan ${transactions.length - 10} transaksi lainnya.\n`;
            }
        }

        return response;
    }

    async generateMonthlyReport(transactions, month = null, year = null) {
        try {
            // Use TimeService for accurate current time
            const timeData = await this.timeService.getCurrentTime();
            const currentTime = moment(timeData.currentTime);
            
            const targetMonth = month || currentTime.month() + 1;
            const targetYear = year || currentTime.year();
            
            // Filter transactions for the target month
            const monthlyTransactions = transactions.filter(t => {
                const transactionDate = moment(t.date);
                return transactionDate.month() + 1 === targetMonth && transactionDate.year() === targetYear;
            });

            const monthName = moment().month(targetMonth - 1).format('MMMM');
            
            if (monthlyTransactions.length === 0) {
                return `📊 *Laporan Bulanan ${monthName} ${targetYear}*\n\nTidak ada transaksi tercatat untuk bulan ini.`;
            }

            // Use Gemini Pro to generate intelligent insights with time context
            const timeContext = await this.timeService.formatTimeForPrompt();
            const prompt = `
${timeContext}

Sebagai asisten keuangan personal, buatlah laporan bulanan yang komprehensif berdasarkan data transaksi berikut:

Data Transaksi ${monthName} ${targetYear}:
${monthlyTransactions.map(t => `${t.date}: ${t.amount} - ${t.category} (${t.description})`).join('\n')}

Buatlah laporan yang mencakup:
1. Ringkasan keuangan (pendapatan, pengeluaran, saldo)
2. Analisis pola pengeluaran
3. Kategori pengeluaran terbesar
4. Tren dan perbandingan (jika memungkinkan)
5. Rekomendasi dan saran untuk bulan depan
6. Highlight transaksi penting

Format laporan dalam bahasa Indonesia yang mudah dipahami dan profesional.
Gunakan emoji yang sesuai untuk membuat laporan lebih menarik.
`;

            const result = await this.genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            return result.text;

        } catch (error) {
            console.error('Error generating monthly report:', error);
            // Fallback to basic report
            return await this.formatResponse('monthly', monthlyTransactions, `Laporan Bulanan ${monthName} ${targetYear}`);
        }
    }
}

module.exports = QueryService; 