const axios = require('axios');

class TimeService {
    constructor() {
        this.timezone = 'Asia/Jakarta';
        this.baseUrl = 'https://timeapi.io/api/Time/current/zone';
        this.cachedTime = null;
        this.cacheExpiry = null;
        this.cacheLifetime = 60000; // 1 minute cache
    }

    async getCurrentTime() {
        try {
            // Check if we have valid cached time
            if (this.cachedTime && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                console.log('Using cached time:', this.cachedTime);
                return this.cachedTime;
            }

            console.log('Fetching current time from timeapi.io...');
            const response = await axios.get(`${this.baseUrl}?timeZone=${this.timezone}`, {
                timeout: 5000 // 5 second timeout
            });

            const timeData = {
                currentTime: response.data.dateTime,
                timezone: response.data.timeZone,
                date: response.data.date,
                time: response.data.time,
                dayOfWeek: response.data.dayOfWeek,
                dayOfYear: response.data.dayOfYear,
                week: response.data.week,
                month: response.data.month,
                year: response.data.year
            };

            // Cache the result
            this.cachedTime = timeData;
            this.cacheExpiry = Date.now() + this.cacheLifetime;

            console.log('Current Jakarta time fetched:', timeData.currentTime);
            return timeData;

        } catch (error) {
            console.error('Error fetching time from timeapi.io:', error.message);
            
            // Fallback to local time with Jakarta timezone
            const fallbackTime = this.getFallbackTime();
            console.log('Using fallback time:', fallbackTime);
            return fallbackTime;
        }
    }

    getFallbackTime() {
        // Fallback using JavaScript Date with Jakarta timezone offset
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        
        return {
            currentTime: jakartaTime.toISOString(),
            timezone: 'Asia/Jakarta',
            date: jakartaTime.toISOString().split('T')[0],
            time: jakartaTime.toTimeString().split(' ')[0],
            dayOfWeek: jakartaTime.toLocaleDateString('id-ID', { weekday: 'long' }),
            dayOfYear: Math.floor((jakartaTime - new Date(jakartaTime.getFullYear(), 0, 0)) / 86400000),
            week: Math.ceil(((jakartaTime - new Date(jakartaTime.getFullYear(), 0, 1)) / 86400000 + 1) / 7),
            month: jakartaTime.getMonth() + 1,
            year: jakartaTime.getFullYear(),
            isFallback: true
        };
    }

    formatTimeForPrompt() {
        return this.getCurrentTime().then(timeData => {
            const indonesianDay = this.getIndonesianDayName(timeData.dayOfWeek);
            const indonesianMonth = this.getIndonesianMonthName(timeData.month);
            
            return `
INFORMASI WAKTU SAAT INI (Jakarta, Indonesia):
- Tanggal dan Waktu: ${timeData.currentTime}
- Zona Waktu: ${timeData.timezone}
- Hari: ${indonesianDay}
- Tanggal: ${timeData.date}
- Jam: ${timeData.time}
- Bulan: ${indonesianMonth}
- Tahun: ${timeData.year}
${timeData.isFallback ? '(Menggunakan waktu fallback)' : ''}

Gunakan informasi ini untuk memahami konteks waktu "hari ini", "kemarin", "besok", dll dalam pesan pengguna.
            `.trim();
        });
    }

    getIndonesianDayName(englishDay) {
        const dayMap = {
            'Monday': 'Senin',
            'Tuesday': 'Selasa', 
            'Wednesday': 'Rabu',
            'Thursday': 'Kamis',
            'Friday': 'Jumat',
            'Saturday': 'Sabtu',
            'Sunday': 'Minggu'
        };
        return dayMap[englishDay] || englishDay;
    }

    getIndonesianMonthName(monthNumber) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months[monthNumber - 1] || monthNumber;
    }
}

module.exports = TimeService; 