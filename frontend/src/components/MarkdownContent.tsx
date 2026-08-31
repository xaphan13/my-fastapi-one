// Вставка готового серверного HTML статьи (article.content).
// dangerouslySetInnerHTML допустим только здесь: backend рендерит markdown
// тем же доверенным движком, что и старый Jinja-блог.

import { useEffect } from 'react';

interface MarkdownContentProps {
  html: string;
}

export default function MarkdownContent({ html }: MarkdownContentProps) {
  useEffect(() => {
    // Подсветка кода после монтирования и после смены контента статьи.
    // (window as any) — hljs подключён с CDN как глобал (см. index.html).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).hljs?.highlightAll();
  }, [html]);

  // eslint-disable-next-line react/no-danger
  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
}