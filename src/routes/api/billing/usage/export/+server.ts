import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';

export const GET: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['billing:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const url = event.url;
	const org_id = url.searchParams.get('org_id');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	if (!org_id) {
		throw error(400, 'Missing required query parameter: org_id');
	}

	try {
		// Get org members
		const { data: members } = await serviceClient
			.from('organization_members')
			.select('user_id')
			.eq('org_id', org_id);

		if (!members || members.length === 0) {
			return new Response('No data found', {
				status: 200,
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="usage_${org_id}.csv"`
				}
			});
		}

		const userIds = members.map((m) => m.user_id);

		// Query usage_metrics with optional date range
		let usageQuery = serviceClient
			.from('usage_metrics')
			.select('*')
			.in('user_id', userIds)
			.order('created_at', { ascending: false });

		if (from) {
			usageQuery = usageQuery.gte('created_at', from);
		}
		if (to) {
			usageQuery = usageQuery.lte('created_at', to);
		}

		const { data: usage, error: usageError } = await usageQuery;

		if (usageError) {
			throw new Error(`Failed to fetch usage metrics: ${usageError.message}`);
		}

		// Build CSV
		const rows = usage || [];
		if (rows.length === 0) {
			return new Response('No data found', {
				status: 200,
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="usage_${org_id}.csv"`
				}
			});
		}

		const headers = Object.keys(rows[0]);
		const csvLines = [
			headers.join(','),
			...rows.map((row) =>
				headers
					.map((h) => {
						const val = row[h];
						if (val === null || val === undefined) return '';
						const str = String(val);
						// Escape values containing commas or quotes
						if (str.includes(',') || str.includes('"') || str.includes('\n')) {
							return `"${str.replace(/"/g, '""')}"`;
						}
						return str;
					})
					.join(',')
			)
		];

		const csv = csvLines.join('\n');

		return new Response(csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="usage_${org_id}.csv"`
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Usage export failed:`, err);
		throw error(500, 'Failed to export usage data');
	}
};
