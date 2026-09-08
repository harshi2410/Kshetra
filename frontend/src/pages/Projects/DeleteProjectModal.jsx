import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../../components/ui';

export default function DeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  project = null,
  loading = false
}) {
  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Modal.Header onClose={onClose}>
        <Modal.Title className="text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Delete Project
        </Modal.Title>
      </Modal.Header>

      <Modal.Content className="space-y-2">
        <p className="text-sm text-[var(--df-text)] font-medium">
          Are you sure you want to delete <span className="font-bold text-[var(--df-accent)]">{project.name}</span>?
        </p>
        <p className="text-xs text-[var(--df-text-muted)] leading-relaxed">
          This action will permanently remove this project and cannot be undone. All layout maps, customer assignments, and records associated with this project will be deleted.
        </p>
      </Modal.Content>

      <Modal.Footer>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          Delete Project
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
