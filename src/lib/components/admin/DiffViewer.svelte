<script lang="ts">
	interface Props {
		before: Record<string, unknown> | null;
		after: Record<string, unknown> | null;
	}

	const { before, after }: Props = $props();

	const allKeys = $derived(() => {
		const keys = new Set<string>();
		if (before) Object.keys(before).forEach((k) => keys.add(k));
		if (after) Object.keys(after).forEach((k) => keys.add(k));
		return [...keys].sort();
	});

	function getStatus(key: string): 'added' | 'removed' | 'changed' | 'unchanged' {
		const inBefore = before !== null && key in before;
		const inAfter = after !== null && key in after;
		if (!inBefore && inAfter) return 'added';
		if (inBefore && !inAfter) return 'removed';
		if (inBefore && inAfter && JSON.stringify(before![key]) !== JSON.stringify(after![key]))
			return 'changed';
		return 'unchanged';
	}

	function formatValue(val: unknown): string {
		if (val === undefined) return '';
		return JSON.stringify(val, null, 2);
	}
</script>

<div class="grid grid-cols-2 gap-4 text-sm font-mono">
	<!-- Before column -->
	<div>
		<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Before</div>
		{#if before === null}
			<div class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-gray-50 p-4 text-gray-400 italic">
				No previous state (new record)
			</div>
		{:else}
			<div class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-white overflow-hidden">
				{#each allKeys() as key}
					{@const status = getStatus(key)}
					{@const bgClass =
						status === 'removed'
							? 'bg-red-50'
							: status === 'changed'
								? 'bg-red-50'
								: ''}
					{#if status !== 'added'}
						<div class="border-b border-[rgba(19,20,23,0.08)] px-3 py-1.5 {bgClass}">
							<span class="text-gray-500">{key}:</span>
							<span class={status === 'removed' || status === 'changed' ? 'text-red-700' : 'text-gray-800'}>
								{formatValue(before[key])}
							</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- After column -->
	<div>
		<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">After</div>
		{#if after === null}
			<div class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-gray-50 p-4 text-gray-400 italic">
				No resulting state (deletion)
			</div>
		{:else}
			<div class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-white overflow-hidden">
				{#each allKeys() as key}
					{@const status = getStatus(key)}
					{@const bgClass =
						status === 'added'
							? 'bg-green-50'
							: status === 'changed'
								? 'bg-green-50'
								: ''}
					{#if status !== 'removed'}
						<div class="border-b border-[rgba(19,20,23,0.08)] px-3 py-1.5 {bgClass}">
							<span class="text-gray-500">{key}:</span>
							<span class={status === 'added' || status === 'changed' ? 'text-green-700' : 'text-gray-800'}>
								{formatValue(after[key])}
							</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
