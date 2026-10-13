import type { ParamSpec, ResourceSpec } from './engine';

/**
 * Resources and operations for the team profile and settings, members, roles, invitations,
 * exports, webhooks, to-dos and Speed to Lead flows and templates.
 *
 * The hand-written member, todo, webhook and stlFlow resources keep their operations; the
 * operations below add what the web app can do on top of that.
 */

const EXPORT_TYPES = [
	'users',
	'teams',
	'tenants',
	'audits',
	'crm_leads',
	'lead_submissions',
	'leads',
	'flows',
	'sms_templates',
	'customers',
].map((type) => ({ name: type.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), value: type }));

const memberLocator: ParamSpec = { name: 'id', displayName: 'Member', kind: 'number', required: true, locator: 'searchMembers' };
const todoLocator: ParamSpec = { name: 'id', displayName: 'Todo', kind: 'number', required: true, locator: 'searchTodos' };
const webhookLocator: ParamSpec = { name: 'id', displayName: 'Webhook', kind: 'number', required: true, locator: 'searchWebhooks' };
const flowLocator: ParamSpec = { name: 'id', displayName: 'STL Flow', kind: 'number', required: true, locator: 'searchStlFlows' };

const translationsParam: ParamSpec = {
	name: 'translations',
	kind: 'json',
	default: '',
	description: 'JSON per language, for example {"nl": {"title": "Bel de klant", "description": "Voor vrijdag"}}. When used, languages you leave out are removed',
};

const todoFields: ParamSpec[] = [
	{ name: 'description', kind: 'string', description: 'Description of the to-do' },
	translationsParam,
];

const webhookFields: ParamSpec[] = [
	{ name: 'description', kind: 'string' },
	{
		name: 'filters',
		kind: 'json',
		default: '',
		description: 'Limit to sales forms, for example {"form_ids": [1, 2]}. Use Get Options for the form IDs',
	},
	{ name: 'isActive', displayName: 'Active', kind: 'boolean', default: true, description: 'Whether the endpoint receives events' },
];

const templateFields: ParamSpec[] = [
	{
		name: 'templateText',
		displayName: 'Template Text',
		kind: 'string',
		description: 'SMS text with placeholders such as {{Name}}, {{Adres}}, {{Telefoon}}, {{Email}} and {{Omschrijving}}. Use {{Omschrijving|truncate(100)}} to shorten',
	},
	{
		name: 'templateJson',
		displayName: 'Template JSON',
		kind: 'json',
		default: '',
		description: 'The SMS text as a Tiptap document. Used instead of Template Text when filled',
	},
];

export const teamAdminResources: ResourceSpec[] = [
	{
		value: 'team',
		name: 'Team',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get a team',
				description: 'Get the team of this API key. Use Me > Get to find the team ID.',
				method: 'GET',
				path: '/api/public/teams/{id}',
				params: [{ name: 'id', displayName: 'Team ID', kind: 'number', required: true }],
			},
			{
				value: 'update',
				name: 'Update Profile',
				action: 'Rename the team',
				description: 'Rename the team of this API key. The slug follows the name. Needs the edit-team permission',
				method: 'PUT',
				path: '/api/public/teams/{id}',
				params: [
					{ name: 'id', displayName: 'Team ID', kind: 'number', required: true },
					{ name: 'name', kind: 'string', required: true },
				],
			},
		],
	},
	{
		value: 'teamSetting',
		name: 'Team Setting',
		operations: [
			{
				value: 'getOverview',
				name: 'Get All Settings',
				action: 'Get the team settings',
				description: 'The timezone, default phone country and, with the manage-team-settings permission, every setting of the settings page. Secrets show only whether they have a value.',
				method: 'GET',
				path: '/api/public/settings',
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get a team setting',
				method: 'GET',
				path: '/api/public/settings/{key}',
				params: [{ name: 'key', kind: 'string', required: true, description: 'Setting key, for example twilio_from or default_phone_country' }],
			},
			{
				value: 'update',
				name: 'Set',
				action: 'Set a team setting',
				description: 'Speed to Lead sending (Twilio), phone number handling, CRM and invoicing options. An empty value clears the setting, an empty secret keeps the old one. Switches take true or false',
				method: 'PUT',
				path: '/api/public/settings/{key}',
				params: [
					{ name: 'key', kind: 'string', required: true, description: 'Setting key, for example twilio_from or default_phone_country' },
					{ name: 'value', kind: 'string', required: true },
				],
			},
		],
	},
	{
		value: 'member',
		name: 'Member',
		operations: [
			{
				value: 'remove',
				name: 'Remove',
				action: 'Remove a member from the team',
				description: 'Their API keys for this team and pending export links stop working. You cannot remove yourself.',
				method: 'DELETE',
				path: '/api/public/members/{id}',
				params: [memberLocator],
			},
			{
				value: 'getRoles',
				name: 'Get Roles',
				action: 'List the roles of the team',
				description: 'The role names you can give with Invite or Change Role',
				method: 'GET',
				path: '/api/public/roles',
				list: true,
			},
		],
	},
	{
		value: 'invitation',
		name: 'Invitation',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List pending invitations',
				description: 'Pending invitations that have not expired. Invite someone with Member > Invite.',
				method: 'GET',
				path: '/api/public/invitations',
				list: true,
				params: [{ name: 'q', displayName: 'Email', kind: 'string', description: 'Part of the email address' }],
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get an invitation',
				method: 'GET',
				path: '/api/public/invitations/{id}',
				params: [{ name: 'id', displayName: 'Invitation ID', kind: 'number', required: true }],
			},
			{
				value: 'resend',
				name: 'Resend',
				action: 'Resend an invitation',
				description: 'Send the invitation mail again. The expiry date does not change.',
				method: 'POST',
				path: '/api/public/invitations/{id}/resend',
				params: [{ name: 'id', displayName: 'Invitation ID', kind: 'number', required: true }],
			},
			{
				value: 'cancel',
				name: 'Cancel',
				action: 'Cancel an invitation',
				method: 'DELETE',
				path: '/api/public/invitations/{id}',
				params: [{ name: 'id', displayName: 'Invitation ID', kind: 'number', required: true }],
			},
		],
	},
	{
		value: 'export',
		name: 'Export',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List exports',
				method: 'GET',
				path: '/api/public/exports',
				list: true,
				params: [
					{ name: 'q', displayName: 'Search', kind: 'string', description: 'Part of the file name or type' },
					{
						name: 'status',
						kind: 'options',
						options: [
							{ name: 'Pending', value: 'pending' },
							{ name: 'Processing', value: 'processing' },
							{ name: 'Completed', value: 'completed' },
							{ name: 'Failed', value: 'failed' },
						],
						default: 'completed',
					},
				],
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get an export',
				description: 'Status, progress and, when completed, the downloadUrl. Fetch the file from that URL with the same API key.',
				method: 'GET',
				path: '/api/public/exports/{id}',
				params: [{ name: 'id', displayName: 'Export ID', kind: 'number', required: true }],
			},
			{
				value: 'start',
				name: 'Start',
				action: 'Start an export',
				description: 'Queue a spreadsheet export. Returns exportId; use Get until the status is completed.',
				method: 'POST',
				path: '/api/public/exports',
				params: [
					{ name: 'type', kind: 'options', required: true, options: EXPORT_TYPES, default: 'customers' },
					{
						name: 'filters',
						kind: 'json',
						default: '',
						description: 'Filters of the export dialog as JSON, for example {"reviewStatus": "approved", "dateFrom": "2026-01-01", "customerId": 12}',
					},
				],
			},
			{
				value: 'startTeamData',
				name: 'Start Team Data Export',
				action: 'Start the full team data export',
				description: 'Members, invitations, to-dos, roles, audits and exports. The download link is mailed to the owner of the API key. Needs the export-team permission',
				method: 'POST',
				path: '/api/public/exports/team-data',
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete an export',
				method: 'DELETE',
				path: '/api/public/exports/{id}',
				params: [{ name: 'id', displayName: 'Export ID', kind: 'number', required: true }],
			},
		],
	},
	{
		value: 'todo',
		name: 'Todo',
		module: 'todos',
		operations: [
			{
				value: 'createFull',
				name: 'Create (All Fields)',
				action: 'Create a to do with description and translations',
				method: 'POST',
				path: '/api/public/todos',
				params: [{ name: 'title', kind: 'string', required: true }, ...todoFields],
			},
			{
				value: 'updateFull',
				name: 'Update (All Fields)',
				action: 'Update a to do with description and translations',
				description: 'Change only the fields you add. Set Completed to complete or reopen the to-do.',
				method: 'PUT',
				path: '/api/public/todos/{id}',
				params: [
					todoLocator,
					{ name: 'title', kind: 'string' },
					...todoFields,
					{ name: 'isCompleted', displayName: 'Completed', kind: 'boolean', description: 'Whether the to-do is completed. Off reopens it' },
				],
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete a to do',
				method: 'DELETE',
				path: '/api/public/todos/{id}',
				params: [todoLocator],
			},
		],
	},
	{
		value: 'webhook',
		name: 'Webhook',
		operations: [
			{
				value: 'get',
				name: 'Get',
				action: 'Get a webhook endpoint',
				method: 'GET',
				path: '/api/public/webhooks/{id}',
				params: [webhookLocator],
			},
			{
				value: 'getOptions',
				name: 'Get Options',
				action: 'List webhook events and forms',
				description: 'The events a webhook can listen to and the sales forms it can be limited to',
				method: 'GET',
				path: '/api/public/webhook-options',
			},
			{
				value: 'createFull',
				name: 'Create (All Fields)',
				action: 'Create a webhook endpoint with all fields',
				description: 'The signing secret is returned once',
				method: 'POST',
				path: '/api/public/webhooks',
				params: [
					{ name: 'url', displayName: 'URL', kind: 'string', required: true, description: 'HTTPS callback URL' },
					{ name: 'events', kind: 'json', required: true, default: '["*"]', description: 'JSON list of event names, or ["*"] for every event' },
					...webhookFields,
				],
			},
			{
				value: 'update',
				name: 'Update',
				action: 'Update a webhook endpoint',
				description: 'Change only the fields you add',
				method: 'PATCH',
				path: '/api/public/webhooks/{id}',
				params: [
					webhookLocator,
					{ name: 'url', displayName: 'URL', kind: 'string' },
					{ name: 'events', kind: 'json', default: '', description: 'JSON list of event names, or ["*"]' },
					...webhookFields.filter((field) => field.name !== 'isActive'),
					{ name: 'isActive', displayName: 'Active', kind: 'boolean', description: 'Whether the endpoint receives events' },
				],
			},
		],
	},
	{
		value: 'stlFlow',
		name: 'STL Flow',
		module: 'speed_to_lead',
		operations: [
			{
				value: 'createFull',
				name: 'Create (All Fields)',
				action: 'Create a flow with an SMS template',
				description: 'Creates a draft flow for one Elementor connection. A connection that already has a flow is rejected.',
				method: 'POST',
				path: '/api/public/stl/flows',
				params: [
					{ name: 'name', kind: 'string', required: true },
					{ name: 'customerIntegrationId', displayName: 'Customer Integration ID', kind: 'number', required: true, description: 'Elementor connection ID' },
					{ name: 'receivingPhone', kind: 'string', required: true },
					{ name: 'smsTemplateId', displayName: 'SMS Template ID', kind: 'number', description: 'Template from the team library. Empty uses the team default' },
				],
			},
			{
				value: 'update',
				name: 'Update',
				action: 'Update a flow',
				description: 'Change only the fields you add. A flow only goes active when its connection has exactly one field tagged as the lead name.',
				method: 'PUT',
				path: '/api/public/stl/flows/{id}',
				params: [
					flowLocator,
					{ name: 'name', kind: 'string' },
					{ name: 'customerIntegrationId', displayName: 'Customer Integration ID', kind: 'number' },
					{ name: 'receivingPhone', kind: 'string' },
					{
						name: 'status',
						kind: 'options',
						options: [
							{ name: 'Draft', value: 'draft' },
							{ name: 'Active', value: 'active' },
							{ name: 'Inactive', value: 'inactive' },
						],
						default: 'draft',
					},
					...templateFields,
					{
						name: 'applyToCampaignFlows',
						displayName: 'Apply to Campaign Flows',
						kind: 'boolean',
						description: 'Whether to copy phone, status and SMS text to the other flows of the same campaign',
					},
				],
			},
			{
				value: 'sendTestSms',
				name: 'Send Test SMS',
				action: 'Send a test SMS for a flow',
				description: 'Sends a real SMS with sample data through the team Twilio account',
				method: 'POST',
				path: '/api/public/stl/flows/{flowId}/test-sms',
				params: [
					{ name: 'flowId', displayName: 'STL Flow', kind: 'number', required: true, locator: 'searchStlFlows' },
					{ name: 'to', kind: 'string', required: true, description: 'Phone number that receives the test SMS' },
					{ name: 'templateJson', displayName: 'Template JSON', kind: 'json', default: '', description: 'Optional unsaved Tiptap template to test' },
				],
			},
		],
	},
	{
		value: 'stlTemplate',
		name: 'STL SMS Template',
		module: 'speed_to_lead',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List SMS templates',
				method: 'GET',
				path: '/api/public/stl/sms-templates',
				list: true,
				params: [{ name: 'q', displayName: 'Name', kind: 'string' }],
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get an SMS template',
				method: 'GET',
				path: '/api/public/stl/sms-templates/{id}',
				params: [{ name: 'id', displayName: 'Template ID', kind: 'number', required: true }],
			},
			{
				value: 'create',
				name: 'Create',
				action: 'Create an SMS template',
				description: 'Give Template Text or Template JSON. The first template of a team becomes the default.',
				method: 'POST',
				path: '/api/public/stl/sms-templates',
				params: [
					{ name: 'name', kind: 'string', required: true },
					...templateFields,
					{ name: 'isDefault', displayName: 'Default', kind: 'boolean', description: 'Whether to make this the team default template' },
				],
			},
			{
				value: 'update',
				name: 'Update',
				action: 'Update an SMS template',
				description: 'Replaces the name and the text. Give Template Text or Template JSON.',
				method: 'PUT',
				path: '/api/public/stl/sms-templates/{id}',
				params: [
					{ name: 'id', displayName: 'Template ID', kind: 'number', required: true },
					{ name: 'name', kind: 'string', required: true },
					...templateFields,
				],
			},
			{
				value: 'setDefault',
				name: 'Set as Default',
				action: 'Make an SMS template the team default',
				method: 'PUT',
				path: '/api/public/stl/sms-templates/{id}/default',
				params: [{ name: 'id', displayName: 'Template ID', kind: 'number', required: true }],
			},
			{
				value: 'delete',
				name: 'Delete',
				action: 'Delete an SMS template',
				method: 'DELETE',
				path: '/api/public/stl/sms-templates/{id}',
				params: [{ name: 'id', displayName: 'Template ID', kind: 'number', required: true }],
			},
		],
	},
];
