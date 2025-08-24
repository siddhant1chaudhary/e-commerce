import { createContext, useContext, useCallback, useState } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback(({ type = 'info', message = '', duration = 4000 }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
    return id;
  }, []);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ show, remove }}>
      {children}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10550, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => {
          const bgClass = t.type === 'success' ? 'bg-success' : t.type === 'error' ? 'bg-danger' : 'bg-secondary';
          return (
            <div key={t.id} className={`toast show text-white ${bgClass}`} role="alert" aria-live="assertive" aria-atomic="true" style={{ minWidth: 220 }}>
              <div className="d-flex">
                <div className="toast-body" style={{ padding: '0.5rem 0.75rem' }}>{t.message}</div>
                <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => remove(t.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
