// API управления реестром art_manage (/api/blog/art_manage*).
// Форматы ответов — по контракту /api/blog (REQUIREMENTS.md):
// GET — контекст страницы реестра, POST add_all/meta — message/category.

import { getJson, postJson } from './client';
import type { MessageResp } from './auth';
import type { Article } from '../types';

// Запись реестра в контексте /art_manage: с флагами complete/file_exists.
export type RegistryArticle = Article;

// Ответ GET /api/blog/art_manage — весь контекст страницы.
export interface ArtManageResp {
  articles: RegistryArticle[];
  unassigned_files: string[];
  missing_entries: RegistryArticle[];
  yaml_error: string | null;
}

// GET /api/blog/art_manage — таблица статей + служебные списки (403 для анонима).
export function getArtManage(): Promise<ArtManageResp> {
  return getJson<ArtManageResp>('/api/blog/art_manage');
}

// POST /api/blog/art_manage/add_all — добавить все новые файлы из content_art.
export function addAllEntries(): Promise<MessageResp> {
  return postJson<MessageResp>('/api/blog/art_manage/add_all', {});
}

// POST /api/blog/art_manage/meta — обновить существующую или добавить
// новую запись реестра по file_name; 422 возвращает { errors }.
export function updateMeta(body: {
  file_name: string;
  author: string;
  lang: string;
  title: string;
}): Promise<MessageResp> {
  return postJson<MessageResp>('/api/blog/art_manage/meta', body);
}