// Переиспользуемая боковая панель-диалог (выезжает справа).
// Используется на /art_manage для форм редактирования и добавления записи.
// Закрытие: клик по затемнённому фону, кнопка ✕ в шапке, клавиша Esc.
// Анимация выезда — transform translateX + opacity, отключается при
// prefers-reduced-motion: reduce в CSS.

import { useEffect, useRef } from 'react';

interface SidePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SidePanel({
  open,
  title,
  onClose,
  children,
}: SidePanelProps) {
  // Сохраняем последний колбэк закрытия в ref, чтобы keydown-листенер
  // не пересоздавался каждый рендер родителя.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="side-panel-overlay"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="side-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="side-panel-header">
          <h2 className="side-panel-title">{title}</h2>
          <button
            type="button"
            className="side-panel-close"
            aria-label="Закрыть панель"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className="side-panel-body">{children}</div>
      </aside>
    </div>
  );
}
