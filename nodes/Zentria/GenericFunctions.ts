import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export type ZentriaModules = {
	sales_cms?: boolean;
	crm_leads?: boolean;
	speed_to_lead?: boolean;
	todos?: boolean;
	business_profiles?: boolean;
	communiqate?: boolean;
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
	headers: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('zentriaApi');
	const base = normalizeBaseUrl(String(credentials.baseUrl ?? ''));

	const options: IHttpRequestOptions = {
		method,
		url: `${base}${path.startsWith('/') ? path : `/${path}`}`,
		qs,
		json: true,
		headers: {
			...headers,
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

export function locatorNumericId(value: unknown): number | undefined {
	const id = locatorId(value).trim();

	if (id === '') {
		return undefined;
	}

	const numeric = Number(id);

	return Number.isFinite(numeric) ? numeric : undefined;
}

export function sameFormFilters(left: unknown, right: unknown): boolean {
	const leftIds = (left && typeof left === 'object' ? (left as IDataObject).form_ids : undefined) as unknown;
	const rightIds = (right && typeof right === 'object' ? (right as IDataObject).form_ids : undefined) as unknown;
	const normalize = (value: unknown): string[] =>
		Array.isArray(value) ? value.map((item) => String(item)).sort() : [];

	return sameStringArrays(normalize(leftIds), normalize(rightIds));
}

export const SALES_ACTIVITY_TYPES = [
	{ name: 'Call', value: 'call' },
	{ name: 'Follow Up', value: 'follow_up' },
	{ name: 'Meeting', value: 'meeting' },
	{ name: 'Task', value: 'task' },
] as const;

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
	{ name: 'Note created', value: 'sales.note.created' },
	{ name: 'Note updated', value: 'sales.note.updated' },
	{ name: 'Activity created', value: 'sales.activity.created' },
	{ name: 'Activity completed', value: 'sales.activity.completed' },
	{ name: 'Activity cancelled', value: 'sales.activity.cancelled' },
	{ name: 'CRM lead created', value: 'crm.lead.created' },
	{ name: 'CRM lead approved', value: 'crm.lead.approved' },
	{ name: 'CRM lead rejected', value: 'crm.lead.rejected' },
	{ name: 'Campaign month closed', value: 'crm.campaign.month_closed' },
	{ name: 'Invoice created', value: 'invoice.created' },
	{ name: 'Invoice ready', value: 'invoice.ready' },
	{ name: 'Invoice sent', value: 'invoice.sent' },
	{ name: 'Invoice paid', value: 'invoice.paid' },
	{ name: 'Invoice failed', value: 'invoice.failed' },
	{ name: 'Invoice charged back', value: 'invoice.charged_back' },
	{ name: 'Invoice overdue', value: 'invoice.overdue' },
	{ name: 'Invoice cancelled', value: 'invoice.cancelled' },
	{ name: 'Invoice adjusted', value: 'invoice.adjusted' },
	{ name: 'Invoice reminder due', value: 'invoice.reminder.due' },
	{ name: 'Invoice reminder sent', value: 'invoice.reminder.sent' },
	{ name: 'Invoice reminder skipped', value: 'invoice.reminder.skipped' },
	{ name: 'Invoice reminder escalated', value: 'invoice.reminder.escalated' },
	{ name: 'Invoice reminder auto-paused', value: 'invoice.reminder.auto_paused' },
	{ name: 'Customer created', value: 'customer.created' },
	{ name: 'Customer updated', value: 'customer.updated' },
	{ name: 'Customer archived', value: 'customer.archived' },
	{ name: 'Customer restored', value: 'customer.restored' },
	{ name: 'Campaign archived', value: 'campaign.archived' },
	{ name: 'Campaign restored', value: 'campaign.restored' },
	{ name: 'Todo created', value: 'todo.created' },
	{ name: 'Todo completed', value: 'todo.completed' },
	{ name: 'Business Profile review created', value: 'business_profile.review.created' },
	{ name: 'Business Profile review updated', value: 'business_profile.review.updated' },
	{ name: 'Business Profile review reply pending approval', value: 'business_profile.review_reply.pending_approval' },
	{ name: 'Business Profile review reply sent', value: 'business_profile.review_reply.sent' },
	{ name: 'Business Profile location change detected', value: 'business_profile.location_change.detected' },
	{ name: 'Business Profile location change decided', value: 'business_profile.location_change.decided' },
	{ name: 'Business Profile post published', value: 'business_profile.post.published' },
	{ name: 'Business Profile post failed', value: 'business_profile.post.failed' },
	{ name: 'Business Profile account needs re-authorization', value: 'business_profile.account.needs_reauth' },
	{ name: 'CommuniQate WhatsApp message received', value: 'communiqate.message.received' },
	{ name: 'CommuniQate WhatsApp message sent', value: 'communiqate.message.sent' },
	{ name: 'CommuniQate WhatsApp message status updated', value: 'communiqate.message.status_updated' },
	{ name: 'CommuniQate WhatsApp template created', value: 'communiqate.template.created' },
	{ name: 'CommuniQate WhatsApp template status changed', value: 'communiqate.template.status_changed' },
	{ name: 'CommuniQate WhatsApp template category changed', value: 'communiqate.template.category_changed' },
	{ name: 'CommuniQate WhatsApp template deleted', value: 'communiqate.template.deleted' },
	{ name: 'Mail sent', value: 'mail.sent' },
	{ name: 'Mail failed', value: 'mail.failed' },
];

/** Items per request when paging through a list. The public API allows at most 100. */
export const LIST_PAGE_SIZE = 100;

/** Pages fetched at most for "Return All", so a runaway list stops with an error instead of running forever. */
export const LIST_MAX_PAGES = 100;

export type ListOptions = {
	/** Fetch every page. */
	returnAll: boolean;
	/** Items to return when returnAll is false. */
	limit: number;
};

/**
 * Fetch a paginated public API list. With returnAll it pages until a short page and throws when
 * the list is longer than LIST_MAX_PAGES pages, so a workflow never silently misses items.
 * Otherwise it returns at most `limit` items.
 */
export async function listItems(
	this: IExecuteFunctions,
	path: string,
	qs: IDataObject,
	options: ListOptions,
): Promise<IDataObject[]> {
	const wanted = options.returnAll ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(options.limit));
	const perPage = options.returnAll ? LIST_PAGE_SIZE : Math.min(LIST_PAGE_SIZE, wanted);
	const all: IDataObject[] = [];

	for (let page = 1; page <= LIST_MAX_PAGES; page++) {
		const items = collectionItems(
			await zentriaApiRequest.call(this, 'GET', path, {}, { ...qs, itemsPerPage: perPage, page }),
		);
		all.push(...items);

		if (all.length >= wanted) {
			return all.slice(0, wanted);
		}

		if (items.length < perPage) {
			return all;
		}
	}

	// Exactly LIST_MAX_PAGES full pages: look one item further before calling the list too long.
	const next = collectionItems(
		await zentriaApiRequest.call(this, 'GET', path, {}, { ...qs, itemsPerPage: 1, page: all.length + 1 }),
	);

	if (next.length === 0) {
		return all;
	}

	throw new NodeOperationError(
		this.getNode(),
		`The list ${path} has more than ${LIST_MAX_PAGES * LIST_PAGE_SIZE} items. Narrow it down with a filter or search.`,
	);
}

export type ZentriaBinaryResponse = {
	body: Buffer;
	/** File name from the Content-Disposition header, when the API sends one. */
	fileName: string | undefined;
	mimeType: string | undefined;
};

/** GET a file (for example an invoice PDF) from the public API as raw bytes. */
export async function zentriaBinaryRequest(
	this: IExecuteFunctions,
	path: string,
	accept: string,
): Promise<ZentriaBinaryResponse> {
	const credentials = await this.getCredentials('zentriaApi');
	const base = normalizeBaseUrl(String(credentials.baseUrl ?? ''));

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${base}${path.startsWith('/') ? path : `/${path}`}`,
		encoding: 'arraybuffer',
		json: false,
		returnFullResponse: true,
		headers: { Accept: accept },
	};

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'zentriaApi', options)) as {
		body: ArrayBuffer | Buffer;
		headers?: Record<string, string | string[] | undefined>;
	};
	const header = (name: string): string | undefined => {
		const value = response.headers?.[name] ?? response.headers?.[name.toLowerCase()];

		return Array.isArray(value) ? value[0] : value;
	};

	return {
		body: Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body),
		fileName: fileNameFromDisposition(header('content-disposition')),
		mimeType: header('content-type')?.split(';')[0].trim() || undefined,
	};
}

/** The file name in a Content-Disposition header, for example `attachment; filename="I-2026-00042.pdf"`. */
export function fileNameFromDisposition(disposition: string | undefined): string | undefined {
	if (!disposition) {
		return undefined;
	}

	const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);

	if (encoded) {
		return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
	}

	const plain = /filename=("?)([^";]+)\1/i.exec(disposition);

	return plain ? plain[2].trim() : undefined;
}
