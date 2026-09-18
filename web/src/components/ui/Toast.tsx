'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Transient feedback.
 *
 * The container is a `role="status"` live region with `aria-live="polite"`, so a
 * screen reader hears "Added to favourites" at the next natural pause instead of
 * being interrupted mid-sentence. Errors are the exception: they use `assertive`,
 * because a failed save is worth interrupting for.
 *
 * Toasts carry an icon and a word as well as a colour, so the difference between
 * success and failure survives a colour-blind reading.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  /** A single inline action, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void;
  success: (message: string, action?: Toast['action']) => void;
  error: (message: string, action?: Toast['action']) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { ...input, id }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION_MS),
      );
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, action?: Toast['action']) => toast({ tone: 'success', message, action }),
    [toast],
  );

  const error = useCallback(
    (message: string, action?: Toast['action']) => toast({ tone: 'error', message, action }),
    [toast],
  );

  /* Clear every pending timer on unmount so a navigation mid-toast cannot fire
     setState against an unmounted provider. */
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toast, success, error, dismiss }),
    [toast, success, error, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-success/40',
  error: 'border-danger/50',
  info: 'border-border-strong',
};

const TONE_ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const TONE_LABELS: Record<ToastTone, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Note',
};

const TONE_ICON_COLORS: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent-text',
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      /* Above the bottom nav on mobile; bottom-right on desktop. `pointer-events-none`
         on the stack means a toast never blocks a click on the page behind it. */
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((item) => {
        const Icon = TONE_ICONS[item.tone];
        return (
          <div
            key={item.id}
            className={cn(
              'bg-card pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-3.5 shadow-lg',
              'animate-[cafera-toast-in_220ms_ease-out] motion-reduce:animate-none',
              TONE_STYLES[item.tone],
            )}
          >
            <Icon
              aria-hidden
              className={cn('mt-0.5 size-5 shrink-0', TONE_ICON_COLORS[item.tone])}
            />
            <div className="flex-1 text-sm">
              <span className="sr-only">{TONE_LABELS[item.tone]}: </span>
              <p className="text-text leading-snug">{item.message}</p>
              {item.action ? (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    onDismiss(item.id);
                  }}
                  className="text-accent-text focus-visible:outline-focus mt-1.5 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {item.action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label="Dismiss notification"
              className="text-text-muted hover:text-text focus-visible:outline-focus -m-1 shrink-0 rounded p-1 focus-visible:outline-2"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
