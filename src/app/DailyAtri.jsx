export function DailyAtri({ card }) {
  if (!card) return null;

  return (
    <section className={`daily-atri glass-panel ${card.theme}`} aria-label="每日 ATRI 完整卡">
      <div className="washi-tape pink washi-tape-top-left" aria-hidden="true" />
      <div className="washi-tape cyan washi-tape-top-right" aria-hidden="true" />
      <div className="card-packaging-seal" aria-hidden="true">
        <span className="seal-code">SYS-LOG // MODEL: ATRI-MDM-01</span>
        <span className="seal-barcode" />
        <span className="seal-logo">DAILY MEMORY CELL</span>
      </div>
      <div className="daily-atri-card-top">
        <div>
          <p className="eyebrow">DAILY ATRI</p>
          <h1>每日 ATRI</h1>
        </div>
        <div className="daily-atri-stamp" aria-label="每日卡编号">
          <span>{card.cardNumber}</span>
          <time dateTime={new Date().toISOString().slice(0, 10)}>{card.dateLabel}</time>
        </div>
      </div>

      <div className="daily-atri-hero">
        {card.image && (
          <figure className="daily-atri-image">
            <img src={card.image.imageUrl} alt={card.image.title} loading="lazy" decoding="async" />
            <figcaption>
              <span>今日图片</span>
              <strong>{card.image.title}</strong>
              <p>{card.image.caption}</p>
            </figcaption>
          </figure>
        )}

        <div className="daily-atri-copy">
          <div className="daily-atri-mood">
            <span>{card.mood}</span>
            <small>{card.memoryLine}</small>
          </div>
          <strong>{card.title}</strong>
          <p>{card.note}</p>
          <div className="daily-atri-rituals" aria-label="今日记录步骤">
            {card.ritualItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="daily-atri-footer">
        {card.voiceSrc && (
          <div className="daily-atri-voice">
            <span>今日语音</span>
            <audio controls preload="none" src={card.voiceSrc}>
              <a href={card.voiceSrc}>下载每日语音</a>
            </audio>
          </div>
        )}
        <div className="daily-atri-question">
          <span>今日小问题</span>
          <p>{card.question}</p>
        </div>
        {card.image && (
          <a className="ghost-button compact daily-atri-download" href={card.image.downloadUrl} download={card.image.filename}>
            下载今日图片
          </a>
        )}
      </div>
    </section>
  );
}
