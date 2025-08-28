export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  });
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};
