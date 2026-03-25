<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import EntitlementPanel from '$lib/components/admin/EntitlementPanel.svelte';
	import ChangePasswordPanel from '$lib/components/admin/ChangePasswordPanel.svelte';

	let { data }: { data: PageData } = $props();

	const org = $derived(data.org);
	const members = $derived(data.members || []);
	const connections = $derived(data.connections || []);
	const destinations = $derived(data.destinations || []);
	const entitlements = $derived(data.entitlements || []);
	const stats = $derived(data.enrichmentStats);
	const auditLog = $derived(data.auditLog || []);

	function statusColor(status: string): string {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'paused':
				return 'bg-yellow-100 text-yellow-800';
			case 'cancelled':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function planBadge(plan: string): string {
		switch (plan) {
			case 'enterprise':
				return 'bg-purple-100 text-purple-800';
			case 'pro':
				return 'bg-blue-100 text-blue-800';
			case 'starter':
				return 'bg-indigo-100 text-indigo-800';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

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

	// Auto-refresh every 30 seconds
	$effect(() => {
		const interval = setInterval(() => {
			invalidateAll();
		}, 30_000);

		return () => clearInterval(interval);
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a href="/accounts" class="text-[#656767] hover:text-[#131417] transition-colors">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-bold text-[#131417]">{org.name}</h1>
			<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium {planBadge(org.plan)}">
				{org.plan || 'free'}
			</span>
			<span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium {statusColor(org.plan_status)}">
				{org.plan_status || 'unknown'}
			</span>
		</div>
	</div>

	<p class="text-sm text-[#656767]">Org ID: {org.id}</p>

	<!-- Cards Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Members -->
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
				<h2 class="text-base font-semibold text-[#131417]">Members ({members.length})</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Name</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Email</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Role</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each members as member}
							<tr class="border-b border-[rgba(19,20,23,0.05)]">
								<td class="px-6 py-2.5 text-[#131417]">
									{member.first_name || ''} {member.last_name || ''}
								</td>
								<td class="px-6 py-2.5 text-[#131417]">{member.email || '--'}</td>
								<td class="px-6 py-2.5 text-[#131417] capitalize">{member.role}</td>
								<td class="px-6 py-2.5">
									<ChangePasswordPanel
										userId={member.user_id}
										orgId={org.id}
										userName={member.first_name ? `${member.first_name} ${member.last_name || ''}`.trim() : member.email || 'user'}
										roles={data.roles}
									/>
								</td>
							</tr>
						{/each}
						{#if members.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-4 text-center text-[#656767]">No members</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Connections -->
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
				<h2 class="text-base font-semibold text-[#131417]">Connections ({connections.length})</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Service</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Status</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Last Sync</th>
						</tr>
					</thead>
					<tbody>
						{#each connections as conn}
							<tr class="border-b border-[rgba(19,20,23,0.05)]">
								<td class="px-6 py-2.5 text-[#131417] capitalize">{conn.service || conn.connector_type || '--'}</td>
								<td class="px-6 py-2.5">
									<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium {statusColor(conn.setup_state === 'connected' ? 'active' : 'paused')}">
										{conn.setup_state || 'unknown'}
									</span>
								</td>
								<td class="px-6 py-2.5 text-[#656767]">{formatDate(conn.last_sync_at || conn.updated_at)}</td>
							</tr>
						{/each}
						{#if connections.length === 0}
							<tr>
								<td colspan="3" class="px-6 py-4 text-center text-[#656767]">No connections</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Destinations -->
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
				<h2 class="text-base font-semibold text-[#131417]">Destinations ({destinations.length})</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Type</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each destinations as dest}
							<tr class="border-b border-[rgba(19,20,23,0.05)]">
								<td class="px-6 py-2.5 text-[#131417] capitalize">{dest.destination_type || dest.type || '--'}</td>
								<td class="px-6 py-2.5">
									<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium {statusColor(dest.status === 'active' ? 'active' : 'paused')}">
										{dest.status || 'unknown'}
									</span>
								</td>
							</tr>
						{/each}
						{#if destinations.length === 0}
							<tr>
								<td colspan="2" class="px-6 py-4 text-center text-[#656767]">No destinations</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Enrichment Stats -->
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
				<h2 class="text-base font-semibold text-[#131417]">Enrichment Stats</h2>
			</div>
			<div class="grid grid-cols-3 divide-x divide-[rgba(19,20,23,0.08)]">
				<div class="px-6 py-5 text-center">
					<p class="text-2xl font-bold text-[#131417]">{stats.totalRecords.toLocaleString()}</p>
					<p class="text-xs text-[#656767] mt-1">Total Records</p>
				</div>
				<div class="px-6 py-5 text-center">
					<p class="text-2xl font-bold text-[#131417]">{stats.addressMatched.toLocaleString()}</p>
					<p class="text-xs text-[#656767] mt-1">Address Matched</p>
				</div>
				<div class="px-6 py-5 text-center">
					<p class="text-2xl font-bold text-[#131417]">{stats.enrichedProfiles.toLocaleString()}</p>
					<p class="text-xs text-[#656767] mt-1">Enriched</p>
				</div>
			</div>
		</div>

		<!-- Entitlements -->
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden lg:col-span-2">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
				<h2 class="text-base font-semibold text-[#131417]">Entitlements ({entitlements.length})</h2>
			</div>
			<div class="p-6">
				<EntitlementPanel orgId={org.id} {entitlements} roles={data.roles} onRefresh={() => invalidateAll()} />
			</div>
		</div>

		<!-- Recent Admin Actions -->
		<div class="bg-white rounded-xl border border-[rgba(19,20,23,0.15)] overflow-hidden lg:col-span-2">
			<div class="px-6 py-4 border-b border-[rgba(19,20,23,0.08)]">
				<h2 class="text-base font-semibold text-[#131417]">Recent Admin Actions</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F9F9F8]">
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Date</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Action</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Category</th>
							<th class="px-6 py-2.5 text-left font-medium text-[#656767]">Reason</th>
						</tr>
					</thead>
					<tbody>
						{#each auditLog.slice(0, 10) as entry}
							<tr class="border-b border-[rgba(19,20,23,0.05)]">
								<td class="px-6 py-2.5 text-[#656767]">{formatDate(entry.created_at)}</td>
								<td class="px-6 py-2.5 text-[#131417]">{entry.action_type}</td>
								<td class="px-6 py-2.5">
									<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
										{entry.action_category}
									</span>
								</td>
								<td class="px-6 py-2.5 text-[#656767]">{entry.reason || '--'}</td>
							</tr>
						{/each}
						{#if auditLog.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-4 text-center text-[#656767]">No recent actions</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
