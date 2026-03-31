/**
 * Generates a custom transaction ID.
 * Format: {environment}_{user_email}_{date}_{pricing_type}_{monthly_price_pence}
 * Example: dev_chris.k@biami.io_2026-03-31_founder_999
 */
export function generateTxId(
	userEmail: string,
	pricingType: string,
	monthlyPricePence: number | null
): string {
	const env = import.meta.env.VITE_APP_ENV || 'dev';
	const date = new Date().toISOString().split('T')[0];
	const price = monthlyPricePence ?? 0;
	return `${env}_${userEmail}_${date}_${pricingType}_${price}`;
}
