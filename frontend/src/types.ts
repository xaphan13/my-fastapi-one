// Типы данных из контракта API /api/blog (REQUIREMENTS.md).
// Все ответы /api/blog/* возвращаются с cookie-сессией: запросы идут
// с credentials: 'include' (см. api/client.ts).

export interface User {
  id: number;
  username: string;
  email: string;
  image_file: string;
}

// Формат записи реестра articles.yaml, как его отдаёт backend
// (ArticleLang из schema_art.py + вычисляемое complete/file_exists).
// content непустой только в ответе /articles/{art_id} (готовый HTML).
export interface Article {
  author: string;
  lang: string;
  art_id: number;
  title: string;
  file_name: string;
  content?: string;
  complete?: boolean;
  file_exists?: boolean;
}