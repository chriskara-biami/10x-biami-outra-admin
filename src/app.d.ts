import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			serviceClient: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
			adminRoles: string[];
			adminSessionId: string | null;
			requestId: string;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			roles: string[];
		}
	}
}

export {};
