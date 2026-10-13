import type { OperationSpec, ParamSpec, ResourceSpec } from './engine';

/**
 * Sales: deletes, nested notes and activities, pipelines and stages, forms and settings.
 * The hand-written deal, person, organization, form, pipeline and activity resources get extra
 * operations here (same `value`). Operations that the hand-written resources already have
 * (create, update, complete) keep their short forms. The "All Fields" variants below accept every
 * field the Zentria web app accepts.
 */

const ACTIVITY_TYPES = [
	{ name: 'Call', value: 'call' },
	{ name: 'Deadline', value: 'deadline' },
	{ name: 'Email', value: 'email' },
	{ name: 'Lunch', value: 'lunch' },
	{ name: 'Meeting', value: 'meeting' },
	{ name: 'Task', value: 'task' },
];

function locatorParam(name: string, displayName: string, locator: string, description?: string): ParamSpec {
	return { name, displayName, kind: 'string', required: true, locator, ...(description ? { description } : {}) };
}

const dealId = locatorParam('id', 'Deal', 'searchDeals');
const personId = locatorParam('id', 'Person', 'searchPeople');
const organizationId = locatorParam('id', 'Organization', 'searchOrganizations');
const pipelineId = locatorParam('id', 'Pipeline', 'searchPipelines');
const formId = locatorParam('id', 'Form', 'searchForms');

const idParam = (displayName: string): ParamSpec => ({ name: 'id', displayName, kind: 'number', required: true });

const noteParams: ParamSpec[] = [
	{ name: 'body', displayName: 'Text', kind: 'string', required: true, description: 'The note text' },
	{ name: 'pinned', kind: 'boolean', description: 'Whether to pin the note to the top' },
];

const activityParams: ParamSpec[] = [
	{ name: 'type', displayName: 'Type', kind: 'options', required: true, options: ACTIVITY_TYPES, default: 'task' },
	{ name: 'title', kind: 'string', required: true },
	{ name: 'body', displayName: 'Description', kind: 'string' },
	{ name: 'dueAt', displayName: 'Due At', kind: 'dateTime' },
	{ name: 'assigneeUserId', displayName: 'Assignee User ID', kind: 'number', description: 'Team member who owns the activity' },
];

const dealFieldParams: ParamSpec[] = [
	{ name: 'value', kind: 'number', description: 'Deal value' },
	{ name: 'expectedCloseDate', displayName: 'Expected Close Date', kind: 'dateTime' },
	{ name: 'ownerUserId', displayName: 'Owner User ID', kind: 'number', description: 'Team member who owns the deal' },
	{ name: 'stageId', displayName: 'Stage ID', kind: 'number' },
	{ name: 'personId', displayName: 'Person ID', kind: 'number' },
	{ name: 'organizationId', displayName: 'Organization ID', kind: 'number' },
	{ name: 'lostReason', displayName: 'Lost Reason', kind: 'string' },
];

const formSettingParams: ParamSpec[] = [
	{
		name: 'allowedOrigins',
		displayName: 'Allowed Origins',
		kind: 'json',
		default: '[]',
		description: 'JSON list of http(s) origins that may submit the form. Wildcards are not allowed',
	},
	{ name: 'calEventTypeId', displayName: 'Cal.com Event Type', kind: 'string', description: 'Cal.com event type path or URL' },
	{ name: 'isActive', displayName: 'Active', kind: 'boolean', default: true },
];

const formContentParams: ParamSpec[] = [
	{ name: 'canvasHtml', displayName: 'Canvas HTML', kind: 'string' },
	{ name: 'canvasCss', displayName: 'Canvas CSS', kind: 'string' },
	{ name: 'canvasJs', displayName: 'Canvas JS', kind: 'string' },
	{ name: 'leadContract', displayName: 'Lead Contract', kind: 'json', default: '{}', description: 'JSON lead contract: required, optional, fields and map' },
];

const op = (spec: OperationSpec): OperationSpec => spec;

const dealOperations: OperationSpec[] = [
	op({
		value: 'createDetailed',
		name: 'Create (All Fields)',
		action: 'Create a deal with all fields',
		description: 'Create a deal and optionally a new person and company in the same call',
		method: 'POST',
		path: '/api/public/sales/deals',
		params: [
			{ name: 'title', kind: 'string', required: true },
			locatorParam('pipelineId', 'Pipeline', 'searchPipelines'),
			...dealFieldParams,
			{ name: 'person', displayName: 'New Person', kind: 'json', default: '{}', description: 'JSON {"name": "...", "email": "...", "phone": "..."}. An existing person with the same email or phone is reused' },
			{ name: 'organization', displayName: 'New Organization', kind: 'json', default: '{}', description: 'JSON {"name": "..."}. An existing company with the same name is reused' },
		],
	}),
	op({
		value: 'updateDetailed',
		name: 'Update (All Fields)',
		action: 'Update a deal with all fields',
		method: 'PUT',
		path: '/api/public/sales/deals/{id}',
		params: [dealId, { name: 'title', kind: 'string' }, ...dealFieldParams],
	}),
	op({
		value: 'moveStageWithReason',
		name: 'Move Stage With Lost Reason',
		action: 'Move a deal to another stage with a lost reason',
		method: 'PATCH',
		path: '/api/public/sales/deals/{id}/stage',
		params: [dealId, { name: 'stageId', displayName: 'Stage ID', kind: 'number', required: true }, { name: 'lostReason', displayName: 'Lost Reason', kind: 'string' }],
	}),
	op({
		value: 'addNote',
		name: 'Add Note',
		action: 'Add a note to a deal',
		method: 'POST',
		path: '/api/public/sales/deals/{id}/notes',
		params: [dealId, ...noteParams],
	}),
	op({
		value: 'addActivity',
		name: 'Add Activity',
		action: 'Add an activity to a deal',
		method: 'POST',
		path: '/api/public/sales/deals/{id}/activities',
		params: [dealId, ...activityParams],
	}),
	op({
		value: 'delete',
		name: 'Delete',
		action: 'Delete a deal',
		description: 'Delete the deal with its activities and notes. Needs the sales:delete scope.',
		method: 'DELETE',
		path: '/api/public/sales/deals/{id}',
		params: [dealId],
	}),
];

const personOperations: OperationSpec[] = [
	op({
		value: 'createDetailed',
		name: 'Create (All Fields)',
		action: 'Create a person with all fields',
		method: 'POST',
		path: '/api/public/sales/people',
		params: [
			{ name: 'name', kind: 'string', required: true },
			{ name: 'email', kind: 'string' },
			{ name: 'phone', kind: 'string' },
			{ name: 'organizationId', displayName: 'Organization ID', kind: 'number' },
		],
	}),
	op({
		value: 'updateDetailed',
		name: 'Update (All Fields)',
		action: 'Update a person with all fields',
		method: 'PUT',
		path: '/api/public/sales/people/{id}',
		params: [
			personId,
			{ name: 'name', kind: 'string', required: true },
			{ name: 'email', kind: 'string' },
			{ name: 'phone', kind: 'string' },
			{ name: 'organizationId', displayName: 'Organization ID', kind: 'number' },
		],
	}),
	op({
		value: 'addNote',
		name: 'Add Note',
		action: 'Add a note to a person',
		method: 'POST',
		path: '/api/public/sales/people/{id}/notes',
		params: [personId, ...noteParams],
	}),
	op({
		value: 'addActivity',
		name: 'Add Activity',
		action: 'Add an activity for a person',
		method: 'POST',
		path: '/api/public/sales/people/{id}/activities',
		params: [personId, { name: 'dealId', displayName: 'Deal ID', kind: 'number', required: true }, ...activityParams],
	}),
	op({
		value: 'delete',
		name: 'Delete',
		action: 'Delete a person',
		description: 'Refused while the person still has deals. Needs the sales:delete scope.',
		method: 'DELETE',
		path: '/api/public/sales/people/{id}',
		params: [personId],
	}),
];

const organizationOperations: OperationSpec[] = [
	op({
		value: 'addNote',
		name: 'Add Note',
		action: 'Add a note to an organization',
		method: 'POST',
		path: '/api/public/sales/organizations/{id}/notes',
		params: [organizationId, ...noteParams],
	}),
	op({
		value: 'delete',
		name: 'Delete',
		action: 'Delete an organization',
		description: 'Refused while the organization still has people or deals. Needs the sales:delete scope.',
		method: 'DELETE',
		path: '/api/public/sales/organizations/{id}',
		params: [organizationId],
	}),
];

const activityOperations: OperationSpec[] = [
	op({
		value: 'createDetailed',
		name: 'Create (All Fields)',
		action: 'Create an activity with all fields',
		method: 'POST',
		path: '/api/public/sales/activities',
		params: [
			locatorParam('dealId', 'Deal', 'searchDeals'),
			...activityParams,
			{ name: 'personId', displayName: 'Person ID', kind: 'number' },
		],
	}),
	op({
		value: 'update',
		name: 'Update',
		action: 'Update an activity',
		method: 'PATCH',
		path: '/api/public/sales/activities/{id}',
		params: [
			idParam('Activity ID'),
			{ name: 'type', kind: 'options', options: ACTIVITY_TYPES, default: 'task' },
			{ name: 'title', kind: 'string' },
			{ name: 'body', displayName: 'Description', kind: 'string' },
			{ name: 'dueAt', displayName: 'Due At', kind: 'dateTime' },
			{ name: 'assigneeUserId', displayName: 'Assignee User ID', kind: 'number' },
		],
	}),
	op({
		value: 'cancel',
		name: 'Cancel',
		action: 'Cancel an activity',
		method: 'POST',
		path: '/api/public/sales/activities/{id}/cancel',
		params: [idParam('Activity ID'), { name: 'cancelledReason', displayName: 'Reason', kind: 'string' }],
	}),
	op({
		value: 'delete',
		name: 'Delete',
		action: 'Delete an activity',
		description: 'Log entries cannot be deleted. Needs the sales:delete scope.',
		method: 'DELETE',
		path: '/api/public/sales/activities/{id}',
		params: [idParam('Activity ID')],
	}),
];

const pipelineOperations: OperationSpec[] = [
	op({
		value: 'create',
		name: 'Create',
		action: 'Create a pipeline',
		description: 'Create a pipeline with the default stages',
		method: 'POST',
		path: '/api/public/sales/pipelines',
		params: [{ name: 'name', kind: 'string', required: true }],
	}),
	op({
		value: 'update',
		name: 'Update',
		action: 'Update a pipeline',
		method: 'PUT',
		path: '/api/public/sales/pipelines/{id}',
		params: [
			pipelineId,
			{ name: 'name', kind: 'string' },
			{ name: 'isDefault', displayName: 'Make Default', kind: 'boolean', description: 'Whether to make this the default pipeline' },
			{ name: 'rotAfterDays', displayName: 'Rot After Days', kind: 'number', description: 'Days without activity before a deal shows as rotting' },
			{
				name: 'visibility',
				kind: 'options',
				options: [
					{ name: 'Team', value: 'team' },
					{ name: 'Restricted', value: 'restricted' },
				],
				default: 'team',
			},
			{ name: 'memberIds', displayName: 'Member IDs', kind: 'json', default: '[]', description: 'JSON list of user ids who may open a restricted pipeline' },
		],
	}),
	op({
		value: 'delete',
		name: 'Delete',
		action: 'Delete a pipeline',
		description: 'Refused for the default or last pipeline and while it has deals or forms. Needs the sales-admin:write scope.',
		method: 'DELETE',
		path: '/api/public/sales/pipelines/{id}',
		params: [pipelineId],
	}),
	op({
		value: 'archive',
		name: 'Archive',
		action: 'Archive a pipeline',
		method: 'POST',
		path: '/api/public/sales/pipelines/{id}/archive',
		params: [pipelineId],
	}),
	op({
		value: 'restore',
		name: 'Restore',
		action: 'Restore an archived pipeline',
		method: 'POST',
		path: '/api/public/sales/pipelines/{id}/restore',
		params: [pipelineId],
	}),
	op({
		value: 'addStage',
		name: 'Add Stage',
		action: 'Add a stage to a pipeline',
		method: 'POST',
		path: '/api/public/sales/pipelines/{id}/stages',
		params: [
			pipelineId,
			{ name: 'name', kind: 'string', required: true },
			{ name: 'isWon', displayName: 'Won Stage', kind: 'boolean' },
			{ name: 'isLost', displayName: 'Lost Stage', kind: 'boolean' },
		],
	}),
	op({
		value: 'updateStages',
		name: 'Update Stages',
		action: 'Rename and reorder the stages of a pipeline',
		description: 'Send every stage in the new order',
		method: 'PUT',
		path: '/api/public/sales/pipelines/{id}/stages',
		params: [
			pipelineId,
			{
				name: 'stages',
				kind: 'json',
				required: true,
				default: '[{"id": 1, "name": "New"}]',
				description: 'JSON list of {"id", "name", "isWon", "isLost"} in the new order',
			},
		],
	}),
	op({
		value: 'deleteStage',
		name: 'Delete Stage',
		action: 'Delete a stage from a pipeline',
		description: 'Refused while the stage has deals or is the last stage',
		method: 'DELETE',
		path: '/api/public/sales/pipelines/{id}/stages/{stageId}',
		params: [pipelineId, { name: 'stageId', displayName: 'Stage ID', kind: 'number', required: true }],
	}),
];

const formOperations: OperationSpec[] = [
	op({
		value: 'create',
		name: 'Create',
		action: 'Create a form',
		method: 'POST',
		path: '/api/public/sales/forms',
		params: [
			{ name: 'name', kind: 'string', required: true },
			locatorParam('pipelineId', 'Pipeline', 'searchPipelines'),
			...formSettingParams,
			...formContentParams,
		],
	}),
	op({
		value: 'update',
		name: 'Update',
		action: 'Update a form',
		description: 'Change the live form directly',
		method: 'PUT',
		path: '/api/public/sales/forms/{id}',
		params: [formId, { name: 'name', kind: 'string' }, { name: 'pipelineId', displayName: 'Pipeline ID', kind: 'number' }, ...formSettingParams, ...formContentParams],
	}),
	op({
		value: 'delete',
		name: 'Delete',
		action: 'Delete a form',
		description: 'Refused while the form has deals or submissions. Needs the sales-admin:write scope.',
		method: 'DELETE',
		path: '/api/public/sales/forms/{id}',
		params: [formId],
	}),
	op({
		value: 'rotateToken',
		name: 'Rotate Token',
		action: 'Give a form a new public token',
		description: 'The old embed URL stops working at once',
		method: 'POST',
		path: '/api/public/sales/forms/{id}/rotate-token',
		params: [formId],
	}),
	op({
		value: 'publish',
		name: 'Publish Draft',
		action: 'Publish the editor draft of a form',
		method: 'POST',
		path: '/api/public/sales/forms/{id}/publish',
		params: [
			formId,
			{ name: 'name', kind: 'string', required: true },
			{ name: 'pipelineId', displayName: 'Pipeline ID', kind: 'number' },
			...formSettingParams,
		],
	}),
	op({
		value: 'getDraft',
		name: 'Get Draft',
		action: 'Get the editor draft of a form',
		method: 'GET',
		path: '/api/public/sales/forms/{id}/draft',
		params: [formId],
	}),
	op({
		value: 'updateDraft',
		name: 'Update Draft',
		action: 'Update the editor draft of a form',
		description: 'Nothing goes live until you publish the draft',
		method: 'PUT',
		path: '/api/public/sales/forms/{id}/draft',
		params: [
			formId,
			...formContentParams,
			{ name: 'meta', kind: 'json', default: '{}', description: 'JSON {"name", "isActive", "pipelineId", "allowedOrigins", "calEventTypeId"}' },
		],
	}),
	op({
		value: 'previewSubmit',
		name: 'Preview Submit',
		action: 'Dry run a sample payload through a form',
		description: 'Shows what the lead contract would map. Nothing is created.',
		method: 'POST',
		path: '/api/public/sales/forms/{id}/preview-submit',
		params: [formId, { name: 'payload', kind: 'json', required: true, default: '{"email": "name@example.com"}' }],
	}),
];

export const salesAdminResources: ResourceSpec[] = [
	{ value: 'deal', name: 'Deal', module: 'sales_cms', operations: dealOperations },
	{ value: 'person', name: 'Person', module: 'sales_cms', operations: personOperations },
	{ value: 'organization', name: 'Organization', module: 'sales_cms', operations: organizationOperations },
	{ value: 'activity', name: 'Activity', module: 'sales_cms', operations: activityOperations },
	{ value: 'pipeline', name: 'Pipeline', module: 'sales_cms', operations: pipelineOperations },
	{ value: 'form', name: 'Form', module: 'sales_cms', operations: formOperations },
	{
		value: 'note',
		name: 'Note',
		module: 'sales_cms',
		operations: [
			op({
				value: 'getAll',
				name: 'Get Many',
				action: 'List notes',
				method: 'GET',
				path: '/api/public/sales/notes',
				list: true,
				params: [
					{ name: 'dealId', displayName: 'Deal ID', kind: 'number', description: 'Only notes on this deal' },
					{ name: 'personId', displayName: 'Person ID', kind: 'number', description: 'Only notes on this person' },
					{ name: 'organizationId', displayName: 'Organization ID', kind: 'number', description: 'Only notes on this organization' },
				],
			}),
			op({ value: 'get', name: 'Get', action: 'Get a note', method: 'GET', path: '/api/public/sales/notes/{id}', params: [idParam('Note ID')] }),
			op({
				value: 'update',
				name: 'Update',
				action: 'Update a note',
				method: 'PATCH',
				path: '/api/public/sales/notes/{id}',
				params: [idParam('Note ID'), { name: 'body', displayName: 'Text', kind: 'string' }, { name: 'pinned', kind: 'boolean' }],
			}),
			op({
				value: 'delete',
				name: 'Delete',
				action: 'Delete a note',
				description: 'Needs the sales:delete scope',
				method: 'DELETE',
				path: '/api/public/sales/notes/{id}',
				params: [idParam('Note ID')],
			}),
		],
	},
	{
		value: 'salesSettings',
		name: 'Sales Settings',
		module: 'sales_cms',
		operations: [
			op({
				value: 'get',
				name: 'Get',
				action: 'Get the sales settings',
				description: 'Cal.com and Pipedrive connection status and the pipelines. No secrets.',
				method: 'GET',
				path: '/api/public/sales/settings',
			}),
			op({
				value: 'update',
				name: 'Update',
				action: 'Connect or disconnect Cal.com',
				description: 'Save a Cal.com API key (write-only) or remove the connection',
				method: 'PUT',
				path: '/api/public/sales/settings',
				params: [
					{ name: 'calApiKey', displayName: 'Cal.com API Key', kind: 'string', secret: true, description: 'Never returned by the API' },
					{ name: 'clearCalApiKey', displayName: 'Remove Cal.com Connection', kind: 'boolean' },
				],
			}),
		],
	},
];
