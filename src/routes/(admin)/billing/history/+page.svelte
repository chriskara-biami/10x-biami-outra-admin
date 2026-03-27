<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const perPage = 25;
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / perPage)));

	let searchQuery = $state((data as any).search || '');

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function buildParams(overrides: Record<string, string> = {}): URLSearchParams {
		const params = new URLSearchParams();
		const page = overrides.page ?? String(data.page);
		const q = overrides.q ?? searchQuery;
		params.set('page', page);
		if (q) params.set('q', q);
		return params;
	}

	function goToPage(p: number) {
		goto(`/billing/history?${buildParams({ page: String(p) }).toString()}`);
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		goto(`/billing/history?${buildParams({ page: '1' }).toString()}`);
	}

	function clearSearch() {
		searchQuery = '';
		goto('/billing/history');
	}
</script>

<svelte:head>
	<title>Subscription History Log - outra.admin</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/billing" class="text-[#656767] hover:text-[#131417] transition-colors">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="text-2xl font-bold text-[#131417]">Subscription History Log</h1>
		</div>
		<span class="text-sm text-[#656767]">{data.total} entr{data.total !== 1 ? 'ies' : 'y'}</span>
	</div>

	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
		<!-- Search Bar -->
		<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
			<form onsubmit={handleSearch} class="flex items-center gap-3">
				<div class="relative flex-1 max-w-md">
					<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#656767]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search by org name, email, or ID..."
						class="w-full pl-10 pr-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
					/>
				</div>
				<button
					type="submit"
					class="px-4 py-2 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors"
				>
					Search
				</button>
				{#if searchQuery}
					<button
						type="button"
						onclick={clearSearch}
						class="px-3 py-2 text-sm text-[#656767] hover:text-[#131417] transition-colors"
					>
						Clear
					</button>
				{/if}
			</form>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Date</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Organization</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Owner Email</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Action</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">From Plan</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">To Plan</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Amount</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Stripe TX ID</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Performed By</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry}
						<tr class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors">
							<td class="px-6 py-3.5 text-[#656767]">{formatDate(entry.created_at)}</td>
							<td class="px-6 py-3.5">
								<div class="flex flex-col">
									<span class="font-medium text-[#131417]">{entry.org_name || '--'}</span>
								</div>
							</td>
							<td class="px-6 py-3.5 text-[#656767]">{entry.owner_email || '--'}</td>
							<td class="px-6 py-3.5 text-[#131417]">{entry.action || entry.action_type || '--'}</td>
							<td class="px-6 py-3.5">
								<span class="capitalize text-[#131417]">{entry.from_plan || '--'}</span>
							</td>
							<td class="px-6 py-3.5">
								<span class="capitalize text-[#131417]">{entry.to_plan || '--'}</span>
							</td>
							<td class="px-6 py-3.5 text-[#131417]">
								{entry.amount != null ? `$${Number(entry.amount).toFixed(2)}` : '--'}
							</td>
							<td class="px-6 py-3.5">
								<span class="text-xs font-mono text-[#656767]">{entry.stripe_transaction_id || '--'}</span>
							</td>
							<td class="px-6 py-3.5">
								<span class="text-[#656767]">{entry.admin_email || entry.performed_by || entry.admin_user_id || '--'}</span>
							</td>
						</tr>
					{/each}
					{#if data.entries.length === 0}
						<tr>
							<td colspan="9" class="px-6 py-12 text-center text-[#656767]">No subscription history found</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.total > 0}
			<div class="px-6 py-4 border-t border-[rgba(19,20,23,0.08)] flex items-center justify-between">
				<p class="text-sm text-[#656767]">
					Showing {(data.page - 1) * perPage + 1} - {Math.min(data.page * perPage, data.total)} of {data.total}
				</p>
				<div class="flex items-center gap-2">
					<button
						onclick={() => goToPage(data.page - 1)}
						disabled={data.page <= 1}
						class="px-3 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6F7F8] transition-colors"
					>
						Previous
					</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
						{#if p === 1 || p === totalPages || (p >= data.page - 1 && p <= data.page + 1)}
							<button
								onclick={() => goToPage(p)}
								class="w-9 h-9 text-sm rounded-lg transition-colors flex items-center justify-center {p === data.page ? 'bg-[#2E4BE9] text-white border border-[#2E4BE9]' : 'border border-[rgba(19,20,23,0.15)] hover:bg-[#F6F7F8]'}"
							>
								{p}
							</button>
						{:else if p === data.page - 2 || p === data.page + 2}
							<span class="px-1 text-[#656767]">...</span>
						{/if}
					{/each}
					<button
						onclick={() => goToPage(data.page + 1)}
						disabled={data.page >= totalPages}
						class="px-3 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6F7F8] transition-colors"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
