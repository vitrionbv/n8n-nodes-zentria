import type { ResourceSpec } from './engine';
import { businessProfileAdminResources } from './businessProfileAdmin';
import { campaignResources } from './campaigns';
import { connectionResources } from './connections';
import { crmLeadResources } from './crmLeads';
import { crmSettingsResources } from './crmSettings';
import { customerAdminResources } from './customerAdmin';
import { invoiceResources } from './invoices';
import { salesAdminResources } from './salesAdmin';
import { teamAdminResources } from './teamAdmin';

/**
 * Area files may extend the same resource (same `value`). Merge them so lookups see every operation.
 * Duplicate operation values on one resource are a mistake and throw when the node loads.
 */
function mergeResources(resources: ResourceSpec[]): ResourceSpec[] {
	const merged = new Map<string, ResourceSpec>();

	for (const resource of resources) {
		const existing = merged.get(resource.value);

		if (!existing) {
			merged.set(resource.value, { ...resource, operations: [...resource.operations] });
			continue;
		}

		for (const operation of resource.operations) {
			if (existing.operations.some((candidate) => candidate.value === operation.value)) {
				throw new Error(`Duplicate operation ${resource.value}.${operation.value} in the Zentria node areas.`);
			}

			existing.operations.push(operation);
		}

		existing.module = existing.module ?? resource.module;
	}

	return Array.from(merged.values());
}

const ALL_RESOURCES: ResourceSpec[] = [
	...businessProfileAdminResources,
	...campaignResources,
	...connectionResources,
	...crmLeadResources,
	...crmSettingsResources,
	...customerAdminResources,
	...invoiceResources,
	...salesAdminResources,
	...teamAdminResources,
];

/** Every resource and operation defined as data. Each area file owns its own list. */
export const AREA_RESOURCES: ResourceSpec[] = mergeResources(ALL_RESOURCES);
