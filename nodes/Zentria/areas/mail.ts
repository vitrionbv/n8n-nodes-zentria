import type { ParamSpec, ResourceSpec } from './engine';

/**
 * Mail through Zentria: send email from the team's own mail account (SMTP) and read accounts and sent messages.
 * A team without its own account sends through Zentria (zentria@updates.vitrion.nl).
 */

const base = '/api/public/mail';

const dynamicHelp =
	'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>';

const accountId: ParamSpec = { name: 'id', displayName: 'Account ID', kind: 'number', required: true, description: 'Mail account ID from Get Many Accounts' };
const messageId: ParamSpec = { name: 'id', displayName: 'Message ID', kind: 'number', required: true, description: 'Mail message ID from Send or Get Many Messages' };

const recipients = (name: string, displayName: string, required = false): ParamSpec => ({
	name,
	displayName,
	kind: 'emailList',
	required,
	description: 'Comma separated email addresses. At most 50 recipients in To, CC and BCC together.',
});

const statuses = [
	{ name: 'Failed', value: 'failed' },
	{ name: 'Queued', value: 'queued' },
	{ name: 'Sent', value: 'sent' },
];

const sources = [
	{ name: 'API', value: 'api' },
	{ name: 'Invoice Reminder', value: 'invoice_reminder' },
	{ name: 'Portal Invitation', value: 'portal_invitation' },
	{ name: 'Portal Password Reset', value: 'portal_password_reset' },
	{ name: 'Portal Welcome', value: 'portal_welcome' },
	{ name: 'Template Test', value: 'template_test' },
	{ name: 'Account Test', value: 'account_test' },
	{ name: 'Weekly Lead Digest', value: 'weekly_lead_digest' },
];

export const mailResources: ResourceSpec[] = [
	{
		value: 'mail',
		name: 'Mail',
		operations: [
			{
				value: 'getAccount',
				name: 'Get Account',
				action: 'Get a mail account',
				description: 'Scope mail:read',
				method: 'GET',
				path: `${base}/accounts/{id}`,
				params: [accountId],
			},
			{
				value: 'getAccounts',
				name: 'Get Many Accounts',
				action: 'List mail accounts',
				description: 'The team mail accounts. An empty list means mail goes through Zentria. Scope mail:read.',
				method: 'GET',
				path: `${base}/accounts`,
				list: true,
			},
			{
				value: 'getMessage',
				name: 'Get Message',
				action: 'Get a mail message',
				description: 'One sent or queued mail with status and error. Bodies are only filled for mails sent through the API. Scope mail:read.',
				method: 'GET',
				path: `${base}/messages/{id}`,
				params: [messageId],
			},
			{
				value: 'getMessages',
				name: 'Get Many Messages',
				action: 'List mail messages',
				description: 'Mails sent by the team, without bodies. Scope mail:read.',
				method: 'GET',
				path: `${base}/messages`,
				list: true,
				params: [
					{
						name: 'accountId',
						displayName: 'Account Name or ID',
						kind: 'options',
						loadOptionsMethod: 'getMailAccountFilter',
						description: dynamicHelp,
					},
					{ name: 'source', kind: 'options', options: sources, default: 'api' },
					{ name: 'status', kind: 'options', options: statuses, default: 'sent' },
				],
			},
			{
				value: 'send',
				name: 'Send',
				action: 'Send an email',
				description:
					"Sends a real email from the team's own address (or through Zentria when the team has no mail account). Scope mail:write.",
				method: 'POST',
				path: `${base}/messages`,
				params: [
					{
						name: 'accountId',
						displayName: 'Account Name or ID',
						kind: 'options',
						loadOptionsMethod: 'getMailAccounts',
						alwaysShow: true,
						description: `${dynamicHelp}. Default Account uses the team default account, or Zentria when there is none.`,
					},
					recipients('to', 'To', true),
					{ name: 'subject', kind: 'string', required: true },
					{
						name: 'html',
						displayName: 'HTML',
						kind: 'string',
						alwaysShow: true,
						description: 'HTML body. Fill HTML, Text or both.',
					},
					{
						name: 'text',
						kind: 'string',
						alwaysShow: true,
						description: 'Plain text body. Fill HTML, Text or both.',
					},
					recipients('cc', 'CC'),
					recipients('bcc', 'BCC'),
					{ name: 'replyTo', displayName: 'Reply-To', kind: 'string', description: 'Email address for replies' },
					{
						name: 'fromName',
						displayName: 'From Name',
						kind: 'string',
						description: 'Overrides only the display name, the address stays the account address',
					},
					{
						name: 'metadata',
						kind: 'keyValue',
						description: 'Your own values, sent back in the mail.sent and mail.failed webhooks',
					},
					{
						name: 'Idempotency-Key',
						displayName: 'Idempotency Key',
						kind: 'string',
						in: 'header',
						description: 'Send the same key again and Zentria returns the first message instead of sending twice',
					},
				],
			},
		],
	},
];
