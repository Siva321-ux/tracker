import { Platform } from 'react-native';

const DEFAULT_API_HOST = 'https://tracker-91ku.onrender.com';

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string = DEFAULT_API_HOST;

  private constructor() {}

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async post(endpoint: string, body: any, token?: string | null): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      return data;
    } catch (err: any) {
      console.warn(`[ApiClient] POST ${endpoint} failed: ${err.message}`);
      throw err;
    }
  }

  public async get(endpoint: string, token?: string | null): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      return data;
    } catch (err: any) {
      console.warn(`[ApiClient] GET ${endpoint} failed: ${err.message}`);
      throw err;
    }
  }
}
