const formatRupiah = (amount) => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? '' : '-';
    
    // Format with thousands separator
    const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(absAmount);
    
    return sign + formatted;
};

const formatRupiahSimple = (amount) => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? '' : '-';
    
    // Simple format: Rp 50.000
    const formatted = absAmount.toLocaleString('id-ID');
    return `${sign}Rp ${formatted}`;
};

module.exports = {
    formatRupiah,
    formatRupiahSimple
}; 