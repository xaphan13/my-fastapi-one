// Страница управления реестром (/art_manage): GET /api/blog/art_manage
// при входе, таблица записей, кнопка «Добавить все новые файлы» (add_all),
// формы редактирования/добавления записи (meta). После успешной мутации —
// перезагрузка контекста. Доступ только для авторизованных (RequireAuth
// в App.tsx), 403 от API — страховка.

import { useCallback, useEffect, useState } from 'react';
import {
  getArtManage,
  addAllEntries,
  type ArtManageResp,
  type RegistryArticle,
} from '../api/artManage';
import { ApiError } from '../api/client';
import { useToast } from '../components/Toast';
import { ArtEditForm, ArtAddForm } from '../components/ArtManageForms';
import Pagination from '../components/Pagination';
import type { ToastCategory } from '../components/Toast';

const REGISTRY_PAGE_SIZE = 10;

// Флаги complete/file_exists в виде бейджей.
function Flags({ art }: { art: RegistryArticle }) {
  return (
    <>
      <span className={`badge ${art.complete ? 'badge-ok' : 'badge-warn'}`}>
        {art.complete ? 'полная' : 'неполная'}
      </span>{' '}
      <span className={`badge ${art.file_exists ? 'badge-ok' : 'badge-warn'}`}>
        {art.file_exists ? 'файл есть' : 'файла нет'}
      </span>
    </>
  );
}

export default function ArtManagePage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ArtManageResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(REGISTRY_PAGE_SIZE);

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

  // Срез таблицы «Записи реестра» с клампингом: если после reload данных
  // текущая страница вышла за пределы (например, добавили/удалили
  // записи), показываем последнюю валидную, чтобы таблица не пустела.
  const registryPageCount = Math.max(1, Math.ceil(data.articles.length / pageSize));
  const registrySafePage = Math.min(Math.max(1, page), registryPageCount);
  const visibleRegistry = data.articles.slice(
    (registrySafePage - 1) * pageSize,
    registrySafePage * pageSize,
  );

  return (
    <div className="art-manage-page">
      <h1>Управление реестром</h1>

      {data.yaml_error && (
        <div className="registry-error">
          Ошибка разбора articles.yaml: {data.yaml_error}
        </div>
      )}

      <h2>Записи реестра</h2>
      <div className="registry-table-wrap">
        <table className="registry-table">
          <thead>
            <tr>
              <th>Файл</th>
              <th>Автор</th>
              <th>Язык</th>
              <th>Заголовок</th>
              <th>Статусы</th>
              <th>Форма записи</th>
            </tr>
          </thead>
          <tbody>
            {visibleRegistry.map((art) => (
              <tr key={art.art_id}>
                <td className="mono">{art.file_name}</td>
                <td>{art.author}</td>
                <td>{art.lang}</td>
                <td>{art.title}</td>
                <td>
                  <Flags art={art} />
                </td>
                <td>
                  <ArtEditForm art={art} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        total={data.articles.length}
        page={registrySafePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <h2>Новые файлы</h2>
      {data.unassigned_files.length > 0 ? (
        <ArtAddForm fileNames={data.unassigned_files} onAdded={load} />
      ) : (
        <p className="text-muted">
          Непривязанных файлов нет — все зарегистрированы.
        </p>
      )}

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