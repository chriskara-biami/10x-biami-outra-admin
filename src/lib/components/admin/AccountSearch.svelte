<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		query?: string;
	}

	const { query = '' }: Props = $props();

	let searchQuery = $state(query);

	function handleSubmit(e: Event) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		}
		goto(`/accounts?${params.toString()}`);
	}

	function handleClear() {
		searchQuery = '';
		goto('/accounts');
	}
</script>

<form onsubmit={handleSubmit} class="flex gap-2">
	<div class="relative flex-1">
		<svg
			class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(19,20,23,0.45)]"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
			/>
		</svg>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search by name, email, or ID..."
			class="w-full rounded-[999px] border border-[rgba(19,20,23,0.15)] bg-white py-2.5 pl-10 pr-4 text-sm text-[#131417] placeholder-[rgba(19,20,23,0.45)] outline-none focus:border-[#4D61F4] focus:ring-2 focus:ring-[#4D61F4]/20 transition-colors"
		/>
	</div>

	<button
		type="submit"
		class="h-[42px] px-6 rounded-[999px] bg-[#2E4BE9] text-sm font-semibold text-white hover:bg-[#2540CC] transition-colors"
	>
		Search
	</button>

	{#if query}
		<button
			type="button"
			onclick={handleClear}
			class="h-[42px] px-4 rounded-[999px] border border-[rgba(19,20,23,0.15)] text-sm font-semibold text-[#2D2E2E] hover:bg-[#F5F5F5] transition-colors"
		>
			Clear
		</button>
	{/if}
</form>
