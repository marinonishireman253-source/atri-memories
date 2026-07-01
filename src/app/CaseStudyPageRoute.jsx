import {
  caseStudyDemoChecklist,
  caseStudyEvidenceCommands,
  caseStudyPage,
  caseStudyProductDecisions,
  caseStudySections,
} from '../lib/caseStudyContent.js';
import '../features/case-study/caseStudy.css';

export function CaseStudyPageRoute() {
  return (
    <article className="case-study-page glass-panel" aria-labelledby="case-study-title">
      <header className="case-study-hero">
        <p className="case-study-eyebrow">{caseStudyPage.eyebrow}</p>
        <h1 id="case-study-title">{caseStudyPage.heading ?? '项目案例'}</h1>
        <p className="case-study-summary">{caseStudyPage.summary}</p>
      </header>

      <div className="case-study-section-grid">
        {caseStudySections.map((section) => (
          <section
            className="case-study-section-card"
            key={section.id}
            aria-labelledby={`case-study-section-${section.id}`}
          >
            <h2 id={`case-study-section-${section.id}`}>{section.title}</h2>
            <p>{section.summary}</p>
            <ul>
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="case-study-evidence" aria-label="验证证据">
        <div className="case-study-block-header">
          <h2>验证体系</h2>
        </div>
        <div className="case-study-command-grid">
          {caseStudyEvidenceCommands.map((item) => (
            <article className="case-study-command-card" key={item.command}>
              <h3>{item.label ?? item.purpose}</h3>
              <code>{item.command}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="case-study-decisions" aria-label="产品决策">
        <div className="case-study-block-header">
          <h2>产品决策</h2>
        </div>
        <div className="case-study-decision-grid">
          {caseStudyProductDecisions.map((decision) => (
            <article className="case-study-decision-card" key={decision.title}>
              <h3>{decision.title}</h3>
              <p>{decision.rationale}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="case-study-demo-checklist" aria-label={caseStudyPage.demoChecklistTitle}>
        <div className="case-study-block-header">
          <h2>{caseStudyPage.demoChecklistTitle}</h2>
        </div>
        <ol>
          {caseStudyDemoChecklist.map((step) => (
            <li key={step.item}>
              <strong>{step.item}</strong>
              <span>{step.evidence}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
