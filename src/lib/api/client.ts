import { ApiError } from "./errors.ts";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export interface ApiClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? "";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.defaultHeaders ?? {}),
    };
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const isAbsolute = path.startsWith("http://") || path.startsWith("https://");
    const base = isAbsolute ? undefined : "http://localhost";
    const url = new URL(isAbsolute ? path : `${this.baseUrl}${path}`, base);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = new Headers({
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string>),
    });

    // Automatically attach auth token from localStorage if available in browser environment
    if (typeof window !== "undefined") {
      try {
        const storedAuth = localStorage.getItem("talenttrack_auth");
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          if (parsed.token) {
            headers.set("Authorization", `Bearer ${parsed.token}`);
          }
        }
      } catch {
        // Ignore JSON parse errors from invalid localStorage
      }
    }

    let body: BodyInit | undefined = undefined;
    if (options.body !== undefined) {
      if (typeof FormData !== "undefined" && options.body instanceof FormData) {
        body = options.body;
        headers.delete("Content-Type");
      } else if (typeof options.body === "string") {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    const { params: _params, body: _body, ...fetchInit } = options;

    const response = await fetch(url, {
      ...fetchInit,
      headers,
      ...(body !== undefined ? { body } : {}),
    });

    let data: unknown = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const parsedError = data as {
        error?: { message?: string; code?: string; details?: unknown } | string;
        message?: string;
      } | null;
      const errorMessage =
        (typeof parsedError?.error === "object" ? parsedError.error.message : parsedError?.error) ||
        parsedError?.message ||
        `Request failed with status ${response.status}`;
      const errorCode =
        (typeof parsedError?.error === "object" ? parsedError.error.code : undefined) ||
        (response.status === 401 ? "UNAUTHORIZED" : "HTTP_ERROR");
      const details =
        typeof parsedError?.error === "object" ? parsedError.error.details : undefined;

      throw new ApiError(errorMessage, response.status, errorCode, details, data);
    }

    // Automatically unwrap standard response wrappers if shaped as { success: true, data: T }
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      (data as { success: boolean }).success === true &&
      "data" in data
    ) {
      return (data as { data: T }).data;
    }

    return data as T;
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  public put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
