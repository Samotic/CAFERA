'use client';

import { Button } from './Button';
import { Modal } from './Modal';

/**
 * The confirmation step in front of every destructive action — removing a
 * favourite is not destructive, deleting a custom recipe or an account is.
 *
 * The confirm button states the actual verb ("Delete recipe"), never "OK". A
 * generic label forces the user to re-read the question to know what they are
 * agreeing to, which is exactly when mistakes happen.
 */
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = true,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      /* While the action is in flight, closing would leave the user unsure
         whether it completed. */
      dismissible={!isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isPending}
            loadingLabel={`${confirmLabel}…`}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-text-secondary text-[0.9375rem] leading-relaxed">{description}</p>
    </Modal>
  );
}
