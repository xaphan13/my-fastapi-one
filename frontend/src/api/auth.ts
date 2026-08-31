// Функции API авторизации и аккаунта (/api/blog): register, login,
// logout, getAccount, updateAccount (multipart). Форматы ответов —
// по контракту API (REQUIREMENTS.md, таблица «Backend — Frontend»).

import { getJson, postJson, postMultipart, ApiError } from './client';
import type { User } from '../types';

// GET /api/blog/current_user — текущий пользователь или null.
export function getCurrentUser(): Promise<{ user: User | null }> {
  return getJson<{ user: User | null }>('/api/blog/current_user');
}

// Тип message/category возвращают все мутации /api/blog.
export interface MessageResp {
  message: string;
  category: string;
}

// Формат ошибок валидации 422: { errors: { поле: [тексты] } }.
export interface ApiErrorWithErrors extends ApiError {
  errors?: Record<string, string[]>;
}

// Вытаскивает errors из 422-ответа backend (глобальный обработчик
// RequestValidationError отдаёт { errors: ... }).
export function extractErrors(err: unknown): Record<string, string[]> {
  if (err instanceof ApiError) {
    const data = err.data as { errors?: Record<string, string[]> } | null;
    if (data && data.errors) return data.errors;
  }
  return {};
}

// POST /api/blog/register — регистрация нового пользователя.
export function register(body: {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}): Promise<MessageResp> {
  return postJson<MessageResp>('/api/blog/register', body);
}

// POST /api/blog/login — вход; в ответе приходит обновлённый user.
export function login(body: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<MessageResp & { user: User }> {
  return postJson<MessageResp & { user: User }>('/api/blog/login', body);
}

// POST /api/blog/logout — выход (cookie-сессия сбрасывается на бэкенде).
export function logout(): Promise<MessageResp> {
  return postJson<MessageResp>('/api/blog/logout', {});
}

// GET /api/blog/account — данные аккаунта (403 для анонима).
export function getAccount(): Promise<{ user: User }> {
  return getJson<{ user: User }>('/api/blog/account');
}

// POST /api/blog/account — обновление username/email и (опционально)
// аватара. CSRF-токен кладём полем формы (см. postMultipart в client.ts).
export function updateAccount(body: {
  username: string;
  email: string;
  picture?: File | null;
}): Promise<MessageResp & { user: User }> {
  const formData = new FormData();
  formData.set('username', body.username);
  formData.set('email', body.email);
  if (body.picture) {
    formData.set('picture', body.picture);
  }
  return postMultipart<MessageResp & { user: User }>(
    '/api/blog/account',
    formData,
  );
}