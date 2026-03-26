<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import { hasPermission } from '$lib/utils/permissions';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { data, children }: Props = $props();

	const roles = $derived(data.roles || []);

	type NavItem = {
		href: string;
		label: string;
		permissions: import('$lib/utils/permissions').Permission[];
	};

	const navItems: NavItem[] = [
		{ href: '/accounts', label: 'Accounts', permissions: ['accounts:view'] },
		{ href: '/billing', label: 'Subscriptions', permissions: ['billing:view'] }
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	const userEmail = $derived(data.user?.email || 'Admin');
	const primaryRole = $derived((roles[0] || 'unknown').replace('_', ' '));
</script>

<div class="min-h-screen bg-[#F6F5F1]">
	<!-- NavBar — matches main app exactly -->
	<header
		class="h-20 px-8 py-3 bg-[#F6F5F1] border-b border-neutral-900/20 inline-flex justify-between items-center w-full"
	>
		<!-- Logo Container (w-48) -->
		<div class="w-48 self-stretch px-1 py-4 flex justify-start items-center overflow-hidden">
			<a href="/accounts" class="flex items-center gap-1.5">
				<!-- Outra logo SVG -->
				<svg xmlns="http://www.w3.org/2000/svg" width="91" height="26" viewBox="0 0 91 26" fill="none" class="text-[#131417]">
					<g clip-path="url(#clip0_admin)">
						<path d="M70.6671 26C70.5113 25.9832 70.3568 25.965 70.2009 25.9496C68.119 25.7437 66.2959 24.9522 64.7748 23.4954C63.251 22.0358 62.3575 20.2302 61.9414 18.171C61.7508 17.2255 61.6798 16.2673 61.7271 15.305C61.8398 13.0259 62.544 10.957 63.9719 9.16955C65.4206 7.35553 67.2882 6.2237 69.5719 5.82167C71.1041 5.55272 72.6168 5.63396 74.0795 6.21529C75.1525 6.64113 76.0487 7.2995 76.6916 8.28005C76.7139 8.31367 76.7209 8.35709 76.7348 8.39632C76.7584 8.37951 76.7807 8.3641 76.8044 8.34729V6.34696H82.4503V25.3374H76.8099V23.2615C76.7584 23.3049 76.7292 23.3189 76.7167 23.3427C76.1823 24.3541 75.3167 24.9732 74.2966 25.4061C73.5019 25.7437 72.6683 25.9188 71.8083 25.9762C71.7596 25.979 71.7123 25.993 71.665 26.0014H70.6671V26ZM72.0087 10.9822C71.8306 10.9948 71.6524 11.0018 71.4757 11.0228C70.3902 11.1517 69.4703 11.6195 68.7188 12.4124C67.9826 13.1898 67.5582 14.1213 67.4176 15.1831C67.2743 16.2589 67.4246 17.2913 67.9715 18.2312C68.9944 19.992 70.5349 20.8171 72.5612 20.6588C73.6745 20.572 74.6389 20.1069 75.4155 19.3028C76.5678 18.1108 76.9922 16.6624 76.7459 15.0332C76.3938 12.7065 74.362 10.9906 72.0101 10.9808L72.0087 10.9822Z" fill="currentColor"/>
						<path d="M0 15.2896C0.0166999 15.1327 0.0347915 14.9772 0.0487081 14.8203C0.26859 12.4754 1.15229 10.4331 2.79445 8.74231C4.22926 7.26448 5.97579 6.35677 7.97839 5.93794C8.81895 5.76284 9.67065 5.68579 10.5279 5.71941C13.1595 5.82307 15.4767 6.71257 17.3916 8.55881C18.9308 10.0422 19.8715 11.8591 20.2208 13.9728C20.5799 16.1427 20.3433 18.248 19.4081 20.2456C18.2628 22.6941 16.3896 24.3583 13.8735 25.2926C12.7504 25.71 11.5842 25.9047 10.3874 25.9244C8.64221 25.9538 6.97778 25.6148 5.41495 24.8289C3.55291 23.8932 2.12507 22.5008 1.15229 20.6462C0.521873 19.4457 0.164216 18.164 0.0473165 16.8122C0.0333998 16.6568 0.0153083 16.4999 0 16.343C0 15.9914 0 15.6412 0 15.2896ZM10.6448 20.6168C11.4854 20.607 12.5834 20.1349 13.449 19.1684C14.8448 17.6093 15.1315 15.3764 14.1601 13.5232C13.3725 12.0202 12.1255 11.1559 10.4249 11.034C9.20305 10.9457 8.13565 11.359 7.23524 12.1868C5.71555 13.5848 5.24099 15.7813 6.0245 17.7228C6.73564 19.4863 8.36249 20.6168 10.6448 20.6168Z" fill="currentColor"/>
						<path d="M33.7394 6.34276H39.3881V25.3374H34.0442V23.3343L34.0038 23.3147C33.976 23.3553 33.9412 23.3931 33.9203 23.438C33.5487 24.193 33.0227 24.8093 32.2949 25.2408C31.7257 25.5784 31.105 25.7717 30.4551 25.8655C29.2624 26.0392 28.0781 25.9944 26.9077 25.6946C25.7666 25.4033 24.7535 24.871 23.9087 24.0375C23.153 23.2923 22.6326 22.3986 22.2958 21.3928C21.9632 20.4025 21.817 19.3799 21.8157 18.3377C21.8115 14.3917 21.8143 10.4457 21.8143 6.49965C21.8143 6.45062 21.8143 6.4016 21.8143 6.34416H27.4588V6.53467C27.4588 10.0086 27.4574 13.4826 27.4602 16.9565C27.4602 17.5673 27.5048 18.1738 27.6759 18.7663C27.9877 19.8463 28.7294 20.4767 29.8372 20.614C30.4078 20.684 30.9742 20.6798 31.5294 20.5257C32.5342 20.247 33.1605 19.5732 33.4889 18.5968C33.6656 18.0743 33.7366 17.5322 33.738 16.9831C33.7408 13.4966 33.7394 10.01 33.7394 6.52486C33.7394 6.46743 33.7394 6.41 33.7394 6.34416V6.34276Z" fill="currentColor"/>
						<path d="M43.0691 0H48.7234V0.16109C48.7234 2.16281 48.7234 4.16594 48.7234 6.16766C48.7234 6.28066 48.7791 6.33716 48.8904 6.33716C49.692 6.33716 50.495 6.33716 51.2966 6.33716C51.3453 6.33716 51.394 6.33716 51.4497 6.33716V10.6446H48.7262V25.3388H43.0774V10.6516H40.2899V6.34276H43.0691V0Z" fill="currentColor"/>
						<path d="M57.8249 25.3416H52.1789V6.34696H57.4867V8.34448C57.5006 8.34869 57.5131 8.35429 57.527 8.35849C57.5535 8.32347 57.5855 8.29125 57.6064 8.25343C57.8374 7.80658 58.1115 7.39055 58.4608 7.02634C59.0662 6.39599 59.8094 6.02198 60.6527 5.83988C61.1454 5.73342 61.645 5.68579 62.1487 5.68579C62.1891 5.68579 62.2309 5.68579 62.2796 5.68579V11.3926C62.0611 11.4038 61.8426 11.4108 61.6241 11.4248C60.9714 11.4682 60.3285 11.5649 59.7133 11.8016C58.6209 12.2219 58.0072 13.0175 57.8708 14.1844C57.843 14.4155 57.8262 14.6508 57.8262 14.8834C57.8235 18.3069 57.8249 21.7304 57.8249 25.1539V25.3416Z" fill="currentColor"/>
						<path d="M87.0984 25.724C88.8616 25.724 90.2909 24.2854 90.2909 22.5106C90.2909 20.7359 88.8616 19.2972 87.0984 19.2972C85.3353 19.2972 83.906 20.7359 83.906 22.5106C83.906 24.2854 85.3353 25.724 87.0984 25.724Z" fill="#4D61F4"/>
					</g>
					<defs>
						<clipPath id="clip0_admin">
							<rect width="90.2909" height="26" fill="white"/>
						</clipPath>
					</defs>
				</svg>
				<span class="text-[10px] font-bold text-[#4D61F4] uppercase tracking-[0.15em] self-end mb-[3px]">admin</span>
			</a>
		</div>

		<!-- Primary Navigation (centered pill tabs — same as main app) -->
		<nav class="p-2 bg-white rounded-[999px] flex justify-center items-center gap-2">
			{#each navItems as item}
				{#if hasPermission(roles, item.permissions)}
					<a
						href={item.href}
						class="h-8 px-6 py-2 rounded-[999px] flex justify-center items-center gap-1 overflow-hidden border transition-colors duration-200
							{isActive(item.href)
							? 'bg-[#EFF1FF] border-[#4D61F4]'
							: 'border-transparent hover:bg-[#F5F5F5]'}"
						style="font-family: 'DM Sans', sans-serif;"
					>
						<span
							class="text-sm font-semibold leading-5
								{isActive(item.href) ? 'text-[#2E4BE9]' : 'text-[#2D2E2E]'}"
						>
							{item.label}
						</span>
					</a>
				{/if}
			{/each}
		</nav>

		<!-- Secondary Navigation (w-48) -->
		<div class="w-48 self-stretch p-1 flex justify-end items-center gap-3 overflow-hidden">
			<div class="flex justify-start items-center gap-3">
				<!-- Admin info -->
				<div class="text-right mr-1">
					<div class="text-xs font-medium text-[#131417] truncate max-w-[120px]">{userEmail}</div>
					<div class="text-[10px] text-[#656767] capitalize">{primaryRole}</div>
				</div>

				<!-- Sign out -->
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="w-8 h-8 flex items-center justify-center text-[#3F3F46] rounded-full transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-95"
						title="Sign out"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
					</button>
				</form>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 p-6">
		{@render children()}
	</main>
</div>
