<script lang="ts">
	import type { PageData } from './$types';
	import DiffViewer from '$lib/components/admin/DiffViewer.svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const perPage = 25;
	const perPageOptions = [10, 20, 50];
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / perPage)));

	let adminId = $state(data.filters.admin_id);
	let orgId = $state(data.filters.org_id);
	let actionType = $state(data.filters.action_type);
	let fromDate = $state(data.filters.from_date);
	let toDate = $state(data.filters.to_date);
	let expandedId = $state<string | null>(null);

	const actionTypes = [
		'',
		'plan_change',
		'entitlement_override',
		'entitlement_revoke',
		'account_suspend',
		'account_reactivate',
		'data_purge'
	];

	function buildParams(overrides: Record<string, string> = {}): URLSearchParams {
		const params = new URLSearchParams();
		const page = overrides.page ?? String(data.page);
		params.set('page', page);
		if (adminId) params.set('admin_id', adminId);
		if (orgId) params.set('org_id', orgId);
		if (actionType) params.set('action_type', actionType);
		if (fromDate) params.set('from_date', fromDate);
		if (toDate) params.set('to_date', toDate);
		return params;
	}

	function applyFilters() {
		goto(`/audit-log?${buildParams({ page: '1' }).toString()}`);
	}

	function goToPage(p: number) {
		goto(`/audit-log?${buildParams({ page: String(p) }).toString()}`);
	}

	function clearFilters() {
		adminId = '';
		orgId = '';
		actionType = '';
		fromDate = '';
		toDate = '';
		goto('/audit-log');
	}

	function toggleRow(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function relativeTime(dateStr: string): string {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diffMs = now - then;
		const diffSec = Math.floor(diffMs / 1000);

		if (diffSec < 60) return 'just now';
		const diffMin = Math.floor(diffSec / 60);
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDay = Math.floor(diffHr / 24);
		if (diffDay < 30) return `${diffDay}d ago`;
		const diffMonth = Math.floor(diffDay / 30);
		if (diffMonth < 12) return `${diffMonth}mo ago`;
		return `${Math.floor(diffMonth / 12)}y ago`;
	}

	function absoluteTime(dateStr: string): string {
		return new Date(dateStr).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Audit Log - outra.admin</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[#131417]">Audit Log</h1>
		<span class="text-sm text-[#656767]">{data.total} entr{data.total !== 1 ? 'ies' : 'y'}</span>
	</div>

	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
		<!-- Filter Bar -->
		<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<div>
					<label for="admin-email" class="block text-xs font-medium text-[#656767] mb-1">Admin Email / ID</label>
					<input
						id="admin-email"
						type="text"
						bind:value={adminId}
						placeholder="Admin user ID"
						class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
					/>
				</div>
				<div>
					<label for="org-id" class="block text-xs font-medium text-[#656767] mb-1">Organization</label>
					<input
						id="org-id"
						type="text"
						bind:value={orgId}
						placeholder="Org ID"
						class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
					/>
				</div>
				<div>
					<label for="action-type" class="block text-xs font-medium text-[#656767] mb-1">Action Type</label>
					<select
						id="action-type"
						bind:value={actionType}
						class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9] bg-white"
					>
						{#each actionTypes as at}
							<option value={at}>{at || 'All actions'}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="from-date" class="block text-xs font-medium text-[#656767] mb-1">From</label>
					<input
						id="from-date"
						type="date"
						bind:value={fromDate}
						class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
					/>
				</div>
				<div>
					<label for="to-date" class="block text-xs font-medium text-[#656767] mb-1">To</label>
					<input
						id="to-date"
						type="date"
						bind:value={toDate}
						class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
					/>
				</div>
			</div>
			<div class="flex gap-3 mt-4">
				<button
					onclick={applyFilters}
					class="h-[42px] px-6 rounded-[999px] bg-[#2E4BE9] text-sm font-semibold text-white hover:bg-[#2540CC] transition-colors"
				>
					Apply Filters
				</button>
				<button
					onclick={clearFilters}
					class="h-[42px] px-4 rounded-[999px] border border-[rgba(19,20,23,0.15)] text-sm font-semibold text-[#2D2E2E] hover:bg-[#F5F5F5] transition-colors"
				>
					Clear
				</button>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Timestamp</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Admin</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Organization</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Action</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Reason</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry (entry.id)}
						<tr
							class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
							onclick={() => toggleRow(entry.id)}
						>
							<td class="px-6 py-3.5 whitespace-nowrap">
								<span title={absoluteTime(entry.created_at)} class="text-[#131417]">
									{relativeTime(entry.created_at)}
								</span>
							</td>
							<td class="px-6 py-3.5 text-[#131417] truncate max-w-[180px]">
								{entry.admin_email || entry.admin_user_id}
							</td>
							<td class="px-6 py-3.5 text-[#131417] truncate max-w-[150px]">
								{entry.org_name || entry.org_id || '--'}
							</td>
							<td class="px-6 py-3.5">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F6F7F8] text-[#2D2E2E]">
									{entry.action_type}
								</span>
							</td>
							<td class="px-6 py-3.5 text-[#656767] truncate max-w-[200px]">
								{entry.reason || '--'}
							</td>
						</tr>

						{#if expandedId === entry.id}
							<tr>
								<td colspan="5" class="bg-[#F9F9F8] px-6 py-4">
									<DiffViewer before={entry.before_state ?? null} after={entry.after_state ?? null} />
								</td>
							</tr>
						{/if}
					{/each}

					{#if data.entries.length === 0}
						<tr>
							<td colspan="5" class="px-6 py-12 text-center text-[#656767]">
								No audit log entries found
							</td>
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
