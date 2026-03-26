<script lang="ts">
	import { hasPermission } from '$lib/utils/permissions';

	interface Entitlement {
		id: string;
		entitlement_type: string;
		source: 'plan' | 'contract' | 'override';
		granted: boolean;
		expires_at?: string | null;
		created_at?: string | null;
		reason?: string;
		granted_by?: string;
	}

	interface Props {
		entitlements: Entitlement[];
		orgId: string;
		roles: string[];
		onRefresh?: () => void | Promise<void>;
	}

	const { entitlements, orgId, roles, onRefresh }: Props = $props();

	let showGrantForm = $state(false);
	let grantType = $state('');
	let grantEnabled = $state(true);
	let grantReason = $state('');
	let grantExpiry = $state('');
	let submitting = $state(false);
	let revokeId = $state<string | null>(null);
	let revokeReason = $state('');

	const canMutate = $derived(hasPermission(roles, ['entitlements:mutate']));
	const reasonValid = $derived(grantReason.trim().length >= 10);

	const sourceBadgeClass: Record<string, string> = {
		plan: 'bg-blue-100 text-blue-700',
		contract: 'bg-purple-100 text-purple-700',
		override: 'bg-orange-100 text-orange-700'
	};

	function formatExpiry(dateStr?: string | null): string {
		if (!dateStr) return 'Never';
		const d = new Date(dateStr);
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function formatDate(dateStr?: string | null): string {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleGrant(e: Event) {
		e.preventDefault();
		if (!reasonValid || !grantType.trim()) return;
		submitting = true;

		try {
			const res = await fetch('/api/entitlements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					org_id: orgId,
					entitlement_type: grantType,
					reason: grantReason.trim(),
					expires_at: grantExpiry || null
				})
			});

			if (!res.ok) throw new Error('Failed to grant override');

			showGrantForm = false;
			grantType = '';
			grantEnabled = true;
			grantReason = '';
			grantExpiry = '';
			await onRefresh?.();
		} catch (err) {
			console.error('Grant override failed:', err);
		} finally {
			submitting = false;
		}
	}

	async function handleRevoke(id: string) {
		if (!revokeReason.trim()) return;
		submitting = true;

		try {
			const res = await fetch(`/api/entitlements/${id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: revokeReason.trim() })
			});

			if (!res.ok) throw new Error('Failed to revoke override');

			revokeId = null;
			revokeReason = '';
			await onRefresh?.();
		} catch (err) {
			console.error('Revoke failed:', err);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-white">
	<div class="flex items-center justify-between border-b border-[rgba(19,20,23,0.08)] px-5 py-4">
		<h3 class="text-base font-semibold text-gray-900">Subscription</h3>
		{#if canMutate}
			<button
				onclick={() => (showGrantForm = !showGrantForm)}
				class="rounded-lg bg-[#2E4BE9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4D61F4] transition-colors"
			>
				{showGrantForm ? 'Cancel' : 'Override'}
			</button>
		{/if}
	</div>

	<!-- Grant Override Form -->
	{#if showGrantForm && canMutate}
		<form onsubmit={handleGrant} class="border-b border-[rgba(19,20,23,0.08)] bg-gray-50 px-5 py-4">
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label for="grant-type" class="mb-1 block text-xs font-medium text-gray-600">
						Subscription Type
					</label>
					<select
						id="grant-type"
						bind:value={grantType}
						required
						class="w-full rounded-lg border border-[rgba(19,20,23,0.15)] bg-white px-3 py-2 text-sm outline-none focus:border-[#2E4BE9] focus:ring-1 focus:ring-[#2E4BE9]"
					>
						<option value="" disabled>Select subscription type...</option>
						<option value="founder">Founder</option>
					</select>
				</div>

				<div>
					<label for="grant-expiry" class="mb-1 block text-xs font-medium text-gray-600">
						Expiry Date (optional)
					</label>
					<input
						id="grant-expiry"
						type="date"
						bind:value={grantExpiry}
						class="w-full rounded-lg border border-[rgba(19,20,23,0.15)] bg-white px-3 py-2 text-sm outline-none focus:border-[#2E4BE9] focus:ring-1 focus:ring-[#2E4BE9]"
					/>
				</div>
			</div>

			<div class="mt-3 flex items-center gap-2">
				<label class="relative inline-flex cursor-pointer items-center">
					<input type="checkbox" bind:checked={grantEnabled} class="peer sr-only" />
					<div class="h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#2E4BE9] peer-checked:after:translate-x-full"></div>
				</label>
				<span class="text-sm text-gray-700">{grantEnabled ? 'Enabled' : 'Disabled'}</span>
			</div>

			<div class="mt-3">
				<label for="grant-reason" class="mb-1 block text-xs font-medium text-gray-600">
					Reason <span class="text-gray-400">(min 10 characters)</span>
				</label>
				<textarea
					id="grant-reason"
					bind:value={grantReason}
					placeholder="Explain why this override is being applied..."
					required
					minlength={10}
					rows={2}
					class="w-full rounded-lg border border-[rgba(19,20,23,0.15)] bg-white px-3 py-2 text-sm outline-none focus:border-[#2E4BE9] focus:ring-1 focus:ring-[#2E4BE9] resize-none"
				></textarea>
			</div>

			<div class="mt-3 flex justify-end">
				<button
					type="submit"
					disabled={submitting || !reasonValid || !grantType.trim()}
					class="rounded-lg bg-[#2E4BE9] px-4 py-2 text-sm font-medium text-white hover:bg-[#4D61F4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{submitting ? 'Applying...' : 'Apply Override'}
				</button>
			</div>
		</form>
	{/if}

	<!-- Entitlements List -->
	{#if entitlements.length === 0}
		<div class="px-5 py-8 text-center text-sm text-gray-400">No subscription entries found</div>
	{:else}
		<ul class="divide-y divide-[rgba(19,20,23,0.08)]">
			{#each entitlements as ent (ent.id)}
				<li class="px-5 py-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="text-sm font-medium text-gray-900 capitalize">{ent.entitlement_type || '--'}</span>
							<span
								class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {sourceBadgeClass[ent.source] || 'bg-gray-100 text-gray-700'}"
							>
								{ent.source}
							</span>
							<span
								class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {ent.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}"
							>
								{ent.granted ? 'active' : 'inactive'}
							</span>
							<span class="text-xs text-gray-400">Date: {formatDate(ent.created_at)}</span>
							<span class="text-xs text-gray-400">Expires: {formatExpiry(ent.expires_at)}</span>
							{#if ent.reason}
								<span class="text-xs text-gray-500">— {ent.reason}</span>
							{/if}
						</div>

						{#if canMutate && ent.source === 'override'}
							{#if revokeId === ent.id}
								<div class="flex items-center gap-2">
									<input
										type="text"
										bind:value={revokeReason}
										placeholder="Reason for revocation"
										class="rounded border border-[rgba(19,20,23,0.15)] px-2 py-1 text-xs outline-none focus:border-[#2E4BE9]"
									/>
									<button
										onclick={() => handleRevoke(ent.id)}
										disabled={!revokeReason.trim() || submitting}
										class="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
									>
										Confirm
									</button>
									<button
										onclick={() => { revokeId = null; revokeReason = ''; }}
										class="text-xs text-gray-500 hover:text-gray-700"
									>
										Cancel
									</button>
								</div>
							{:else}
								<button
									onclick={() => (revokeId = ent.id)}
									class="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
								>
									Revoke
								</button>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
