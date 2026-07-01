export function PageIntro({ eyebrow, title, children }) {
  return (
    <section className="page-intro glass-panel">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
    </section>
  );
}
