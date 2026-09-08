/**
 * Format numeric currency into Indian Rupee notation (Cr, L, or K)
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const val = Number(amount);
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(1)} K`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Format ISO date string into readable format (e.g., Jan 10, 2024)
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (err) {
    return dateString;
  }
}
