import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

function getStripe() {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw error(500, 'STRIPE_SECRET_KEY not configured');
	return new Stripe(key);
}

/**
 * GET /api/pricing — list all plan pricing from DB
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!hasPermission(locals.adminRoles, ['billing:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const { data, error: dbError } = await locals.serviceClient
		.from('plan_pricing')
		.select('*')
		.eq('is_active', true)
		.order('created_at', { ascending: true });

	if (dbError) {
		console.error('[Pricing] Failed to load:', dbError);
		throw error(500, 'Failed to load pricing');
	}

	return json({ plans: data || [] });
};

/**
 * POST /api/pricing — create or update a plan price
 *
 * Body: { plan_key, label, description, monthly_price_pence, annual_price_pence }
 *
 * Flow:
 * 1. Creates/finds a Stripe Product for this plan
 * 2. Creates a new Stripe Price with the given amount
 * 3. Saves/updates the plan_pricing row in DB
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!hasPermission(locals.adminRoles, ['billing:mutate'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await request.json();
	const { plan_key, label, description, monthly_price_pence, annual_price_pence } = body;

	if (!plan_key || !label) {
		throw error(400, 'plan_key and label are required');
	}

	const stripe = getStripe();
	let stripeProductId: string | null = null;
	let stripePriceId: string | null = null;

	// Check if plan already exists in DB
	const { data: existing } = await locals.serviceClient
		.from('plan_pricing')
		.select('*')
		.eq('plan_key', plan_key)
		.single();

	try {
		// Only create Stripe resources for paid plans
		if (monthly_price_pence > 0) {
			// 1. Get or create Stripe Product
			if (existing?.stripe_product_id) {
				stripeProductId = existing.stripe_product_id;
				// Update product name/description in Stripe
				await stripe.products.update(stripeProductId, {
					name: label,
					description: description || undefined
				});
			} else {
				const product = await stripe.products.create({
					name: label,
					description: description || undefined,
					metadata: { plan_key }
				});
				stripeProductId = product.id;
			}

			// 2. Create a new Stripe Price (prices are immutable in Stripe)
			const price = await stripe.prices.create({
				product: stripeProductId,
				unit_amount: monthly_price_pence,
				currency: 'gbp',
				recurring: { interval: 'month' }
			});
			stripePriceId = price.id;

			// 3. Deactivate old price in Stripe if there was one
			if (existing?.stripe_price_id && existing.stripe_price_id !== stripePriceId) {
				await stripe.prices.update(existing.stripe_price_id, { active: false });
			}
		}

		// 4. Upsert in DB
		const row = {
			plan_key,
			label,
			description: description || '',
			monthly_price_pence: monthly_price_pence || 0,
			annual_price_pence: annual_price_pence || 0,
			stripe_product_id: stripeProductId,
			stripe_price_id: stripePriceId,
			updated_at: new Date().toISOString()
		};

		const { data, error: dbError } = existing
			? await locals.serviceClient
					.from('plan_pricing')
					.update(row)
					.eq('plan_key', plan_key)
					.select()
					.single()
			: await locals.serviceClient
					.from('plan_pricing')
					.insert({ ...row, is_active: true })
					.select()
					.single();

		if (dbError) {
			console.error('[Pricing] DB error:', dbError);
			throw error(500, 'Failed to save pricing');
		}

		return json({
			success: true,
			plan: data,
			stripe_price_id: stripePriceId
		});
	} catch (err: any) {
		if (err.status) throw err; // re-throw SvelteKit errors
		console.error('[Pricing] Stripe error:', err);
		throw error(500, `Stripe error: ${err.message}`);
	}
};
