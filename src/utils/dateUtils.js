const moment = require('moment');

class DateUtils {
    static parseDate(dateString) {
        if (!dateString) {
            return moment().format('YYYY-MM-DD');
        }

        const input = dateString.toLowerCase().trim();
        
        // Handle relative dates
        if (input === 'today') {
            return moment().format('YYYY-MM-DD');
        }
        
        if (input === 'yesterday') {
            return moment().subtract(1, 'day').format('YYYY-MM-DD');
        }
        
        if (input === 'tomorrow') {
            return moment().add(1, 'day').format('YYYY-MM-DD');
        }
        
        if (input.includes('last week')) {
            return moment().subtract(1, 'week').format('YYYY-MM-DD');
        }
        
        if (input.includes('this week')) {
            return moment().startOf('week').format('YYYY-MM-DD');
        }
        
        if (input.includes('last month')) {
            return moment().subtract(1, 'month').format('YYYY-MM-DD');
        }
        
        if (input.includes('this month')) {
            return moment().startOf('month').format('YYYY-MM-DD');
        }

        // Try to parse various date formats
        const formats = [
            'YYYY-MM-DD',
            'MM/DD/YYYY',
            'DD/MM/YYYY',
            'MM-DD-YYYY',
            'DD-MM-YYYY',
            'YYYY/MM/DD',
            'MMM DD, YYYY',
            'DD MMM YYYY',
            'MMMM DD, YYYY'
        ];

        for (const format of formats) {
            const parsed = moment(dateString, format, true);
            if (parsed.isValid()) {
                return parsed.format('YYYY-MM-DD');
            }
        }

        // If nothing works, return today's date
        return moment().format('YYYY-MM-DD');
    }

    static isValidDate(dateString) {
        return moment(dateString, 'YYYY-MM-DD', true).isValid();
    }

    static formatDate(date, format = 'YYYY-MM-DD') {
        return moment(date).format(format);
    }

    static getDateRange(period) {
        const end = moment().endOf('day');
        let start;

        switch (period.toLowerCase()) {
            case 'week':
                start = moment().startOf('week');
                break;
            case 'month':
                start = moment().startOf('month');
                break;
            case 'year':
                start = moment().startOf('year');
                break;
            default:
                start = moment().subtract(30, 'days');
        }

        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        };
    }
}

module.exports = DateUtils; 