import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export type ZentriaModules = {
	sales_cms?: boolean;
	crm_leads?: boolean;
	speed_to_lead?: boolean;
	todos?: boolean;
};

export function normalizeBaseUrl(raw: string): string {
	return raw.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

export async function zentriaApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('zentriaApi');
	const base = normalizeBaseUrl(String(credentials.baseUrl ?? ''));

	const options: IHttpRequestOptions = {
		method,
		url: `${base}${path.startsWith('/') ? path : `/${path}`}`,
		qs,
		json: true,
		headers: {
			Accept: 'application/json',
		},
	};

	if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
		options.body = body;
	}

	return this.helpers.httpRequestWithAuthentication.call(this, 'zentriaApi', options) as Promise<IDataObject>;
}

export function collectionItems(body: unknown): IDataObject[] {
	if (Array.isArray(body)) {
		return body as IDataObject[];
	}

	if (body && typeof body === 'object') {
		const record = body as Record<string, unknown>;
		if (Array.isArray(record.member)) {
			return record.member as IDataObject[];
		}
		if (Array.isArray(record['hydra:member'])) {
			return record['hydra:member'] as IDataObject[];
		}
	}

	return [];
}

export async function getMe(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions): Promise<{
	modules: ZentriaModules;
}> {
	const me = await zentriaApiRequest.call(this, 'GET', '/api/public/me');
	const modules = (me.modules as ZentriaModules | undefined) ?? {};

	return { modules };
}

export function locatorId(value: unknown): string {
	if (value && typeof value === 'object' && 'value' in value) {
		return String((value as { value: unknown }).value ?? '');
	}

	return String(value ?? '');
}

export function sameStringArrays(left: string[], right: string[]): boolean {
	const a = [...left].map(String).sort();
	const b = [...right].map(String).sort();

	return a.length === b.length && a.every((item, index) => item === b[index]);
}

function rawKey(secret: string): Buffer {
	const trimmed = secret.startsWith('whsec_') ? secret.slice(6) : secret;
	const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
	const decoded = Buffer.from(normalized, 'base64');

	return decoded.length > 0 ? decoded : Buffer.from(trimmed);
}

export function verifyStandardWebhook(
	secret: string,
	messageId: string,
	timestamp: string,
	body: string,
	header: string,
	toleranceSeconds = 300,
): boolean {
	const ts = Number.parseInt(timestamp, 10);
	if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSeconds) {
		return false;
	}

	const expected = createHmac('sha256', rawKey(secret))
		.update(`${messageId}.${timestamp}.${body}`)
		.digest('base64');

	for (const part of header.trim().split(/\s+/)) {
		if (!part.startsWith('v1,')) {
			continue;
		}

		const given = part.slice(3);
		const expectedBuf = Buffer.from(expected);
		const givenBuf = Buffer.from(given);

		if (expectedBuf.length === givenBuf.length && timingSafeEqual(expectedBuf, givenBuf)) {
			return true;
		}
	}

	return false;
}

export function headerValue(headers: Record<string, unknown>, name: string): string {
	const lower = name.toLowerCase();

	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() !== lower) {
			continue;
		}

		if (Array.isArray(value)) {
			return String(value[0] ?? '');
		}

		return String(value ?? '');
	}

	return '';
}

export const ZENTRIA_EVENTS = [
	{ name: 'All events', value: '*' },
	{ name: 'Form submitted', value: 'sales.form.submitted' },
	{ name: 'Deal created', value: 'sales.deal.created' },
	{ name: 'Deal updated', value: 'sales.deal.updated' },
	{ name: 'Deal stage changed', value: 'sales.deal.stage_changed' },
	{ name: 'Deal won', value: 'sales.deal.won' },
	{ name: 'Deal lost', value: 'sales.deal.lost' },
	{ name: 'Person created', value: 'sales.person.created' },
	{ name: 'Person updated', value: 'sales.person.updated' },
	{ name: 'Organization created', value: 'sales.organization.created' },
	{ name: 'Organization updated', value: 'sales.organization.updated' },
	{ name: 'Calendar booked', value: 'sales.calendar.booked' },
	{ name: 'Calendar declined', value: 'sales.calendar.declined' },
	{ name: 'Calendar cancelled', value: 'sales.calendar.cancelled' },
	{ name: 'CRM lead created', value: 'crm.lead.created' },
	{ name: 'CRM lead approved', value: 'crm.lead.approved' },
	{ name: 'CRM lead rejected', value: 'crm.lead.rejected' },
	{ name: 'Customer created', value: 'customer.created' },
	{ name: 'Customer updated', value: 'customer.updated' },
	{ name: 'Customer archived', value: 'customer.archived' },
	{ name: 'Contact created', value: 'contact.created' },
	{ name: 'Contact updated', value: 'contact.updated' },
	{ name: 'Todo created', value: 'todo.created' },
	{ name: 'Todo completed', value: 'todo.completed' },
];
