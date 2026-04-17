<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { formatPriceGBP } from '$lib/config/plan-entitlements';
	import AccountSearch from '$lib/components/admin/AccountSearch.svelte';

	let { data }: { data: PageData } = $props();

	// Sub-tab state
	let activeTab = $state<'users' | 'pricing' | 'logs'>('users');

	// Users list pagination
	const perPageOptions = [10, 20, 50];
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.perPage)));
	let planFilter = $state(data.plan || '');

	// Sorting state
	let sortColumn = $state<string>('');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	function toggleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function compareValues(a: any, b: any, dir: 'asc' | 'desc'): number {
		if (a == null && b == null) return 0;
		if (a == null) return dir === 'asc' ? 1 : -1;
		if (b == null) return dir === 'asc' ? -1 : 1;
		if (typeof a === 'string') return dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
		return dir === 'asc' ? a - b : b - a;
	}

	const filteredAndSortedAccounts = $derived.by(() => {
		let rows = [...(data.accounts || [])];

		if (sortColumn) {
			rows.sort((a: any, b: any) => {
				const keyMap: Record<string, string> = {
					email: 'email',
					plan: 'plan',
					subscribed_on: 'created_at',
					created: 'created_at'
				};
				const key = keyMap[sortColumn] || sortColumn;
				return compareValues(a[key], b[key], sortDirection);
			});
		}

		return rows;
	});

	// Logs sorting state
	let logSortColumn = $state<string>('');
	let logSortDirection = $state<'asc' | 'desc'>('asc');

	function toggleLogSort(column: string) {
		if (logSortColumn === column) {
			logSortDirection = logSortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			logSortColumn = column;
			logSortDirection = 'asc';
		}
	}

	function logSortIcon(column: string): string {
		if (logSortColumn !== column) return '↕';
		return logSortDirection === 'asc' ? '↑' : '↓';
	}

	const filteredAndSortedLogs = $derived.by(() => {
		let rows = [...((data as any).historyEntries || [])];

		if (logSortColumn) {
			rows.sort((a: any, b: any) => {
				const keyMap: Record<string, string> = {
					date: 'created_at',
					organization: 'org_name',
					email: 'owner_email',
					action: 'action',
					from_plan: 'from_plan',
					to_plan: 'to_plan',
					amount: 'amount',
					performed_by: 'admin_email'
				};
				const key = keyMap[logSortColumn] || logSortColumn;
				return compareValues(a[key], b[key], logSortDirection);
			});
		}

		return rows;
	});

	function sortIcon(column: string): string {
		if (sortColumn !== column) return '↕';
		return sortDirection === 'asc' ? '↑' : '↓';
	}

	// Pricing from DB
	const pricingEntries = $derived((data as any).pricing || []);

	// Edit state
	let editingKey = $state<string | null>(null);
	let editMonthlyGBP = $state(0);
	let editAnnualGBP = $state(0);
	let editOriginalGBP = $state(0);
	let editLabel = $state('');
	let editDescription = $state('');
	let saving = $state(false);
	let saveError = $state('');
	let saveSuccess = $state('');

	// New category form
	let showNewForm = $state(false);
	let newKey = $state('');
	let newLabel = $state('');
	let newMonthlyGBP = $state(0);
	let newAnnualGBP = $state(0);
	let newOriginalGBP = $state(0);
	let newDescription = $state('');

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

	function startEdit(entry: any) {
		editingKey = entry.plan_key;
		editMonthlyGBP = entry.monthly_price_pence / 100;
		editAnnualGBP = entry.annual_price_pence / 100;
		editOriginalGBP = (entry.original_price_pence || 0) / 100;
		editLabel = entry.label;
		editDescription = entry.description;
		saveError = '';
		saveSuccess = '';
	}

	function cancelEdit() {
		editingKey = null;
		saveError = '';
	}

	async function saveEdit() {
		if (!editingKey) return;
		saving = true;
		saveError = '';
		saveSuccess = '';

		try {
			const res = await fetch('/api/pricing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					plan_key: editingKey,
					label: editLabel,
					description: editDescription,
					monthly_price_pence: Math.round(editMonthlyGBP * 100),
					annual_price_pence: Math.round(editAnnualGBP * 100),
					original_price_pence: Math.round(editOriginalGBP * 100)
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.message || 'Failed to save');

			saveSuccess = `Saved. ${result.stripe_price_id ? `New Stripe Price: ${result.stripe_price_id}` : ''}`;
			editingKey = null;
			await invalidateAll();
		} catch (err: any) {
			saveError = err.message || 'Failed to save pricing';
		} finally {
			saving = false;
		}
	}

	async function addCategory() {
		if (!newKey.trim() || !newLabel.trim()) return;
		saving = true;
		saveError = '';
		saveSuccess = '';

		const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');

		try {
			const res = await fetch('/api/pricing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					plan_key: key,
					label: newLabel.trim(),
					description: newDescription.trim(),
					monthly_price_pence: Math.round(newMonthlyGBP * 100),
					annual_price_pence: Math.round(newAnnualGBP * 100),
					original_price_pence: Math.round(newOriginalGBP * 100)
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.message || 'Failed to create');

			saveSuccess = `Created "${newLabel.trim()}". ${result.stripe_price_id ? `Stripe Price: ${result.stripe_price_id}` : ''}`;
			newKey = '';
			newLabel = '';
			newMonthlyGBP = 0;
			newAnnualGBP = 0;
			newOriginalGBP = 0;
			newDescription = '';
			showNewForm = false;
			await invalidateAll();
		} catch (err: any) {
			saveError = err.message || 'Failed to create pricing';
		} finally {
			saving = false;
		}
	}
</script>

<div class="max-w-[1600px] mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[#131417]">Subscriptions</h1>
	</div>

	<!-- Sub-tabs -->
	<nav class="p-2 bg-white rounded-[999px] flex items-center gap-2 w-fit">
		<button
			onclick={() => (activeTab = 'users')}
			class="h-8 px-6 py-2 rounded-[999px] flex items-center justify-center border transition-colors duration-200 text-sm font-semibold leading-5
				{activeTab === 'users' ? 'bg-[#EFF1FF] border-[#4D61F4] text-[#2E4BE9]' : 'border-transparent text-[#2D2E2E] hover:bg-[#F5F5F5]'}"
		>
			Users
		</button>
		<button
			onclick={() => (activeTab = 'pricing')}
			class="h-8 px-6 py-2 rounded-[999px] flex items-center justify-center border transition-colors duration-200 text-sm font-semibold leading-5
				{activeTab === 'pricing' ? 'bg-[#EFF1FF] border-[#4D61F4] text-[#2E4BE9]' : 'border-transparent text-[#2D2E2E] hover:bg-[#F5F5F5]'}"
		>
			Pricing
		</button>
		<button
			onclick={() => (activeTab = 'logs')}
			class="h-8 px-6 py-2 rounded-[999px] flex items-center justify-center border transition-colors duration-200 text-sm font-semibold leading-5
				{activeTab === 'logs' ? 'bg-[#EFF1FF] border-[#4D61F4] text-[#2E4BE9]' : 'border-transparent text-[#2D2E2E] hover:bg-[#F5F5F5]'}"
		>
			Subscription Logs
		</button>
	</nav>

	<!-- Status Messages -->
	{#if saveError}
		<div class="bg-red-50 border border-red-200 rounded-full px-4 py-3 text-sm text-red-700 flex items-center justify-between">
			<span>{saveError}</span>
			<button onclick={() => (saveError = '')} class="text-red-400 hover:text-red-600">&times;</button>
		</div>
	{/if}
	{#if saveSuccess}
		<div class="bg-green-50 border border-green-200 rounded-full px-4 py-3 text-sm text-green-700 flex items-center justify-between">
			<span>{saveSuccess}</span>
			<button onclick={() => (saveSuccess = '')} class="text-green-400 hover:text-green-600">&times;</button>
		</div>
	{/if}

	{#if activeTab === 'users'}
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
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleSort('email')}>
								Email <span class="text-[10px]">{sortIcon('email')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleSort('plan')}>
								Plan <span class="text-[10px]">{sortIcon('plan')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleSort('subscribed_on')}>
								Subscribed on <span class="text-[10px]">{sortIcon('subscribed_on')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleSort('created')}>
								Created <span class="text-[10px]">{sortIcon('created')}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredAndSortedAccounts as account}
							<tr
								class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
								onclick={() => goto(`/billing/${account.org_id}`)}
							>
								<td class="px-6 py-3 text-[#131417]">{account.email || '--'}</td>
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
								<td class="px-6 py-3 text-[#656767]">{formatDate(account.created_at)}</td>
								<td class="px-6 py-3 text-[#656767]">{formatDate(account.created_at)}</td>
							</tr>
						{/each}
						{#if filteredAndSortedAccounts.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-8 text-center text-[#656767]">No users found</td>
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
	{:else if activeTab === 'pricing'}
		<!-- Pricing Management -->
		<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)] flex items-center justify-between">
				<h2 class="text-base font-semibold text-[#131417]">Plan Pricing</h2>
				<button
					onclick={() => (showNewForm = !showNewForm)}
					class="rounded-full bg-[#2E4BE9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4D61F4] transition-colors"
				>
					{showNewForm ? 'Cancel' : 'Add Category'}
				</button>
			</div>

			<!-- Add New Category Form -->
			{#if showNewForm}
				<div class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8] px-6 py-4">
					<h3 class="text-sm font-semibold text-[#131417] mb-3">New Pricing Category</h3>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<div>
							<label for="new-key" class="block text-xs font-medium text-[#656767] mb-1">Plan Key</label>
							<input
								id="new-key"
								type="text"
								bind:value={newKey}
								placeholder="e.g. enterprise"
								class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
							/>
						</div>
						<div>
							<label for="new-label" class="block text-xs font-medium text-[#656767] mb-1">Display Name</label>
							<input
								id="new-label"
								type="text"
								bind:value={newLabel}
								placeholder="e.g. Enterprise"
								class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
							/>
						</div>
						<div>
							<label for="new-monthly" class="block text-xs font-medium text-[#656767] mb-1">Monthly Price (GBP)</label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#656767]">&pound;</span>
								<input
									id="new-monthly"
									type="number"
									bind:value={newMonthlyGBP}
									min="0"
									step="0.01"
									class="w-full pl-7 pr-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
								/>
							</div>
						</div>
						<div>
							<label for="new-annual" class="block text-xs font-medium text-[#656767] mb-1">Annual Price (GBP)</label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#656767]">&pound;</span>
								<input
									id="new-annual"
									type="number"
									bind:value={newAnnualGBP}
									min="0"
									step="0.01"
									class="w-full pl-7 pr-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
								/>
							</div>
						</div>
						<div>
							<label for="new-original" class="block text-xs font-medium text-[#656767] mb-1">Original Price (GBP)</label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#656767]">&pound;</span>
								<input
									id="new-original"
									type="number"
									bind:value={newOriginalGBP}
									min="0"
									step="0.01"
									class="w-full pl-7 pr-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
								/>
							</div>
							<p class="text-[10px] text-[#656767] mt-1">Crossed-out price / "You save" text</p>
						</div>
						<div class="sm:col-span-2">
							<label for="new-desc" class="block text-xs font-medium text-[#656767] mb-1">Description</label>
							<input
								id="new-desc"
								type="text"
								bind:value={newDescription}
								placeholder="Plan description"
								class="w-full px-3 py-2 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
							/>
						</div>
					</div>
					<div class="mt-4 flex justify-end">
						<button
							onclick={addCategory}
							disabled={!newKey.trim() || !newLabel.trim() || saving}
							class="rounded-full bg-[#2E4BE9] px-4 py-2 text-sm font-medium text-white hover:bg-[#4D61F4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{saving ? 'Creating...' : 'Add Category'}
						</button>
					</div>
				</div>
			{/if}

			<!-- Pricing Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Plan</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Monthly</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Annual</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Original Price</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Stripe Price ID</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Description</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each pricingEntries as entry (entry.plan_key)}
							{#if editingKey === entry.plan_key}
								<tr class="border-b border-[rgba(19,20,23,0.05)] bg-[#FAFAF9]">
									<td class="px-6 py-3">
										<input
											type="text"
											bind:value={editLabel}
											class="w-full px-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
										/>
									</td>
									<td class="px-6 py-3">
										<div class="relative">
											<span class="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#656767]">&pound;</span>
											<input
												type="number"
												bind:value={editMonthlyGBP}
												min="0"
												step="0.01"
												class="w-28 pl-6 pr-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
											/>
										</div>
									</td>
									<td class="px-6 py-3">
										<div class="relative">
											<span class="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#656767]">&pound;</span>
											<input
												type="number"
												bind:value={editAnnualGBP}
												min="0"
												step="0.01"
												class="w-28 pl-6 pr-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
											/>
										</div>
									</td>
									<td class="px-6 py-3">
										<div class="relative">
											<span class="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#656767]">&pound;</span>
											<input
												type="number"
												bind:value={editOriginalGBP}
												min="0"
												step="0.01"
												class="w-28 pl-6 pr-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
											/>
										</div>
									</td>
									<td class="px-6 py-3 text-xs font-mono text-[#656767]">
										{entry.stripe_price_id || '--'}
									</td>
									<td class="px-6 py-3">
										<input
											type="text"
											bind:value={editDescription}
											class="w-full px-2 py-1.5 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30"
										/>
									</td>
									<td class="px-6 py-3">
										<div class="flex items-center gap-2">
											<button
												onclick={saveEdit}
												disabled={saving}
												class="rounded-full bg-[#2E4BE9] px-2 py-1 text-xs font-medium text-white hover:bg-[#4D61F4] disabled:opacity-50 transition-colors"
											>
												{saving ? '...' : 'Save'}
											</button>
											<button
												onclick={cancelEdit}
												class="text-xs text-[#656767] hover:text-[#131417]"
											>
												Cancel
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr class="border-b border-[rgba(19,20,23,0.05)] hover:bg-[#FAFAF9] transition-colors">
									<td class="px-6 py-3">
										<div class="flex items-center gap-2">
											<span class="font-medium text-[#131417]">{entry.label}</span>
											<span class="text-xs text-[#656767] font-mono">({entry.plan_key})</span>
										</div>
									</td>
									<td class="px-6 py-3 text-[#131417] font-medium">
										{entry.monthly_price_pence > 0 ? formatPriceGBP(entry.monthly_price_pence) + '/mo' : 'Free'}
									</td>
									<td class="px-6 py-3 text-[#131417]">
										{entry.annual_price_pence > 0 ? formatPriceGBP(entry.annual_price_pence) + '/yr' : '--'}
									</td>
									<td class="px-6 py-3 text-[#131417]">
										{#if entry.original_price_pence > 0}
											<span class="line-through text-[#656767]">{formatPriceGBP(entry.original_price_pence)}</span>
											{#if entry.annual_price_pence > 0}
												<span class="text-xs text-green-600 ml-1">Save {formatPriceGBP(entry.original_price_pence - entry.annual_price_pence)}</span>
											{/if}
										{:else}
											--
										{/if}
									</td>
									<td class="px-6 py-3">
										{#if entry.stripe_price_id}
											<span class="text-xs font-mono text-[#656767]">{entry.stripe_price_id}</span>
										{:else}
											<span class="text-xs text-[#656767]">--</span>
										{/if}
									</td>
									<td class="px-6 py-3 text-[#656767]">{entry.description}</td>
									<td class="px-6 py-3">
										<button
											onclick={() => startEdit(entry)}
											class="rounded-full border border-[rgba(19,20,23,0.15)] px-2 py-1 text-xs font-medium text-[#656767] hover:text-[#131417] hover:bg-[#F6F7F8] transition-colors"
										>
											Edit
										</button>
									</td>
								</tr>
							{/if}
						{/each}
						{#if pricingEntries.length === 0}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-[#656767]">No pricing categories defined</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

	{:else if activeTab === 'logs'}
		<!-- Subscription Logs -->
		<div class="bg-white rounded-2xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)] flex items-center justify-between">
				<h2 class="text-base font-semibold text-[#131417]">Subscription Logs</h2>
				<span class="text-sm text-[#656767]">{(data as any).historyTotal || 0} entr{(data as any).historyTotal !== 1 ? 'ies' : 'y'}</span>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('date')}>
								Date <span class="text-[10px]">{logSortIcon('date')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('organization')}>
								Organization <span class="text-[10px]">{logSortIcon('organization')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('email')}>
								Owner Email <span class="text-[10px]">{logSortIcon('email')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('action')}>
								Action <span class="text-[10px]">{logSortIcon('action')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('from_plan')}>
								From Plan <span class="text-[10px]">{logSortIcon('from_plan')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('to_plan')}>
								To Plan <span class="text-[10px]">{logSortIcon('to_plan')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('amount')}>
								Amount <span class="text-[10px]">{logSortIcon('amount')}</span>
							</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider">Stripe TX ID</th>
							<th class="px-6 py-3 text-left font-semibold text-[#656767] text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#131417]" onclick={() => toggleLogSort('performed_by')}>
								Performed By <span class="text-[10px]">{logSortIcon('performed_by')}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredAndSortedLogs as entry}
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
									{entry.amount != null ? `£${Number(entry.amount).toFixed(2)}` : '--'}
								</td>
								<td class="px-6 py-3.5">
									<span class="text-xs font-mono text-[#656767]">{entry.stripe_transaction_id || '--'}</span>
								</td>
								<td class="px-6 py-3.5">
									<span class="text-[#656767]">{entry.admin_email || entry.performed_by || entry.admin_user_id || '--'}</span>
								</td>
							</tr>
						{/each}
						{#if filteredAndSortedLogs.length === 0}
							<tr>
								<td colspan="9" class="px-6 py-12 text-center text-[#656767]">No subscription history found</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
