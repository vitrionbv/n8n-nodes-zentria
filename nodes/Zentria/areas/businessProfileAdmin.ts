import type { OperationSpec, ParamSpec, ResourceSpec } from './engine';

/**
 * Resources and operations for Business Profile accounts, locations, photos, schedules and settings, plus the extra
 * actions on reviews, replies, changes and posts. The hand-written `businessProfile` resource in Zentria.node.ts gets
 * its extra operations through the same `value`.
 */

const BASE = '/api/public/business-profiles';
const MODULE = 'business_profiles' as const;

const CATEGORY_OPTIONS = [
	'ADDITIONAL',
	'COVER',
	'PROFILE',
	'EXTERIOR',
	'INTERIOR',
	'PRODUCT',
	'AT_WORK',
	'FOOD_AND_DRINK',
	'MENU',
	'COMMON_AREA',
	'ROOMS',
	'TEAMS',
].map((value) => ({ name: value, value }));

const idParam = (displayName: string): ParamSpec => ({
	name: 'id',
	displayName,
	kind: 'number',
	required: true,
});

const num = (name: string, description: string, required = false, displayName?: string): ParamSpec => ({
	name,
	kind: 'number',
	required,
	description,
	...(displayName ? { displayName } : {}),
});

const str = (name: string, description: string, required = false, displayName?: string): ParamSpec => ({
	name,
	kind: 'string',
	required,
	description,
	...(displayName ? { displayName } : {}),
});

const bool = (name: string, description: string, required = false): ParamSpec => ({
	name,
	kind: 'boolean',
	required,
	description,
	default: false,
});

const json = (name: string, description: string, required = false, fallback = '{}'): ParamSpec => ({
	name,
	kind: 'json',
	required,
	description,
	default: fallback,
});

const options = (
	name: string,
	values: Array<string | { name: string; value: string }>,
	description: string,
	required = false,
): ParamSpec => ({
	name,
	kind: 'options',
	required,
	description,
	options: values.map((value) => (typeof value === 'string' ? { name: value, value } : value)),
});

const FREQUENCY = json(
	'frequency',
	'JSON: {"type": "weekly|monthly|custom", "time": "09:30", "days": [1, 3], "day": 15, "everyDays": 10, "startDate": "2026-10-01"}. days for weekly, day for monthly, everyDays for custom.',
	true,
);

const CHANGE_PREFERENCE = options(
	'changePreference',
	[
		{ name: 'Review (a Person Decides)', value: 'review' },
		{ name: 'Always Reject', value: 'always_reject' },
		{ name: 'Notify Only', value: 'notify_only' },
	],
	'What happens with detected changes.',
	true,
);

const POST_FIELDS: ParamSpec[] = [
	options('topicType', ['STANDARD', 'EVENT', 'OFFER'], 'Type of post.', true),
	str('summary', 'Text of the post (at most 1500 characters).', true),
	options(
		'mode',
		[
			{ name: 'Draft', value: 'draft' },
			{ name: 'Schedule', value: 'schedule' },
			{ name: 'Publish Now', value: 'publish_now' },
		],
		'What happens next.',
	),
	{ name: 'scheduledFor', kind: 'dateTime', description: 'Required for mode schedule: future time, Europe/Amsterdam.' },
	str('title', 'Required for EVENT and OFFER (at most 58 characters).'),
	options('language', ['nl', 'en'], 'Language of the post.'),
	options('ctaType', ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'], 'Call to action button.'),
	str('ctaUrl', 'Required for every call to action except CALL.'),
	{ name: 'eventStart', kind: 'dateTime', description: 'Required for EVENT and OFFER.' },
	{ name: 'eventEnd', kind: 'dateTime', description: 'Required for EVENT and OFFER.' },
	json('offer', 'JSON for OFFER posts: {"couponCode": "ZOMER", "redeemUrl": "https://...", "terms": "..."}.'),
	str('mediaPath', 'Path returned by Upload Post Picture.'),
	options('source', ['manual', 'ai'], 'ai records the model and cost of the last generated draft with the same text.'),
];

const SCHEDULE_FIELDS: ParamSpec[] = [
	str('name', 'Name of the schedule.', true),
	json('locationIds', 'JSON array of location ids, for example [12, 13].', true, '[]'),
	FREQUENCY,
	bool('requiresApproval', 'Every run waits for approval before it is published.', true),
	bool('isActive', 'Whether the schedule runs. Default true.'),
];

const POST_SCHEDULE_FIELDS: ParamSpec[] = [
	...SCHEDULE_FIELDS,
	options('source', ['fixed', 'pool', 'ai'], 'Where the text comes from.', true),
	str('fixedText', 'Required for source fixed.'),
	json('pool', 'JSON array of texts for source pool.', false, '[]'),
	str('aiPrompt', 'Required for source ai.'),
	json('aiAngles', 'JSON array of angles the AI rotates through (source ai).', false, '[]'),
	options('tone', ['vriendelijk', 'zakelijk', 'informeel', 'enthousiast'], 'Tone of voice.'),
	options('language', ['nl', 'en'], 'Language.'),
	options('topicType', ['STANDARD', 'EVENT', 'OFFER'], 'Type of post.', true),
	str('title', 'Required for EVENT and OFFER (unless source ai).'),
	json('event', 'JSON for EVENT and OFFER: {"startOffsetDays": 7, "startTime": "10:00", "durationDays": 0, "endTime": "16:00"}.'),
	json('offer', 'JSON for OFFER: {"couponCode": "...", "redeemUrl": "https://...", "terms": "..."}.'),
	options('ctaType', ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'], 'Call to action button.'),
	str('ctaUrl', 'Required for every call to action except CALL.'),
	json('media', 'JSON: {"mode": "none|fixed|random", "paths": ["path from Upload Post Picture"]}.'),
];

const PAGE: ParamSpec[] = [];

const op = (
	value: string,
	name: string,
	action: string,
	method: OperationSpec['method'],
	path: string,
	description: string,
	params: ParamSpec[] = [],
	list = false,
): OperationSpec => ({ value, name, action, method, path, description, params, list });

const businessProfile: ResourceSpec = {
	value: 'businessProfile',
	name: 'Business Profile',
	module: MODULE,
	operations: [
		op('getReview', 'Get Review', 'Get a review', 'GET', `${BASE}/reviews/{id}`, 'Fetch a Google review. Scope: business-profiles:read.', [idParam('Review ID')]),
		op('getReply', 'Get Review Reply', 'Get a review reply', 'GET', `${BASE}/review-replies/{id}`, 'Fetch a reply draft or sent reply. Scope: business-profiles:read.', [idParam('Reply ID')]),
		op('getChange', 'Get Change', 'Get a location change', 'GET', `${BASE}/changes/{id}`, 'Fetch a detected location change. Scope: business-profiles:read.', [idParam('Change ID')]),
		op('getPost', 'Get Post', 'Get a post', 'GET', `${BASE}/posts/{id}`, 'Fetch a post. Scope: business-profiles:read.', [idParam('Post ID')]),
		op('generateReplyDraft', 'Generate Review Reply Draft (AI)', 'Generate a reply draft with AI', 'POST', `${BASE}/reviews/{id}/draft`, 'Let AI write a new reply draft for a review. Older open drafts are superseded. Scope: business-profiles:write.', [
			idParam('Review ID'),
			str('instruction', 'Optional instruction, for example: make it shorter.'),
		]),
		op('createReply', 'Create Review Reply', 'Write a reply to a review', 'POST', `${BASE}/reviews/{id}/replies`, 'Write a reply yourself: send true posts it to Google right away, false saves a draft. Scope: business-profiles:write.', [
			idParam('Review ID'),
			str('body', 'Reply text.', true),
			bool('send', 'Post it to Google now instead of saving a draft.'),
		]),
		op('updateReply', 'Update Review Reply', 'Change the text of a reply draft', 'PATCH', `${BASE}/review-replies/{id}`, 'Change the text of a reply draft; it goes back to waiting for approval. Scope: business-profiles:write.', [
			idParam('Reply ID'),
			str('body', 'New reply text.', true),
		]),
		op('deleteReply', 'Delete Posted Review Reply', 'Delete the reply Zentria posted on Google', 'DELETE', `${BASE}/reviews/{id}/reply`, 'Delete the reply that Zentria posted on Google (not a reply written on Google itself). Scope: business-profiles:write.', [idParam('Review ID')]),
		op('bulkApproveReplies', 'Bulk Approve Review Replies', 'Approve many reply drafts', 'POST', `${BASE}/review-replies/bulk-approve`, 'Approve reply drafts and queue them for sending: give ids (up to 100), or Approve All with a location id. Scope: business-profiles:write.', [
			json('ids', 'JSON array of reply ids.', false, '[]'),
			bool('approveAll', 'Approve all pending drafts of the location below.'),
			num('locationId', 'Location id for Approve All.'),
		]),
		op('generateReplyDrafts', 'Generate Review Reply Drafts (AI)', 'Queue AI drafts for unanswered reviews', 'POST', `${BASE}/reviews/generate-drafts`, 'Queue AI drafts for all unanswered reviews without an open draft (at most 200). Confirm Count must equal the number of affected reviews. Scope: business-profiles:write.', [
			num('confirmCount', 'The number of unanswered reviews without a draft that you expect.', true),
			num('locationId', 'Only reviews of this location.'),
		]),
		op('decideChanges', 'Decide Changes (Bulk)', 'Decide many location changes', 'POST', `${BASE}/changes/bulk`, 'Accept, reject or dismiss up to 200 changes at once; changes that were already handled are skipped. Scope: business-profiles:write.', [
			json('ids', 'JSON array of change ids.', true, '[]'),
			options('decision', ['accept', 'reject', 'dismiss'], 'What to do with the changes.', true),
		]),
		op('rejectAllChanges', 'Reject All Changes of Google Login', 'Reject all open changes of a Google login', 'POST', `${BASE}/changes/reject-all`, 'Reject every open change of one Google login: our values are restored at Google. Scope: business-profiles:write.', [
			num('googleAccountId', 'Id of the Google login (Business Profile Account).', true),
		]),
		op('updatePost', 'Update Post', 'Replace the content of a post', 'PUT', `${BASE}/posts/{id}`, 'Replace the content of a post that can still be edited (draft, waiting for approval, scheduled, failed or expired). Scope: business-profiles:write.', [idParam('Post ID'), ...POST_FIELDS]),
		op('approvePost', 'Approve Post', 'Approve a post', 'POST', `${BASE}/posts/{id}/approve`, 'Approve a draft or a post that waits for approval so it is published at its planned time. Scope: business-profiles:write.', [idParam('Post ID')]),
		op('publishPost', 'Publish Post', 'Publish a post now', 'POST', `${BASE}/posts/{id}/publish`, 'Publish a post now. Scope: business-profiles:write.', [idParam('Post ID')]),
		op('generatePostText', 'Generate Post Text (AI)', 'Generate a post text with AI', 'POST', `${BASE}/posts/generate`, 'Let AI write a post text for a location. Nothing is saved. Scope: business-profiles:write.', [
			num('locationId', 'Location id.', true),
			str('prompt', 'What the post is about.'),
			options('tone', ['vriendelijk', 'zakelijk', 'informeel', 'enthousiast'], 'Tone of voice.'),
			options('language', ['nl', 'en'], 'Language.'),
			num('length', 'Target length in characters (50 to 1500).'),
			options('topicType', ['STANDARD', 'EVENT', 'OFFER'], 'Type of post.'),
			options('ctaType', ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'], 'Call to action.'),
			str('currentSummary', 'An existing text to improve.'),
			str('instruction', 'What to change in the current text.'),
		]),
		op('uploadPostPicture', 'Upload Post Picture', 'Upload a picture for a post', 'POST', `${BASE}/posts/media`, 'Upload a JPG or PNG (base64) for a post. Returns the path to use as Media Path. Scope: business-profiles:write.', [
			str('contentBase64', 'Picture content, base64 encoded (10 MB at most, 250 pixels on the short edge at least).', true),
		]),
	],
};

const businessProfileLocation: ResourceSpec = {
	value: 'businessProfileLocation',
	name: 'Business Profile Location',
	module: MODULE,
	operations: [
		op('update', 'Update', 'Update a location', 'PATCH', `${BASE}/locations/{id}`, 'Update the customer and campaign link, reply profile, business context and review sync of a location. Scope: business-profiles-admin:write.', [
			idParam('Location ID'),
			num('customerId', 'Customer to link.'),
			num('campaignId', 'Campaign of that customer.'),
			num('replyProfileId', 'Reply profile (needs the permission to manage reply settings).'),
			str('context', 'Business context the AI uses for replies and posts.'),
			bool('syncEnabled', 'Turn review sync on. Turning it on starts the first import.'),
		]),
		op('sync', 'Sync', 'Refresh a location', 'POST', `${BASE}/locations/{id}/sync`, 'Queue a refresh of the reviews, posts and changes of a location. Scope: business-profiles-admin:write.', [idParam('Location ID')]),
		op('bulkUpdate', 'Bulk Update', 'Change many locations at once', 'POST', `${BASE}/locations/bulk`, 'Change many locations: enable_sync, disable_sync, link_customer, assign_profile or accept_suggestions. Scope: business-profiles-admin:write.', [
			json('ids', 'JSON array of location ids.', true, '[]'),
			options('action', ['enable_sync', 'disable_sync', 'link_customer', 'assign_profile', 'accept_suggestions'], 'What to do.', true),
			num('customerId', 'Customer for link_customer.'),
			num('replyProfileId', 'Reply profile for assign_profile.'),
		]),
		op('updateStandardProfile', 'Update Standard Profile', 'Change the standard profile of a location', 'PATCH', `${BASE}/locations/{id}/standard-profile`, 'Change how the Google profile should look. Nothing is written to Google. Only the keys in the JSON change. Scope: business-profiles:write.', [
			idParam('Location ID'),
			json(
				'standardProfile',
				'JSON in the shape of standardProfile on a location, for example {"description": "...", "primaryPhone": "+31...", "primaryCategory": {"id": "categories/gcid:plumber"}, "regularHours": {"MONDAY": [{"open": "08:00", "close": "17:00"}]}, "links": {"url_appointment": ["https://..."]}}.',
				true,
			),
		]),
		op('importStandardProfile', 'Import Standard Profile', 'Import the standard profile from Google', 'POST', `${BASE}/locations/{id}/standard-profile/import`, 'Replace the standard profile with what Google shows now. Scope: business-profiles:write.', [idParam('Location ID')]),
		op('getCategories', 'Search Categories', 'Search Google categories', 'GET', `${BASE}/locations/{locationId}/categories`, 'Search the Google business categories (Dutch names). Returns id and name. Scope: business-profiles:read.', [
			{ name: 'locationId', displayName: 'Location ID', kind: 'number', required: true },
			str('q', 'Part of the category name.'),
		], true),
		op('getServiceTypes', 'List Service Types', 'List service types of categories', 'GET', `${BASE}/locations/{locationId}/service-types`, 'List the structured service types of up to 10 categories. Scope: business-profiles:read.', [
			{ name: 'locationId', displayName: 'Location ID', kind: 'number', required: true },
			str('categories', 'Category ids, comma separated (categories/gcid:plumber,categories/gcid:roofing_contractor).', true),
		], true),
		op('getPlaces', 'Search Places', 'Search regions for the service area', 'GET', `${BASE}/locations/{locationId}/places`, 'Search regions for the service area. Returns placeId and placeName. Needs the permission to manage location changes. Scope: business-profiles:read.', [
			{ name: 'locationId', displayName: 'Location ID', kind: 'number', required: true },
			str('q', 'Part of the place name.'),
		], true),
		op('setReplySettings', 'Set Reply Settings', 'Set reply settings of a location', 'PUT', `${BASE}/locations/{id}/reply-settings`, 'Set the reply profile, context and own reply settings. Only the keys you send change. Scope: business-profiles-admin:write.', [
			idParam('Location ID'),
			num('replyProfileId', 'Reply profile.'),
			str('context', 'Business context.'),
			json('replySettings', 'JSON with the own reply settings of the location (see Reply Profile).'),
		]),
		op('giveAutoReplyConsent', 'Give Auto-Reply Consent', 'Record consent for automatic replies', 'POST', `${BASE}/locations/{id}/auto-reply-consent`, 'Record the consent of the business owner for automatic replies. Scope: business-profiles-admin:write.', [
			idParam('Location ID'),
			str('name', 'Name of the person who agreed.', true),
			bool('consent', 'The owner agreed. Must be on.', true),
			{ name: 'givenAt', kind: 'dateTime', description: 'Date of the consent (not in the future). Default today.' },
			str('note', 'Optional note.'),
		]),
		op('revokeAutoReplyConsent', 'Revoke Auto-Reply Consent', 'Withdraw consent for automatic replies', 'DELETE', `${BASE}/locations/{id}/auto-reply-consent`, 'Withdraw the consent; scheduled automatic replies go back to draft. Scope: business-profiles-admin:write.', [idParam('Location ID')]),
		op('syncPerformance', 'Sync Performance', 'Refresh the results of a location', 'POST', `${BASE}/locations/{id}/performance/sync`, 'Queue a fresh import of the results and search terms (once per five minutes). Scope: business-profiles-admin:write.', [idParam('Location ID')]),
		op('refreshPosts', 'Refresh Posts', 'Refresh the posts of a location', 'POST', `${BASE}/locations/{id}/posts/refresh`, 'Queue a refresh of the posts of a location from Google. Scope: business-profiles:write.', [idParam('Location ID')]),
		op('setChangePreference', 'Set Change Preference', 'Set the change preference of a location', 'PUT', `${BASE}/locations/{id}/change-preference`, 'What happens with detected changes of this location. Scope: business-profiles:write.', [idParam('Location ID'), CHANGE_PREFERENCE]),
	],
};

const businessProfileAccount: ResourceSpec = {
	value: 'businessProfileAccount',
	name: 'Business Profile Account',
	module: MODULE,
	operations: [
		op('getAll', 'Get Many', 'List connected Google logins', 'GET', `${BASE}/accounts`, 'List the connected Google logins with their connection status. Connecting or reconnecting is only possible in the app. Scope: business-profiles:read.', PAGE, true),
		op('get', 'Get', 'Get a connected Google login', 'GET', `${BASE}/accounts/{id}`, 'Fetch a connected Google login and its status. Scope: business-profiles:read.', [idParam('Account ID')]),
		op('update', 'Update', 'Change the nickname of a Google login', 'PATCH', `${BASE}/accounts/{id}`, 'Change the nickname. Scope: business-profiles-admin:write.', [idParam('Account ID'), str('nickname', 'New nickname (leave empty to clear it).', true)]),
		op('sync', 'Sync', 'Refresh a Google login', 'POST', `${BASE}/accounts/{id}/sync`, 'Queue a refresh of the listings of a Google login. Scope: business-profiles-admin:write.', [idParam('Account ID')]),
		op('disconnect', 'Disconnect', 'Disconnect a Google login', 'DELETE', `${BASE}/accounts/{id}`, 'Disconnect a Google login: the grant is revoked and listings that no other login can reach are archived. Scope: business-profiles-admin:write.', [idParam('Account ID')]),
		op('setChangePreference', 'Set Change Preference', 'Set the change preference of a Google login', 'PUT', `${BASE}/accounts/{id}/change-preference`, 'What happens with detected changes of the listings of this login. Scope: business-profiles:write.', [idParam('Account ID'), CHANGE_PREFERENCE]),
	],
};

const businessProfileReplyProfile: ResourceSpec = {
	value: 'businessProfileReplyProfile',
	name: 'Business Profile Reply Profile',
	module: MODULE,
	operations: [
		op('getAll', 'Get Many', 'List reply profiles', 'GET', `${BASE}/reply-profiles`, 'List the reply profiles of the team. Scope: business-profiles:read.', PAGE, true),
		op('get', 'Get', 'Get a reply profile', 'GET', `${BASE}/reply-profiles/{id}`, 'Fetch a reply profile with its settings. Scope: business-profiles:read.', [idParam('Reply Profile ID')]),
		op('create', 'Create', 'Create a reply profile', 'POST', `${BASE}/reply-profiles`, 'Create a reply profile. The first profile becomes the team default. Scope: business-profiles-admin:write.', [
			str('name', 'Name of the profile.', true),
			json('settings', 'JSON with the full settings: mode (off, templates, ai), ratings, noText, tone, toneNotes, formality, language, length, useFirstName, signOff, dos, donts, bannedWords, examples, negativeInstruction, model, autoSendDelayMinutes, businessHoursOnly, templates. Copy it from an existing profile.', true),
			bool('isDefault', 'Make it the default of the team.'),
		]),
		op('update', 'Update', 'Replace a reply profile', 'PUT', `${BASE}/reply-profiles/{id}`, 'Replace the name and settings of a reply profile. Send the full settings. Scope: business-profiles-admin:write.', [
			idParam('Reply Profile ID'),
			str('name', 'Name of the profile.', true),
			json('settings', 'JSON with the full settings (see Create).', true),
			bool('isDefault', 'Make it the default of the team.'),
		]),
		op('delete', 'Delete', 'Delete a reply profile', 'DELETE', `${BASE}/reply-profiles/{id}`, 'Delete a reply profile. Locations that used it follow the team default again. Scope: business-profiles-admin:write.', [idParam('Reply Profile ID')]),
		op('assign', 'Assign to Locations', 'Assign a reply profile to locations', 'POST', `${BASE}/reply-profiles/assign`, 'Assign a reply profile (or none) to many locations. Scope: business-profiles-admin:write.', [
			json('locationIds', 'JSON array of location ids.', true, '[]'),
			num('replyProfileId', 'Reply profile id. Leave 0 to remove the profile.'),
		]),
		op('sandbox', 'Test Settings', 'Try reply settings on a review', 'POST', `${BASE}/reply-profiles/sandbox`, 'Try reply settings on a sample or stored review. Nothing is saved or sent; uses AI budget. Scope: business-profiles-admin:write.', [
			num('locationId', 'Location id.', true),
			num('reviewId', 'A stored review to answer.'),
			num('stars', 'Star rating of a sample review (1 to 5).'),
			str('reviewText', 'Text of the sample review.'),
			str('reviewerName', 'Name of the sample reviewer.'),
			json('settings', 'JSON with unsaved settings to try.'),
			num('profileId', 'A stored reply profile to try.'),
			str('instruction', 'Optional instruction.'),
		]),
	],
};

const businessProfilePostSchedule: ResourceSpec = {
	value: 'businessProfilePostSchedule',
	name: 'Business Profile Post Schedule',
	module: MODULE,
	operations: [
		op('getAll', 'Get Many', 'List post schedules', 'GET', `${BASE}/post-schedules`, 'List the recurring post schedules. Scope: business-profiles:read.', PAGE, true),
		op('get', 'Get', 'Get a post schedule', 'GET', `${BASE}/post-schedules/{id}`, 'Fetch a post schedule. Scope: business-profiles:read.', [idParam('Schedule ID')]),
		op('create', 'Create', 'Create a post schedule', 'POST', `${BASE}/post-schedules`, 'Create a recurring post schedule: one post per location on every run. Scope: business-profiles:write.', POST_SCHEDULE_FIELDS),
		op('update', 'Update', 'Replace a post schedule', 'PUT', `${BASE}/post-schedules/{id}`, 'Replace a post schedule (send the full schedule). Pausing it or switching on approval sends its still-future posts back to draft. Scope: business-profiles:write.', [idParam('Schedule ID'), ...POST_SCHEDULE_FIELDS]),
		op('delete', 'Delete', 'Delete a post schedule', 'DELETE', `${BASE}/post-schedules/{id}`, 'Delete a post schedule and its still-future scheduled posts. Scope: business-profiles:write.', [idParam('Schedule ID')]),
		op('toggle', 'Pause or Resume', 'Pause or resume a post schedule', 'POST', `${BASE}/post-schedules/{id}/toggle`, 'Pause an active schedule or resume a paused one. Scope: business-profiles:write.', [idParam('Schedule ID')]),
		op('testRun', 'Test Run', 'Create draft posts from a schedule', 'POST', `${BASE}/post-schedules/{id}/test-run`, 'Create draft posts without publishing and without moving the schedule forward. Scope: business-profiles:write.', [idParam('Schedule ID')]),
		op('previewOccurrences', 'Preview Occurrences', 'Preview the next runs of a frequency', 'POST', `${BASE}/post-schedules/preview`, 'Show the next occurrences of an unsaved frequency. Scope: business-profiles:write.', [FREQUENCY, num('count', 'Number of occurrences (1 to 12). Default 6.')]),
	],
};

const businessProfilePhoto: ResourceSpec = {
	value: 'businessProfilePhoto',
	name: 'Business Profile Photo',
	module: MODULE,
	operations: [
		op('getAll', 'Get Many', 'List photos', 'GET', `${BASE}/photos`, 'List photos on Business Profile listings, newest first. Scope: business-profiles:read.', [
			num('location_id', 'Only photos of this location.', false, 'Location ID'),
			options('status', ['pending_approval', 'scheduled', 'publishing', 'published', 'failed', 'removed'], 'Only photos with this status.'),
		], true),
		op('get', 'Get', 'Get a photo', 'GET', `${BASE}/photos/{id}`, 'Fetch a photo. Scope: business-profiles:read.', [idParam('Photo ID')]),
		op('place', 'Place from Library', 'Place library photos on locations', 'POST', `${BASE}/photos/place`, 'Place library photos on listings, now or at a planned moment. Scope: business-profiles:write.', [
			json('libraryItemIds', 'JSON array of library photo ids.', true, '[]'),
			json('locationIds', 'JSON array of location ids.', true, '[]'),
			options('mode', ['now', 'schedule'], 'Place now or at a planned time.', true),
			{ name: 'scheduledFor', kind: 'dateTime', description: 'Required for schedule: future time, Europe/Amsterdam.' },
			options('category', CATEGORY_OPTIONS, 'Photo category. Default the category of the library photo.'),
		]),
		op('approve', 'Approve', 'Approve a photo', 'POST', `${BASE}/photos/{id}/approve`, 'Approve a photo that waits for approval. Scope: business-profiles:write.', [idParam('Photo ID')]),
		op('publish', 'Publish Now', 'Publish a photo now', 'POST', `${BASE}/photos/{id}/publish`, 'Publish a photo now. Scope: business-profiles:write.', [idParam('Photo ID')]),
		op('repost', 'Repost', 'Place a removed photo again', 'POST', `${BASE}/photos/{id}/repost`, 'Place a photo again that Google removed. Returns the new photo. Scope: business-profiles:write.', [idParam('Photo ID')]),
		op('delete', 'Delete', 'Remove a photo', 'DELETE', `${BASE}/photos/{id}`, 'Remove a photo; a live photo is removed at Google first. Scope: business-profiles:write.', [idParam('Photo ID')]),
		op('acknowledgeRemoved', 'Acknowledge Removed', 'Mark removed photos as seen', 'POST', `${BASE}/photos/acknowledge-removed`, 'Mark the photos that Google removed as seen. Scope: business-profiles:write.'),
	],
};

const businessProfileLibraryItem: ResourceSpec = {
	value: 'businessProfileLibraryItem',
	name: 'Business Profile Library Photo',
	module: MODULE,
	operations: [
		op('getAll', 'Get Many', 'List library photos', 'GET', `${BASE}/photo-library`, 'List the photos of the photo library, newest first. Scope: business-profiles:read.', [str('collection', 'Only photos of this collection.')], true),
		op('upload', 'Upload', 'Add photos to the library', 'POST', `${BASE}/photo-library`, 'Add photos from base64 content (JPG or PNG, 10 KB to 5 MB, up to 20 files). Scope: business-profiles:write.', [
			options('category', CATEGORY_OPTIONS, 'Google photo category.', true),
			json('files', 'JSON array: [{"filename": "dak.jpg", "contentBase64": "..."}].', true, '[]'),
			str('collection', 'Optional collection name.'),
		]),
		op('delete', 'Delete', 'Delete a library photo', 'DELETE', `${BASE}/photo-library/{id}`, 'Delete a photo from the library. Not possible while it is planned or being published. Scope: business-profiles:write.', [idParam('Library Photo ID')]),
	],
};

const photoScheduleFields: ParamSpec[] = [...SCHEDULE_FIELDS, str('collection', 'Only use library photos of this collection.')];

const businessProfilePhotoSchedule: ResourceSpec = {
	value: 'businessProfilePhotoSchedule',
	name: 'Business Profile Photo Schedule',
	module: MODULE,
	operations: [
		op('getAll', 'Get Many', 'List photo schedules', 'GET', `${BASE}/photo-schedules`, 'List the recurring photo schedules. Scope: business-profiles:read.', PAGE, true),
		op('get', 'Get', 'Get a photo schedule', 'GET', `${BASE}/photo-schedules/{id}`, 'Fetch a photo schedule. Scope: business-profiles:read.', [idParam('Schedule ID')]),
		op('create', 'Create', 'Create a photo schedule', 'POST', `${BASE}/photo-schedules`, 'Create a recurring photo schedule: one library photo per location on every run. Scope: business-profiles:write.', photoScheduleFields),
		op('update', 'Update', 'Replace a photo schedule', 'PUT', `${BASE}/photo-schedules/{id}`, 'Replace a photo schedule (send the full schedule). Scope: business-profiles:write.', [idParam('Schedule ID'), ...photoScheduleFields]),
		op('delete', 'Delete', 'Delete a photo schedule', 'DELETE', `${BASE}/photo-schedules/{id}`, 'Delete a photo schedule and its still-future photos. Scope: business-profiles:write.', [idParam('Schedule ID')]),
		op('toggle', 'Pause or Resume', 'Pause or resume a photo schedule', 'POST', `${BASE}/photo-schedules/{id}/toggle`, 'Pause an active schedule or resume a paused one. Scope: business-profiles:write.', [idParam('Schedule ID')]),
	],
};

export const businessProfileAdminResources: ResourceSpec[] = [
	businessProfile,
	businessProfileLocation,
	businessProfileAccount,
	businessProfileReplyProfile,
	businessProfilePostSchedule,
	businessProfilePhoto,
	businessProfileLibraryItem,
	businessProfilePhotoSchedule,
];
