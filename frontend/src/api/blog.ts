// Функции API для публичных страниц: список статей и отдельная статья.
// Форматы ответов — по контракту /api/blog (REQUIREMENTS.md).

import { getJson } from './client';
import type { Article } from '../types';

// GET /api/blog/articles — список всех записей реестра.
export function getArticles(): Promise<{ articles: Article[] }> {
  return getJson<{ articles: Article[] }>('/api/blog/articles');
}

// GET /api/blog/articles/{art_id} — одна статья с готовым HTML-контентом.
export function getArticle(artId: number | string): Promise<{ article: Article }> {
  return getJson<{ article: Article }>(`/api/blog/articles/${artId}`);
}