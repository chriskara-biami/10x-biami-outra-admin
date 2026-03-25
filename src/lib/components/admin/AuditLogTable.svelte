<script lang="ts">
	import DiffViewer from './DiffViewer.svelte';

	interface AuditEntry {
		id: string;
		created_at: string;
		admin_user_id: string;
		admin_email?: string;
		org_id?: string;
		org_name?: string;
		action_type: string;
		reason?: string;
		before_state?: Record<string, unknown> | null;
		after_state?: Record<string, unknown> | null;
	}

	interface Props {
		entries: AuditEntry[];
		total: number;
		page: number;
		perPage?: number;
	}

	const { entries, total, page, perPage = 20 }: Props = $props();

	let expandedId = $state<string | null>(null);

	const totalPages = $derived(Math.max(1, Math.ceil(total / perPage)));

	function toggleRow(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function relativeTime(dateStr: string): string {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diffMs = now - then;
		const diffSec = Math.floor(diffMs / 1000);

		if (diffSec < 60) return 'just now';
		const diffMin = Math.floor(diffSec / 60);
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDay = Math.floor(diffHr / 24);
		if (diffDay < 30) return `${diffDay}d ago`;
		const diffMonth = Math.floor(diffDay / 30);
		if (diffMonth < 12) return `${diffMonth}mo ago`;
		return `${Math.floor(diffMonth / 12)}y ago`;
	}

	function absoluteTime(dateStr: string): string {
		return new Date(dateStr).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<div class="rounded-lg border border-[rgba(19,20,23,0.15)] bg-white overflow-hidden">
	<table class="w-full text-sm">
		<thead>
			<tr class="border-b border-[rgba(19,20,23,0.08)] bg-[#F6F5F1]">
				<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
					Timestamp
				</th>
				<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
					Admin
				</th>
				<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
					Org
				</th>
				<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
					Action
				</th>
				<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
					Reason
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-[rgba(19,20,23,0.08)]">
			{#each entries as entry (entry.id)}
				<tr
					class="cursor-pointer hover:bg-[#F6F5F1]/50 transition-colors"
					onclick={() => toggleRow(entry.id)}
				>
					<td class="px-4 py-3 whitespace-nowrap">
						<span title={absoluteTime(entry.created_at)} class="text-gray-700">
							{relativeTime(entry.created_at)}
						</span>
					</td>
					<td class="px-4 py-3 text-gray-700 truncate max-w-[180px]">
						{entry.admin_email || entry.admin_user_id}
					</td>
					<td class="px-4 py-3 text-gray-700 truncate max-w-[150px]">
						{entry.org_name || entry.org_id || '-'}
					</td>
					<td class="px-4 py-3">
						<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
							{entry.action_type}
						</span>
					</td>
					<td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">
						{entry.reason || '-'}
					</td>
				</tr>

				{#if expandedId === entry.id}
					<tr>
						<td colspan="5" class="bg-[#F6F5F1]/30 px-6 py-4">
							<DiffViewer before={entry.before_state ?? null} after={entry.after_state ?? null} />
						</td>
					</tr>
				{/if}
			{/each}

			{#if entries.length === 0}
				<tr>
					<td colspan="5" class="px-4 py-8 text-center text-gray-400">
						No audit log entries found
					</td>
				</tr>
			{/if}
		</tbody>
	</table>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between border-t border-[rgba(19,20,23,0.08)] px-4 py-3">
			<span class="text-xs text-gray-500">
				Page {page} of {totalPages} ({total} total entries)
			</span>
			<div class="flex gap-2">
				<a
					href="?page={page - 1}"
					class="rounded-lg border border-[rgba(19,20,23,0.15)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors {page <= 1 ? 'pointer-events-none opacity-50' : ''}"
					aria-disabled={page <= 1}
				>
					Previous
				</a>
				<a
					href="?page={page + 1}"
					class="rounded-lg border border-[rgba(19,20,23,0.15)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors {page >= totalPages ? 'pointer-events-none opacity-50' : ''}"
					aria-disabled={page >= totalPages}
				>
					Next
				</a>
			</div>
		</div>
	{/if}
</div>
