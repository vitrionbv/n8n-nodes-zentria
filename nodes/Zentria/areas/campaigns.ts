import type { ParamSpec, ResourceSpec } from './engine';

const campaignId: ParamSpec = {
	name: 'id',
	displayName: 'Campaign ID',
	kind: 'number',
	required: true,
	description: 'Campaign id from the Get Many operation',
};

const categoriesJson = (description: string, required = false): ParamSpec => ({
	name: 'allowedLeadValueCategories',
	displayName: 'Lead Value Categories',
	kind: 'json',
	required,
	default: '[]',
	description,
});

const categoriesHelp =
	'A list of {"key": "roof", "amountCentsOverride": 7500, "whitelistText": null, "blacklistText": null}. Use the key other for leads without a category. A category cannot have both a whitelist and a blacklist';

const amountParams: ParamSpec[] = [
	{ name: 'monthlyAmountCents', displayName: 'Monthly Amount (Cents)', kind: 'number', description: 'Monthly amount in euro cents' },
	{
		name: 'missingPhoneSharePct',
		displayName: 'Missing Phone Share (%)',
		kind: 'number',
		description: 'Share of calls that cannot be measured because there is no phone tracking, 1 to 99. Lowers the monthly target',
	},
	{
		name: 'services',
		kind: 'json',
		default: '{}',
		description:
			'Services the campaign takes, for example {"website": true, "seo": false, "businessProfile": true, "phoneTracking": true}. Only the services you pass change. Turning one off is refused while it still has connections',
	},
	{
		name: 'phoneSubscription',
		displayName: 'Phone Subscription',
		kind: 'json',
		default: '{}',
		description:
			'Only with phone tracking: {"amountCents": 2500, "startsOn": "2026-10-01", "endsOn": null}. Separate from the monthly amount, not part of the goal',
	},
];

/** Resources and operations for campaigns and campaign lead value category assignments. */
export const campaignResources: ResourceSpec[] = [
	{
		value: 'campaign',
		name: 'Campaign',
		operations: [
			{
				value: 'archive',
				name: 'Archive',
				action: 'Archive a campaign',
				description: 'Hide a campaign from lists and the dashboard; its leads stay. Scope campaigns:write.',
				method: 'PATCH',
				path: '/api/public/campaigns/{id}/archive',
				params: [campaignId],
			},
			{
				value: 'create',
				name: 'Create',
				action: 'Create a campaign',
				description: 'Add a campaign to a customer. Scope campaigns:write.',
				method: 'POST',
				path: '/api/public/campaigns',
				params: [
					{ name: 'customerId', displayName: 'Customer ID', kind: 'number', required: true, locator: 'searchCustomers' },
					{ name: 'name', kind: 'string', required: true },
					...amountParams,
				],
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete a campaign',
				description:
					'Delete a campaign. Refused for the last campaign of a customer and for a campaign with leads, submissions or connections. Scope campaigns:write',
				method: 'DELETE',
				path: '/api/public/campaigns/{id}',
				params: [campaignId],
			},
			{
				value: 'dismissSplit',
				name: 'Dismiss Split Suggestion',
				action: 'Stop suggesting to split a campaign',
				description: 'Stop proposing this campaign as a candidate to split. Scope campaigns:write.',
				method: 'POST',
				path: '/api/public/campaigns/{id}/split-dismiss',
				params: [campaignId],
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get a campaign',
				description: 'A campaign with its lead value categories, connection counts and the latest split that can be undone. Scope campaigns:read.',
				method: 'GET',
				path: '/api/public/campaigns/{id}',
				params: [campaignId],
			},
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List campaigns',
				description: 'Campaigns of the team with lead counts, amounts and services. Scope campaigns:read.',
				method: 'GET',
				path: '/api/public/campaigns',
				list: true,
				params: [
					{ name: 'q', displayName: 'Search', kind: 'string', description: 'Campaign or customer name' },
					{ name: 'customerId', displayName: 'Customer ID', kind: 'number', description: 'Only campaigns of this customer' },
					{
						name: 'status',
						kind: 'options',
						options: [
							{ name: 'Active', value: 'active' },
							{ name: 'All', value: 'all' },
							{ name: 'Archived', value: 'archived' },
						],
						default: 'active',
					},
					{
						name: 'services',
						kind: 'string',
						description: 'Comma separated services the campaign must all take: website, seo, business_profile, phone_tracking',
					},
					{
						name: 'splitCandidates',
						displayName: 'Split Candidates Only',
						kind: 'boolean',
						description: 'Whether to return only campaigns that look like several brands in one campaign',
					},
					{
						name: 'sortBy',
						displayName: 'Sort By',
						kind: 'options',
						options: [
							{ name: 'Created At', value: 'created_at' },
							{ name: 'Monthly Amount', value: 'monthly_amount_cents' },
							{ name: 'Name', value: 'name' },
						],
						default: 'name',
					},
					{
						name: 'sortDirection',
						displayName: 'Sort Direction',
						kind: 'options',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
						default: 'asc',
					},
				],
			},
			{
				value: 'getSplitRun',
				name: 'Get Split',
				action: 'Get a campaign split',
				description: 'A campaign split and whether it can still be undone. The ID is in latestSplitRun of Get. Scope campaigns:read',
				method: 'GET',
				path: '/api/public/campaign-split-runs/{id}',
				params: [{ name: 'id', displayName: 'Split ID', kind: 'number', required: true }],
			},
			{
				value: 'proposeSplit',
				name: 'Propose Split',
				action: 'Propose a campaign split',
				description:
					'Ask for a proposal to split a campaign into one campaign per brand or website. Changes nothing; limited to 10 per minute. Scope campaigns:write',
				method: 'POST',
				path: '/api/public/campaigns/{id}/split-proposal',
				params: [campaignId, { name: 'hint', kind: 'string', description: 'Extra instruction for the proposal' }],
			},
			{
				value: 'restore',
				name: 'Restore',
				action: 'Restore an archived campaign',
				description: 'Bring an archived campaign back. Scope campaigns:write.',
				method: 'PATCH',
				path: '/api/public/campaigns/{id}/restore',
				params: [campaignId],
			},
			{
				value: 'setLeadValueCategories',
				name: 'Set Lead Value Categories',
				action: 'Set the lead value categories of a campaign',
				description: 'Replace the lead value categories a campaign accepts. An empty list clears them. Scope campaigns:write',
				method: 'PUT',
				path: '/api/public/campaigns/{id}/lead-value-categories',
				params: [campaignId, categoriesJson(categoriesHelp, true)],
			},
			{
				value: 'split',
				name: 'Split',
				action: 'Split a campaign',
				description:
					'Split a campaign into several campaigns. Use the item keys of a split proposal; every item must be in exactly one group and one group keeps the source campaign. Scope campaigns:write',
				method: 'POST',
				path: '/api/public/campaigns/{id}/split',
				params: [
					campaignId,
					{
						name: 'groups',
						kind: 'json',
						required: true,
						default: '[]',
						description:
							'2 to 20 groups of {"name": "Brand", "keepsSource": false, "itemKeys": ["integration:12"], "categoryKeys": ["roof"], "monthlyAmountCents": 50000}',
					},
					{
						name: 'proposalSource',
						displayName: 'Proposal Source',
						kind: 'options',
						options: [
							{ name: 'AI', value: 'ai' },
							{ name: 'Heuristic', value: 'heuristic' },
							{ name: 'Manual', value: 'manual' },
						],
						default: 'manual',
					},
				],
			},
			{
				value: 'undoSplit',
				name: 'Undo Split',
				action: 'Undo a campaign split',
				description:
					'Remove the campaigns a split created and move their mailboxes, forms and Voys numbers back. Refused after a newer split or an issued invoice. Scope campaigns:write',
				method: 'POST',
				path: '/api/public/campaign-split-runs/{id}/undo',
				params: [{ name: 'id', displayName: 'Split ID', kind: 'number', required: true }],
			},
			{
				value: 'update',
				name: 'Update',
				action: 'Update a campaign',
				description:
					'Change the name, amounts, services, phone subscription and optionally the lead value categories. Fields you leave empty stay as they are. Scope campaigns:write',
				method: 'PUT',
				path: '/api/public/campaigns/{id}',
				params: [
					campaignId,
					{ name: 'name', kind: 'string' },
					...amountParams,
					categoriesJson(`Replaces the whole set when filled. ${categoriesHelp}`),
				],
			},
		],
	},
];
