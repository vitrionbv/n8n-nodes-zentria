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
					{ name: 'Business Profile', value: 'businessProfile' },
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
				displayOptions: { show: { resource: ['person', 'organization'] } },
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
				displayOptions: { show: { resource: ['customer'] } },
				options: [
					{
						name: 'Archive',
						value: 'archive',
						action: 'Archive a customer',
						description: 'Keep all data but stop invoicing and take the customer out of lists',
					},
					{ name: 'Create', value: 'create', action: 'Create a customer' },
					{ name: 'Get', value: 'get', action: 'Get a customer' },
					{ name: 'Get Many', value: 'getAll', action: 'List customers' },
					{ name: 'Restore', value: 'restore', action: 'Restore an archived customer' },
					{ name: 'Update', value: 'update', action: 'Update a customer' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Status',
				name: 'customerStatus',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'All', value: 'all' },
				],
				default: 'active',
				description: 'Which customers to return',
				displayOptions: { show: { resource: ['customer'], operation: ['getAll'] } },
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['businessProfile'] } },
				options: [
					{ name: 'Accept Change (Google Is Right)', value: 'acceptChange', action: 'Accept a location change' },
					{ name: 'Approve Review Reply', value: 'approveReply', action: 'Approve and send a review reply' },
					{ name: 'Create Post', value: 'createPost', action: 'Create a post' },
					{ name: 'Delete Post', value: 'deletePost', action: 'Delete a post' },
					{ name: 'Dismiss Change', value: 'dismissChange', action: 'Mark a location change as handled' },
					{
						name: 'Dismiss Review',
						value: 'dismissReview',
						action: 'Dismiss a review without replying',
						description: 'Take an unanswered review out of the queue without replying. Nothing is sent to Google.',
					},
					{ name: 'Get Location', value: 'getLocation', action: 'Get a location' },
					{ name: 'Get Many Changes', value: 'getChanges', action: 'List location changes' },
					{ name: 'Get Many Locations', value: 'getLocations', action: 'List locations' },
					{ name: 'Get Many Posts', value: 'getPosts', action: 'List posts' },
					{ name: 'Get Many Review Replies', value: 'getReplies', action: 'List review replies' },
					{ name: 'Get Many Reviews', value: 'getReviews', action: 'List reviews' },
					{ name: 'Get Many Search Keywords', value: 'getSearchKeywords', action: 'List search keywords of a location' },
					{ name: 'Get Performance', value: 'getPerformance', action: 'Get the results of a location' },
					{ name: 'Reject Change', value: 'rejectChange', action: 'Reject a location change' },
					{ name: 'Reject Review Reply', value: 'rejectReply', action: 'Reject a review reply' },
					{ name: 'Restore Review', value: 'restoreReview', action: 'Put a dismissed review back in the queue' },
				],
				default: 'getLocations',
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['getAll', 'getLocations', 'getSearchKeywords'] } },
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
				operation: ['get', 'update', 'archive', 'restore'],
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
				displayName: 'Location ID',
				name: 'bpLocationId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						resource: ['businessProfile'],
						operation: ['getLocation', 'getPerformance', 'getSearchKeywords'],
					},
				},
			},
			{
				displayName: 'Review Reply ID',
				name: 'bpReplyId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['businessProfile'], operation: ['approveReply', 'rejectReply'] } },
			},
			{
				displayName: 'Review ID',
				name: 'bpReviewId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['businessProfile'], operation: ['dismissReview', 'restoreReview'] } },
			},
			{
				displayName: 'Reply Text',
				name: 'bpReplyBody',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Edited reply text. Leave empty to send the draft as it is.',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['approveReply'] } },
			},
			{
				displayName: 'Change ID',
				name: 'bpChangeId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: { resource: ['businessProfile'], operation: ['acceptChange', 'dismissChange', 'rejectChange'] },
				},
			},
			{
				displayName: 'Post ID',
				name: 'bpPostId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['businessProfile'], operation: ['deletePost'] } },
			},
			{
				displayName: 'Location Filters',
				name: 'bpLocationFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['businessProfile'], operation: ['getLocations'] } },
				options: [
					{ displayName: 'Campaign ID', name: 'campaignId', type: 'number', default: 0 },
					{
						displayName: 'Category',
						name: 'category',
						type: 'string',
						default: '',
						description: 'Only locations with this category (primary or additional), exact Dutch name, e.g. Loodgieter',
					},
					{ displayName: 'Customer ID', name: 'customerId', type: 'number', default: 0 },
					{ displayName: 'Sync Enabled', name: 'syncEnabled', type: 'boolean', default: true },
					{ displayName: 'Verified', name: 'verified', type: 'boolean', default: true },
				],
			},
			{
				displayName: 'Period',
				name: 'bpPeriod',
				type: 'options',
				default: 'last_28',
				description: 'Google reports these numbers 2 to 3 days late',
				options: [
					{ name: 'Custom', value: 'custom' },
					{ name: 'Last 28 Days', value: 'last_28' },
					{ name: 'Last 7 Days', value: 'last_7' },
					{ name: 'Last 90 Days', value: 'last_90' },
					{ name: 'Last Month', value: 'last_month' },
					{ name: 'This Month', value: 'this_month' },
				],
				displayOptions: { show: { resource: ['businessProfile'], operation: ['getPerformance'] } },
			},
			{
				displayName: 'From',
				name: 'bpFrom',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				displayOptions: {
					show: { resource: ['businessProfile'], operation: ['getPerformance'], bpPeriod: ['custom'] },
				},
			},
			{
				displayName: 'To',
				name: 'bpTo',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				displayOptions: {
					show: { resource: ['businessProfile'], operation: ['getPerformance'], bpPeriod: ['custom'] },
				},
			},
			{
				displayName: 'Granularity',
				name: 'bpGranularity',
				type: 'options',
				default: 'day',
				description: 'Series buckets. Use week for periods over 62 days.',
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Week', value: 'week' },
				],
				displayOptions: { show: { resource: ['businessProfile'], operation: ['getPerformance'] } },
			},
			{
				displayName: 'Month',
				name: 'bpMonth',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM',
				description:
					'Month of the search terms. Leave empty for the newest month with data. A threshold means the term was used fewer than that many times.',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['getSearchKeywords'] } },
			},
			{
				displayName: 'Review Filters',
				name: 'bpReviewFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['businessProfile'], operation: ['getReviews'] } },
				options: [
					{ displayName: 'Answered', name: 'answered', type: 'boolean', default: false },
					{
						displayName: 'Dismissed',
						name: 'dismissed',
						type: 'boolean',
						default: false,
						description:
							'Whether to return only reviews dismissed without a reply (on) or only reviews that are not dismissed (off). Combine Answered off and Dismissed off for the reviews still to answer.',
					},
					{ displayName: 'Location ID', name: 'locationId', type: 'number', default: 0 },
					{ displayName: 'Since', name: 'since', type: 'dateTime', default: '' },
					{ displayName: 'Stars', name: 'stars', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 5 },
				],
			},
			{
				displayName: 'Filters',
				name: 'bpStatusFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: { resource: ['businessProfile'], operation: ['getReplies', 'getChanges', 'getPosts'] },
				},
				options: [
					{ displayName: 'Location ID', name: 'locationId', type: 'number', default: 0 },
					{
						displayName: 'Status',
						name: 'status',
						type: 'string',
						default: '',
						description:
							'Replies: pending_approval, sent, rejected and so on. Changes: open, accepted, dismissed, rejected. Posts: draft, scheduled, published and so on.',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'bpReturnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results (paged 100 at a time) or only the first 50',
				displayOptions: {
					show: { resource: ['businessProfile'], operation: ['getReplies', 'getChanges', 'getPosts'] },
				},
			},
			{
				displayName: 'Location IDs',
				name: 'bpPostLocationIds',
				type: 'string',
				default: '',
				required: true,
				description: 'Comma-separated location IDs. One post is created per location.',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['createPost'] } },
			},
			{
				displayName: 'Topic Type',
				name: 'bpTopicType',
				type: 'options',
				options: [
					{ name: 'Event', value: 'EVENT' },
					{ name: 'Offer', value: 'OFFER' },
					{ name: 'Standard', value: 'STANDARD' },
				],
				default: 'STANDARD',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['createPost'] } },
			},
			{
				displayName: 'Summary',
				name: 'bpSummary',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['businessProfile'], operation: ['createPost'] } },
			},
			{
				displayName: 'Mode',
				name: 'bpMode',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Publish Now', value: 'publish_now' },
					{ name: 'Schedule', value: 'schedule' },
				],
				default: 'draft',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['createPost'] } },
			},
			{
				displayName: 'Scheduled For',
				name: 'bpScheduledFor',
				type: 'dateTime',
				default: '',
				description: 'Amsterdam time',
				displayOptions: {
					show: { resource: ['businessProfile'], operation: ['createPost'], bpMode: ['schedule'] },
				},
			},
			{
				displayName: 'Post Options',
				name: 'bpPostOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['businessProfile'], operation: ['createPost'] } },
				options: [
					{
						displayName: 'Call To Action',
						name: 'ctaType',
						type: 'options',
						options: [
							{ name: 'Book', value: 'BOOK' },
							{ name: 'Call', value: 'CALL' },
							{ name: 'Learn More', value: 'LEARN_MORE' },
							{ name: 'Order', value: 'ORDER' },
							{ name: 'Shop', value: 'SHOP' },
							{ name: 'Sign Up', value: 'SIGN_UP' },
						],
						default: 'LEARN_MORE',
					},
					{ displayName: 'Call To Action URL', name: 'ctaUrl', type: 'string', default: '' },
					{ displayName: 'Coupon Code', name: 'couponCode', type: 'string', default: '' },
					{ displayName: 'Event End', name: 'eventEnd', type: 'dateTime', default: '' },
					{ displayName: 'Event Start', name: 'eventStart', type: 'dateTime', default: '' },
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{ name: 'Dutch', value: 'nl' },
							{ name: 'English', value: 'en' },
						],
						default: 'nl',
					},
					{ displayName: 'Redeem URL', name: 'redeemUrl', type: 'string', default: '' },
					{ displayName: 'Terms', name: 'terms', type: 'string', default: '' },
					{ displayName: 'Title', name: 'title', type: 'string', default: '', description: 'Required for events and offers' },
				],
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

			if (resource === 'businessProfile' && modules.business_profiles === false) {
				throw new NodeOperationError(
					this.getNode(),
					'Business Profiles is off for this team. /me.modules.business_profiles is false.',
				);
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
			const status = this.getNodeParameter('customerStatus', index, 'active') as string;

			return collectionItems(
				await zentriaApiRequest.call(this, 'GET', '/api/public/customers', {}, { ...listQs, status }),
			);
		}

		if (operation === 'archive' || operation === 'restore') {
			return zentriaApiRequest.call(
				this,
				'PATCH',
				`/api/public/customers/${locatorId(this.getNodeParameter('customerId', index))}/${operation}`,
				{},
			);
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

	if (resource === 'businessProfile') {
		return runBusinessProfileOperation.call(this, operation, index, listQs);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported operation ${resource}.${operation}`);
}

function businessProfileQuery(filters: IDataObject, keys: Record<string, string>): IDataObject {
	const qs: IDataObject = { itemsPerPage: 50 };

	for (const [key, param] of Object.entries(keys)) {
		const value = filters[key];

		if (value !== undefined && value !== '' && value !== 0) {
			qs[param] = value as string | number | boolean;
		}
	}

	return qs;
}

async function runBusinessProfileOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
	listQs: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const base = '/api/public/business-profiles';
	const numeric = (name: string): number => Number(this.getNodeParameter(name, index));

	if (operation === 'getLocations') {
		const filters = this.getNodeParameter('bpLocationFilters', index, {}) as IDataObject;
		const qs = {
			...businessProfileQuery(filters, {
				customerId: 'customer_id',
				campaignId: 'campaign_id',
				verified: 'verified',
				syncEnabled: 'sync_enabled',
				category: 'category',
			}),
			...(listQs.q ? { q: listQs.q } : {}),
		};

		return collectionItems(await zentriaApiRequest.call(this, 'GET', `${base}/locations`, {}, qs));
	}

	if (operation === 'getLocation') {
		return zentriaApiRequest.call(this, 'GET', `${base}/locations/${numeric('bpLocationId')}`);
	}

	if (operation === 'getPerformance') {
		const period = String(this.getNodeParameter('bpPeriod', index, 'last_28'));
		const qs: IDataObject = {
			period,
			granularity: String(this.getNodeParameter('bpGranularity', index, 'day')),
		};

		if (period === 'custom') {
			qs.from = String(this.getNodeParameter('bpFrom', index, ''));
			qs.to = String(this.getNodeParameter('bpTo', index, ''));
		}

		return zentriaApiRequest.call(
			this,
			'GET',
			`${base}/locations/${numeric('bpLocationId')}/performance`,
			{},
			qs,
		);
	}

	if (operation === 'getSearchKeywords') {
		const month = String(this.getNodeParameter('bpMonth', index, '')).trim();
		const qs = {
			itemsPerPage: 100,
			...(month !== '' ? { month } : {}),
			...(listQs.q ? { q: listQs.q } : {}),
		};

		return collectionItems(
			await zentriaApiRequest.call(
				this,
				'GET',
				`${base}/locations/${numeric('bpLocationId')}/search-keywords`,
				{},
				qs,
			),
		);
	}

	if (operation === 'getReviews') {
		const filters = this.getNodeParameter('bpReviewFilters', index, {}) as IDataObject;
		const qs = businessProfileQuery(filters, {
			locationId: 'location_id',
			stars: 'stars',
			answered: 'answered',
			dismissed: 'dismissed',
			since: 'since',
		});

		return collectionItems(await zentriaApiRequest.call(this, 'GET', `${base}/reviews`, {}, qs));
	}

	if (operation === 'getReplies' || operation === 'getChanges' || operation === 'getPosts') {
		const filters = this.getNodeParameter('bpStatusFilters', index, {}) as IDataObject;
		const qs = businessProfileQuery(filters, { locationId: 'location_id', status: 'status' });
		const path = { getReplies: 'review-replies', getChanges: 'changes', getPosts: 'posts' }[operation];

		if (!this.getNodeParameter('bpReturnAll', index, false)) {
			return collectionItems(await zentriaApiRequest.call(this, 'GET', `${base}/${path}`, {}, qs));
		}

		const perPage = 100;
		const all: IDataObject[] = [];

		for (let page = 1; page <= 100; page++) {
			const items = collectionItems(
				await zentriaApiRequest.call(this, 'GET', `${base}/${path}`, {}, { ...qs, itemsPerPage: perPage, page }),
			);
			all.push(...items);

			if (items.length < perPage) {
				break;
			}
		}

		return all;
	}

	if (operation === 'approveReply') {
		const body = String(this.getNodeParameter('bpReplyBody', index, '')).trim();

		return zentriaApiRequest.call(
			this,
			'POST',
			`${base}/review-replies/${numeric('bpReplyId')}/approve`,
			body !== '' ? { body } : {},
		);
	}

	if (operation === 'rejectReply') {
		return zentriaApiRequest.call(this, 'POST', `${base}/review-replies/${numeric('bpReplyId')}/reject`, {});
	}

	if (operation === 'dismissReview' || operation === 'restoreReview') {
		const action = operation === 'dismissReview' ? 'dismiss' : 'restore';

		return zentriaApiRequest.call(this, 'POST', `${base}/reviews/${numeric('bpReviewId')}/${action}`, {});
	}

	if (operation === 'acceptChange' || operation === 'dismissChange' || operation === 'rejectChange') {
		const action = { acceptChange: 'accept', dismissChange: 'dismiss', rejectChange: 'reject' }[operation];

		return zentriaApiRequest.call(this, 'POST', `${base}/changes/${numeric('bpChangeId')}/${action}`, {});
	}

	if (operation === 'createPost') {
		const options = this.getNodeParameter('bpPostOptions', index, {}) as IDataObject;
		const mode = this.getNodeParameter('bpMode', index) as string;
		const locationIds = String(this.getNodeParameter('bpPostLocationIds', index))
			.split(',')
			.map((id) => Number(id.trim()))
			.filter((id) => Number.isInteger(id) && id > 0);

		if (locationIds.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Provide at least one location id.');
		}

		const offer: IDataObject = {};

		if (options.couponCode) {
offer.coupon_code = options.couponCode;
}

		if (options.redeemUrl) {
offer.redeem_url = options.redeemUrl;
}

		if (options.terms) {
offer.terms = options.terms;
}

		const optional: IDataObject = {
			title: options.title,
			language: options.language,
			cta_type: options.ctaType,
			cta_url: options.ctaUrl,
			event_start: options.eventStart,
			event_end: options.eventEnd,
			scheduled_for: mode === 'schedule' ? this.getNodeParameter('bpScheduledFor', index) : undefined,
			offer: Object.keys(offer).length > 0 ? offer : undefined,
		};

		const body: IDataObject = {
			location_ids: locationIds,
			topic_type: this.getNodeParameter('bpTopicType', index),
			summary: this.getNodeParameter('bpSummary', index),
			mode,
		};

		for (const [key, value] of Object.entries(optional)) {
			if (value !== undefined && value !== '') {
				body[key] = value;
			}
		}

		return zentriaApiRequest.call(this, 'POST', `${base}/posts`, body);
	}

	if (operation === 'deletePost') {
		const id = numeric('bpPostId');
		await zentriaApiRequest.call(this, 'DELETE', `${base}/posts/${id}`);

		return { deleted: true, id };
	}

	throw new NodeOperationError(this.getNode(), `Unsupported operation businessProfile.${operation}`);
}
