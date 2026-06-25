import client from 'prom-client';

export const socketRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: socketRegistry,
  prefix: 'socket_node_',
});

export const concurrentConnectionsGauge = new client.Gauge({
  name: 'ws_concurrent_connections',
  help: 'Total number of active, open WebSocket sessions',
});

export const connectionTerminationCounter = new client.Counter({
  name: 'ws_connection_terminations_total',
  help: 'Total number of client disconnects',
  labelNames: ['reason'], 
});

export const eventProcessingCounter = new client.Counter({
  name: 'ws_events_processed_total',
  help: 'Total number of inbound and outbound events handled',
  labelNames: ['direction', 'event_type'], 
});

export const broadcastDurationHistogram = new client.Histogram({
  name: 'ws_broadcast_duration_seconds',
  help: 'Time taken to dispatch an event to the client over the socket',
  labelNames: ['event_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25], 
});

socketRegistry.registerMetric(concurrentConnectionsGauge);
socketRegistry.registerMetric(connectionTerminationCounter);
socketRegistry.registerMetric(eventProcessingCounter);
socketRegistry.registerMetric(broadcastDurationHistogram);