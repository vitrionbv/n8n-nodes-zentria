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

const adjustmentId: ParamSpec = { name: 'id', displayName: 'Correction ID', kind: 'number', required: true };

const adjustmentReason: ParamSpec = {
	name: 'reason',
	kind: 'options',
	required: true,
	options: [
		{ name: 'Duplicate Lead', value: 'duplicate_lead' },
		{ name: 'Other', value: 'other' },
		{ name: 'Price Correction', value: 'price_correction' },
		{ name: 'Reclamation', value: 'reclamation' },
	],
	default: 'reclamation',
};

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
			action('cancel', 'Cancel', 'Cancel an invoice', 'Only for a sent or overdue invoice. Zentria then issues a replacement invoice for the same week with the approved leads, so they are billed again. Use Skip Collection to drop an invoice without billing its leads again', [
				{ name: 'reason', kind: 'string' },
			]),
			{
				value: 'addAdjustment',
				name: 'Add Correction',
				action: 'Add a correction to a draft invoice',
				description: 'A discount (negative amount) or extra charge (positive amount) on a draft invoice. The description is shown to the customer. The total cannot go below zero',
				method: 'POST',
				path: '/api/public/invoices/{id}/adjustments',
				params: [
					invoiceId,
					{ name: 'amountCents', displayName: 'Amount (Cents)', kind: 'number', required: true, default: 0, description: 'Integer cents ex VAT. Negative for a discount, positive for an extra charge' },
					adjustmentReason,
					{ name: 'description', kind: 'string', required: true, description: 'Text on the invoice' },
					{ name: 'crmLeadId', displayName: 'CRM Lead ID', kind: 'number', description: 'The lead this correction is about' },
				],
			},
			action('chargedBack', 'Mark Charged Back', 'Mark an invoice as charged back', 'Refused for a draft or an invoice that was never collected'),
			action('collect', 'Collect', 'Collect an invoice', 'Starts or retries the collection of a ready, failed or sent invoice'),
			action('skipCollection', 'Skip Collection', 'Keep an invoice out of the automatic collection', 'The invoice is not issued or collected, and its leads stay on it, so they are not billed later either. Needs the invoices:write scope'),
			action('unskipCollection', 'Unskip Collection', 'Put an invoice back in the automatic collection', 'Needs the invoices:write scope'),
			action('pauseReminders', 'Pause Reminders', 'Pause payment reminders of an invoice', 'Needs the invoices:write scope', [
				{ name: 'reason', kind: 'string', required: true },
			]),
			action('resumeReminders', 'Resume Reminders', 'Resume payment reminders of an invoice', 'Needs the invoices:write scope'),
		],
	},
	{
		value: 'invoiceAdjustment',
		name: 'Invoice Correction',
		module: 'crm_leads',
		operations: [
			{
				value: 'creditLead',
				name: 'Credit Lead',
				action: 'Credit a lead on a sent invoice',
				description: 'Without an amount the full billed amount is credited. The credit is deducted on the open draft of the customer, or waits for the next invoice. A lead on a draft invoice is rejected instead',
				method: 'POST',
				path: '/api/public/crm/leads/{id}/credit',
				params: [
					{ name: 'id', displayName: 'CRM Lead', kind: 'number', required: true, locator: 'searchCrmLeads' },
					adjustmentReason,
					{ name: 'amountCents', displayName: 'Amount (Cents)', kind: 'number', description: 'Integer cents ex VAT, at most what was billed for the lead' },
					{ name: 'description', kind: 'string', description: 'Text on the invoice' },
				],
			},
			{
				value: 'getAll',
				name: 'Get Many',
				action: 'List invoice corrections',
				description: 'Discounts, extra charges and lead credits, newest first. Pending credits wait for the next invoice.',
				method: 'GET',
				path: '/api/public/invoice-adjustments',
				list: true,
				params: [
					{ name: 'customerId', displayName: 'Customer', kind: 'number' },
					{ name: 'invoiceId', displayName: 'Invoice ID', kind: 'number' },
					{ name: 'crmLeadId', displayName: 'CRM Lead ID', kind: 'number' },
					{
						name: 'status',
						kind: 'options',
						options: [
							{ name: 'Applied', value: 'applied' },
							{ name: 'Pending', value: 'pending' },
							{ name: 'Settled Externally', value: 'settled_externally' },
							{ name: 'Withdrawn', value: 'withdrawn' },
						],
						default: 'pending',
					},
				],
			},
			{
				value: 'get',
				name: 'Get',
				action: 'Get an invoice correction',
				method: 'GET',
				path: '/api/public/invoice-adjustments/{id}',
				params: [adjustmentId],
			},
			{
				value: 'delete',
				name: 'Remove From Draft',
				action: 'Remove a correction from its draft invoice',
				description: 'A manual correction is deleted; a lead credit goes back to waiting for the next invoice',
				method: 'DELETE',
				path: '/api/public/invoice-adjustments/{id}',
				params: [adjustmentId],
			},
			{
				value: 'settle',
				name: 'Settle Externally',
				action: 'Mark a waiting credit as settled outside Zentria',
				description: 'For example with a credit note or refund in Mollie',
				method: 'POST',
				path: '/api/public/invoice-adjustments/{id}/settle',
				params: [adjustmentId, { name: 'reference', kind: 'string', description: 'For example the credit note number' }],
			},
			{
				value: 'withdraw',
				name: 'Withdraw',
				action: 'Withdraw a waiting correction',
				description: 'The correction never lands on an invoice',
				method: 'POST',
				path: '/api/public/invoice-adjustments/{id}/withdraw',
				params: [adjustmentId],
			},
		],
	},
];
