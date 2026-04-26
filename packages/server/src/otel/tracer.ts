import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace, type Tracer } from '@opentelemetry/api';

let sdk: NodeSDK | null = null;

export function initOtel(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
  });
  sdk.start();
}

export function getTracer(): Tracer {
  return trace.getTracer('claude-operator', '0.1.0');
}

export async function shutdownOtel(): Promise<void> {
  if (sdk) await sdk.shutdown();
}
