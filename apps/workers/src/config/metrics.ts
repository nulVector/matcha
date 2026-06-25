import client from 'prom-client';

export const workerRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: workerRegistry,
  prefix: 'worker_node_',
});

export const queueLengthGauge = new client.Gauge({
  name: 'worker_bullmq_queue_length',
  help: 'Total number of jobs in the queue broken down by state',
  labelNames: ['queue_name', 'status'],
});

export const jobDurationHistogram = new client.Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Time taken to execute a background job',
  labelNames: ['queue_name', 'job_name'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
});

export const dlqIncidentsCounter = new client.Counter({
  name: 'worker_dlq_incidents_total',
  help: 'Total number of jobs moved to permanent failure state',
  labelNames: ['queue_name', 'job_name', 'error_reason'],
});

export const workerMatchChunkDurationHistogram = new client.Histogram({
  name: 'worker_match_chunk_duration_seconds',
  help: 'Time taken to execute an entire chunk of users in the matchmaking loop',
  buckets: [0.5, 1, 2.5, 5, 10, 15, 30], 
});

export const vectorSearchDurationHistogram = new client.Histogram({
  name: 'worker_vector_search_duration_seconds',
  help: 'Time taken to execute the vector search loop',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export const vectorMatchesLockedCounter = new client.Counter({
  name: 'worker_vector_matches_locked_total',
  help: 'Total number of matchmaking combinations successfully locked',
});

export const dbBufferCommittedRowsCounter = new client.Counter({
  name: 'worker_db_buffer_committed_rows_total',
  help: 'Total number of memory-buffered rows flushed to PostgreSQL',
  labelNames: ['type']
});

workerRegistry.registerMetric(queueLengthGauge);
workerRegistry.registerMetric(jobDurationHistogram);
workerRegistry.registerMetric(dlqIncidentsCounter);
workerRegistry.registerMetric(workerMatchChunkDurationHistogram);
workerRegistry.registerMetric(vectorSearchDurationHistogram);
workerRegistry.registerMetric(vectorMatchesLockedCounter);
workerRegistry.registerMetric(dbBufferCommittedRowsCounter);