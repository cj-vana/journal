export interface ExperimentResult {
  injector: string;
  timestamp: Date;
  passed: boolean;
  duration: number; // ms
  error?: string;
  details?: string;
}

export interface ChaosConfig {
  targetUrl: string;
  debugKey: string;
  intervalMs: number;
  probability: number;
  enabledInjectors: string[];
}

export interface Injector {
  name: string;
  description: string;
  run: (client: ApiClient) => Promise<ExperimentResult>;
}

export interface ApiClient {
  get(path: string): Promise<{ status: number; data: any }>;
  post(path: string, body?: any): Promise<{ status: number; data: any }>;
  put(path: string, body?: any): Promise<{ status: number; data: any }>;
  delete(path: string): Promise<{ status: number; data: any }>;
  upload(
    path: string,
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ status: number; data: any }>;
}
