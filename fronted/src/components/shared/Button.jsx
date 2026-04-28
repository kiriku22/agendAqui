import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  icon,
  ...props
}) => {
  const classNames = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth && 'button--full-width',
    disabled && 'button--disabled',
    loading && 'button--loading',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="button__spinner"></span>
      )}
      {icon && !loading && <span className="button__icon">{icon}</span>}
      <span className="button__text">{children}</span>
    </button>
  );
};

export default Button;
