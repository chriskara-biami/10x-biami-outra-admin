<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import AccountSearch from '$lib/components/admin/AccountSearch.svelte';

	let { data }: { data: PageData } = $props();

	const results = $derived(data.results || []);
	const page = $derived(data.page);
	const totalPages = $derived(data.totalPages);
	const total = $derived(data.total);

	const plans = ['free', 'founder'];
	const perPageOptions = [10, 20, 50];
	let planFilter = $state(data.plan || '');

	function buildParams(overrides: Record<string, string> = {}): URLSearchParams {
		const params = new URLSearchParams();
		const p = overrides.page ?? String(data.page);
		const pp = overrides.perPage ?? String(data.perPage);
		const q = overrides.q ?? (data.query || '');
		const plan = overrides.plan ?? planFilter;

		params.set('page', p);
		params.set('perPage', pp);
		if (q) params.set('q', q);
		if (plan) params.set('plan', plan);
		return params;
	}

	function goToPage(p: number) {
		goto(`/accounts?${buildParams({ page: String(p) }).toString()}`);
	}

	function changePerPage(newPerPage: number) {
		goto(`/accounts?${buildParams({ page: '1', perPage: String(newPerPage) }).toString()}`);
	}

	function changePlanFilter(plan: string) {
		planFilter = plan;
		goto(`/accounts?${buildParams({ page: '1', plan }).toString()}`);
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'active':
				return 'bg-[#C3FF98] text-[#2D2E2E]';
			case 'paused':
				return 'bg-yellow-100 text-yellow-800';
			case 'cancelled':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-[#F6F7F8] text-[#2D2E2E]';
		}
	}

	function boolBadge(val: boolean): string {
		return val
			? 'bg-[#C3FF98] text-[#2D2E2E]'
			: 'bg-[#F6F7F8] text-[#2D2E2E] border border-[rgba(19,20,23,0.15)]';
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Accounts - outra.admin</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[#131417]">Accounts</h1>
		<span class="text-sm text-[#656767]">{total} account{total !== 1 ? 's' : ''}</span>
	</div>

	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
		<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<AccountSearch query={data.query} perPage={data.perPage} plan={data.plan} />
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<label for="plan-filter" class="text-sm text-[#656767] whitespace-nowrap">Plan</label>
					<select
						id="plan-filter"
						value={data.plan}
						onchange={(e) => changePlanFilter((e.target as HTMLSelectElement).value)}
						class="px-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
					>
						<option value="">All</option>
						<option value="founder">Founder</option>
					</select>
				</div>
				<div class="flex items-center gap-2">
					<label for="per-page" class="text-sm text-[#656767] whitespace-nowrap">Show</label>
					<select
						id="per-page"
						value={data.perPage}
						onchange={(e) => changePerPage(Number((e.target as HTMLSelectElement).value))}
						class="px-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
					>
						{#each perPageOptions as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Org Name</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Email</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Plan</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Status</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Connection</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Activation</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Override</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Created</th>
					</tr>
				</thead>
				<tbody>
					{#each results as row}
						<tr class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors">
							<td class="px-6 py-3.5">
								<a
									href="/accounts/{row.org_id}"
									class="text-[#2E4BE9] hover:text-[#4D61F4] font-medium hover:underline"
								>
									{row.org_name}
								</a>
							</td>
							<td class="px-6 py-3.5 text-[#131417]">{row.email || '--'}</td>
							<td class="px-6 py-3.5">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
									{row.plan === 'enterprise' ? 'bg-purple-50 text-purple-700' :
									 row.plan === 'pro' ? 'bg-blue-50 text-blue-700' :
									 row.plan === 'starter' ? 'bg-green-50 text-green-700' :
									 row.plan === 'founder' ? 'bg-[#EFF1FF] text-[#4D61F4]' :
									 'bg-gray-100 text-gray-600'}">
									{row.plan || 'free'}
								</span>
							</td>
							<td class="px-6 py-3.5">
								<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium {statusColor(row.plan_status)}">
									{row.plan_status || 'unknown'}
								</span>
							</td>
							<td class="px-6 py-3.5">
								<span class="text-[#131417]">{row.connection_status || 'none'}</span>
							</td>
							<td class="px-6 py-3.5">
								<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium {boolBadge(row.has_activation)}">
									{row.has_activation ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="px-6 py-3.5">
								<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium {boolBadge(row.has_override)}">
									{row.has_override ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="px-6 py-3.5 text-[#656767]">{formatDate(row.created_at)}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="8" class="px-6 py-12 text-center text-[#656767]">
								{#if data.query}
									No accounts found for "{data.query}"
								{:else}
									No accounts found
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if total > 0}
			<div class="px-6 py-4 border-t border-[rgba(19,20,23,0.08)] flex items-center justify-between">
				<p class="text-sm text-[#656767]">
					Showing {(page - 1) * data.perPage + 1} - {Math.min(page * data.perPage, total)} of {total}
				</p>
				<div class="flex items-center gap-2">
					<button
						onclick={() => goToPage(page - 1)}
						disabled={page <= 1}
						class="px-3 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6F7F8] transition-colors"
					>
						Previous
					</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
						{#if p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)}
							<button
								onclick={() => goToPage(p)}
								class="w-9 h-9 text-sm rounded-lg transition-colors flex items-center justify-center {p === page ? 'bg-[#2E4BE9] text-white border border-[#2E4BE9]' : 'border border-[rgba(19,20,23,0.15)] hover:bg-[#F6F7F8]'}"
							>
								{p}
							</button>
						{:else if p === page - 2 || p === page + 2}
							<span class="px-1 text-[#656767]">...</span>
						{/if}
					{/each}
					<button
						onclick={() => goToPage(page + 1)}
						disabled={page >= totalPages}
						class="px-3 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6F7F8] transition-colors"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
