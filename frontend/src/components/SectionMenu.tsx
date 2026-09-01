// Левое меню разделов блога. Загружает список разделов через
// getSections() и рендерит «Все статьи» (to="/") плюс по ссылке
// на каждый раздел (to="/section/<name>"). Активный пункт
// определяется по текущему маршруту: для раздела — путь должен
// начинаться с /section/<name>, иначе пункт «Все статьи». При ошибке
// загрузки молча показываем только «Все статьи» (не падаем).
//
// Стиль активного пункта (.menu-item.active) придёт из index.css (фаза 4).

import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getSections } from '../api/blog';
import type { Section } from '../types';

export default function SectionMenu() {
  const [sections, setSections] = useState<Section[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSections()
      .then((data) => {
        if (!cancelled) setSections(data.sections);
      })
      .catch(() => {
        // Тихо: при ошибке меню остаётся работоспособным — виден только
        // пункт «Все статьи» (sections === null -> рендерим пустой массив).
        if (!cancelled) setSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Класс для раздела: активен, если мы на /section/<name>.
  const sectionClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'menu-item active' : 'menu-item';

  // Для пункта «Все статьи» нужен end: иначе он бы считался активным
  // на любом вложенном маршруте под "/".
  const allClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'menu-item active' : 'menu-item';

  return (
    <>
      <NavLink to="/" end className={allClass}>
        Все статьи
      </NavLink>
      {sections?.map((s) => (
        <NavLink key={s.name} to={`/section/${s.name}`} className={sectionClass}>
          {s.label}
        </NavLink>
      ))}
    </>
  );
}
