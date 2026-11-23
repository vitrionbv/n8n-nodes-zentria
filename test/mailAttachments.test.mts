import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { executeArea } from '../nodes/Zentria/areas/engine';
import { mailResources } from '../nodes/Zentria/areas/mail';

const mail = mailResources.find((resource) => resource.value === 'mail')!;

const files: Record<string, { buffer: Buffer; fileName?: string; mimeType: string; fileExtension?: string }> = {
	data: { buffer: Buffer.from('%PDF-1.4 offerte'), fileName: 'Offerte 12.pdf', mimeType: 'application/pdf' },
	notes: { buffer: Buffer.from('Hallo'), mimeType: 'text/plain', fileExtension: 'txt' },
};

/** Fake n8n context with binary data on the input item that records the request. */
function fakeContext(parameters: IDataObject): { context: IExecuteFunctions; requests: IHttpRequestOptions[] } {
	const requests: IHttpRequestOptions[] = [];
	const context = {
		getCredentials: async () => ({ baseUrl: 'https://zentria.test/' }),
		getNode: () => ({ name: 'Zentria' }),
		getNodeParameter: (name: string, _index: number, fallback?: unknown) => parameters[name] ?? fallback,
		helpers: {
			assertBinaryData: (_index: number, name: string) => {
				const file = files[name];

				if (!file) {
					throw new Error(`No binary data in ${name}`);
				}

				return { data: '', mimeType: file.mimeType, fileName: file.fileName, fileExtension: file.fileExtension };
			},
			getBinaryDataBuffer: async (_index: number, name: string) => files[name].buffer,
			httpRequestWithAuthentication: async (_credential: string, options: IHttpRequestOptions) => {
				requests.push(options);

				return { id: 1, status: 'queued' };
			},
		},
	} as unknown as IExecuteFunctions;

	return { context, requests };
}

describe('mail Send with attachments', () => {
	it('sends the chosen binary fields as base64 attachments', async () => {
		const { context, requests } = fakeContext({
			mailSendTo: 'jan@voorbeeld.test',
			mailSendSubject: 'Je offerte',
			mailSendText: 'Zie bijlage',
			mailSendOptions: { mailSendAttachments: 'data, notes' },
		});

		await executeArea.call(context, mail, 'send', 0);

		expect(requests).toHaveLength(1);
		expect((requests[0].body as IDataObject).attachments).toEqual([
			{ filename: 'Offerte 12.pdf', contentBase64: Buffer.from('%PDF-1.4 offerte').toString('base64'), contentType: 'application/pdf' },
			{ filename: 'notes.txt', contentBase64: Buffer.from('Hallo').toString('base64'), contentType: 'text/plain' },
		]);
	});

	it('sends no attachments field when none is chosen', async () => {
		const { context, requests } = fakeContext({ mailSendTo: 'jan@voorbeeld.test', mailSendSubject: 'Hoi', mailSendText: 'Hoi' });

		await executeArea.call(context, mail, 'send', 0);

		expect(requests[0].body as IDataObject).not.toHaveProperty('attachments');
	});

	it('fails when a chosen binary field is missing', async () => {
		const { context } = fakeContext({
			mailSendTo: 'jan@voorbeeld.test',
			mailSendSubject: 'Hoi',
			mailSendText: 'Hoi',
			mailSendOptions: { mailSendAttachments: 'missing' },
		});

		await expect(executeArea.call(context, mail, 'send', 0)).rejects.toThrow('No binary data in missing');
	});
});
