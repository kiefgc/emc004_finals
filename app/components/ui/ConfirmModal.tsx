"use client";

import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onCancel}>
      <div className="modal-header">
        <h2>{title}</h2>
      </div>

      <div className="modal-body">
        <p>{message}</p>
      </div>

      <div
        className="mt-3"
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
        }}
      >
        <Button variant="secondary" onClick={onCancel}>
          {cancelText}
        </Button>

        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
