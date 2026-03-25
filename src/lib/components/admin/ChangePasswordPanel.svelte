<script lang="ts">
	import { hasPermission } from '$lib/utils/permissions';

	interface Props {
		userId: string;
		orgId: string;
		userName: string;
		roles: string[];
	}

	let { userId, orgId, userName, roles }: Props = $props();

	const canMutate = $derived(hasPermission(roles, ['accounts:view']));

	let newPassword = $state('');
	let confirmPassword = $state('');
	let submitting = $state(false);
	let error = $state('');
	let success = $state('');
	let showForm = $state(false);
	let showPassword = $state(false);

	const passwordsMatch = $derived(newPassword === confirmPassword);
	const isValid = $derived(newPassword.length >= 8 && passwordsMatch && confirmPassword.length > 0);

	async function changePassword() {
		if (!isValid) return;
		submitting = true;
		error = '';
		success = '';

		try {
			const res = await fetch('/api/accounts/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_id: userId, org_id: orgId, new_password: newPassword })
			});

			const json = await res.json();
			if (!res.ok) throw new Error(json.message || json.error || 'Failed to change password');

			success = `Password changed successfully for ${userName}`;
			newPassword = '';
			confirmPassword = '';
			showForm = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to change password';
		} finally {
			submitting = false;
		}
	}
</script>

{#if canMutate}
	<div class="space-y-3">
		{#if error}
			<div class="px-4 py-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">{error}</div>
		{/if}

		{#if success}
			<div class="px-4 py-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">{success}</div>
		{/if}

		{#if !showForm}
			<button
				onclick={() => { showForm = true; success = ''; }}
				class="px-4 py-2 text-sm font-medium text-[#2E4BE9] bg-white border border-[#2E4BE9] rounded-lg hover:bg-[#EFF1FF] transition-colors"
			>
				Reset Password
			</button>
		{:else}
			<div class="space-y-3 max-w-sm">
				<div>
					<label for="new-password" class="block text-sm font-medium text-[#656767] mb-1">New Password</label>
					<div class="relative">
						<input
							id="new-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={newPassword}
							placeholder="Min 8 characters"
							class="w-full px-3 py-2 pr-10 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
						/>
						<button
							type="button"
							onclick={() => { showPassword = !showPassword; }}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-[#656767] hover:text-[#131417] transition-colors"
							title={showPassword ? 'Hide password' : 'Show password'}
						>
							{#if showPassword}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
					{#if newPassword.length > 0 && newPassword.length < 8}
						<p class="text-xs text-red-500 mt-1">Must be at least 8 characters</p>
					{/if}
				</div>

				<div>
					<label for="confirm-password" class="block text-sm font-medium text-[#656767] mb-1">Confirm Password</label>
					<div class="relative">
						<input
							id="confirm-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Re-enter password"
							class="w-full px-3 py-2 pr-10 text-sm border border-[rgba(19,20,23,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E4BE9]/30 focus:border-[#2E4BE9]"
						/>
						<button
							type="button"
							onclick={() => { showPassword = !showPassword; }}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-[#656767] hover:text-[#131417] transition-colors"
							title={showPassword ? 'Hide password' : 'Show password'}
						>
							{#if showPassword}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
					{#if confirmPassword.length > 0 && !passwordsMatch}
						<p class="text-xs text-red-500 mt-1">Passwords do not match</p>
					{/if}
				</div>

				<div class="flex gap-2">
					<button
						onclick={changePassword}
						disabled={!isValid || submitting}
						class="px-4 py-2 text-sm font-medium text-white bg-[#2E4BE9] hover:bg-[#4D61F4] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{submitting ? 'Changing...' : 'Change Password'}
					</button>
					<button
						onclick={() => { showForm = false; newPassword = ''; confirmPassword = ''; error = ''; }}
						class="px-4 py-2 text-sm font-medium text-[#656767] bg-white border border-[rgba(19,20,23,0.15)] rounded-lg hover:bg-[#F6F7F8] transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
