<script lang="ts">
	import type { PageData } from './$types';
	import AccountSearch from '$lib/components/admin/AccountSearch.svelte';

	let { data }: { data: PageData } = $props();

	const results = $derived(data.results || []);
	const page = $derived(data.page);
	const totalPages = $derived(data.totalPages);
	const total = $derived(data.total);

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

	function pageUrl(p: number): string {
		const params = new URLSearchParams();
		if (data.query) params.set('q', data.query);
		params.set('page', String(p));
		return `/accounts?${params.toString()}`;
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

	<AccountSearch query={data.query} />

	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
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
								<span class="capitalize text-[#131417] font-medium">{row.plan || 'free'}</span>
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
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-6 py-12 text-center text-[#656767]">
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
		{#if totalPages > 1}
			<div class="px-6 py-4 border-t border-[rgba(19,20,23,0.08)] flex items-center justify-between">
				<p class="text-sm text-[#656767]">
					Page {page} of {totalPages}
				</p>
				<div class="flex gap-2">
					{#if page > 1}
						<a
							href={pageUrl(page - 1)}
							class="px-4 py-2 text-sm font-semibold rounded-[999px] border border-[rgba(19,20,23,0.15)] text-[#2D2E2E] hover:bg-[#F5F5F5] transition-colors"
						>
							Previous
						</a>
					{/if}
					{#if page < totalPages}
						<a
							href={pageUrl(page + 1)}
							class="px-4 py-2 text-sm font-semibold rounded-[999px] border border-[rgba(19,20,23,0.15)] text-[#2D2E2E] hover:bg-[#F5F5F5] transition-colors"
						>
							Next
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
