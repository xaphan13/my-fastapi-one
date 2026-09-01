// Главная страница: список только полных статей (complete === true)
// из GET /api/blog/articles в виде карточек. Если в URL есть раздел
// (/section/:name), берём из него имя раздела и фильтруем выдачу;
// заголовок и сообщение о пустом списке зависят от выбранного раздела.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getArticles } from '../api/blog';
import type { Article } from '../types';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';

const DEFAULT_PAGE_SIZE = 10;

export default function HomePage() {
  const { name } = useParams<{ name?: string }>();
  const section = name ?? '';

  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Заголовок страницы: «Все статьи» или «Статьи раздела «<name>»».
  const heading = section ? `Статьи раздела «${section}»` : 'Все статьи';

  useEffect(() => {
    let cancelled = false;
    setArticles(null);
    setError(null);
    setPage(1);
    getArticles(section || undefined)
      .then((data) => {
        if (!cancelled) {
          setArticles(data.articles.filter((a) => a.complete === true));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить статьи. Попробуйте позже.');
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (error) {
    return (
      <div className="page-stub">
        <h1>{heading}</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (articles === null) {
    return (
      <div className="page-stub">
        <h1>{heading}</h1>
        <p className="text-muted">Загрузка...</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="page-stub">
        <h1>{heading}</h1>
        <p className="text-muted">В этом разделе пока нет статей.</p>
      </div>
    );
  }

  // Клампинг страницы под фактический размер выдачи: если page вышла
  // за пределы (например, после reload данных), удерживаем последнюю
  // валидную. Срез карточек пересчитывается на каждом рендере —
  // массив статей меняется только при загрузке, поэтому дешёво.
  const pageCount = Math.max(1, Math.ceil(articles.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const visibleArticles = articles.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="page-stub">
      <h1>{heading}</h1>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {visibleArticles.map((article) => (
          <ArticleCard key={article.art_id} article={article} />
        ))}
      </div>
      <Pagination
        total={articles.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}