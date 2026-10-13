import type { ParamSpec, ResourceSpec } from './engine';

const leadLocator: ParamSpec = {
	name: 'id',
	displayName: 'CRM Lead',
	kind: 'string',
	locator: 'searchCrmLeads',
};

const reason = (description: string, required = false): ParamSpec => ({
	name: 'reason',
	kind: 'string',
	required,
	description,
});

const approvePresets = [
	{ name: 'AI Was Incorrect', value: 'ai_incorrect' },
	{ name: 'Contact Reached', value: 'contact_reached' },
	{ name: 'Matches Services (Needs Category Key)', value: 'matches_services' },
	{ name: 'Missing Category', value: 'missing_category' },
	{ name: 'Other (Needs Reason)', value: 'other' },
	{ name: 'Reclamation Upheld', value: 'reclamation_upheld' },
	{ name: 'Valid Inquiry', value: 'valid_inquiry' },
];

const rejectPresets = [
	{ name: 'Duplicate', value: 'duplicate' },
	{ name: 'Invalid Contact', value: 'invalid_contact' },
	{ name: 'Other', value: 'other' },
	{ name: 'Spam', value: 'spam' },
	{ name: 'Test', value: 'test' },
	{ name: 'Wrong Category', value: 'wrong_category' },
];

const allPresets = [...approvePresets, ...rejectPresets.filter((preset) => preset.value !== 'other')];

const leadFilters: ParamSpec[] = [
	{ name: 'q', displayName: 'Search', kind: 'string', description: 'Name, email, phone, company or campaign name' },
	{
		name: 'reviewStatus',
		displayName: 'Review Status',
		kind: 'options',
		options: [
			{ name: 'Approved', value: 'approved' },
			{ name: 'Open', value: 'open' },
			{ name: 'Reclamation', value: 'reclamation' },
			{ name: 'Rejected', value: 'rejected' },
		],
	},
	{
		name: 'needsExtraCheck',
		displayName: 'Needs Extra Check',
		kind: 'boolean',
		description:
			'Whether to return only rejected leads that AI or the system rejected, that have a category and that nobody confirmed (on), or all other leads (off)',
	},
	{
		name: 'workbenchQueue',
		displayName: 'Werkbak Queue',
		kind: 'options',
		options: [
			{ name: 'Rejected by AI (Not Confirmed)', value: 'ai_rejected' },
			{ name: 'Reclamations', value: 'reclamations' },
		],
	},
	{
		name: 'includeSpam',
		displayName: 'Include Spam',
		kind: 'boolean',
		description: 'Whether the Rejected by AI queue also contains spam-like leads',
	},
	{
		name: 'includeOutOfCategory',
		displayName: 'Include Out of Category',
		kind: 'boolean',
		description: 'Whether the Rejected by AI queue also contains leads outside the categories the customer takes',
	},
	{
		name: 'rejectedByType',
		displayName: 'Rejected By',
		kind: 'options',
		options: [
			{ name: 'Agency', value: 'agency' },
			{ name: 'AI', value: 'ai' },
			{ name: 'Customer', value: 'customer' },
			{ name: 'System', value: 'system' },
		],
	},
	{
		name: 'rejectionConfirmed',
		displayName: 'Rejection Confirmed',
		kind: 'boolean',
		description: 'Whether a person confirmed the rejection (on) or nobody did (off)',
	},
	{ name: 'customerId', displayName: 'Customer ID', kind: 'number' },
	{ name: 'campaignId', displayName: 'Campaign ID', kind: 'number' },
	{
		name: 'source',
		kind: 'options',
		options: [
			{ name: 'Form (Elementor)', value: 'elementor' },
			{ name: 'Mail', value: 'mail' },
			{ name: 'Phone (Voys)', value: 'voys' },
		],
	},
	{
		name: 'leadValueCategory',
		displayName: 'Lead Value Category',
		kind: 'string',
		description: 'Category key, unclassified or other',
	},
	{ name: 'invoiced', kind: 'boolean', description: 'Whether the lead is on an invoice (on) or not (off)' },
	{ name: 'lastSeenAt[after]', displayName: 'Last Seen After', kind: 'dateTime' },
	{ name: 'lastSeenAt[before]', displayName: 'Last Seen Before', kind: 'dateTime' },
	{
		name: 'sortBy',
		displayName: 'Sort By',
		kind: 'options',
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'First Seen', value: 'firstSeenAt' },
			{ name: 'ID (Newest First)', value: 'id' },
			{ name: 'Last Seen', value: 'lastSeenAt' },
			{ name: 'Name', value: 'name' },
			{ name: 'Phone', value: 'phone' },
		],
	},
	{
		name: 'sortDirection',
		displayName: 'Sort Direction',
		kind: 'options',
		options: [
			{ name: 'Descending', value: 'desc' },
			{ name: 'Ascending', value: 'asc' },
		],
	},
];

const submissionFilters: ParamSpec[] = [
	{ name: 'q', displayName: 'Search', kind: 'string', description: 'Name, email, phone, customer or campaign name' },
	{
		name: 'source',
		kind: 'options',
		options: [
			{ name: 'Form (Elementor)', value: 'elementor' },
			{ name: 'Mail', value: 'mail' },
			{ name: 'Phone (Voys)', value: 'voys' },
		],
	},
	{
		name: 'status',
		kind: 'string',
		description: 'One or more of unhandled, new, duplicate, test, failed, spam, pending (comma separated)',
	},
	{ name: 'authenticity', kind: 'string', description: 'real, spam or both (comma separated)' },
	{ name: 'customerId', displayName: 'Customer ID', kind: 'number' },
	{ name: 'campaignId', displayName: 'Campaign ID', kind: 'number' },
	{ name: 'leadId', displayName: 'CRM Lead ID', kind: 'number' },
	{ name: 'receivedAt[after]', displayName: 'Received After', kind: 'dateTime' },
	{ name: 'receivedAt[before]', displayName: 'Received Before', kind: 'dateTime' },
	{
		name: 'sortBy',
		displayName: 'Sort By',
		kind: 'options',
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'ID (Newest First)', value: 'id' },
			{ name: 'Name', value: 'name' },
			{ name: 'Phone', value: 'phone' },
			{ name: 'Received', value: 'receivedAt' },
			{ name: 'Source', value: 'source' },
			{ name: 'Status', value: 'status' },
		],
	},
	{
		name: 'sortDirection',
		displayName: 'Sort Direction',
		kind: 'options',
		options: [
			{ name: 'Descending', value: 'desc' },
			{ name: 'Ascending', value: 'asc' },
		],
	},
];

const submissionId: ParamSpec = {
	name: 'id',
	displayName: 'Submission ID',
	kind: 'number',
	description: 'From Get Many on CRM Submission, or the submission id of a lead',
};

const callbackFilters: ParamSpec[] = [
	{ name: 'q', displayName: 'Search', kind: 'string', description: 'Lead name or phone, customer, campaign or the missed call' },
	{
		name: 'status',
		kind: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Called Back', value: 'called_back' },
			{ name: 'Called, Not Reached', value: 'called_not_reached' },
			{ name: 'Missed (Open)', value: 'missed' },
			{ name: 'Never Called Back', value: 'never_called_back' },
		],
	},
	{ name: 'customerId', displayName: 'Customer ID', kind: 'number' },
	{ name: 'campaignId', displayName: 'Campaign ID', kind: 'number' },
	{ name: 'leadId', displayName: 'CRM Lead ID', kind: 'number' },
	{ name: 'dateFrom', displayName: 'Missed From', kind: 'string', description: 'Date YYYY-MM-DD' },
	{ name: 'dateTo', displayName: 'Missed To', kind: 'string', description: 'Date YYYY-MM-DD' },
	{
		name: 'sortBy',
		displayName: 'Sort By',
		kind: 'options',
		options: [
			{ name: 'Customer', value: 'customer' },
			{ name: 'Due', value: 'dueAt' },
			{ name: 'Missed Call (Default)', value: 'missedAt' },
		],
	},
	{
		name: 'sortDirection',
		displayName: 'Sort Direction',
		kind: 'options',
		options: [
			{ name: 'Descending', value: 'desc' },
			{ name: 'Ascending', value: 'asc' },
		],
	},
];

const proposalId: ParamSpec = {
	name: 'id',
	displayName: 'Proposal ID',
	kind: 'number',
	description: 'From Get Many on CRM AI Rule Proposal',
};

/** Resources and operations for CRM leads (extra lead actions), submissions, callbacks, the werkbak and AI rule proposals. */
export const crmLeadResources: ResourceSpec[] = [
	{
		// Extends the hand-written Get, Get Many, Approve and Reject in Zentria.node.ts.
		// The hand-written Reject sends no reason: use Reject With Reason.
		value: 'crmLead',
		name: 'CRM Lead',
		module: 'crm_leads',
		operations: [
			{
				value: 'getAllFiltered',
				name: 'Get Many (More Filters)',
				action: 'List CRM leads with more filters',
				description: 'GET /crm/leads with the werkbak filters (needs extra check, queue, rejected by), last seen range and sorting. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/leads',
				list: true,
				params: leadFilters,
			},
			{
				value: 'getWorkbench',
				name: 'Get Werkbak',
				action: 'Get the werkbak queues',
				description:
					'GET /crm/workbench: leads rejected by AI or the system, reclamations and open callbacks, with counts. Needs the view-workbench permission. Scope crm:read',
				method: 'GET',
				path: '/api/public/crm/workbench',
				params: [
					{ name: 'includeSpam', displayName: 'Include Spam', kind: 'boolean' },
					{ name: 'includeOutOfCategory', displayName: 'Include Out of Category', kind: 'boolean' },
				],
			},
			{
				value: 'getReviewEvents',
				name: 'Get Review History',
				action: 'Get the review history of a CRM lead',
				description: 'GET /crm/leads/{leadId}/review-events, newest first. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/leads/{leadId}/review-events',
				list: true,
				params: [{ ...leadLocator, name: 'leadId' }],
			},
			{
				value: 'approveWithReason',
				name: 'Approve With Reason',
				action: 'Approve a CRM lead with a reason',
				description: 'POST /crm/leads/{ID}/approve with a reason, preset and a category to add. Preset Matches Services needs a category key, preset Other needs a reason. Scope crm:write',
				method: 'POST',
				path: '/api/public/crm/leads/{id}/approve',
				params: [
					leadLocator,
					reason('Why the lead is approved'),
					{ name: 'reasonPresetKey', displayName: 'Reason Preset', kind: 'options', options: approvePresets },
					{
						name: 'addCategoryKey',
						displayName: 'Add Category Key',
						kind: 'string',
						description: 'Lead value category to give the lead and add to the categories the customer takes',
					},
				],
			},
			{
				value: 'rejectWithReason',
				name: 'Reject With Reason',
				action: 'Reject a CRM lead with a reason',
				description: 'POST /crm/leads/{ID}/reject. A reason is required. Scope crm:write',
				method: 'POST',
				path: '/api/public/crm/leads/{id}/reject',
				params: [
					leadLocator,
					reason('Why the lead is rejected', true),
					{ name: 'reasonPresetKey', displayName: 'Reason Preset', kind: 'options', options: rejectPresets, default: 'other' },
				],
			},
			{
				value: 'confirmRejection',
				name: 'Confirm Rejection',
				action: 'Confirm the rejection of a CRM lead',
				description: 'POST /crm/leads/{ID}/confirm-rejection: the rejection by AI or the system was right, the lead leaves the extra-check queue. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/leads/{id}/confirm-rejection',
				params: [
					leadLocator,
					reason('Optional note'),
					{ name: 'reasonPresetKey', displayName: 'Reason Preset', kind: 'options', options: allPresets },
				],
			},
			{
				value: 'dismissReclamation',
				name: 'Dismiss Reclamation',
				action: 'Dismiss the reclamation of a CRM lead',
				description: 'POST /crm/leads/{ID}/dismiss-reclamation: the lead goes back to approved. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/leads/{id}/dismiss-reclamation',
				params: [leadLocator, reason('Optional note')],
			},
			{
				value: 'setLeadValue',
				name: 'Set Lead Value',
				action: 'Set the lead value category of a CRM lead',
				description: 'PUT /crm/leads/{ID}/lead-value. The amount follows from the category. Not possible for a lead on an invoice. Scope crm-values:write',
				method: 'PUT',
				path: '/api/public/crm/leads/{id}/lead-value',
				params: [
					leadLocator,
					{
						name: 'categoryKey',
						displayName: 'Category Key',
						kind: 'string',
						required: true,
						description: 'Key from CRM Lead Value Category Get Many, or other for a classified lead without a category',
					},
				],
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete a CRM lead',
				description: 'DELETE /crm/leads/{ID}. Scope crm:delete.',
				method: 'DELETE',
				path: '/api/public/crm/leads/{id}',
				params: [leadLocator],
			},
		],
	},
	{
		value: 'crmSubmission',
		name: 'CRM Submission',
		module: 'crm_leads',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List CRM submissions',
				description: 'GET /crm/submissions, newest first. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/submissions',
				list: true,
				params: submissionFilters,
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get a CRM submission',
				description: 'GET /crm/submissions/{ID} with raw payload, transcript, AI extraction and which actions are allowed. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/submissions/{id}',
				params: [submissionId],
			},
			{
				value: 'markAsReal',
				name: 'Mark as Real',
				action: 'Mark a CRM submission as real',
				description: 'POST /crm/submissions/{ID}/mark-as-real: restore a spam submission and process it again. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/submissions/{id}/mark-as-real',
				params: [submissionId],
			},
			{
				value: 'markAsSpam',
				name: 'Mark as Spam',
				action: 'Mark a CRM submission as spam',
				description: 'POST /crm/submissions/{ID}/mark-as-spam: unlinks it from its lead. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/submissions/{id}/mark-as-spam',
				params: [submissionId],
			},
			{
				value: 'retryProcessing',
				name: 'Retry Processing',
				action: 'Retry processing of a CRM submission',
				description: 'POST /crm/submissions/{ID}/retry-processing for a failed form post. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/submissions/{id}/retry-processing',
				params: [submissionId],
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete a CRM submission',
				description: 'DELETE /crm/submissions/{ID}. Scope crm:delete.',
				method: 'DELETE',
				path: '/api/public/crm/submissions/{id}',
				params: [submissionId],
			},
		],
	},
	{
		value: 'crmCallback',
		name: 'CRM Callback',
		module: 'crm_leads',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List CRM callbacks',
				description:
					'GET /crm/callbacks: callbacks for missed calls. The system closes them from Voys calls, there is nothing to resolve by hand. Needs the view-workbench permission. Scope crm:read',
				method: 'GET',
				path: '/api/public/crm/callbacks',
				list: true,
				params: callbackFilters,
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get a CRM callback',
				description: 'GET /crm/callbacks/{ID}. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/callbacks/{id}',
				params: [{ name: 'id', displayName: 'Callback ID', kind: 'number' }],
			},
			{
				value: 'getSummary',
				name: 'Get Summary',
				action: 'Get the CRM callback summary',
				description: 'GET /crm/callbacks/summary: counts per status and the average time to call back. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/callbacks/summary',
				params: callbackFilters.filter((param) => !['status', 'sortBy', 'sortDirection'].includes(param.name)),
			},
		],
	},
	{
		value: 'crmAiRuleProposal',
		name: 'CRM AI Rule Proposal',
		module: 'crm_leads',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List CRM AI rule proposals',
				description: 'GET /crm/ai-rule-proposals: proposals that wait for a decision on the werkbak. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/ai-rule-proposals',
				list: true,
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get a CRM AI rule proposal',
				description: 'GET /crm/ai-rule-proposals/{ID}. Scope crm:read.',
				method: 'GET',
				path: '/api/public/crm/ai-rule-proposals/{id}',
				params: [proposalId],
			},
			{
				value: 'confirm',
				name: 'Confirm',
				action: 'Confirm a CRM AI rule proposal',
				description: 'POST /crm/ai-rule-proposals/{ID}/confirm: the text is added to the rule the proposal targets. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/ai-rule-proposals/{id}/confirm',
				params: [
					proposalId,
					{ name: 'text', displayName: 'Text', kind: 'string', required: true, description: 'Final wording of the rule' },
					{
						name: 'categoryKey',
						displayName: 'Category Key',
						kind: 'string',
						description: 'Point the rule at another lead value category',
					},
				],
			},
			{
				value: 'discard',
				name: 'Discard',
				action: 'Discard a CRM AI rule proposal',
				description: 'POST /crm/ai-rule-proposals/{ID}/discard. Scope crm:write.',
				method: 'POST',
				path: '/api/public/crm/ai-rule-proposals/{id}/discard',
				params: [proposalId],
			},
		],
	},
];
