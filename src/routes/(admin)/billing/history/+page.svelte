<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const perPage = 25;
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / perPage)));

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

	function goToPage(p: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', String(p));
		goto(`/billing/history?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Billing History - outra.admin</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/billing" class="text-[#656767] hover:text-[#131417] transition-colors">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="text-2xl font-bold text-[#131417]">Billing History</h1>
		</div>
		<span class="text-sm text-[#656767]">{data.total} entr{data.total !== 1 ? 'ies' : 'y'}</span>
	</div>

	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
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
									{#if entry.org_id}
										<span class="text-xs text-[#656767] font-mono">{entry.org_id.slice(0, 8)}...</span>
									{/if}
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
								<span class="text-[#656767]">{entry.admin_email || entry.performed_by || entry.admin_user_id || '--'}</span>
							</td>
						</tr>
					{/each}
					{#if data.entries.length === 0}
						<tr>
							<td colspan="8" class="px-6 py-12 text-center text-[#656767]">No billing history found</td>
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
