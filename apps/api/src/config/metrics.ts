import { getDbMetrics } from '@matcha/prisma';
import client from 'prom-client';

export const apiRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: apiRegistry,
  prefix: 'api_node_', 
});

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const userRegistrationCounter = new client.Counter({
  name: 'api_user_registrations_total',
  help: 'Total number of successful user registrations',
});

export const userOnboardingFailureCounter = new client.Counter({
  name: 'api_user_onboarding_failures_total',
  help: 'Total number of failed onboarding attempts',
  labelNames: ['reason']
});

export const dbConnectionsActive = new client.Gauge({
  name: 'prisma_pool_connections_busy', 
  help: 'The number of currently busy pool connections.',
  collect() {
    const metrics = getDbMetrics();
    this.set(metrics.active)
  }
});

export const dbQueriesWaiting = new client.Gauge({
  name: 'prisma_client_queries_wait',
  help: 'The number of queries currently waiting for a connection.',
  collect() {
    const metrics = getDbMetrics();
    this.set(metrics.waiting)
  }
});

apiRegistry.registerMetric(httpRequestDurationMicroseconds);
apiRegistry.registerMetric(userRegistrationCounter);
apiRegistry.registerMetric(userOnboardingFailureCounter);
apiRegistry.registerMetric(dbConnectionsActive);
apiRegistry.registerMetric(dbQueriesWaiting);