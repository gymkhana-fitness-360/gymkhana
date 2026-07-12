import type { ApiError, ApiResponse } from "./api-types";

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const body = data as { error?: ApiError } | null;
    return {
      success: false,
      error:
        body?.error && typeof body.error === "object" && "code" in body.error
          ? body.error
          : {
              code: "UNKNOWN",
              message:
                typeof body === "object" &&
                body !== null &&
                "message" in body &&
                typeof (body as { message: unknown }).message === "string"
                  ? (body as { message: string }).message
                  : "Request failed",
            },
    };
  }

  return { success: true, data: data as T };
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  post: <T>(url: string, body: unknown) =>
    apiRequest<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    apiRequest<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: "DELETE" }),
};
