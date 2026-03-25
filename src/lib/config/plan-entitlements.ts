/**
 * Plan-to-entitlement mapping.
 * Defines which entitlements are included in each plan tier.
 */

export const PLAN_ENTITLEMENTS: Record<string, string[]> = {
	free: ['feature:insight_basic'],
	founder: ['activation', 'connector:klaviyo', 'feature:insight_basic']
};

/**
 * Plan pricing (monthly in GBP pence).
 */
export interface PlanPricing {
	monthlyPence: number;
	annualPence: number;
	label: string;
	description: string;
	isFounder?: boolean;
}

export const PLAN_PRICING: Record<string, PlanPricing> = {
	free: {
		monthlyPence: 0,
		annualPence: 0,
		label: 'Free',
		description: 'Basic insights only'
	},
	founder: {
		monthlyPence: 59900,
		annualPence: 0,
		label: 'Founder',
		description: 'Early-adopter pricing — locked in for life',
		isFounder: true
	}
};

/**
 * Format pence as GBP string (e.g. 9900 → "£99.00").
 */
export function formatPriceGBP(pence: number): string {
	if (pence === 0) return '£0';
	return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Compute the diff between two plans.
 */
export function computePlanDiff(currentPlan: string, newPlan: string) {
	const current = PLAN_ENTITLEMENTS[currentPlan] || [];
	const next = PLAN_ENTITLEMENTS[newPlan] || [];

	const gained = next.filter((e) => !current.includes(e));
	const lost = current.filter((e) => !next.includes(e));

	return { currentPlan, newPlan, entitlementsGained: gained, entitlementsLost: lost };
}
