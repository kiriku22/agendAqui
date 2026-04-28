import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './ConfirmModal.css';

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  variant = 'warning', // 'success', 'danger', 'warning', 'info'
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false
}) {
  const variantConfig = {
    success: {
      icon: CheckCircle,
      iconColor: '#10b981',
      buttonVariant: 'success'
    },
    danger: {
      icon: XCircle,
      iconColor: '#ef4444',
      buttonVariant: 'danger'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#f59e0b',
      buttonVariant: 'warning'
    },
    info: {
      icon: Info,
      iconColor: '#06b6d4',
      buttonVariant: 'primary'
    }
  };

  const config = variantConfig[variant] || variantConfig.warning;
  const Icon = config.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
    >
      <div className="confirm-modal">
        <div className="confirm-modal__icon" style={{ color: config.iconColor }}>
          <Icon size={64} />
        </div>

        {message && (
          <div className="confirm-modal__message">
            {message}
          </div>
        )}

        <div className="confirm-modal__actions">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
            fullWidth
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
