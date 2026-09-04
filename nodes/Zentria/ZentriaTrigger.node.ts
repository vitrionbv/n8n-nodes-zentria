import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	ZENTRIA_EVENTS,
	collectionItems,
	headerValue,
	locatorId,
	sameStringArrays,
	verifyStandardWebhook,
	zentriaApiRequest,
} from './GenericFunctions';

type WebhookStatic = IDataObject & {
	webhookId?: string | number;
	secret?: string;
	url?: string;
	events?: string[];
};

function selectedEvents(this: IHookFunctions): string[] {
	const events = this.getNodeParameter('events') as string[];

	if (events.includes('*')) {
		return ['*'];
	}

	return [...new Set(events)];
}

function formFilters(this: IHookFunctions): IDataObject | undefined {
	const events = selectedEvents.call(this);

	if (!events.includes('sales.form.submitted') && !events.includes('*')) {
		return undefined;
	}

	const formId = locatorId(this.getNodeParameter('formId', false));

	if (formId === '') {
		return undefined;
	}

	return { form_ids: [Number(formId)] };
}

export class ZentriaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zentria Trigger',
		name: 'zentriaTrigger',
		icon: 'file:zentria.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Zentria emits a signed team webhook.',
		usableAsTool: true,
		defaults: {
			name: 'Zentria Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'zentriaApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: ZENTRIA_EVENTS,
				default: ['*'],
				required: true,
				description: 'Zentria event types to subscribe to. Choose All events or a specific subset.',
			},
			{
				displayName: 'Form',
				name: 'formId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Optional form filter for sales.form.submitted',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchForms',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async searchForms(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<{ results: Array<{ name: string; value: string }> }> {
				const qs: IDataObject = { itemsPerPage: 50 };

				if (filter) {
					qs.q = filter;
				}

				const body = await zentriaApiRequest.call(this, 'GET', '/api/public/sales/forms', {}, qs);
				const results = collectionItems(body).map((item) => ({
					name: String(item.name ?? item.id),
					value: String(item.id ?? ''),
				}));

				return { results };
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node') as WebhookStatic;
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = selectedEvents.call(this);

				const body = await zentriaApiRequest.call(this, 'GET', '/api/public/webhooks', {}, {
					itemsPerPage: 100,
				});

				for (const item of collectionItems(body)) {
					const url = String(item.url ?? '');
					const itemEvents = Array.isArray(item.events) ? item.events.map(String) : [];
					const active = item.isActive !== false && item.is_active !== false;

					if (url === webhookUrl && active && sameStringArrays(itemEvents, events)) {
						webhookData.webhookId = item.id as string | number;
						webhookData.url = url;
						webhookData.events = itemEvents;

						return true;
					}
				}

				delete webhookData.webhookId;

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node') as WebhookStatic;
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = selectedEvents.call(this);
				const filters = formFilters.call(this);

				const created = await zentriaApiRequest.call(this, 'POST', '/api/public/webhooks', {
					url: webhookUrl,
					events,
					source: 'n8n',
					description: 'n8n Zentria Trigger',
					...(filters ? { filters } : {}),
				});

				if (created.id === undefined) {
					throw new NodeApiError(this.getNode(), { message: 'Zentria did not return a webhook id' });
				}

				webhookData.webhookId = created.id as string | number;
				webhookData.secret = created.secret as string | undefined;
				webhookData.url = webhookUrl;
				webhookData.events = events;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node') as WebhookStatic;

				if (webhookData.webhookId === undefined) {
					return true;
				}

				try {
					await zentriaApiRequest.call(
						this,
						'DELETE',
						`/api/public/webhooks/${webhookData.webhookId}`,
					);
				} catch {
					// Already gone is fine — deactivate should still succeed.
				}

				delete webhookData.webhookId;
				delete webhookData.secret;
				delete webhookData.url;
				delete webhookData.events;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const webhookData = this.getWorkflowStaticData('node') as WebhookStatic;
		const secret = webhookData.secret;

		const rawBody =
			typeof req.rawBody === 'string'
				? req.rawBody
				: Buffer.isBuffer(req.rawBody)
					? req.rawBody.toString('utf8')
					: JSON.stringify(req.body ?? {});

		if (secret) {
			const headers = (req.headers ?? {}) as Record<string, unknown>;
			const id = headerValue(headers, 'webhook-id');
			const timestamp = headerValue(headers, 'webhook-timestamp');
			const signature = headerValue(headers, 'webhook-signature');

			if (!id || !timestamp || !signature || !verifyStandardWebhook(secret, id, timestamp, rawBody, signature)) {
				throw new NodeOperationError(this.getNode(), 'Invalid Standard Webhooks signature');
			}
		}

		const json = (req.body ?? {}) as IDataObject;

		return {
			workflowData: [this.helpers.returnJsonArray([json])],
		};
	}
}
