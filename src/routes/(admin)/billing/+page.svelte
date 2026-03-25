<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { PLAN_PRICING, formatPriceGBP } from '$lib/config/plan-entitlements';
	import AccountSearch from '$lib/components/admin/AccountSearch.svelte';

	let { data }: { data: PageData } = $props();

	const plans = ['free', 'founder'];

	// Users list pagination
	const perPageOptions = [10, 20, 50];
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.perPage)));
	let planFilter = $state(data.plan || '');

	function buildParams(overrides: Record<string, string> = {}): URLSearchParams {
		const params = new URLSearchParams();
		const page = overrides.page ?? String(data.page);
		const perPage = overrides.perPage ?? String(data.perPage);
		const q = overrides.q ?? (data.search || '');
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
</script>

<div class="max-w-[1600px] mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[#131417]">Billing Management</h1>
		<div class="flex items-center gap-3">
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
	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] p-6 space-y-4">
		<h2 class="text-base font-semibold text-[#131417]">Plan Pricing</h2>
		<div class="grid grid-cols-2 gap-4 max-w-lg">
			{#each plans as plan}
				{@const pricing = PLAN_PRICING[plan]}
				{#if pricing}
					<div class="rounded-lg border p-4 {pricing.isFounder ? 'border-[#4D61F4] bg-[#EFF1FF]' : 'border-[rgba(19,20,23,0.10)] bg-[#F9F9F8]'}">
						<div class="flex items-center gap-2 mb-1">
							<h3 class="text-sm font-semibold text-[#131417]">{pricing.label}</h3>
						</div>
						{#if pricing.monthlyPence > 0}
							<p class="text-lg font-bold text-[#131417]">{formatPriceGBP(pricing.monthlyPence)}<span class="text-xs font-normal text-[#656767]">/mo</span></p>
						{:else}
							<p class="text-lg font-bold text-[#131417]">Free</p>
						{/if}
						<p class="text-xs text-[#656767] mt-2">{pricing.description}</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Users List -->
	<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
		<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<AccountSearch query={data.search} perPage={data.perPage} plan={data.plan} basePath="/billing" />
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
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Organization</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Email</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Plan</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Status</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Connection</th>
						<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Created</th>
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
