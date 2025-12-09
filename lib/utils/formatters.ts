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
// Simple date formatter for updated_at/created_at fields
export const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}