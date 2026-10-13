import type { OperationSpec, ParamSpec, ResourceSpec } from './engine';

/** Resources and operations for invoices and invoice actions. Amounts are integer cents. */

const invoiceId: ParamSpec = { name: 'id', displayName: 'Invoice ID', kind: 'number', required: true };

function action(value: string, name: string, actionText: string, description: string, extra: ParamSpec[] = []): OperationSpec {
	return {
		value,
		name,
		action: actionText,
		description,
		method: 'POST',
		path: `/api/public/invoices/{id}/${value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
		params: [invoiceId, ...extra],
	};
}

export const invoiceResources: ResourceSpec[] = [
	{
		value: 'invoice',
		name: 'Invoice',
		module: 'crm_leads',
		operations: [
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List invoices',
				description: 'Invoices of customers with invoicing on, newest period first',
				method: 'GET',
				path: '/api/public/invoices',
				list: true,
				params: [
					{ name: 'customerId', displayName: 'Customer', kind: 'number' },
					{
						name: 'status',
						kind: 'options',
						options: [
							{ name: 'Cancelled', value: 'cancelled' },
							{ name: 'Charged Back', value: 'charged_back' },
							{ name: 'Draft', value: 'draft' },
							{ name: 'Draft Failed', value: 'draft_failed' },
							{ name: 'Failed', value: 'failed' },
							{ name: 'Overdue', value: 'overdue' },
							{ name: 'Paid', value: 'paid' },
							{ name: 'Ready', value: 'ready' },
							{ name: 'Sent', value: 'sent' },
						],
						default: 'draft',
					},
					{ name: 'period', kind: 'string', description: 'ISO week of the invoice, for example 2026-W07' },
					{ name: 'outstanding', kind: 'boolean', description: 'Whether to return only invoices that still have to be paid' },
					{ name: 'withLines', displayName: 'Include Lines', kind: 'boolean', description: 'Whether to include the invoice lines' },
				],
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get an invoice',
				description: 'An invoice with its lines, payment attempts and reminder log',
				method: 'GET',
				path: '/api/public/invoices/{id}',
				params: [invoiceId],
			},
			action('ready', 'Mark Ready', 'Mark an invoice as ready', 'Refused before the billing moment of its week or when it is no longer a draft'),
			action('cancel', 'Cancel', 'Cancel an invoice', 'Cancels the Mollie sales invoice and releases the leads', [
				{ name: 'reason', kind: 'string' },
			]),
			action('chargedBack', 'Mark Charged Back', 'Mark an invoice as charged back', 'Refused for a draft or an invoice that was never collected'),
			action('collect', 'Collect', 'Collect an invoice', 'Starts or retries the collection of a ready, failed or sent invoice'),
			action('skipCollection', 'Skip Collection', 'Keep an invoice out of the automatic collection', 'Needs the invoices:write scope'),
			action('unskipCollection', 'Unskip Collection', 'Put an invoice back in the automatic collection', 'Needs the invoices:write scope'),
			action('pauseReminders', 'Pause Reminders', 'Pause payment reminders of an invoice', 'Needs the invoices:write scope', [
				{ name: 'reason', kind: 'string', required: true },
			]),
			action('resumeReminders', 'Resume Reminders', 'Resume payment reminders of an invoice', 'Needs the invoices:write scope'),
		],
	},
];
