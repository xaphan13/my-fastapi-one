// Функции API для публичных страниц: список статей и отдельная статья.
// Форматы ответов — по контракту /api/blog (REQUIREMENTS.md).

import { getJson } from './client';
import type { Article, Section } from '../types';

// GET /api/blog/articles — список всех записей реестра. Необязательный
// section фильтрует по разделу (= имя подпапки content_art/): бэкенд
// возвращает только полные статьи с article.section == section.
export function getArticles(section?: string): Promise<{ articles: Article[] }> {
  const query = section ? `?section=${encodeURIComponent(section)}` : '';
  return getJson<{ articles: Article[] }>(`/api/blog/articles${query}`);
}

// GET /api/blog/sections — список непустых разделов с количеством
// полных статей в каждом. Сортировка по name — на бэкенде.
export function getSections(): Promise<{ sections: Section[] }> {
  return getJson<{ sections: Section[] }>('/api/blog/sections');
}

// GET /api/blog/articles/{art_id} — одна статья с готовым HTML-контентом.
export function getArticle(artId: number | string): Promise<{ article: Article }> {
  return getJson<{ article: Article }>(`/api/blog/articles/${artId}`);
}