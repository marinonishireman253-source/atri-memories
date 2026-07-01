import { useState } from 'react';

export function ThemeModal({ presets, selectedUrl, onSelect, onClose }) {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const applyCustomImage = (event) => {
    event.preventDefault();
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        throw new Error();
      }
      onSelect(parsedUrl.href);
      onClose();
    } catch {
      setMessage('请输入可访问的 HTTPS 图片地址。');
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="modal theme-modal glass-panel screentone-shadow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="notebook-wire-rings" aria-hidden="true">
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
        </div>
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <p className="eyebrow">PERSONALIZE</p>
        <h2 id="theme-title">选择此刻的海色</h2>
        <div className="preset-grid">
          {presets.map((preset) => (
            <button
              type="button"
              className={`preset ${selectedUrl === preset.url ? 'selected' : ''}`}
              key={preset.id}
              onClick={() => onSelect(preset.url)}
            >
              <img src={preset.url} alt="" loading="lazy" decoding="async" />
              <span>
                <strong>{preset.name}</strong>
                <small>{preset.description}</small>
              </span>
            </button>
          ))}
        </div>
        <form className="custom-theme" onSubmit={applyCustomImage}>
          <label htmlFor="custom-background">自定义背景图片 URL</label>
          <div>
            <input
              id="custom-background"
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setMessage('');
              }}
              placeholder="https://..."
            />
            <button className="primary-button" type="submit">
              应用
            </button>
          </div>
          {message && <p className="form-error">{message}</p>}
        </form>
      </section>
    </div>
  );
}
