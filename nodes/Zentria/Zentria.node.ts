import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	SALES_ACTIVITY_TYPES,
	collectionItems,
	getMe,
	locatorId,
	locatorNumericId,
	zentriaApiRequest,
} from './GenericFunctions';

const salesResources = ['deal', 'person', 'organization', 'form', 'submission', 'pipeline', 'activity'];

function locator(
	displayName: string,
	name: string,
	searchListMethod: string,
	show: Record<string, string[]>,
	required = true,
	description?: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required,
		...(description ? { description } : {}),
		displayOptions: { show },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
			},
		],
	};
}

async function searchCollection(
	ctx: ILoadOptionsFunctions,
	path: string,
	filter: string | undefined,
	nameKeys: string[],
): Promise<{ results: INodeListSearchItems[] }> {
	const qs: IDataObject = { itemsPerPage: 50 };

	if (filter) {
		qs.q = filter;
	}

	const body = await zentriaApiRequest.call(ctx, 'GET', path, {}, qs);
	const results = collectionItems(body).map((item) => {
		const name = nameKeys.map((key) => item[key]).find((value) => value !== undefined && value !== null && value !== '');

		return {
			name: String(name ?? item.id),
			value: String(item.id ?? ''),
		};
	});

	return { results };
}

export class Zentria implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zentria',
		name: 'zentria',
		icon: 'file:zentria.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and write the Zentria public team API.',
		usableAsTool: true,
		defaults: {
			name: 'Zentria',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zentriaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Activity', value: 'activity' },
					{ name: 'CRM Lead', value: 'crmLead' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Deal', value: 'deal' },
					{ name: 'Form', value: 'form' },
					{ name: 'Me', value: 'me' },
					{ name: 'Member', value: 'member' },
					{ name: 'Organization', value: 'organization' },
					{ name: 'Person', value: 'person' },
					{ name: 'Pipeline', value: 'pipeline' },
					{ name: 'STL Flow', value: 'stlFlow' },
					{ name: 'Submission', value: 'submission' },
					{ name: 'Todo', value: 'todo' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'deal',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['me'] } },
				options: [{ name: 'Get', value: 'get', action: 'Get current team and modules' }],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['deal'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a deal' },
					{ name: 'Get', value: 'get', action: 'Get a deal' },
					{ name: 'Get Many', value: 'getAll', action: 'List deals' },
					{ name: 'Move Stage', value: 'moveStage', action: 'Move a deal to another stage' },
					{ name: 'Update', value: 'update', action: 'Update a deal' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['person', 'organization', 'customer'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create' },
					{ name: 'Get', value: 'get', action: 'Get' },
					{ name: 'Get Many', value: 'getAll', action: 'List' },
					{ name: 'Update', value: 'update', action: 'Update' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['form', 'submission', 'pipeline'] } },
				options: [
					{ name: 'Get', value: 'get', action: 'Get' },
					{ name: 'Get Many', value: 'getAll', action: 'List' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['activity'] } },
				options: [
					{ name: 'Complete', value: 'complete', action: 'Complete an activity' },
					{ name: 'Create', value: 'create', action: 'Create an activity' },
					{ name: 'Get Many', value: 'getAll', action: 'List activities' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['crmLead'] } },
				options: [
					{ name: 'Approve', value: 'approve', action: 'Approve a CRM lead' },
					{ name: 'Get', value: 'get', action: 'Get a CRM lead' },
					{ name: 'Get Many', value: 'getAll', action: 'List CRM leads' },
					{ name: 'Reject', value: 'reject', action: 'Reject a CRM lead' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['member'] } },
				options: [
					{ name: 'Change Role', value: 'changeRole', action: 'Change a member role' },
					{ name: 'Get Many', value: 'getAll', action: 'List members' },
					{ name: 'Invite', value: 'invite', action: 'Invite a member' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['todo'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a to do' },
					{ name: 'Get', value: 'get', action: 'Get a to do' },
					{ name: 'Get Many', value: 'getAll', action: 'List to dos' },
					{ name: 'Update', value: 'update', action: 'Update a to do' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['stlFlow'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a speed to lead flow' },
					{ name: 'Delete', value: 'delete', action: 'Delete a flow' },
					{ name: 'Get', value: 'get', action: 'Get a flow' },
					{ name: 'Get Many', value: 'getAll', action: 'List flows' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webhook'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a webhook endpoint' },
					{ name: 'Delete', value: 'delete', action: 'Delete a webhook endpoint' },
					{ name: 'Get Many', value: 'getAll', action: 'List webhook endpoints' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['getAll'] } },
			},
			locator('Deal', 'dealId', 'searchDeals', {
				resource: ['deal'],
				operation: ['get', 'update', 'moveStage'],
			}),
			locator('Deal', 'dealId', 'searchDeals', {
				resource: ['activity'],
				operation: ['create'],
			}),
			locator('Pipeline', 'pipelineId', 'searchPipelines', {
				resource: ['deal'],
				operation: ['create'],
			}),
			locator('Pipeline', 'pipelineId', 'searchPipelines', {
				resource: ['pipeline'],
				operation: ['get'],
			}, false, 'Leave empty to fetch the team default pipeline'),
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['activity'], operation: ['complete'] } },
			},
			locator('Person', 'personId', 'searchPeople', {
				resource: ['person'],
				operation: ['get', 'update'],
			}),
			locator('Person', 'personId', 'searchPeople', {
				resource: ['deal'],
				operation: ['create'],
			}, false),
			locator('Organization', 'organizationId', 'searchOrganizations', {
				resource: ['organization'],
				operation: ['get', 'update'],
			}),
			locator('Organization', 'organizationId', 'searchOrganizations', {
				resource: ['deal'],
				operation: ['create'],
			}, false),
			locator('Stage', 'stageId', 'searchStages', {
				resource: ['deal'],
				operation: ['moveStage'],
			}),
			locator('Form', 'formId', 'searchForms', {
				resource: ['form', 'submission'],
				operation: ['get'],
			}),
			locator('Customer', 'customerId', 'searchCustomers', {
				resource: ['customer'],
				operation: ['get', 'update'],
			}),
			locator('CRM Lead', 'crmLeadId', 'searchCrmLeads', {
				resource: ['crmLead'],
				operation: ['get', 'approve', 'reject'],
			}),
			locator('Member', 'memberId', 'searchMembers', {
				resource: ['member'],
				operation: ['changeRole'],
			}),
			locator('Todo', 'todoId', 'searchTodos', {
				resource: ['todo'],
				operation: ['get', 'update'],
			}),
			locator('STL Flow', 'stlFlowId', 'searchStlFlows', {
				resource: ['stlFlow'],
				operation: ['get', 'delete'],
			}),
			locator('Webhook', 'webhookId', 'searchWebhooks', {
				resource: ['webhook'],
				operation: ['delete'],
			}),
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				displayOptions: {
					show: { resource: ['deal', 'activity', 'todo'], operation: ['create', 'update'] },
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['person', 'organization', 'customer', 'stlFlow'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: {
					show: { resource: ['person', 'customer', 'member'], operation: ['create', 'invite'] },
				},
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'string',
				default: 'user',
				displayOptions: { show: { resource: ['member'], operation: ['invite', 'changeRole'] } },
			},
			{
				displayName: 'Activity Type',
				name: 'activityType',
				type: 'options',
				options: [...SALES_ACTIVITY_TYPES],
				default: 'task',
				displayOptions: { show: { resource: ['activity'], operation: ['create'] } },
			},
			{
				displayName: 'Receiving Phone',
				name: 'receivingPhone',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['stlFlow'], operation: ['create'] } },
			},
			{
				displayName: 'Customer Integration ID',
				name: 'customerIntegrationId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['stlFlow'], operation: ['create'] } },
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
			},
			{
				displayName: 'Events',
				name: 'webhookEvents',
				type: 'string',
				default: '*',
				description: 'Comma-separated event names, or *',
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
			},
			{
				displayName: 'Completed',
				name: 'isCompleted',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['todo'], operation: ['update'] } },
			},
		],
	};

	methods = {
		listSearch: {
			searchDeals: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.sales_cms === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/sales/deals', filter, ['title', 'name']);
			},
			searchPeople: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.sales_cms === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/sales/people', filter, ['name']);
			},
			searchOrganizations: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.sales_cms === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/sales/organizations', filter, ['name']);
			},
			searchForms: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.sales_cms === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/sales/forms', filter, ['name']);
			},
			searchStages: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.sales_cms === false) {
					return { results: [] };
				}

				const pipeline = await zentriaApiRequest.call(this, 'GET', '/api/public/sales/pipeline');
				const stages = (pipeline.stages as IDataObject[] | undefined) ?? [];
				const needle = (filter ?? '').toLowerCase();
				const results = stages
					.filter((stage) => String(stage.name ?? '').toLowerCase().includes(needle))
					.map((stage) => ({
						name: String(stage.name ?? stage.id),
						value: String(stage.id ?? ''),
					}));

				return { results };
			},
			searchPipelines: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.sales_cms === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/sales/pipelines', filter, ['name']);
			},
			searchCustomers: async function (this: ILoadOptionsFunctions, filter?: string) {
				return searchCollection(this, '/api/public/customers', filter, ['name']);
			},
			searchCrmLeads: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.crm_leads === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/crm/leads', filter, ['name', 'email']);
			},
			searchMembers: async function (this: ILoadOptionsFunctions, filter?: string) {
				return searchCollection(this, '/api/public/members', filter, ['name', 'email']);
			},
			searchTodos: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.todos === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/todos', filter, ['title']);
			},
			searchStlFlows: async function (this: ILoadOptionsFunctions, filter?: string) {
				const { modules } = await getMe.call(this);

				if (modules.speed_to_lead === false) {
					return { results: [] };
				}

				return searchCollection(this, '/api/public/stl/flows', filter, ['name']);
			},
			searchWebhooks: async function (this: ILoadOptionsFunctions, filter?: string) {
				return searchCollection(this, '/api/public/webhooks', filter, ['url', 'description']);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const { modules } = await getMe.call(this);

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			if (salesResources.includes(resource) && modules.sales_cms === false) {
				throw new NodeOperationError(this.getNode(), 'Sales is off for this team. /me.modules.sales_cms is false.');
			}

			if (resource === 'crmLead' && modules.crm_leads === false) {
				throw new NodeOperationError(this.getNode(), 'CRM leads is off for this team. /me.modules.crm_leads is false.');
			}

			if (resource === 'todo' && modules.todos === false) {
				throw new NodeOperationError(this.getNode(), 'Todos is off for this team. /me.modules.todos is false.');
			}

			if (resource === 'stlFlow' && modules.speed_to_lead === false) {
				throw new NodeOperationError(this.getNode(), 'Speed to lead is off for this team. /me.modules.speed_to_lead is false.');
			}

			const response = await runOperation.call(this, resource, operation, i);
			const json = Array.isArray(response) ? { items: response } : response;
			returnData.push({ json });
		}

		return [returnData];
	}
}

async function runOperation(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	index: number,
): Promise<IDataObject | IDataObject[]> {
	const q = (this.getNodeParameter('q', index, '') as string) || undefined;
	const listQs: IDataObject = { itemsPerPage: 50, ...(q ? { q } : {}) };

	if (resource === 'me' && operation === 'get') {
		return zentriaApiRequest.call(this, 'GET', '/api/public/me');
	}

	if (resource === 'deal') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/deals', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/sales/deals/${locatorId(this.getNodeParameter('dealId', index))}`);
		}

		if (operation === 'create') {
			const personId = locatorNumericId(this.getNodeParameter('personId', index, ''));
			const organizationId = locatorNumericId(this.getNodeParameter('organizationId', index, ''));
			const pipelineId = locatorNumericId(this.getNodeParameter('pipelineId', index));

			if (pipelineId === undefined) {
				throw new NodeOperationError(this.getNode(), 'Pipeline is required to create a deal.');
			}

			if (personId === undefined && organizationId === undefined) {
				throw new NodeOperationError(this.getNode(), 'Provide a person or an organization to create a deal.');
			}

			return zentriaApiRequest.call(this, 'POST', '/api/public/sales/deals', {
				title: this.getNodeParameter('title', index),
				pipelineId,
				...(personId !== undefined ? { personId } : {}),
				...(organizationId !== undefined ? { organizationId } : {}),
			});
		}

		if (operation === 'update') {
			return zentriaApiRequest.call(this, 'PUT', `/api/public/sales/deals/${locatorId(this.getNodeParameter('dealId', index))}`, {
				title: this.getNodeParameter('title', index),
			});
		}

		if (operation === 'moveStage') {
			const stageId = locatorNumericId(this.getNodeParameter('stageId', index));

			if (stageId === undefined) {
				throw new NodeOperationError(this.getNode(), 'Stage is required to move a deal.');
			}

			return zentriaApiRequest.call(
				this,
				'PATCH',
				`/api/public/sales/deals/${locatorId(this.getNodeParameter('dealId', index))}/stage`,
				{ stageId },
			);
		}
	}

	if (resource === 'person') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/people', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/sales/people/${locatorId(this.getNodeParameter('personId', index))}`);
		}

		if (operation === 'create') {
			return zentriaApiRequest.call(this, 'POST', '/api/public/sales/people', {
				name: this.getNodeParameter('name', index),
				email: this.getNodeParameter('email', index),
			});
		}

		if (operation === 'update') {
			return zentriaApiRequest.call(this, 'PUT', `/api/public/sales/people/${locatorId(this.getNodeParameter('personId', index))}`, {
				name: this.getNodeParameter('name', index),
			});
		}
	}

	if (resource === 'organization') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/organizations', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/sales/organizations/${locatorId(this.getNodeParameter('organizationId', index))}`);
		}

		if (operation === 'create') {
			return zentriaApiRequest.call(this, 'POST', '/api/public/sales/organizations', {
				name: this.getNodeParameter('name', index),
			});
		}

		if (operation === 'update') {
			return zentriaApiRequest.call(
				this,
				'PUT',
				`/api/public/sales/organizations/${locatorId(this.getNodeParameter('organizationId', index))}`,
				{ name: this.getNodeParameter('name', index) },
			);
		}
	}

	if (resource === 'form') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/forms', {}, listQs));
		}

		return zentriaApiRequest.call(this, 'GET', `/api/public/sales/forms/${locatorId(this.getNodeParameter('formId', index))}`);
	}

	if (resource === 'submission') {
		return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/submissions', {}, listQs));
	}

	if (resource === 'pipeline') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/pipelines', {}, listQs));
		}

		const pipelineId = locatorNumericId(this.getNodeParameter('pipelineId', index, ''));

		if (pipelineId === undefined) {
			return zentriaApiRequest.call(this, 'GET', '/api/public/sales/pipeline');
		}

		return zentriaApiRequest.call(this, 'GET', `/api/public/sales/pipelines/${pipelineId}`);
	}

	if (resource === 'activity') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/sales/activities', {}, listQs));
		}

		if (operation === 'create') {
			const dealId = locatorNumericId(this.getNodeParameter('dealId', index));

			if (dealId === undefined) {
				throw new NodeOperationError(this.getNode(), 'Deal is required to create an activity.');
			}

			return zentriaApiRequest.call(this, 'POST', '/api/public/sales/activities', {
				title: this.getNodeParameter('title', index),
				type: this.getNodeParameter('activityType', index),
				dealId,
			});
		}

		if (operation === 'complete') {
			return zentriaApiRequest.call(this, 'PATCH', `/api/public/sales/activities/${this.getNodeParameter('activityId', index)}`, {
				status: 'done',
			});
		}
	}

	if (resource === 'crmLead') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/crm/leads', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/crm/leads/${locatorId(this.getNodeParameter('crmLeadId', index))}`);
		}

		const leadId = locatorId(this.getNodeParameter('crmLeadId', index));

		if (operation === 'approve') {
			return zentriaApiRequest.call(this, 'POST', `/api/public/crm/leads/${leadId}/approve`, {});
		}

		if (operation === 'reject') {
			return zentriaApiRequest.call(this, 'POST', `/api/public/crm/leads/${leadId}/reject`, {});
		}
	}

	if (resource === 'customer') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/customers', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/customers/${locatorId(this.getNodeParameter('customerId', index))}`);
		}

		if (operation === 'create') {
			return zentriaApiRequest.call(this, 'POST', '/api/public/customers', {
				name: this.getNodeParameter('name', index),
				email: this.getNodeParameter('email', index),
			});
		}

		if (operation === 'update') {
			return zentriaApiRequest.call(this, 'PUT', `/api/public/customers/${locatorId(this.getNodeParameter('customerId', index))}`, {
				name: this.getNodeParameter('name', index),
			});
		}
	}

	if (resource === 'member') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/members', {}, listQs));
		}

		if (operation === 'invite') {
			return zentriaApiRequest.call(this, 'POST', '/api/public/members', {
				email: this.getNodeParameter('email', index),
				role: this.getNodeParameter('role', index),
			});
		}

		if (operation === 'changeRole') {
			return zentriaApiRequest.call(
				this,
				'PATCH',
				`/api/public/members/${locatorId(this.getNodeParameter('memberId', index))}/role`,
				{ role: this.getNodeParameter('role', index) },
			);
		}
	}

	if (resource === 'todo') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/todos', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/todos/${locatorId(this.getNodeParameter('todoId', index))}`);
		}

		if (operation === 'create') {
			return zentriaApiRequest.call(this, 'POST', '/api/public/todos', {
				title: this.getNodeParameter('title', index),
			});
		}

		if (operation === 'update') {
			return zentriaApiRequest.call(this, 'PUT', `/api/public/todos/${locatorId(this.getNodeParameter('todoId', index))}`, {
				title: this.getNodeParameter('title', index),
				isCompleted: this.getNodeParameter('isCompleted', index),
			});
		}
	}

	if (resource === 'stlFlow') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/stl/flows', {}, listQs));
		}

		if (operation === 'get') {
			return zentriaApiRequest.call(this, 'GET', `/api/public/stl/flows/${locatorId(this.getNodeParameter('stlFlowId', index))}`);
		}

		if (operation === 'create') {
			return zentriaApiRequest.call(this, 'POST', '/api/public/stl/flows', {
				name: this.getNodeParameter('name', index),
				receivingPhone: this.getNodeParameter('receivingPhone', index),
				customerIntegrationId: this.getNodeParameter('customerIntegrationId', index),
			});
		}

		if (operation === 'delete') {
			return zentriaApiRequest.call(this, 'DELETE', `/api/public/stl/flows/${locatorId(this.getNodeParameter('stlFlowId', index))}`);
		}
	}

	if (resource === 'webhook') {
		if (operation === 'getAll') {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', '/api/public/webhooks', {}, listQs));
		}

		if (operation === 'create') {
			const events = String(this.getNodeParameter('webhookEvents', index))
				.split(',')
				.map((event) => event.trim())
				.filter(Boolean);

			return zentriaApiRequest.call(this, 'POST', '/api/public/webhooks', {
				url: this.getNodeParameter('webhookUrl', index),
				events,
				source: 'n8n',
			});
		}

		if (operation === 'delete') {
			return zentriaApiRequest.call(this, 'DELETE', `/api/public/webhooks/${locatorId(this.getNodeParameter('webhookId', index))}`);
		}
	}

	throw new NodeOperationError(this.getNode(), `Unsupported operation ${resource}.${operation}`);
}
