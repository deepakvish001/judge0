async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body: BodyInit | undefined = init?.body as BodyInit | undefined;
  if (init?.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, {
    ...init,
    headers,
    body,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    let err: any = { error: res.statusText };
    try {
      err = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, err.error ?? 'request failed', err);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: any,
  ) {
    super(message);
  }
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, json?: unknown) =>
    request<T>(p, { method: 'POST', json }),
  put: <T>(p: string, json?: unknown) =>
    request<T>(p, { method: 'PUT', json }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};
