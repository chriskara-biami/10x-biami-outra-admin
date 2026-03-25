<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmPhrase: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	const { open, title, message, confirmPhrase, onConfirm, onCancel }: Props = $props();

	let typedPhrase = $state('');
	const matches = $derived(typedPhrase === confirmPhrase);

	$effect(() => {
		if (!open) typedPhrase = '';
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (matches) onConfirm();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onCancel();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		onkeydown={handleKeydown}
	>
		<!-- Backdrop click -->
		<button
			class="absolute inset-0 cursor-default"
			onclick={onCancel}
			aria-label="Close dialog"
			tabindex="-1"
		></button>

		<div class="relative z-10 w-full max-w-md rounded-lg border border-[rgba(19,20,23,0.15)] bg-white p-6 shadow-xl">
			<!-- Warning icon -->
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
					<svg class="h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
					</svg>
				</div>
				<h2 id="confirm-title" class="text-lg font-semibold text-gray-900">{title}</h2>
			</div>

			<p class="mb-4 text-sm text-gray-600">{message}</p>

			<form onsubmit={handleSubmit}>
				<label class="mb-1 block text-sm font-medium text-gray-700">
					Type <span class="font-mono font-semibold text-gray-900">{confirmPhrase}</span> to confirm
				</label>
				<input
					type="text"
					bind:value={typedPhrase}
					placeholder={confirmPhrase}
					class="mb-4 w-full rounded-lg border border-[rgba(19,20,23,0.15)] bg-white px-3 py-2 text-sm outline-none focus:border-[#2E4BE9] focus:ring-1 focus:ring-[#2E4BE9]"
				/>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={onCancel}
						class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!matches}
						class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Confirm
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
