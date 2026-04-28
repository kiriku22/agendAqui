import { CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './SuccessModal.css';

function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'success', // 'success' or 'error'
  buttonText = 'Aceptar'
}) {
  const config = {
    success: {
      icon: CheckCircle,
      iconColor: '#10b981',
      titleDefault: 'Operación exitosa'
    },
    error: {
      icon: XCircle,
      iconColor: '#ef4444',
      titleDefault: 'Error'
    }
  };

  const currentConfig = config[type] || config.success;
  const Icon = currentConfig.icon;
  const displayTitle = title || currentConfig.titleDefault;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayTitle}
      size="small"
    >
      <div className="success-modal">
        <div className="success-modal__icon" style={{ color: currentConfig.iconColor }}>
          <Icon size={80} strokeWidth={2} />
        </div>

        {message && (
          <div className="success-modal__message">
            {message}
          </div>
        )}

        <div className="success-modal__actions">
          <Button
            variant={type === 'success' ? 'success' : 'danger'}
            onClick={onClose}
            fullWidth
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SuccessModal;
