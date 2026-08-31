// Страница статьи: author и artId берутся из URL (/art/:author/:artId),
// данные — GET /api/blog/articles/{art_id}; контент вставляется как
// готовый HTML (MarkdownContent), hljs подсвечивает блоки кода.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getArticle } from '../api/blog';
import type { Article } from '../types';
import MarkdownContent from '../components/MarkdownContent';

export default function ArticlePage() {
  const { author, artId } = useParams<{ author: string; artId: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setError(null);
    setNotFound(false);
    getArticle(artId ?? '')
      .then((data) => {
        // art_id из URL может не совпадать с реестром — сверяем автора.
        if (cancelled) return;
        if (!data.article || data.article.author !== author) {
          setNotFound(true);
        } else {
          setArticle(data.article);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          setNotFound(true);
        } else {
          setError('Не удалось загрузить статью. Попробуйте позже.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [author, artId]);

  if (notFound) {
    return (
      <div className="page-stub">
        <h1>Статья</h1>
        <p className="text-muted">Статья не найдена.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stub">
        <h1>Статья</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="page-stub">
        <h1>Статья</h1>
        <p className="text-muted">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="page-stub">
      <h1>{article.title}</h1>
      <p className="text-muted">{article.author}</p>
      <MarkdownContent html={article.content ?? ''} />
    </div>
  );
}