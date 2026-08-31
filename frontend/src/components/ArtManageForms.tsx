// Формы реестра art_manage: редактирование записи существующей статьи
// и добавление записи для нового (unassigned) файла. Обе отправляют
// POST /api/blog/art_manage/meta; ошибки 422 показываются по полям.

import { useEffect, useState } from 'react';
import { updateMeta } from '../api/artManage';
import { extractErrors } from '../api/auth';
import type { RegistryArticle } from '../api/artManage';
import { useToast } from './Toast';
import type { ToastCategory } from './Toast';

// Строка ввода с блоком ошибок 422 (локальная версия FormField:
// отдельный id по имени поля, меньший отступ внутри таблицы).
function MetaField({
  label,
  name,
  value,
  errors,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  errors?: string[];
  onChange: (value: string) => void;
}) {
  const hasError = errors && errors.length > 0;
  return (
    <div className={`meta-field${hasError ? ' form-field-invalid' : ''}`}>
      <label htmlFor={`${name}-${value}-label`}>{label}</label>
      <input
        id={`${name}-${value}-label`}
        name={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hasError && <div className="form-error-text">{errors.join(', ')}</div>}
    </div>
  );
}

// Форма отправки meta: onSubmit получает собранные поля; внутренний
// стейт нужен только для блокировки кнопки на время запроса.
async function submitMeta(
  body: { file_name: string; author: string; lang: string; title: string },
  showToast: (message: string, category?: ToastCategory) => void,
  onErrors: (errors: Record<string, string[]>) => void,
) {
  try {
    const resp = await updateMeta(body);
    showToast(resp.message, resp.category as ToastCategory);
  } catch (err) {
    const serverErrors = extractErrors(err);
    if (Object.keys(serverErrors).length > 0) {
      onErrors(serverErrors);
    } else {
      showToast('Не удалось сохранить запись', 'danger');
    }
  }
}

// Форма редактирования одной строки реестра (author, lang, title).
export function ArtEditForm({ art }: { art: RegistryArticle }) {
  const { showToast } = useToast();
  const [author, setAuthor] = useState(art.author);
  const [lang, setLang] = useState(art.lang);
  const [title, setTitle] = useState(art.title);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Меняются пропсы после перезагрузки данных — подтягиваем значения.
  useEffect(() => {
    setAuthor(art.author);
    setLang(art.lang);
    setTitle(art.title);
  }, [art]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    await submitMeta(
      { file_name: art.file_name, author, lang, title },
      showToast,
      setErrors,
    );
    setSubmitting(false);
  };

  return (
    <form className="meta-form" onSubmit={handleSubmit} noValidate>
      <MetaField
        label="Автор"
        name={`author-${art.art_id}`}
        value={author}
        errors={errors.author}
        onChange={setAuthor}
      />
      <MetaField
        label="Язык"
        name={`lang-${art.art_id}`}
        value={lang}
        errors={errors.lang}
        onChange={setLang}
      />
      <MetaField
        label="Заголовок"
        name={`title-${art.art_id}`}
        value={title}
        errors={errors.title}
        onChange={setTitle}
      />
      <button type="submit" className="btn btn-ghost" disabled={submitting}>
        {submitting ? 'Сохранение...' : 'Сохранить'}
      </button>
    </form>
  );
}

// Форма добавления записи для нового файла из unassigned_files.
export function ArtAddForm({
  fileNames,
  onAdded,
}: {
  fileNames: string[];
  onAdded?: () => void;
}) {
  const { showToast } = useToast();
  const [fileName, setFileName] = useState(fileNames[0] ?? '');
  const [author, setAuthor] = useState('');
  const [lang, setLang] = useState('');
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Список unassigned_files меняется после мутаций — держим валидный выбор.
  useEffect(() => {
    setFileName((current) =>
      fileNames.includes(current) ? current : (fileNames[0] ?? ''),
    );
  }, [fileNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) {
      setErrors({ file_name: ['Выберите файл для добавления.'] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    await submitMeta(
      { file_name: fileName, author, lang, title },
      showToast,
      setErrors,
    );
    setSubmitting(false);
    if (onAdded) onAdded();
  };

  if (fileNames.length === 0) {
    return (
      <p className="text-muted">
        Новых файлов в content_art нет — все зарегистрированы.
      </p>
    );
  }

  return (
    <form className="meta-form" onSubmit={handleSubmit} noValidate>
      <div className={`meta-field${errors.file_name ? ' form-field-invalid' : ''}`}>
        <label htmlFor="new-file-name">Файл</label>
        <select
          id="new-file-name"
          name="file_name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        >
          {fileNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {errors.file_name && (
          <div className="form-error-text">{errors.file_name.join(', ')}</div>
        )}
      </div>
      <MetaField
        label="Автор"
        name="new-author"
        value={author}
        errors={errors.author}
        onChange={setAuthor}
      />
      <MetaField
        label="Язык"
        name="new-lang"
        value={lang}
        errors={errors.lang}
        onChange={setLang}
      />
      <MetaField
        label="Заголовок"
        name="new-title"
        value={title}
        errors={errors.title}
        onChange={setTitle}
      />
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Добавление...' : 'Добавить запись'}
      </button>
    </form>
  );
}