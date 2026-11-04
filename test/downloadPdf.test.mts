import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { fileNameFromDisposition } from '../nodes/Zentria/GenericFunctions';
import { invoiceResources } from '../nodes/Zentria/areas/invoices';
import { BinaryOutput, executeArea, withAreas } from '../nodes/Zentria/areas/engine';

const invoice = invoiceResources.find((resource) => resource.value === 'invoice')!;
const pdf = Buffer.from('%PDF-1.4\nfake\n%%EOF');

/** Fake n8n context that answers the PDF endpoint and records the request. */
function fakeContext(parameters: IDataObject, headers: Record<string, string>): {
	context: IExecuteFunctions;
	requests: IHttpRequestOptions[];
} {
	const requests: IHttpRequestOptions[] = [];
	const context = {
		getCredentials: async () => ({ baseUrl: 'https://zentria.test/' }),
		getNode: () => ({ name: 'Zentria' }),
		getNodeParameter: (name: string, _index: number, fallback?: unknown) => parameters[name] ?? fallback,
		helpers: {
			httpRequestWithAuthentication: async (_credential: string, options: IHttpRequestOptions) => {
				requests.push(options);

				return { body: pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength), headers };
			},
			prepareBinaryData: async (data: Buffer, fileName: string, mimeType: string) => ({
				data: data.toString('base64'),
				fileName,
				mimeType,
			}),
		},
	} as unknown as IExecuteFunctions;

	return { context, requests };
}

describe('invoice Download PDF', () => {
	it('downloads the PDF as binary data in the chosen field, named after the Mollie number', async () => {
		const { context, requests } = fakeContext(
			{ invoiceDownloadPdfId: 42, invoiceDownloadPdfBinaryPropertyName: 'invoicePdf' },
			{ 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="I-2026-00042.pdf"' },
		);

		const result = await executeArea.call(context, invoice, 'downloadPdf', 0);

		expect(result).toBeInstanceOf(BinaryOutput);
		const output = result as BinaryOutput;

		expect(requests).toHaveLength(1);
		expect(requests[0].url).toBe('https://zentria.test/api/public/invoices/42/pdf');
		expect(requests[0].encoding).toBe('arraybuffer');
		expect(requests[0].returnFullResponse).toBe(true);
		expect(requests[0].headers).toMatchObject({ Accept: 'application/pdf' });

		expect(output.json).toMatchObject({
			id: 42,
			fileName: 'I-2026-00042.pdf',
			mimeType: 'application/pdf',
			fileSize: pdf.length,
			binaryPropertyName: 'invoicePdf',
		});
		expect(Object.keys(output.binary)).toEqual(['invoicePdf']);
		expect(output.binary.invoicePdf).toMatchObject({ fileName: 'I-2026-00042.pdf', mimeType: 'application/pdf' });
		expect(Buffer.from(output.binary.invoicePdf.data, 'base64').equals(pdf)).toBe(true);
	});

	it('falls back to the data field and a file name with the invoice id', async () => {
		const { context } = fakeContext({ invoiceDownloadPdfId: 7 }, {});

		const output = (await executeArea.call(context, invoice, 'downloadPdf', 0)) as BinaryOutput;

		expect(Object.keys(output.binary)).toEqual(['data']);
		expect(output.json).toMatchObject({ fileName: 'invoice-7.pdf', mimeType: 'application/pdf' });
	});

	it('adds an output field setting to the operation', () => {
		const properties = withAreas(
			[{ displayName: 'Resource', name: 'resource', type: 'options', default: '', options: [] }],
			invoiceResources,
		);
		const field = properties.find((property) => property.name === 'invoiceDownloadPdfBinaryPropertyName');

		expect(field).toMatchObject({
			default: 'data',
			displayOptions: { show: { resource: ['invoice'], operation: ['downloadPdf'] } },
		});
	});
});

describe('fileNameFromDisposition', () => {
	it('reads plain and encoded file names', () => {
		expect(fileNameFromDisposition('attachment; filename="I-1.pdf"')).toBe('I-1.pdf');
		expect(fileNameFromDisposition('attachment; filename=I-2.pdf')).toBe('I-2.pdf');
		expect(fileNameFromDisposition("attachment; filename*=UTF-8''I-3%20a.pdf")).toBe('I-3 a.pdf');
		expect(fileNameFromDisposition(undefined)).toBeUndefined();
	});
});
