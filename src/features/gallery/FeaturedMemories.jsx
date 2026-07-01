import { FeaturedMemoryCard } from './FeaturedMemoryCard.jsx';

export function FeaturedMemories({ memories, loading, error, onOpenMemory }) {
  if (loading) {
    return (
      <section className="featured-panel glass-panel">
        <p className="eyebrow">FEATURED MEMORIES</p>
        <h2>精选记忆读取中</h2>
      </section>
    );
  }

  if (error || !memories.length) {
    return null;
  }

  return (
    <section className="featured-panel glass-panel" id="featured-memories">
      <div className="section-head">
        <div>
          <p className="eyebrow">FEATURED MEMORIES</p>
          <h2>
            <span className="section-accent" aria-hidden="true" />
            被标记的幸福瞬间
          </h2>
        </div>
      </div>
      <div className="featured-grid">
        {memories.map((memory, index) => (
          <FeaturedMemoryCard
            key={memory.id}
            memory={memory}
            priority={index === 0}
            onOpenMemory={onOpenMemory}
          />
        ))}
      </div>
    </section>
  );
}
