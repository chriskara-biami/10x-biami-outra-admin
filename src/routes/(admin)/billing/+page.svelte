<script lang="ts">
	import type { PageData } from './$types';
	import { hasPermission } from '$lib/utils/permissions';
	import { goto } from '$app/navigation';
	import { PLAN_PRICING, formatPriceGBP } from '$lib/config/plan-entitlements';

	let { data }: { data: PageData } = $props();

	const canMutate = $derived(hasPermission(data.roles, ['billing:mutate']));

	let orgSearch = $state('');
	let selectedOrg: { id: string; name: string; plan: string } | null = $state(null);
	let newPlan = $state('');
	let effectiveDate = $state(new Date().toISOString().split('T')[0]);
	let searchResults: Array<{ id: string; name: string; plan: string }> = $state([]);
	let searching = $state(false);

	let preview: { currentPlan: string; newPlan: string; entitlementsGained: string[]; entitlementsLost: string[] } | null = $state(null);
	let previewLoading = $state(false);
	let confirmOpen = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let success = $state('');

	const plans = ['free', 'founder', 'starter', 'pro', 'enterprise'];

	// Users list pagination
	const perPageOptions = [10, 20, 50];
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.perPage)));
	let userSearch = $state(data.search || '');
	let planFilter = $state(data.plan || '');

	function buildParams(overrides: Record<string, string> = {}): URLSearchParams {
		const params = new URLSearchParams();
		const page = overrides.page ?? String(data.page);
		const perPage = overrides.perPage ?? String(data.perPage);
		const q = overrides.q ?? userSearch.trim();
		const plan = overrides.plan ?? planFilter;

		params.set('page', page);
		params.set('perPage', perPage);
		if (q) params.set('q', q);
		if (plan) params.set('plan', plan);
		return params;
	}

	function goToPage(page: number) {
		goto(`/billing?${buildParams({ page: String(page) }).toString()}`);
	}

	function changePerPage(newPerPage: number) {
		goto(`/billing?${buildParams({ page: '1', perPage: String(newPerPage) }).toString()}`);
	}

	function searchUsers() {
		goto(`/billing?${buildParams({ page: '1' }).toString()}`);
	}

	function changePlanFilter(plan: string) {
		planFilter = plan;
		goto(`/billing?${buildParams({ page: '1', plan }).toString()}`);
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function searchOrgs() {
		if (!orgSearch.trim()) return;
		searching = true;
		try {
			const res = await fetch(`/api/billing/search-orgs?q=${encodeURIComponent(orgSearch)}`);
			const json = await res.json();
			searchResults = json.results || [];
		} catch {
			searchResults = [];
		} finally {
			searching = false;
		}
	}

	function selectOrg(org: { id: string; name: string; plan: string }) {
		selectedOrg = org;
		newPlan = org.plan;
		searchResults = [];
		orgSearch = org.name;
		preview = null;
	}

	async function fetchPreview() {
		if (!selectedOrg || !newPlan || newPlan === selectedOrg.plan) return;
		previewLoading = true;
		error = '';
		try {
			const res = await fetch('/api/billing/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ org_id: selectedOrg.id, new_plan: newPlan })
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || 'Preview failed');
			preview = json;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Preview failed';
			preview = null;
		} finally {
			previewLoading = false;
		}
	}

	async function confirmChange() {
		if (!selectedOrg || !newPlan) return;
		submitting = true;
		error = '';
		success = '';
		try {
			const res = await fetch('/api/billing/change-plan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					org_id: selectedOrg.id,
					new_plan: newPlan,
					effective_date: effectiveDate
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || 'Plan change failed');
			success = `Plan changed from ${selectedOrg.plan} to ${newPlan} for ${selectedOrg.name}`;
			selectedOrg = { ...selectedOrg, plan: newPlan };
			preview = null;
			confirmOpen = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Plan change failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[#131417]">Billing Management</h1>
		<div class="flex gap-3">
			<a
				href="/billing/history"
				class="px-4 py-2 text-sm font-medium text-[#656767] hover:text-[#131417] bg-white border border-[rgba(19,20,23,0.15)] rounded-lg transition-colors"
			>
				Billing History
			</a>
			<a
				href="/billing/usage"
				class="px-4 py-2 text-sm font-medium text-[#656767] hover:text-[#131417] bg-white border border-[rgba(19,20,23,0.15)] rounded-lg transition-colors"
			>
				Usage Dashboard
			</a>
		</div>
	</div>

	<!-- Pricing Reference -->
	<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-6 space-y-4">
		<h2 class="text-base font-semibold text-[#131417]">Plan Pricing</h2>
		<div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
			{#each plans as plan}
				{@const pricing = PLAN_PRICING[plan]}
				{#if pricing}
					<div class="rounded-lg border p-4 {pricing.isFounder ? 'border-[#4D61F4] bg-[#EFF1FF]' : 'border-[rgba(19,20,23,0.10)] bg-[#F9F9F8]'}">
						<div class="flex items-center gap-2 mb-1">
							<h3 class="text-sm font-semibold text-[#131417]">{pricing.label}</h3>
							{#if pricing.isFounder}
								<span class="text-[10px] font-bold text-[#4D61F4] bg-white px-1.5 py-0.5 rounded-full border border-[#4D61F4]/30">EARLY</span>
							{/if}
						</div>
						{#if pricing.monthlyPence > 0}
							<p class="text-lg font-bold text-[#131417]">{formatPriceGBP(pricing.monthlyPence)}<span class="text-xs font-normal text-[#656767]">/mo</span></p>
							<p class="text-xs text-[#656767]">{formatPriceGBP(pricing.annualPence)}/yr</p>
						{:else if plan === 'enterprise'}
							<p class="text-sm font-medium text-[#656767]">Custom</p>
						{:else}
							<p class="text-lg font-bold text-[#131417]">Free</p>
						{/if}
						<p class="text-xs text-[#656767] mt-2">{pricing.description}</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Plan Change Form -->
	<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-6 space-y-6">
		<h2 class="text-base font-semibold text-[#131417]">Change Organization Plan</h2>

		{#if error}
			<div class="px-4 py-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">{error}</div>
		{/if}

		{#if success}
			<div class="px-4 py-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">{success}</div>
		{/if}

		<!-- Org Search -->
		<div class="relative">
			<label for="org-search" class="block text-sm font-medium text-[#656767] mb-1">Search Organization</label>
			<div class="flex gap-2">
				<input
					id="org-search"
					type="text"
					bind:value={orgSearch}
					placeholder="Search by name or ID..."
					class="flex-1 px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
					onkeydown={(e) => e.key === 'Enter' && searchOrgs()}
				/>
				<button
					onclick={searchOrgs}
					disabled={searching}
					class="px-4 py-2 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors disabled:opacity-50"
				>
					{searching ? 'Searching...' : 'Search'}
				</button>
			</div>
			{#if searchResults.length > 0}
				<div class="absolute z-10 mt-1 w-full bg-white border border-[rgba(19,20,23,0.15)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
					{#each searchResults as org}
						<button
							onclick={() => selectOrg(org)}
							class="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F6F7F8] transition-colors border-b border-[rgba(19,20,23,0.05)] last:border-b-0"
						>
							<span class="font-medium text-[#131417]">{org.name}</span>
							<span class="ml-2 text-xs text-[#656767] capitalize">({org.plan})</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if selectedOrg}
			<!-- Current Plan -->
			<div>
				<p class="text-sm text-[#656767] mb-1">Current Plan</p>
				<p class="text-lg font-semibold text-[#131417] capitalize">{selectedOrg.plan}</p>
			</div>

			<!-- New Plan Selector -->
			<div>
				<label for="new-plan" class="block text-sm font-medium text-[#656767] mb-1">New Plan</label>
				<select
					id="new-plan"
					bind:value={newPlan}
					disabled={!canMutate}
					class="w-full max-w-xs px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#each plans as plan}
						{@const p = PLAN_PRICING[plan]}
						<option value={plan}>{p?.label || plan} {p && p.monthlyPence > 0 ? `(${formatPriceGBP(p.monthlyPence)}/mo)` : ''}</option>
					{/each}
				</select>
			</div>

			<!-- Effective Date -->
			<div>
				<label for="effective-date" class="block text-sm font-medium text-[#656767] mb-1">Effective Date</label>
				<input
					id="effective-date"
					type="date"
					bind:value={effectiveDate}
					disabled={!canMutate}
					class="px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9] disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>

			{#if canMutate}
				<!-- Preview Button -->
				<div class="flex gap-3">
					<button
						onclick={fetchPreview}
						disabled={previewLoading || newPlan === selectedOrg.plan}
						class="px-4 py-2 text-sm font-medium text-[#2E4BE9] bg-white border border-[#2E4BE9] rounded-lg hover:bg-[#EFF1FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{previewLoading ? 'Loading...' : 'Preview Changes'}
					</button>
				</div>
			{/if}

			<!-- Preview Results -->
			{#if preview}
				<div class="bg-[#F6F5F1] rounded-lg p-4 space-y-3">
					<h3 class="text-sm font-semibold text-[#131417]">Impact Preview</h3>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-xs font-medium text-green-700 mb-1">Entitlements Gained</p>
							{#if preview.entitlementsGained.length > 0}
								<ul class="space-y-1">
									{#each preview.entitlementsGained as e}
										<li class="text-sm text-green-800 bg-green-50 px-2 py-1 rounded">+ {e}</li>
									{/each}
								</ul>
							{:else}
								<p class="text-sm text-[#656767]">None</p>
							{/if}
						</div>
						<div>
							<p class="text-xs font-medium text-red-700 mb-1">Entitlements Lost</p>
							{#if preview.entitlementsLost.length > 0}
								<ul class="space-y-1">
									{#each preview.entitlementsLost as e}
										<li class="text-sm text-red-800 bg-red-50 px-2 py-1 rounded">- {e}</li>
									{/each}
								</ul>
							{:else}
								<p class="text-sm text-[#656767]">None</p>
							{/if}
						</div>
					</div>

					{#if canMutate}
						<button
							onclick={() => { confirmOpen = true; }}
							class="mt-3 px-4 py-2 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors"
						>
							Confirm Plan Change
						</button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Users List -->
	<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
		<div class="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<h2 class="text-base font-semibold text-[#131417]">All Users</h2>
			<div class="flex items-center gap-3">
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={userSearch}
						placeholder="Search by org name..."
						class="px-3 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
						onkeydown={(e) => e.key === 'Enter' && searchUsers()}
					/>
					<button
						onclick={searchUsers}
						class="px-3 py-1.5 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors"
					>
						Search
					</button>
				</div>
				<div class="flex items-center gap-2">
					<label for="plan-filter" class="text-sm text-[#656767]">Plan</label>
					<select
						id="plan-filter"
						value={data.plan}
						onchange={(e) => changePlanFilter((e.target as HTMLSelectElement).value)}
						class="px-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
					>
						<option value="">All</option>
						{#each plans as plan}
							<option value={plan} class="capitalize">{plan}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-center gap-2">
					<label for="per-page" class="text-sm text-[#656767]">Show</label>
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
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Organization</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Email</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Plan</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Status</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Connection</th>
						<th class="px-6 py-3 text-left font-medium text-[#656767]">Created</th>
					</tr>
				</thead>
				<tbody>
					{#each data.accounts as account}
						<tr class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors">
							<td class="px-6 py-3">
								<div class="flex flex-col">
									<span class="font-medium text-[#131417]">{account.org_name}</span>
									<span class="text-xs text-[#656767] font-mono">{account.org_id.slice(0, 8)}...</span>
								</div>
							</td>
							<td class="px-6 py-3 text-[#656767]">{account.email || '--'}</td>
							<td class="px-6 py-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
									{account.plan === 'enterprise' ? 'bg-purple-50 text-purple-700' :
									 account.plan === 'pro' ? 'bg-blue-50 text-blue-700' :
									 account.plan === 'starter' ? 'bg-green-50 text-green-700' :
									 account.plan === 'founder' ? 'bg-[#EFF1FF] text-[#4D61F4]' :
									 'bg-gray-100 text-gray-600'}">
									{account.plan}
								</span>
							</td>
							<td class="px-6 py-3">
								<span class="inline-flex items-center gap-1 text-xs capitalize
									{account.plan_status === 'active' ? 'text-green-700' :
									 account.plan_status === 'paused' ? 'text-amber-600' :
									 'text-[#656767]'}">
									<span class="w-1.5 h-1.5 rounded-full
										{account.plan_status === 'active' ? 'bg-green-500' :
										 account.plan_status === 'paused' ? 'bg-amber-500' :
										 'bg-gray-400'}"></span>
									{account.plan_status}
								</span>
							</td>
							<td class="px-6 py-3 text-[#656767] text-xs capitalize">{account.connection_status || '--'}</td>
							<td class="px-6 py-3 text-[#656767]">{formatDate(account.created_at)}</td>
						</tr>
					{/each}
					{#if data.accounts.length === 0}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-[#656767]">No users found</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.total > 0}
			<div class="flex items-center justify-between px-6 py-4 border-t border-[rgba(19,20,23,0.08)]">
				<p class="text-sm text-[#656767]">
					Showing {(data.page - 1) * data.perPage + 1} - {Math.min(data.page * data.perPage, data.total)} of {data.total}
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
								class="px-3 py-1.5 text-sm rounded-lg transition-colors {p === data.page ? 'bg-[#2E4BE9] text-white' : 'border border-[rgba(19,20,23,0.15)] hover:bg-[#F6F7F8]'}"
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

<!-- Confirm Dialog -->
{#if confirmOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] p-6 max-w-md w-full mx-4 shadow-xl">
			<h3 class="text-lg font-semibold text-[#131417] mb-2">Confirm Plan Change</h3>
			<p class="text-sm text-[#656767] mb-4">
				Are you sure you want to change <strong>{selectedOrg?.name}</strong> from
				<strong class="capitalize">{selectedOrg?.plan}</strong> to
				<strong class="capitalize">{newPlan}</strong>?
				This action will be logged in the audit trail.
			</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={() => { confirmOpen = false; }}
					class="px-4 py-2 text-sm font-medium text-[#656767] bg-white border border-[rgba(19,20,23,0.15)] rounded-lg hover:bg-[#F6F7F8] transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={confirmChange}
					disabled={submitting}
					class="px-4 py-2 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors disabled:opacity-50"
				>
					{submitting ? 'Processing...' : 'Confirm'}
				</button>
			</div>
		</div>
	</div>
{/if}
