import type { INode, INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Zentria } from '../nodes/Zentria/Zentria.node';

const description = new Zentria().description;
const properties = description.properties as INodeProperties[];

const shownFor = (name: string, resource: string, operation: string): INodeProperties | undefined =>
	properties.find(
		(property) =>
			property.name === name &&
			(property.displayOptions?.show?.resource as string[] | undefined)?.includes(resource) &&
			(property.displayOptions?.show?.operation as string[] | undefined)?.includes(operation),
	);

const lists: Array<[string, string, string]> = [
	['customer', 'customer', 'getAll'],
	['deal', 'deal', 'getAll'],
	['person', 'person', 'getAll'],
	['organization', 'organization', 'getAll'],
	['form', 'form', 'getAll'],
	['submission', 'submission', 'getAll'],
	['pipeline', 'pipeline', 'getAll'],
	['activity', 'activity', 'getAll'],
	['member', 'member', 'getAll'],
	['todo', 'todo', 'getAll'],
	['stlFlow', 'stlFlow', 'getAll'],
	['webhook', 'webhook', 'getAll'],
	['crmCall', 'crmCall', 'getAll'],
	['crmLead', 'crmLead', 'getAll'],
	['bp', 'businessProfile', 'getLocations'],
	['bp', 'businessProfile', 'getReviews'],
	['bp', 'businessProfile', 'getReplies'],
];

describe('Get Many parameters', () => {
	it.each(lists)('%s offers Return All and Limit on %s > %s', (prefix, resource, operation) => {
		const returnAll = shownFor(`${prefix}ReturnAll`, resource, operation);
		const limit = shownFor(`${prefix}Limit`, resource, operation);

		expect(returnAll?.type).toBe('boolean');
		expect(limit?.type).toBe('number');
		expect(limit?.default).toBe(50);
		expect(limit?.displayOptions?.show?.[`${prefix}ReturnAll`]).toEqual([false]);
	});

	it('returns all customers by default and keeps the other lists at a limit', () => {
		expect(shownFor('customerReturnAll', 'customer', 'getAll')?.default).toBe(true);
		expect(shownFor('dealReturnAll', 'deal', 'getAll')?.default).toBe(false);
		expect(shownFor('crmLeadReturnAll', 'crmLead', 'getAll')?.default).toBe(false);
	});

	it('gives a saved Customer > Get Many node without the new parameter Return All on', () => {
		// The parameters as stored in an existing workflow (like Chiel's "Klanten" node).
		const saved = { resource: 'customer', operation: 'getAll', customerStatus: 'active' };
		const node = { name: 'Klanten', type: 'zentria', typeVersion: 1, position: [0, 0], parameters: saved } as unknown as INode;

		// The same call n8n makes when it loads a workflow for a run.
		const resolved = NodeHelpers.getNodeParameters(properties, saved, true, false, node, description);

		expect(resolved?.customerReturnAll).toBe(true);
	});
});
