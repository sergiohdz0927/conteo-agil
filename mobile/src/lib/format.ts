// $12,345.50
export function money(n: number) {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const [int, dec] = abs.toFixed(2).split('.');
  return `${sign}$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

// $12.3k para espacios chiquitos
export function compactMoney(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  return `$${abs.toFixed(0)}`;
}

// 1,234
export function int(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}