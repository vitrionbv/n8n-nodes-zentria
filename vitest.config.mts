// .mts on purpose: the n8n lint checks every .ts file and rejects imports such as vitest.

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.test.mts'],
	},
});
