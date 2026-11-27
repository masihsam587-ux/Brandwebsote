import { useEffect } from 'react';
import { AdminConsole } from './AdminConsole';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminModal({ open, onClose }: AdminModalProps) {
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cinematic Arts Admin Lock & Console"
      className="ca-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6"
    >
      <AdminConsole mode="modal" active={open} onClose={onClose} />
    </div>
  );
}
