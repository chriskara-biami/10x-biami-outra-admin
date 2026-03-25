/**
 * Sensitive data masking utilities.
 * All admin API responses use masked values by default.
 */

export function maskEmail(email: string): string {
	if (!email || !email.includes('@')) return '***';
	const [local, domain] = email.split('@');
	if (local.length <= 1) return `${local}***@${domain}`;
	return `${local[0]}***@${domain}`;
}

export function maskApiKey(key: string): string {
	if (!key || key.length < 8) return '****';
	return `****...${key.slice(-4)}`;
}

export function maskBillingId(id: string): string {
	if (!id || id.length < 6) return '****';
	return `****...${id.slice(-3)}`;
}

/**
 * Mask a value based on its field name.
 */
export function maskField(fieldName: string, value: string): string {
	if (!value) return '***';
	if (fieldName.includes('email')) return maskEmail(value);
	if (fieldName.includes('api_key') || fieldName.includes('secret')) return maskApiKey(value);
	if (fieldName.includes('billing_id')) return maskBillingId(value);
	return value;
}
