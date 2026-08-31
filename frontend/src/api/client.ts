// Базовый API-клиент для /api/blog.
// Все запросы идут с cookie-сессией (credentials: 'include').
// State-changing запросы требуют CSRF-токена:
//   - JSON (postJson) -> заголовок X-CSRF-Token;
//   - multipart (postMultipart) -> поле формы csrf_token
//     (как требует backend для POST /api/blog/account).

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, { credentials: 'include', ...init });
  return res;
}

async function ensureOk(res: Response): Promise<unknown> {
  const data = await parseResponse(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export async function getJson<T = unknown>(path: string): Promise<T> {
  const res = await request(path);
  return (await ensureOk(res)) as T;
}

// GET /api/blog/csrf — создаёт/возвращает csrf_token из сессии.
export async function getCsrfToken(): Promise<string> {
  const data = await getJson<{ csrf_token: string }>('/api/blog/csrf');
  return data.csrf_token;
}

// POST с JSON-телом; CSRF-токен кладём в заголовок X-CSRF-Token.
export async function postJson<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const token = await getCsrfToken();
  const res = await request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    body: JSON.stringify(body),
  });
  return (await ensureOk(res)) as T;
}

// POST с multipart-формой; CSRF-токен передаётся полем csrf_token.
export async function postMultipart<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  if (!formData.has('csrf_token')) {
    formData.set('csrf_token', await getCsrfToken());
  }
  const res = await request(path, {
    method: 'POST',
    // Content-Type не ставим руками: браузер сам подставит boundary.
    body: formData,
  });
  return (await ensureOk(res)) as T;
}