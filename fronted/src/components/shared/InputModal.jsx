import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './InputModal.css';

function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Ingrese información',
  message,
  placeholder = 'Escriba aquí...',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  required = false,
  loading = false
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (required && !value.trim()) {
      setError('Este campo es obligatorio');
      return;
    }

    if (onConfirm) {
      onConfirm(value.trim());
    }
  };

  const handleClose = () => {
    setValue('');
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="small"
    >
      <div className="input-modal">
        {message && (
          <div className="input-modal__message">
            <MessageSquare size={20} color="#1e40af" />
            <span>{message}</span>
          </div>
        )}

        <div className="input-modal__field">
          <textarea
            className={`input-modal__textarea ${error ? 'input-modal__textarea--error' : ''}`}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            rows={4}
            autoFocus
            disabled={loading}
          />
          {error && (
            <span className="input-modal__error">{error}</span>
          )}
        </div>

        <div className="input-modal__actions">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
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

export default InputModal;
