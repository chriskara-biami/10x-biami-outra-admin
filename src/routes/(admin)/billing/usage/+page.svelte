<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let orgId = $state(data.orgId);
	let fromDate = $state(data.from);
	let toDate = $state(data.to);

	const metrics = $derived(data.usageMetrics);

	function applyFilters() {
		const params = new URLSearchParams();
		if (orgId) params.set('org_id', orgId);
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		goto(`/billing/usage?${params.toString()}`);
	}

	function clearFilters() {
		orgId = '';
		fromDate = '';
		toDate = '';
		goto('/billing/usage');
	}

	const exportUrl = $derived(() => {
		const params = new URLSearchParams();
		if (orgId) params.set('org_id', orgId);
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		return `/api/billing/usage/export?${params.toString()}`;
	});
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<a href="/billing" class="text-[#656767] hover:text-[#131417] transition-colors">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<h1 class="text-2xl font-bold text-[#131417]">Usage Dashboard</h1>
	</div>

	<!-- Filters -->
	<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-6">
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div>
				<label for="usage-org" class="block text-xs font-medium text-[#656767] mb-1">Organization ID</label>
				<input
					id="usage-org"
					type="text"
					bind:value={orgId}
					placeholder="Org ID"
					class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
				/>
			</div>
			<div>
				<label for="usage-from" class="block text-xs font-medium text-[#656767] mb-1">From</label>
				<input
					id="usage-from"
					type="date"
					bind:value={fromDate}
					class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
				/>
			</div>
			<div>
				<label for="usage-to" class="block text-xs font-medium text-[#656767] mb-1">To</label>
				<input
					id="usage-to"
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
				Apply
			</button>
			<button
				onclick={clearFilters}
				class="px-4 py-2 text-sm font-medium text-[#656767] hover:text-[#131417] bg-white border border-[rgba(19,20,23,0.15)] rounded-lg transition-colors"
			>
				Clear
			</button>
			<a
				href={exportUrl()}
				class="ml-auto px-4 py-2 text-sm font-medium text-[#2E4BE9] bg-white border border-[#2E4BE9] rounded-lg hover:bg-[#EFF1FF] transition-colors"
			>
				Export CSV
			</a>
		</div>
	</div>

	<!-- Metric Cards -->
	{#if data.orgId}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-5">
				<p class="text-xs font-medium text-[#656767] mb-1">Enriched Profiles</p>
				<p class="text-2xl font-bold text-[#131417]">{metrics.enrichedProfiles.toLocaleString()}</p>
			</div>
			<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-5">
				<p class="text-xs font-medium text-[#656767] mb-1">Connector Runs</p>
				<p class="text-2xl font-bold text-[#131417]">{metrics.connectorRuns.toLocaleString()}</p>
			</div>
			<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-5">
				<p class="text-xs font-medium text-[#656767] mb-1">API Calls</p>
				<p class="text-2xl font-bold text-[#131417]">{metrics.apiCalls.toLocaleString()}</p>
			</div>
			<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-5">
				<p class="text-xs font-medium text-[#656767] mb-1">Total Records</p>
				<p class="text-2xl font-bold text-[#131417]">{metrics.totalRecords.toLocaleString()}</p>
			</div>
			<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-5">
				<p class="text-xs font-medium text-[#656767] mb-1">Address Matched</p>
				<p class="text-2xl font-bold text-[#131417]">{metrics.addressMatched.toLocaleString()}</p>
			</div>
		</div>
	{:else}
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] px-6 py-12 text-center">
			<p class="text-[#656767]">Enter an Organization ID and click Apply to view usage metrics.</p>
		</div>
	{/if}
</div>
