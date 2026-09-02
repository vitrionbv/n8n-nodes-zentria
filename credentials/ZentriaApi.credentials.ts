import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ZentriaApi implements ICredentialType {
	name = 'zentriaApi';

	displayName = 'Zentria API';

	documentationUrl = 'https://github.com/vitrionbv/n8n-nodes-zentria';

	icon: Icon = 'file:../nodes/Zentria/zentria.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.zentria.nl',
			placeholder: 'https://app.zentria.nl',
			required: true,
			description: 'Zentria origin without a trailing slash. Do not append /api/public.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Team Personal Access Token from Teams → API keys.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/api/public/me',
			method: 'GET',
		},
	};
}
