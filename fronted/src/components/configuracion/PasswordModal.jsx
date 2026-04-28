import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, X } from 'lucide-react';
import './PasswordModal.css';

const CONFIG_PASSWORD = 'admin123';

const PasswordModal = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CONFIG_PASSWORD) {
      onSuccess();
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="password-modal-overlay" onKeyDown={handleKeyDown}>
      <div className={`password-modal ${isShaking ? 'password-modal--shake' : ''}`}>
        <button
          className="password-modal__close"
          onClick={handleCancel}
          type="button"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="password-modal__header">
          <div className="password-modal__icon">
            <Lock size={32} />
          </div>
          <h2 className="password-modal__title">Acceso Restringido</h2>
          <p className="password-modal__subtitle">
            Ingrese la contraseña para acceder a la configuración del sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="password-modal__form">
          <div className="password-modal__input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Contraseña"
              className={`password-modal__input ${error ? 'password-modal__input--error' : ''}`}
              autoFocus
              autoComplete="off"
            />
            {error && (
              <span className="password-modal__error">{error}</span>
            )}
          </div>

          <div className="password-modal__actions">
            <button
              type="button"
              className="password-modal__btn password-modal__btn--cancel"
              onClick={handleCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="password-modal__btn password-modal__btn--submit"
              disabled={!password}
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
