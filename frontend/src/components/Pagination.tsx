// Переиспользуемый блок пагинации: «‹ Назад / Вперёд ›», счётчик
// «Страница X из Y», переключатель размера страницы (5/10/20). При
// total <= pageSize (т.е. 0 или 1 страница) ничего не рендерит.
// Родитель хранит page/pageSize сам; компонент stateless, держит
// синхронизацию через колбэки. Смена размера сбрасывает на страницу 1.

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [5, 10, 20] as const;

// При большом числе страниц не показываем кликабельные номера —
// хватает «‹ Назад / Вперёд ›» и счётчика, чтобы не раздувать DOM.
const NUMBERED_PAGES_THRESHOLD = 7;

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Нечего показывать: 0 элементов или единственная страница.
  if (pageCount <= 1) {
    return null;
  }

  // Защита от рассинхрона: если родитель передал page за пределами
  // диапазона (например, после уменьшения total), клампим здесь же,
  // чтобы не рендерить сломанные кнопки.
  const safePage = Math.min(Math.max(1, page), pageCount);
  const canPrev = safePage > 1;
  const canNext = safePage < pageCount;

  const handlePageSize = (size: number) => {
    if (size !== pageSize) {
      onPageSizeChange(size);
      // Сброс на первую страницу синхронизируем с родителем через
      // раздельные колбэки: родитель сам решит, установить ли page=1
      // сразу или дождаться ресайза.
      onPageChange(1);
    }
  };

  return (
    <nav className="pagination" aria-label="Пагинация">
      <div className="pagination-nav">
        <button
          type="button"
          className="page-btn"
          disabled={!canPrev}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Предыдущая страница"
        >
          ‹ Назад
        </button>

        {pageCount <= NUMBERED_PAGES_THRESHOLD ? (
          <div className="pagination-pages" role="group" aria-label="Страницы">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`page-btn${n === safePage ? ' active' : ''}`}
                aria-current={n === safePage ? 'page' : undefined}
                onClick={() => onPageChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <span className="pagination-counter" aria-live="polite">
            Страница {safePage} из {pageCount}
          </span>
        )}

        <button
          type="button"
          className="page-btn"
          disabled={!canNext}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Следующая страница"
        >
          Вперёд ›
        </button>
      </div>

      <div className="pagination-size" role="group" aria-label="Размер страницы">
        <span className="pagination-size-label">На странице:</span>
        {PAGE_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`page-btn${size === pageSize ? ' active' : ''}`}
            aria-pressed={size === pageSize}
            onClick={() => handlePageSize(size)}
          >
            {size}
          </button>
        ))}
      </div>
    </nav>
  );
}
