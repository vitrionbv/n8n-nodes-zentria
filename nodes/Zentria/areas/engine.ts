import type { IDataObject, IExecuteFunctions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { collectionItems, locatorId, zentriaApiRequest } from '../GenericFunctions';

/**
 * Declarative operations for the Zentria node.
 *
 * An area file lists resources and operations as plain data. The engine turns them into n8n
 * properties and runs them against the public API, so a new endpoint is a few lines of data
 * instead of a copy of the property and execute boilerplate in Zentria.node.ts.
 *
 * A resource that already exists in Zentria.node.ts (for example `crmLead`) can get extra
 * operations: use the same `value` and the new operations are appended to its Operation list.
 */

export type ModuleKey = 'sales_cms' | 'crm_leads' | 'speed_to_lead' | 'todos' | 'business_profiles' | 'communiqate';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ParamSpec {
	/** API field: a `{placeholder}` in the path, a query key or a JSON body field. */
	name: string;
	/** Label in the n8n UI. Defaults to the name in Title Case. */
	displayName?: string;
	kind: 'string' | 'number' | 'boolean' | 'options' | 'dateTime' | 'json';
	/** Required params are always shown. Optional params sit under "Options" and are only sent when filled. */
	required?: boolean;
	/** Where the value goes. Default: path when the path has the placeholder, else query for GET and body for other methods. */
	in?: 'path' | 'query' | 'body';
	/** Mask the value in the n8n UI (passwords, API keys). Write-only secrets must set this. */
	secret?: boolean;
	/** For `type: 'options'`. */
	options?: Array<{ name: string; value: string | number | boolean }>;
	default?: string | number | boolean;
	description?: string;
	/**
	 * Existing resource locator search method (for example `searchCrmLeads`, `searchCustomers`).
	 * Shows a "From List / By ID" picker instead of a plain field. Only for required params.
	 */
	locator?: string;
}

export interface OperationSpec {
	/** Operation value, for example `getAll`, `get`, `create`, `delete`, `approve`. */
	value: string;
	/** Name in the operation list. Keep the list alphabetical when you can. */
	name: string;
	/** Sentence for the n8n action, for example "List campaigns". */
	action: string;
	description?: string;
	method: HttpMethod;
	/** Public API path, for example `/api/public/campaigns/{id}/archive`. */
	path: string;
	params?: ParamSpec[];
	/** A paginated list: adds "Return All" and collects the items. */
	list?: boolean;
}

export interface ResourceSpec {
	/** Resource value. Reuse an existing value to add operations to an existing resource. */
	value: string;
	/** Name in the resource list. Needed for new resources. */
	name: string;
	/** Needed for gating: the operation fails when the team has this module off. */
	module?: ModuleKey;
	operations: OperationSpec[];
}

const MODULE_LABELS: Record<ModuleKey, string> = {
	sales_cms: 'Sales',
	crm_leads: 'CRM leads',
	speed_to_lead: 'Speed to lead',
	todos: 'Todos',
	business_profiles: 'Business Profiles',
	communiqate: 'CommuniQate (connect it on the team CommuniQate tab in Zentria)',
};

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCase(value: string): string {
	return capitalize(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' '));
}

function propertyName(resource: string, operation: string, param: string): string {
	return `${resource}${capitalize(operation)}${capitalize(param.replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : '')))}`;
}

function pathPlaceholders(path: string): string[] {
	return Array.from(path.matchAll(/\{(\w+)\}/g), (match) => match[1]);
}

function paramTarget(spec: OperationSpec, param: ParamSpec): 'path' | 'query' | 'body' {
	if (param.in) {
		return param.in;
	}

	if (pathPlaceholders(spec.path).includes(param.name)) {
		return 'path';
	}

	return spec.method === 'GET' ? 'query' : 'body';
}

function isRequired(spec: OperationSpec, param: ParamSpec): boolean {
	return param.required === true || paramTarget(spec, param) === 'path';
}

function defaultFor(param: ParamSpec): string | number | boolean {
	if (param.default !== undefined) {
		return param.default;
	}

	switch (param.kind) {
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'options':
			return param.options?.[0]?.value ?? '';
		default:
			return '';
	}
}

function baseProperty(spec: OperationSpec, param: ParamSpec, name: string): INodeProperties {
	const common = {
		displayName: param.displayName ?? titleCase(param.name),
		name,
		default: defaultFor(param) as never,
		...(param.description ? { description: param.description } : {}),
	};

	switch (param.kind) {
		case 'number':
			return { ...common, type: 'number' };
		case 'boolean':
			return { ...common, type: 'boolean' };
		case 'dateTime':
			return { ...common, type: 'dateTime' };
		case 'json':
			return { ...common, type: 'json', default: (param.default as string | undefined) ?? '{}' };
		case 'options':
			return {
				...common,
				type: 'options',
				options: (param.options ?? []).map((option) => ({ name: option.name, value: option.value })),
			};
		default:
			return {
				...common,
				type: 'string',
				...(param.secret ? { typeOptions: { password: true } } : {}),
			};
	}
}

function locatorProperty(
	param: ParamSpec,
	name: string,
	show: Record<string, string[]>,
): INodeProperties {
	return {
		displayName: param.displayName ?? titleCase(param.name),
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		...(param.description ? { description: param.description } : {}),
		displayOptions: { show },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: param.locator, searchable: true },
			},
			{ displayName: 'By ID', name: 'id', type: 'string' },
		],
	};
}

/** Properties for one operation: required params, an "Options" collection and "Return All". */
function operationProperties(resource: string, spec: OperationSpec): INodeProperties[] {
	const show = { resource: [resource], operation: [spec.value] };
	const properties: INodeProperties[] = [];
	const optional: INodeProperties[] = [];

	for (const param of spec.params ?? []) {
		const name = propertyName(resource, spec.value, param.name);

		if (isRequired(spec, param)) {
			properties.push(
				param.locator
					? locatorProperty(param, name, show)
					: { ...baseProperty(spec, param, name), required: true, displayOptions: { show } },
			);
		} else {
			optional.push(baseProperty(spec, param, name));
		}
	}

	if (optional.length > 0) {
		properties.push({
			displayName: spec.list ? 'Filters' : 'Options',
			name: propertyName(resource, spec.value, 'options'),
			type: 'collection',
			placeholder: spec.list ? 'Add Filter' : 'Add Option',
			default: {},
			displayOptions: { show },
			options: optional,
		});
	}

	if (spec.list) {
		properties.push({
			displayName: 'Return All',
			name: propertyName(resource, spec.value, 'returnAll'),
			type: 'boolean',
			default: false,
			description: 'Whether to return all results (paged 100 at a time) or only the first 50',
			displayOptions: { show },
		});
	}

	return properties;
}

function operationOptions(spec: OperationSpec[]): INodePropertyOptions[] {
	return spec.map((operation) => ({
		name: operation.name,
		value: operation.value,
		action: operation.action,
		...(operation.description ? { description: operation.description } : {}),
	}));
}

function sortByName<T extends { name: string }>(options: T[]): T[] {
	return [...options].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Add the area resources to the node properties: new entries in the Resource list, extra
 * operations on existing resources, and the parameter properties of every operation.
 */
export function withAreas(properties: INodeProperties[], resources: ResourceSpec[]): INodeProperties[] {
	const result = properties.map((property) => ({ ...property }));
	const resourceProperty = result.find((property) => property.name === 'resource' && property.type === 'options');
	const existingResources = new Set(
		((resourceProperty?.options ?? []) as INodePropertyOptions[]).map((option) => String(option.value)),
	);
	const appended: INodeProperties[] = [];

	for (const resource of resources) {
		if (!existingResources.has(resource.value)) {
			if (resourceProperty) {
				resourceProperty.options = sortByName([
					...((resourceProperty.options ?? []) as INodePropertyOptions[]),
					{ name: resource.name, value: resource.value },
				]);
			}
			existingResources.add(resource.value);

			const defaultOperation = String(
				resource.operations.find((operation) => operation.list)?.value ?? resource.operations[0].value,
			);

			appended.push({
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: defaultOperation,
				noDataExpression: true,
				displayOptions: { show: { resource: [resource.value] } },
				options: sortByName(operationOptions(resource.operations)),
			});
		} else {
			const operationProperty = result.find(
				(property) =>
					property.name === 'operation' &&
					(property.displayOptions?.show?.resource as string[] | undefined)?.includes(resource.value),
			);

			if (operationProperty) {
				operationProperty.options = sortByName([
					...((operationProperty.options ?? []) as INodePropertyOptions[]),
					...operationOptions(resource.operations),
				]);
			}
		}

		for (const operation of resource.operations) {
			appended.push(...operationProperties(resource.value, operation));
		}
	}

	return [...result, ...appended];
}

export function findResource(resources: ResourceSpec[], value: string): ResourceSpec | undefined {
	return resources.find((resource) => resource.value === value);
}

/** The module a resource needs, for the "module is off" check in the node. */
export function moduleMessage(module: ModuleKey): string {
	return `${MODULE_LABELS[module]} is off for this team. /me.modules.${module} is false.`;
}

function readValue(
	context: IExecuteFunctions,
	resource: string,
	spec: OperationSpec,
	param: ParamSpec,
	index: number,
	options: IDataObject,
): unknown {
	const name = propertyName(resource, spec.value, param.name);
	const raw = isRequired(spec, param)
		? context.getNodeParameter(name, index)
		: options[name];

	if (raw === undefined || raw === null) {
		return undefined;
	}

	if (param.locator) {
		return locatorId(raw as never);
	}

	if (param.kind === 'json') {
		if (typeof raw !== 'string') {
			return raw;
		}

		if (raw.trim() === '') {
			return undefined;
		}

		try {
			return JSON.parse(raw);
		} catch {
			throw new NodeOperationError(context.getNode(), `${param.displayName ?? titleCase(param.name)} must be valid JSON.`, {
				itemIndex: index,
			});
		}
	}

	if (!isRequired(spec, param)) {
		if (raw === '' || (param.kind === 'number' && raw === 0)) {
			return undefined;
		}
	}

	return raw;
}

/** Run one area operation against the public API. */
export async function executeArea(
	this: IExecuteFunctions,
	resource: ResourceSpec,
	operation: string,
	index: number,
): Promise<IDataObject | IDataObject[]> {
	const spec = resource.operations.find((candidate) => candidate.value === operation);

	if (!spec) {
		throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}" for ${resource.name}.`, {
			itemIndex: index,
		});
	}

	const options = (this.getNodeParameter(propertyName(resource.value, spec.value, 'options'), index, {}) ?? {}) as IDataObject;
	let path = spec.path;
	const query: IDataObject = {};
	const body: IDataObject = {};

	for (const param of spec.params ?? []) {
		const value = readValue(this, resource.value, spec, param, index, options);

		if (value === undefined) {
			continue;
		}

		const target = paramTarget(spec, param);

		if (target === 'path') {
			path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)));
		} else if (target === 'query') {
			query[param.name] = value as never;
		} else {
			body[param.name] = value as never;
		}
	}

	if (!spec.list) {
		const response = await zentriaApiRequest.call(this, spec.method, path, body, query);

		// Deletes and some actions answer 204 without a body.
		return response !== null && typeof response === 'object' ? response : { ok: true };
	}

	const returnAll = this.getNodeParameter(propertyName(resource.value, spec.value, 'returnAll'), index, false) as boolean;

	if (!returnAll) {
		return collectionItems(await zentriaApiRequest.call(this, 'GET', path, {}, { itemsPerPage: 50, ...query }));
	}

	const perPage = 100;
	const all: IDataObject[] = [];

	for (let page = 1; page <= 100; page++) {
		const items = collectionItems(
			await zentriaApiRequest.call(this, 'GET', path, {}, { ...query, itemsPerPage: perPage, page }),
		);
		all.push(...items);

		if (items.length < perPage) {
			break;
		}
	}

	return all;
}
