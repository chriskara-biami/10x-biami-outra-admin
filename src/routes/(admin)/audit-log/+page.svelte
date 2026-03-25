<script lang="ts">
	import type { PageData } from './$types';
	import AuditLogTable from '$lib/components/admin/AuditLogTable.svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let adminId = $state(data.filters.admin_id);
	let orgId = $state(data.filters.org_id);
	let actionType = $state(data.filters.action_type);
	let fromDate = $state(data.filters.from_date);
	let toDate = $state(data.filters.to_date);

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / 25)));

	const actionTypes = [
		'',
		'plan_change',
		'entitlement_override',
		'entitlement_revoke',
		'account_suspend',
		'account_reactivate',
		'data_purge'
	];

	function applyFilters() {
		const params = new URLSearchParams();
		if (adminId) params.set('admin_id', adminId);
		if (orgId) params.set('org_id', orgId);
		if (actionType) params.set('action_type', actionType);
		if (fromDate) params.set('from_date', fromDate);
		if (toDate) params.set('to_date', toDate);
		params.set('page', '1');
		goto(`/audit-log?${params.toString()}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams();
		if (adminId) params.set('admin_id', adminId);
		if (orgId) params.set('org_id', orgId);
		if (actionType) params.set('action_type', actionType);
		if (fromDate) params.set('from_date', fromDate);
		if (toDate) params.set('to_date', toDate);
		params.set('page', String(p));
		goto(`/audit-log?${params.toString()}`);
	}

	function clearFilters() {
		adminId = '';
		orgId = '';
		actionType = '';
		fromDate = '';
		toDate = '';
		goto('/audit-log');
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold text-[#131417]">Audit Log</h1>

	<!-- Filter Bar -->
	<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-6">
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
				class="px-4 py-2 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors"
			>
				Apply Filters
			</button>
			<button
				onclick={clearFilters}
				class="px-4 py-2 text-sm font-medium text-[#656767] hover:text-[#131417] bg-white border border-[rgba(19,20,23,0.15)] rounded-lg transition-colors"
			>
				Clear
			</button>
		</div>
	</div>

	<!-- Results -->
	<AuditLogTable entries={data.entries} />

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
