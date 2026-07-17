/**
 * Queue / job contract (BullMQ) — interface only.
 */
export interface QueueJob<T = unknown> {
  name: string;
  data: T;
  opts?: {
    delay?: number;
    attempts?: number;
    jobId?: string;
    priority?: number;
  };
}

export interface QueueService {
  enqueue<T>(queueName: string, job: QueueJob<T>): Promise<{ id: string }>;
  drain(queueName: string): Promise<void>;
}
