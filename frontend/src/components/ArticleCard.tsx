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
      className="card card-hover card-row"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <h3 className="card-title-grad">{article.title}</h3>
      <p className="text-muted card-author">{article.author}</p>
      <span className="badge card-lang">{article.lang}</span>
    </Link>
  );
}