# 05. Каркас фронтенда: React 18 + TypeScript + Vite

> Цикл «FastAPI + React». Предыдущая: [04. JSON API](04-json-api-contract.md) · Следующая: [06. Связка и деплой](06-integration-deploy.md)

## 1. Стек и почему он

| Выбор | Почему |
|---|---|
| **Vite** | Мгновенный dev-сервер с HMR; сборка на esbuild/rollup — секунды вместо минут webpack'а. Стандарт де-факто для новых SPA. |
| **TypeScript** | Типы контракта API на клиенте; половина багов «undefined в JSON» ловится на компиляции. |
| **React 18** | Функциональные компоненты + хуки; экосистема и найм. |
| **Tailwind CSS v4** | Стили рядом с разметкой, тёмные темы через CSS-переменные, нет каскадных конфликтов. |
| **react-router-dom 6** | Клиентский роутинг без перезагрузок; `NavLink`, `useParams`, вложенные layout'ы. |

Ничего из этого не нужно в рантайме сервера: после `npm run build` остаётся
статика. Node — инструмент сборки, не зависимость продукта.

## 2. Структура каталога

```
frontend/
├── index.html              # точка входа; сюда Vite вкомпилирует бандлы
├── vite.config.ts          # dev-порт, прокси /api и /static → :8000
├── package.json
└── src/
    ├── api/                # СЛОЙ ДОСТУПА К API — весь fetch живёт только здесь
    │   ├── client.ts       # базовый клиент: credentials, CSRF, разбор ошибок
    │   ├── blog.ts         # статьи и разделы
    │   ├── auth.ts         # register / login / logout / current_user
    │   └── artManage.ts    # управление реестром
    ├── components/         # переиспользуемые UI-блоки (Header, ArticleCard, ...)
    ├── context/            # AuthContext — глобальное состояние пользователя
    ├── hooks/              # useTheme и пр.
    ├── pages/              # страницы-маршруты (HomePage, ArticlePage, LoginPage...)
    └── types.ts            # TS-зеркало pydantic-схем бэкенда
```

Ключевое правило: **компоненты не вызывают `fetch` напрямую.** Всё общение с
сервером — через слой `src/api/`. Это даёт одну точку для авторизации, CSRF,
обработки ошибок и подмены в тестах.

## 3. Типы — зеркало контракта

`src/types.ts` держится синхронным с pydantic-схемами (см. [статью 04](04-json-api-contract.md)):

```typescript
export interface Article {
  id: number;
  title: string;
  author: string;
  lang: string;
  section: string;
  content?: string;      // готовый HTML — только в ответе /articles/{id}
}

export interface User {
  nickname: string;
  email?: string;
  avatar_url?: string;
}
```

Компилятор не даст обратиться к `article.content` там, где вы запросили только
список (в списке поля `content` нет) — ровно та же дисциплина, что
`OrderResp` vs `OrderRespWithProducts` на бэкенде.

## 4. Базовый API-клиент

`src/api/client.ts` — реальный код проекта (упрощён до сути):

```typescript
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, { credentials: 'include', ...init });
  return res;
}

export async function getJson<T = unknown>(path: string): Promise<T> {
  const res = await request(path);
  const data = await parseResponse(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
```

Что здесь принципиально:

- **`credentials: 'include'`** — cookie-сессия ходит с каждым запросом; без этого
  авторизация «работает, но слетает».
- **Единый `ApiError`** со статусом и телом — компоненты решают, что показывать
  (401 → форма входа, 422 → ошибки полей, 500 → toast).
- **Дженерик `getJson<T>`** — тип ответа задаётся на месте вызова, а не `any`.

Сверху — доменные функции (`src/api/blog.ts`):

```typescript
// GET /api/blog/articles — список записей; section фильтрует по разделу.
export function getArticles(section?: string): Promise<{ articles: Article[] }> {
  const query = section ? `?section=${encodeURIComponent(section)}` : '';
  return getJson<{ articles: Article[] }>(`/api/blog/articles${query}`);
}
```

## 5. Глобальное состояние: контекст авторизации

Для большинства SPA **не нужен** Redux/Zustand/MobX: достаточно одного контекста
для «кто я» и локального состояния страниц. Реальный `src/context/AuthContext.tsx`:

```tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
      setUser(null);          // неавторизован или сеть недоступна
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

Паттерн: **`loading` обязателен.** Пока `GET /current_user` не ответил, UI не
должен решать «показать форму входа или контент» — иначе при каждом F5 мигает
редирект на логин. Защита страниц — компонент-обёртка `RequireAuth` поверх
маршрута, а 403 от API — страховка (никогда не доверяйте только UI).

## 6. Страницы и роутинг

```tsx
<BrowserRouter>
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/section/:name" element={<HomePage />} />
      <Route path="/art/:author/:artId" element={<ArticlePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/art_manage" element={<ArtManagePage />} />
      </Route>
    </Route>
  </Routes>
</BrowserRouter>
```

Страница читает параметр и запрашивает данные:

```tsx
const { name } = useParams<{ name: string }>();
const [articles, setArticles] = useState<Article[]>([]);

useEffect(() => {
  getArticles(name).then(data => setArticles(data.articles));
}, [name]);
```

**Связка с бэкендом:** любой прямой заход на `/art/Max/7` (F5, ссылка из письма)
попадёт на сервер, где catch-all отдаст `index.html` — и React Router сам
развернёт нужную страницу. Без catch-all на бэкенде это была бы 404. Подробно —
в [статье 06](06-integration-deploy.md).

## 7. Темы и стили: CSS-переменные + data-атрибут

Тёмная/светлая тема делается без перезагрузки и без CSS-in-JS:

- на `<html>` ставится `data-theme="dark"`;
- в CSS все цвета — через `var(--bg)`, `var(--text)`, значения переопределены в
  `[data-theme="dark"]`;
- выбор пользователя — в `localStorage['theme']` (защита от «вспышки» светлой
  темы — маленький инлайн-скрипт в `index.html` до загрузки бандла).

## 8. Чекпоинт самопроверки

- [ ] Весь `fetch` — в `src/api/`, компоненты вызывают доменные функции.
- [ ] `credentials: 'include'` в базовом клиенте.
- [ ] `types.ts` синхронен с pydantic-схемами; никаких `any` в слое API.
- [ ] `AuthContext` с фазой `loading`; защита маршрутов через `RequireAuth`.
- [ ] Ошибки API обрабатываются по статусу (401/403/422/500), а не молча.
- [ ] После правок — контрольный `npm run build` (см. граблю из [статьи 01](01-architecture-overview.md)).
