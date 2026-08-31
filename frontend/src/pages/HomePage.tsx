// Главная страница: список только полных статей (complete === true)
// из GET /api/blog/articles в виде карточек.

import { useEffect, useState } from 'react';
import { getArticles } from '../api/blog';
import type { Article } from '../types';
import ArticleCard from '../components/ArticleCard';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getArticles()
      .then((data) => {
        if (!cancelled) {
          setArticles(data.articles.filter((a) => a.complete === true));
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить статьи. Попробуйте позже.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="page-stub">
        <h1>Статьи</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (articles === null) {
    return (
      <div className="page-stub">
        <h1>Статьи</h1>
        <p className="text-muted">Загрузка...</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="page-stub">
        <h1>Статьи</h1>
        <p className="text-muted">Статей пока нет.</p>
      </div>
    );
  }

  return (
    <div className="page-stub">
      <h1>Статьи</h1>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {articles.map((article) => (
          <ArticleCard key={article.art_id} article={article} />
        ))}
      </div>
    </div>
  );
}