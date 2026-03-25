<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { hasPermission } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	const canMutate = $derived(hasPermission(data.roles, ['billing:mutate']));
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / 25)));

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

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<a href="/billing" class="text-[#656767] hover:text-[#131417] transition-colors">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<h1 class="text-2xl font-bold text-[#131417]">Billing History</h1>
	</div>

	<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Date</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Organization</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Owner Email</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Action</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">From Plan</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">To Plan</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Amount</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Performed By</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry}
						<tr class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors">
							<td class="px-6 py-3 text-[#656767]">{formatDate(entry.created_at)}</td>
							<td class="px-6 py-3">
								<div class="flex flex-col">
									<span class="font-medium text-[#131417]">{entry.org_name || '--'}</span>
									{#if entry.org_id}
										<span class="text-xs text-[#656767] font-mono">{entry.org_id.slice(0, 8)}...</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-3 text-[#656767]">{entry.owner_email || '--'}</td>
							<td class="px-6 py-3 text-[#131417]">{entry.action || entry.action_type || '--'}</td>
							<td class="px-6 py-3">
								<span class="capitalize text-[#131417]">{entry.from_plan || '--'}</span>
							</td>
							<td class="px-6 py-3">
								<span class="capitalize text-[#131417]">{entry.to_plan || '--'}</span>
							</td>
							<td class="px-6 py-3 text-[#131417]">
								{entry.amount != null ? `$${Number(entry.amount).toFixed(2)}` : '--'}
							</td>
							<td class="px-6 py-3">
								<div class="flex flex-col">
									<span class="text-[#656767]">{entry.admin_email || entry.performed_by || entry.admin_user_id || '--'}</span>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.entries.length === 0}
						<tr>
							<td colspan="8" class="px-6 py-8 text-center text-[#656767]">No billing history found</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-[#656767]">
				Showing {(data.page - 1) * 25 + 1} - {Math.min(data.page * 25, data.total)} of {data.total}
			</p>
			<div class="flex gap-2">
				<button
					onclick={() => goToPage(data.page - 1)}
					disabled={data.page <= 1}
					class="px-3 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6F7F8] transition-colors"
				>
					Previous
				</button>
				<span class="px-3 py-1.5 text-sm text-[#656767]">
					Page {data.page} of {totalPages}
				</span>
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
