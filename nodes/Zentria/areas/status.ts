import type { ParamSpec, ResourceSpec } from './engine';

/**
 * Status of a customer or campaign in one call, Google data per campaign, grid rank tracking of Business Profile
 * listings and the origin report of sales deals.
 */

const BASE = '/api/public';

const periods = [
	{ name: 'Custom', value: 'custom' },
	{ name: 'Last 28 Days', value: 'last_28' },
	{ name: 'Last 7 Days', value: 'last_7' },
	{ name: 'Last 90 Days', value: 'last_90' },
	{ name: 'Last Month', value: 'last_month' },
	{ name: 'This Month', value: 'this_month' },
];

const periodParams: ParamSpec[] = [
	{
		name: 'period',
		kind: 'options',
		options: periods,
		default: 'last_28',
		description: 'Period of the Google and review numbers, compared with the period before. Leads always cover the current month.',
	},
	{ name: 'from', kind: 'string', description: 'Start date YYYY-MM-DD, for period Custom' },
	{ name: 'to', kind: 'string', description: 'End date YYYY-MM-DD, for period Custom' },
];

const sectionHelp =
	'Each section is {available, data} or {available: false, reason} (missing_scope, no_permission, module_off). Leads need dashboard:read, Google, grid and reviews business-profiles:read, invoices invoices:read.';

const campaignId: ParamSpec = { name: 'id', displayName: 'Campaign ID', kind: 'number', required: true, description: 'Campaign id from Campaign > Get Many' };
const locationId: ParamSpec = { name: 'locationId', displayName: 'Location ID', kind: 'number', required: true, description: 'Business Profile location id' };

export const statusResources: ResourceSpec[] = [
	{
		value: 'campaign',
		name: 'Campaign',
		operations: [
			{
				value: 'getStatus',
				name: 'Get Status',
				action: 'Get the status of a campaign',
				description: `Leads and goals this month, latest leads, Search Console and GA4, Business Profile results, grid scores, reviews and open invoices in one call. ${sectionHelp} Scope campaigns:read.`,
				method: 'GET',
				path: `${BASE}/campaigns/{id}/status`,
				params: [campaignId, ...periodParams],
			},
			{
				value: 'getGoogleData',
				name: 'Get Google Data',
				action: 'Get the Google numbers of a campaign',
				description: 'Search Console, GA4 and Business Profile results of a campaign against the period before. Scope business-profiles:read.',
				method: 'GET',
				path: `${BASE}/campaigns/{id}/google-data`,
				params: [campaignId, ...periodParams],
			},
		],
	},
	{
		value: 'customer',
		name: 'Customer',
		operations: [
			{
				value: 'getStatus',
				name: 'Get Status',
				action: 'Get the status of a customer',
				description: `Leads over all campaigns this month, Google numbers per campaign, Business Profile results, grid scores, reviews and open invoices in one call. ${sectionHelp} Scope customers:read.`,
				method: 'GET',
				path: `${BASE}/customers/{id}/status`,
				params: [{ name: 'id', displayName: 'Customer', kind: 'number', required: true, locator: 'searchCustomers' }, ...periodParams],
			},
		],
	},
	{
		value: 'businessProfileLocation',
		name: 'Business Profile Location',
		module: 'business_profiles',
		operations: [
			{
				value: 'getGrid',
				name: 'Get Grid',
				action: 'Get the grid rank tracking of a location',
				description: 'Grid settings, budget and the latest grid score per keyword with the score before it and the trend. Scope business-profiles:read.',
				method: 'GET',
				path: `${BASE}/business-profiles/locations/{locationId}/grid`,
				params: [locationId],
			},
			{
				value: 'startGridRun',
				name: 'Start Grid Run',
				action: 'Start a grid measurement',
				description:
					'Measure the grid now, one run per keyword. Every point is a paid DataForSEO search within the team budget. Refused when a run is still open or the budget would be exceeded. Scope business-profiles-admin:write.',
				method: 'POST',
				path: `${BASE}/business-profiles/locations/{locationId}/grid/run`,
				params: [locationId],
			},
			{
				value: 'getServicePushes',
				name: 'Get Service Pushes',
				action: 'Get the services sent to Google',
				description: 'Services of the location sent to Google from Zentria, with the review status at Google. Scope business-profiles:read.',
				method: 'GET',
				path: `${BASE}/business-profiles/locations/{locationId}/service-pushes`,
				params: [locationId],
			},
		],
	},
	{
		value: 'businessProfileGridRun',
		name: 'Business Profile Grid Run',
		module: 'business_profiles',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get a grid run',
				description: 'One grid measurement with the position per point, the previous position and the top 3. Scope business-profiles:read.',
				method: 'GET',
				path: `${BASE}/business-profiles/grid-runs/{id}`,
				params: [{ name: 'id', displayName: 'Grid Run ID', kind: 'number', required: true }],
			},
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List grid runs',
				description: 'Grid measurements of the team, newest first. Scope business-profiles:read.',
				method: 'GET',
				path: `${BASE}/business-profiles/grid-runs`,
				list: true,
				params: [
					{ name: 'locationId', displayName: 'Location ID', kind: 'number' },
					{ name: 'campaignId', displayName: 'Campaign ID', kind: 'number' },
					{ name: 'customerId', displayName: 'Customer ID', kind: 'number' },
					{ name: 'keyword', kind: 'string', description: 'Exact keyword, case insensitive' },
					{
						name: 'status',
						kind: 'options',
						default: 'done',
						options: [
							{ name: 'Done', value: 'done' },
							{ name: 'Failed', value: 'failed' },
							{ name: 'Partial', value: 'partial' },
							{ name: 'Queued', value: 'queued' },
							{ name: 'Running', value: 'running' },
						],
					},
				],
			},
		],
	},
	{
		value: 'salesReport',
		name: 'Sales Report',
		module: 'sales_cms',
		operations: [
			{
				value: 'getAttribution',
				name: 'Get Origin Report',
				action: 'Get the origin report of sales deals',
				description: 'Leads and funnel steps (booked, no show, offer, won, lost) per ad campaign, ad set or ad. Scope sales:read.',
				method: 'GET',
				path: `${BASE}/sales/attribution-report`,
				params: [
					{ name: 'from', kind: 'string', description: 'First day the deal was created, YYYY-MM-DD. Default 89 days ago.' },
					{ name: 'to', kind: 'string', description: 'Last day, YYYY-MM-DD' },
					{
						name: 'level',
						kind: 'options',
						default: 'campaign',
						options: [
							{ name: 'Ad', value: 'ad' },
							{ name: 'Ad Set', value: 'adset' },
							{ name: 'Campaign', value: 'campaign' },
						],
					},
					{ name: 'pipelineId', displayName: 'Pipeline ID', kind: 'number' },
					{ name: 'formId', displayName: 'Form ID', kind: 'number' },
					{ name: 'platform', kind: 'string', description: 'Only this platform, for example meta or google' },
				],
			},
		],
	},
];
