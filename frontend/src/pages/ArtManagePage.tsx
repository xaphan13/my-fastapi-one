// Страница управления реестром (/art_manage): GET /api/blog/art_manage
// при входе, фильтры списка (поиск по title/file_name + чекбоксы
// «Без автора»/«Без языка»), кликабельный список названий статей,
// одна панель редактирования выбранной записи (Автор/Язык/Заголовок
// + «Принять»). После успешной мутации — перезагрузка контекста,
// выбор сохраняется по art_id. Секции «Новые файлы»/«Записи без
// файла» и кнопка «Добавить все новые файлы» сохранены. Доступ
// только для авторизованных (RequireAuth в App.tsx), 403 от API —
// страховка на анонимный визит.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getArtManage,
  addAllEntries,
  type ArtManageResp,
  type RegistryArticle,
} from '../api/artManage';
import { ApiError } from '../api/client';
import { useToast } from '../components/Toast';
import { ArtEditSelectedForm, ArtAddForm } from '../components/ArtManageForms';
import Pagination from '../components/Pagination';
import SidePanel from '../components/SidePanel';
import type { ToastCategory } from '../components/Toast';

const REGISTRY_PAGE_SIZE = 10;

// Предикат «без автора»: NoName считается «без автора» (решение
// пользователя), пустая строка тоже.
function isNoAuthor(art: RegistryArticle): boolean {
  return art.author.trim() === '' || art.author === 'NoName';
}

// Предикат «без языка»: пустой lang после trim.
function isNoLang(art: RegistryArticle): boolean {
  return art.lang.trim() === '';
}

// Подстрока без учёта регистра; пустой запрос = true (фильтр отключён).
function matchesSearch(art: RegistryArticle, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    art.title.toLowerCase().includes(needle) ||
    art.file_name.toLowerCase().includes(needle)
  );
}

// Форматирует строку автора/языка для приглушённой подписи под пунктом.
// Если поле пустое — выводим «—», чтобы верстка не «слипалась».
function formatMetaPair(art: RegistryArticle): string {
  const author = art.author.trim() === '' ? '—' : art.author;
  const lang = art.lang.trim() === '' ? '—' : art.lang;
  return `${author} · ${lang}`;
}

export default function ArtManagePage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ArtManageResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Фильтры списка.
  const [search, setSearch] = useState('');
  const [filterNoAuthor, setFilterNoAuthor] = useState(false);
  const [filterNoLang, setFilterNoLang] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(REGISTRY_PAGE_SIZE);

  // Выбранная запись (по art_id). null — ничего не выбрано.
  const [selectedArtId, setSelectedArtId] = useState<number | null>(null);

  // Видимость боковых панелей: редактирование выбранной записи и
  // добавление новой для unassigned_files. Снимаются отдельно от
  // selectedArtId, чтобы клик по статье в списке открывал форму, а
  // клик по крестику/фону/Esc — закрывал без сброса selectedArtId.
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const resp = await getArtManage();
      setData(resp);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 403
          ? 'Требуется вход в аккаунт'
          : 'Не удалось загрузить реестр';
      showToast(message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // POST add_all + перезагрузка контекста после успеха.
  const handleAddAll = async () => {
    setAdding(true);
    try {
      const resp = await addAllEntries();
      showToast(resp.message, resp.category as ToastCategory);
      await load();
    } catch {
      showToast('Не удалось добавить новые файлы', 'danger');
    } finally {
      setAdding(false);
    }
  };

  // Любая смена фильтров/поиска/pageSize сбрасывает пагинацию на 1.
  useEffect(() => {
    setPage(1);
  }, [search, filterNoAuthor, filterNoLang, pageSize]);

  // Отфильтрованные articles. Мемо — список пересчитывается только при
  // изменении входных данных.
  const filteredArticles = useMemo(() => {
    if (!data) return [];
    return data.articles.filter((art) => {
      if (!matchesSearch(art, search)) return false;
      if (filterNoAuthor && !isNoAuthor(art)) return false;
      if (filterNoLang && !isNoLang(art)) return false;
      return true;
    });
  }, [data, search, filterNoAuthor, filterNoLang]);

  // Выбранная запись как объект (для формы редактирования). Ищем в
  // полном реестре, а не в фильтрованном — форма должна работать
  // даже если выбранную запись фильтры временно скрыли.
  const selectedArt = useMemo(() => {
    if (!data || selectedArtId === null) return null;
    return data.articles.find((art) => art.art_id === selectedArtId) ?? null;
  }, [data, selectedArtId]);

  if (loading) {
    return <div className="page-stub text-muted">Загрузка реестра...</div>;
  }
  if (!data) {
    return (
      <div className="page-stub">
        <h1>Управление реестром</h1>
        <p className="text-muted">Реестр недоступен, попробуйте позже.</p>
      </div>
    );
  }

  // Срез списка с клампингом: если после reload данных текущая страница
  // вышла за пределы (например, добавили/удалили записи), показываем
  // последнюю валидную, чтобы список не пустел.
  const registryPageCount = Math.max(
    1,
    Math.ceil(filteredArticles.length / pageSize),
  );
  const registrySafePage = Math.min(Math.max(1, page), registryPageCount);
  const visibleArticles = filteredArticles.slice(
    (registrySafePage - 1) * pageSize,
    registrySafePage * pageSize,
  );

  // Клик по пункту: первый клик — выделяет запись и открывает панель
  // редактирования; повторный клик по выбранному — закрывает панель
  // и снимает подсветку. При переключении между записями панель
  // остаётся открытой, а ArtEditSelectedForm подтягивает новое
  // значение через useEffect по art.
  const handleItemClick = (artId: number) => {
    if (selectedArtId === artId) {
      setSelectedArtId(null);
      setEditPanelOpen(false);
      return;
    }
    setSelectedArtId(artId);
    setEditPanelOpen(true);
  };

  // Закрытие панели редактирования «вручную» (Esc/overlay/✕): подсветку
  // выбранного пункта снимаем тоже, чтобы список и форма были
  // согласованы. Панель добавления трогать не нужно — она про свой раздел.
  const handleCloseEditPanel = () => {
    setEditPanelOpen(false);
    setSelectedArtId(null);
  };

  return (
    <div className="art-manage-page">
      <h1>Управление реестром</h1>

      {data.yaml_error && (
        <div className="registry-error">
          Ошибка разбора articles.yaml: {data.yaml_error}
        </div>
      )}

      <h2>Записи реестра</h2>

      <div className="registry-filters">
        <input
          type="search"
          className="registry-search"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск по названию"
        />
        <label className="registry-filter">
          <input
            type="checkbox"
            checked={filterNoAuthor}
            onChange={(e) => setFilterNoAuthor(e.target.checked)}
          />
          <span>Без автора</span>
        </label>
        <label className="registry-filter">
          <input
            type="checkbox"
            checked={filterNoLang}
            onChange={(e) => setFilterNoLang(e.target.checked)}
          />
          <span>Без языка</span>
        </label>
        <span className="registry-count text-muted">
          Найдено: {filteredArticles.length}
        </span>
      </div>

      {visibleArticles.length > 0 ? (
        <ul className="registry-list" role="list">
          {visibleArticles.map((art) => (
            <li
              key={art.art_id}
              className={`registry-item${
                selectedArtId === art.art_id ? ' active' : ''
              }`}
              role="button"
              tabIndex={0}
              aria-pressed={selectedArtId === art.art_id}
              onClick={() => handleItemClick(art.art_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(art.art_id);
                }
              }}
            >
              <div
                className="registry-item-title"
                title={art.title || art.file_name}
              >
                {art.title || art.file_name}
              </div>
              <div className="registry-item-meta mono">
                {formatMetaPair(art)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="registry-empty text-muted">
          Ничего не найдено по фильтрам.
        </p>
      )}

      <Pagination
        total={filteredArticles.length}
        page={registrySafePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Панель редактирования выбранной записи. SidePanel открывается
          по клику на пункте списка и закрывается через Esc/overlay/✕
          (см. handleCloseEditPanel). Запись может стать недоступна
          после reload (например, удалили/переименовали), но пока
          панель открыта — форму рендерим с последним известным art,
          чтобы пользователь успел увидеть ошибку и закрыть панель. */}
      <SidePanel
        open={editPanelOpen && selectedArt !== null}
        title={selectedArt ? `Редактирование: ${selectedArt.title || selectedArt.file_name}` : 'Редактирование записи'}
        onClose={handleCloseEditPanel}
      >
        {selectedArt && (
          <>
            <p className="registry-edit-file text-muted">
              Файл: <span className="mono">{selectedArt.file_name}</span>
            </p>
            <ArtEditSelectedForm
              art={selectedArt}
              onSaved={() => {
                setEditPanelOpen(false);
                setSelectedArtId(null);
                load();
              }}
            />
          </>
        )}
      </SidePanel>

      <h2>Новые файлы</h2>
      {data.unassigned_files.length > 0 ? (
        <div className="add-all-block">
          <button
            type="button"
            className="btn"
            onClick={() => setAddPanelOpen(true)}
          >
            Добавить запись для нового файла
          </button>
          <span className="text-muted">
            В реестре отсутствуют {data.unassigned_files.length} файл(ов):
            {' '}
            <span className="mono">
              {data.unassigned_files.slice(0, 3).join(', ')}
              {data.unassigned_files.length > 3 ? ', …' : ''}
            </span>
          </span>
        </div>
      ) : (
        <p className="text-muted">
          Непривязанных файлов нет — все зарегистрированы.
        </p>
      )}

      <SidePanel
        open={addPanelOpen && data.unassigned_files.length > 0}
        title="Добавить запись для нового файла"
        onClose={() => setAddPanelOpen(false)}
      >
        <ArtAddForm
          fileNames={data.unassigned_files}
          onAdded={() => {
            setAddPanelOpen(false);
            load();
          }}
        />
      </SidePanel>

      <h2>Записи без файла на диске</h2>
      {data.missing_entries.length > 0 ? (
        <ul className="missing-list">
          {data.missing_entries.map((art) => (
            <li key={art.art_id} className="mono">
              {art.file_name} (автор: {art.author || '—'}, lang:{' '}
              {art.lang || '—'})
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Все записи имеют файл на диске.</p>
      )}

      <div className="add-all-block">
        <button
          type="button"
          className="btn"
          onClick={handleAddAll}
          disabled={adding}
        >
          {adding ? 'Добавление...' : 'Добавить все новые файлы'}
        </button>
        <span className="text-muted">
          Регистрирует все .md-файлы из content_art, которых ещё нет в реестре.
        </span>
      </div>
    </div>
  );
}
