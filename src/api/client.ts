import { useAuthStore } from "@/store/authStore";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export interface ApiMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
  meta?: ApiMeta;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function attemptRefresh(): Promise<string | null> {
  const { refresh, setTokens, logout } = useAuthStore.getState();
  if (!refresh) {
    logout();
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const body = await res.json();
    const newAccess: string | undefined = body.data?.access;
    if (newAccess) {
      setTokens(newAccess, refresh);
      return newAccess;
    }
    logout();
    return null;
  } catch {
    logout();
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { access } = useAuthStore.getState();
  const { skipAuth, ...rest } = options;
  const isFormData = rest.body instanceof FormData;

  const buildHeaders = (token?: string | null): Record<string, string> => ({
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers as Record<string, string> | undefined ?? {}),
  });

  let res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: buildHeaders(access),
  });

  if (res.status === 401 && !skipAuth) {
    let newToken: string | null;

    if (isRefreshing) {
      newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
    } else {
      isRefreshing = true;
      newToken = await attemptRefresh();
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];
    }

    if (newToken) {
      res = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: buildHeaders(newToken),
      });
    } else {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError("Session expired", 401);
    }
  }

  const json = await res.json().catch(() => ({
    success: false,
    message: "Invalid server response",
  }));

  if (!res.ok) {
    throw new ApiError(
      json.message ?? "Request failed",
      res.status,
      json.errors,
    );
  }

  // Paginated list endpoints (via StandardResultsPagination) return
  // { success, data: [...], meta: {...} }.
  // Single-object endpoints (ModelViewSet retrieve/create/update) return
  // the raw serialized object with no envelope.
  // Normalise both so every caller can safely read res.data.
  if ("success" in json) {
    return json as ApiResponse<T>;
  }
  return { success: true, data: json as T, message: "" } as ApiResponse<T>;
}

export function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") {
      q.set(k, String(v));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
