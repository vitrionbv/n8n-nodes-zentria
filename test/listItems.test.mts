import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { LIST_MAX_PAGES, LIST_PAGE_SIZE, listItems } from '../nodes/Zentria/GenericFunctions';

type Request = { url: string; qs: IDataObject };

/** Fake n8n context that serves `total` items from a paged API and records every request. */
function fakeApi(total: number): { context: IExecuteFunctions; requests: Request[] } {
	const requests: Request[] = [];
	const context = {
		getCredentials: async () => ({ baseUrl: 'https://zentria.test' }),
		getNode: () => ({ name: 'Zentria' }),
		helpers: {
			httpRequestWithAuthentication: async (_credential: string, options: { url: string; qs: IDataObject }) => {
				requests.push({ url: options.url, qs: options.qs });
				const page = Number(options.qs.page);
				const perPage = Number(options.qs.itemsPerPage);
				const start = (page - 1) * perPage;
				const member = Array.from({ length: Math.max(0, Math.min(perPage, total - start)) }, (_v, i) => ({
					id: start + i + 1,
				}));

				return { member, totalItems: total };
			},
		},
	} as unknown as IExecuteFunctions;

	return { context, requests };
}

const ids = (items: IDataObject[]): number[] => items.map((item) => Number(item.id));
const range = (count: number): number[] => Array.from({ length: count }, (_v, i) => i + 1);

describe('listItems', () => {
	it('returns a single short page with one request', async () => {
		const { context, requests } = fakeApi(30);

		const items = await listItems.call(context, '/api/public/customers', {}, { returnAll: true, limit: 50 });

		expect(ids(items)).toEqual(range(30));
		expect(requests).toHaveLength(1);
		expect(requests[0].qs).toMatchObject({ page: 1, itemsPerPage: LIST_PAGE_SIZE });
	});

	it('asks for one more page when a page is exactly full', async () => {
		const { context, requests } = fakeApi(100);

		const items = await listItems.call(context, '/api/public/customers', {}, { returnAll: true, limit: 50 });

		expect(ids(items)).toEqual(range(100));
		expect(requests.map((request) => request.qs.page)).toEqual([1, 2]);
	});

	it('returns every item across pages with Return All', async () => {
		const { context, requests } = fakeApi(250);

		const items = await listItems.call(
			context,
			'/api/public/customers',
			{ status: 'active', itemsPerPage: 50 },
			{ returnAll: true, limit: 50 },
		);

		expect(ids(items)).toEqual(range(250));
		expect(requests).toHaveLength(3);
		expect(requests[2].qs).toMatchObject({ status: 'active', page: 3, itemsPerPage: 100 });
	});

	it('stops at the limit when Return All is off', async () => {
		const small = fakeApi(250);
		expect(ids(await listItems.call(small.context, '/x', {}, { returnAll: false, limit: 50 }))).toEqual(range(50));
		expect(small.requests).toHaveLength(1);
		expect(small.requests[0].qs).toMatchObject({ page: 1, itemsPerPage: 50 });

		const large = fakeApi(250);
		expect(ids(await listItems.call(large.context, '/x', {}, { returnAll: false, limit: 150 }))).toEqual(range(150));
		expect(large.requests.map((request) => request.qs.page)).toEqual([1, 2]);
	});

	it('returns exactly the cap when the list ends there', async () => {
		const { context, requests } = fakeApi(LIST_MAX_PAGES * LIST_PAGE_SIZE);

		const items = await listItems.call(context, '/x', {}, { returnAll: true, limit: 50 });

		expect(items).toHaveLength(LIST_MAX_PAGES * LIST_PAGE_SIZE);
		expect(requests.at(-1)?.qs).toMatchObject({ itemsPerPage: 1, page: LIST_MAX_PAGES * LIST_PAGE_SIZE + 1 });
	});

	it('throws instead of silently cutting off a longer list', async () => {
		const { context } = fakeApi(LIST_MAX_PAGES * LIST_PAGE_SIZE + 1);

		await expect(listItems.call(context, '/api/public/customers', {}, { returnAll: true, limit: 50 })).rejects.toThrow(
			/more than 10000 items/,
		);
	});
});
