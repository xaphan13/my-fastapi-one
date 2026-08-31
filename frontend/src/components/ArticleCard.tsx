// Карточка статьи в списке на главной: ссылка на /art/:author/:artId,
// скругления, тень и плавный переход — в стиле карточек фазы 3 (.card).

import { Link } from 'react-router-dom';
import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link
      to={`/art/${article.author}/${article.art_id}`}
      className="card card-hover"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <h3 style={{ marginTop: 0 }}>{article.title}</h3>
      <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
        {article.author}
      </p>
      <span className="badge">{article.lang}</span>
    </Link>
  );
}