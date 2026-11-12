import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <aside 
      aria-label="Notifications"
      className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />;
        let borderClass = 'border-[var(--border-color)]';
        let bgClass = 'bg-[var(--bg-surface)]';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-[var(--accent-olive)] shrink-0" />;
          borderClass = 'border-[var(--accent-olive)]/60';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-[var(--accent)] shrink-0" />;
          borderClass = 'border-[var(--accent)]/60';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-[var(--accent-red)] shrink-0" />;
          borderClass = 'border-[var(--accent-red)]/60';
        }

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded shadow-md border ${borderClass} ${bgClass} text-[var(--text-primary)] animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {icon}
              <p className="text-xs font-mono font-medium truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </aside>
  );
};
