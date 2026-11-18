const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const errorResponse = data as ApiErrorResponse | null;

    throw new ApiError(
      response.status,
      errorResponse?.error?.code ?? "UNKNOWN_ERROR",
      errorResponse?.error?.message ??
        `Request failed with status ${response.status}`,
      errorResponse?.error?.details,
    );
  }

  return data as T;
}
