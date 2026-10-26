const TOKEN_KEY = 'onetv_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !(init.body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 401) {
    tokenStore.clear();
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }
  if (!res.ok) {
    let msg = res.statusText;
    let body: unknown;
    try {
      body = await res.json();
      const detail = (body as { detail?: unknown }).detail;
      if (detail !== undefined) msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg, body);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** XHR orqali yuklash — progress (0..1) bilan. */
export function upload<T>(path: string, file: File, onProgress?: (p: number) => void, method = 'PUT'): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api${path}`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let body: unknown;
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as T);
      const detail = (body as { detail?: unknown } | undefined)?.detail;
      reject(new ApiError(xhr.status, typeof detail === 'string' ? detail : xhr.statusText || 'Yuklashda xato', body));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Tarmoq xatosi'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}
