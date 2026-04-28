import './Loading.css';

const Loading = ({ fullScreen = false, size = 'medium', text = 'Cargando...' }) => {
  if (fullScreen) {
    return (
      <div className="loading loading--fullscreen">
        <div className={`loading__spinner loading__spinner--${size}`}></div>
        {text && <p className="loading__text">{text}</p>}
      </div>
    );
  }

  return (
    <div className="loading">
      <div className={`loading__spinner loading__spinner--${size}`}></div>
      {text && <p className="loading__text">{text}</p>}
    </div>
  );
};

export default Loading;
