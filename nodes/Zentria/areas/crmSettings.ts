import type { ParamSpec, ResourceSpec } from './engine';

const categoryKey: ParamSpec = {
	name: 'key',
	displayName: 'Category Key',
	kind: 'string',
	required: true,
	description:
		'Key from Get Many (letters, numbers, dashes and underscores). The row "other" is the default amount and cannot be changed or deleted here.',
};

const dashboardRanges = [
	{ name: 'Today', value: 'today' },
	{ name: 'This Month (Default)', value: 'month' },
	{ name: 'Previous Month', value: 'previous_month' },
	{ name: 'Last 7 Days', value: '7' },
	{ name: 'Last 14 Days', value: '14' },
	{ name: 'Last 30 Days', value: '30' },
	{ name: 'Last 60 Days', value: '60' },
	{ name: 'Last 90 Days', value: '90' },
	{ name: 'Custom (Use From and To)', value: 'custom' },
];

const dateParams: ParamSpec[] = [
	{ name: 'from', displayName: 'From', kind: 'string', description: 'First day (YYYY-MM-DD). Needed for range Custom.' },
	{ name: 'to', displayName: 'To', kind: 'string', description: 'Last day (YYYY-MM-DD). Needed for range Custom.' },
];

const proration: ParamSpec = {
	name: 'proration',
	kind: 'options',
	options: [
		{ name: '30 Days (Default)', value: '30d' },
		{ name: 'Calendar Month', value: 'cal' },
	],
	description: 'How the monthly target is prorated over the period',
};

/** Resources and operations for lead value categories and settings, learning rules, CRM dashboard and report reads. */
export const crmSettingsResources: ResourceSpec[] = [
	{
		// Extends the hand-written Get Many in Zentria.node.ts.
		value: 'crmLeadValueCategory',
		name: 'CRM Lead Value Category',
		module: 'crm_leads',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get a lead value category',
				description: 'One category by key. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/lead-value-categories/{key}',
				params: [categoryKey],
			},
			{
				value: 'create',
				name: 'Create',
				action: 'Create a lead value category',
				description:
					'POST /crm/lead-value-categories. The keys other and unclassified are reserved. Scope crm-values:write',
				method: 'POST',
				path: '/api/public/crm/lead-value-categories',
				params: [
					{ name: 'label', kind: 'string', required: true, description: 'Name of the category, unique within the team' },
					{
						name: 'amountCents',
						displayName: 'Amount (Cents)',
						kind: 'number',
						required: true,
						description: 'Value of a lead in this category in euro cents (5000 = EUR 50)',
					},
					{
						name: 'key',
						kind: 'string',
						description: 'Optional key (letters, numbers, dashes, underscores). Defaults to the slug of the label and cannot be changed later',
					},
					{
						name: 'aiHints',
						displayName: 'AI Hints',
						kind: 'string',
						description: 'Hints for the AI that classifies leads into this category',
					},
				],
			},
			{
				value: 'update',
				name: 'Update',
				action: 'Update a lead value category',
				description:
					'PUT /crm/lead-value-categories/{key}. AI hints you leave empty keep their value. Scope crm-values:write',
				method: 'PUT',
				path: '/api/public/crm/lead-value-categories/{key}',
				params: [
					categoryKey,
					{ name: 'label', kind: 'string', required: true, description: 'Name of the category, unique within the team' },
					{
						name: 'amountCents',
						displayName: 'Amount (Cents)',
						kind: 'number',
						required: true,
						description: 'Value of a lead in this category in euro cents',
					},
					{
						name: 'aiHints',
						displayName: 'AI Hints',
						kind: 'string',
						description: 'Hints for the AI that classifies leads into this category',
					},
				],
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete a lead value category',
				description: 'DELETE /crm/lead-value-categories/{key}. Leads that carry the key keep it. Scope crm-values:write',
				method: 'DELETE',
				path: '/api/public/crm/lead-value-categories/{key}',
				params: [categoryKey],
			},
		],
	},
	{
		value: 'crmLeadValueSettings',
		name: 'CRM Lead Value Settings',
		module: 'crm_leads',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get the lead value settings',
				description:
					'Default amount, authenticity notes and the number of leads a refresh would touch. Needs the manage lead values permission. Scope crm:read',
				method: 'GET',
				path: '/api/public/crm/lead-value-settings',
			},
			{
				value: 'updateDefaultAmount',
				name: 'Update Default Amount',
				action: 'Update the default lead value amount',
				description: 'PUT /crm/lead-value-settings with defaultAmountCents. Scope crm-values:write.',
				method: 'PUT',
				path: '/api/public/crm/lead-value-settings',
				params: [
					{
						name: 'defaultAmountCents',
						displayName: 'Default Amount (Cents)',
						kind: 'number',
						required: true,
						description: 'Value in euro cents of a classified lead that fits no category',
					},
				],
			},
			{
				value: 'updateAuthenticityNotes',
				name: 'Update Authenticity Notes',
				action: 'Update the authenticity notes',
				description: 'PUT /crm/lead-value-settings with authenticityNotes. Empty text clears the notes. Scope crm-values:write',
				method: 'PUT',
				path: '/api/public/crm/lead-value-settings',
				params: [
					{
						name: 'authenticityNotes',
						displayName: 'Authenticity Notes',
						kind: 'string',
						required: true,
						description: 'Team wide notes the AI reads when it checks whether a lead is real. Empty clears them.',
					},
				],
			},
			{
				value: 'backfill',
				name: 'Refresh Lead Values',
				action: 'Refresh lead values in the background',
				description: 'POST /crm/lead-value-backfill, the same job as the refresh buttons in the app. Scope crm-values:write.',
				method: 'POST',
				path: '/api/public/crm/lead-value-backfill',
				params: [
					{
						name: 'mode',
						kind: 'options',
						required: true,
						options: [
							{ name: 'Leads Without a Value', value: 'missing' },
							{ name: 'All Leads of This Month', value: 'current_month' },
						],
						default: 'missing',
						description: 'Which leads are classified and refreshed',
					},
				],
			},
		],
	},
	{
		value: 'crmLearningRule',
		name: 'CRM Learning Rule',
		module: 'crm_leads',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List learning rules',
				description:
					'The learning rules (leerregels) the AI follows, read only. Needs the workbench permission. Scope crm:read',
				method: 'GET',
				path: '/api/public/crm/learning-rules',
				list: true,
				params: [
					{
						name: 'applyScope',
						displayName: 'Applies To',
						kind: 'options',
						options: [
							{ name: 'Campaign', value: 'campaign' },
							{ name: 'Customer', value: 'customer' },
							{ name: 'Team', value: 'team' },
						],
						description: 'Only rules that apply at this level',
					},
					{ name: 'q', displayName: 'Search', kind: 'string', description: 'Search in the rule text, customer, campaign and category' },
				],
			},
		],
	},
	{
		value: 'crmDashboard',
		name: 'CRM Dashboard',
		module: 'crm_leads',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get the CRM dashboard numbers',
				description:
					'Totals, goal attainment per customer and campaign, trends and lead value, with the same filters as the dashboard. Money in euro cents. Scope dashboard:read',
				method: 'GET',
				path: '/api/public/crm/dashboard',
				params: [
					{ name: 'range', kind: 'options', options: dashboardRanges, default: 'month', description: 'Period of the numbers' },
					...dateParams,
					{ name: 'customerId', displayName: 'Customer ID', kind: 'number', description: 'Drill down into one customer' },
					{ name: 'campaignId', displayName: 'Campaign ID', kind: 'number', description: 'Drill down into one campaign' },
					{
						name: 'view',
						kind: 'options',
						options: [
							{ name: 'Customers', value: 'customers' },
							{ name: 'Campaigns', value: 'campaigns' },
						],
						description: 'Which summary the sort and filters work on',
					},
					proration,
					{
						name: 'attainmentStatus',
						displayName: 'Goal Statuses',
						kind: 'string',
						description: 'Comma separated statuses to keep: met, near, not_met, no_target',
					},
					{
						name: 'leadValueCategoryKey',
						displayName: 'Lead Value Category Keys',
						kind: 'string',
						description: 'Comma separated category keys: only customers that sell these',
					},
					{
						name: 'sort',
						kind: 'options',
						options: [
							{ name: 'Priority', value: 'priority' },
							{ name: 'Name', value: 'name' },
							{ name: 'Attainment (Low First)', value: 'attainment_asc' },
							{ name: 'Attainment (High First)', value: 'attainment_desc' },
							{ name: 'Gap (Small First)', value: 'gap_asc' },
							{ name: 'Gap (Large First)', value: 'gap_desc' },
						],
					},
					{ name: 'search', kind: 'string', description: 'Search by customer name' },
					{ name: 'label', kind: 'string', description: 'Only customers with this label' },
					{
						name: 'service',
						kind: 'options',
						options: [
							{ name: 'Business Profile', value: 'business_profile' },
							{ name: 'Phone Tracking', value: 'phone_tracking' },
							{ name: 'SEO', value: 'seo' },
							{ name: 'Website', value: 'website' },
						],
						default: 'website',
						description: 'Only campaigns with this service, and customers with at least one such campaign',
					},
				],
			},
		],
	},
	{
		value: 'crmCustomerReport',
		name: 'CRM Customer Report',
		module: 'crm_leads',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get a customer report',
				description:
					'The klant-rapportage of one customer or campaign for a period. Pass a customer or a campaign. Scope dashboard:read',
				method: 'GET',
				path: '/api/public/crm/customer-report',
				params: [
					{ name: 'customerId', displayName: 'Customer ID', kind: 'number', description: 'Customer to report on. Needed unless you give a campaign' },
					{ name: 'campaignId', displayName: 'Campaign ID', kind: 'number', description: 'Report on one campaign of the customer' },
					{
						name: 'range',
						kind: 'options',
						options: dashboardRanges,
						default: 'month',
						description: 'Period of the report',
					},
					...dateParams,
					proration,
					{ name: 'includeSpam', displayName: 'Include Spam', kind: 'boolean', description: 'Whether to list spam and rejected submissions too' },
				],
			},
		],
	},
];
