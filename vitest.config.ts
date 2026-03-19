import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'integration',
          fileParallelism: false,
          include: [
            'apps/api/src/**/*.test.ts',
            'apps/workers/src/**/*.test.ts',
            'apps/socket/src/**/*.test.ts',
            'packages/redis/src/**/*.test.ts',
            'packages/queue/src/**/*.test.ts' 
          ],
          environment: 'node',
          globalSetup: './packages/test-utils/src/boot-containers.ts',
          setupFiles: ['./packages/test-utils/src/reset-state.ts'],
          provide: {
            databaseUrl: '',
            redisUrl: ''
          },
          testTimeout: 10000, 
        },
      },
      {
        test: {
          name: 'unit',
          include: [
            'packages/zod/src/**/*.test.ts',
            'packages/logger/src/**/*.test.ts'
          ],
          environment: 'node',
        }
      }
    ]
  }
});