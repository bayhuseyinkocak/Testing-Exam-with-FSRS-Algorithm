export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  // Sadece gövde varsa JSON Content-Type gönder (gövdesiz POST'lar 400 almasın)
  if (options.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch('/api' + path, {
    credentials: 'include',
    ...options,
    headers,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? 'Bir hata oluştu';
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch('/api' + path, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? 'Bir hata oluştu';
    throw new ApiError(message, res.status);
  }

  return data as T;
}
