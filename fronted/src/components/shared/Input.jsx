import './Input.css';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  icon,
  ...props
}) => {
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={name} className="input-group__label">
          {label}
          {required && <span className="input-group__required">*</span>}
        </label>
      )}
      <div className="input-group__wrapper">
        {icon && <span className="input-group__icon">{icon}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`input-group__input ${error ? 'input-group__input--error' : ''} ${
            icon ? 'input-group__input--with-icon' : ''
          }`}
          {...props}
        />
      </div>
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
};

export default Input;
