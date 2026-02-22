import { ApiClient } from './types';

export class HttpApiClient implements ApiClient {
  private baseUrl: string;
  private debugKey: string;

  constructor(baseUrl: string, debugKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.debugKey = debugKey;
  }

  private headers(): Record<string, string> {
    return {
      'X-Debug-Key': this.debugKey,
      'Content-Type': 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<{ status: number; data: any }> {
    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    try {
      const res = await fetch(url, opts);
      let data: any;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      return { status: res.status, data };
    } catch (err: any) {
      return { status: 0, data: { error: err.message } };
    }
  }

  async get(path: string): Promise<{ status: number; data: any }> {
    return this.request('GET', path);
  }

  async post(path: string, body?: any): Promise<{ status: number; data: any }> {
    return this.request('POST', path, body);
  }

  async put(path: string, body?: any): Promise<{ status: number; data: any }> {
    return this.request('PUT', path, body);
  }

  async delete(path: string): Promise<{ status: number; data: any }> {
    return this.request('DELETE', path);
  }

  async upload(
    path: string,
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ status: number; data: any }> {
    const url = `${this.baseUrl}${path}`;
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filename);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Debug-Key': this.debugKey,
        },
        body: formData,
      });
      let data: any;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      return { status: res.status, data };
    } catch (err: any) {
      return { status: 0, data: { error: err.message } };
    }
  }
}
