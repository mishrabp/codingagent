import Link from 'next/link';

const upcoming = [
  'Azure migration strategy and landing zone design',
  'AKS platform engineering and Kubernetes modernization',
  'DevSecOps pipelines and operational maturity transformation',
  'Healthcare and enterprise system integration case studies',
  'AI and MLOps enablement patterns for scalable teams',
];

export default function PortfolioPage() {
  return (
    <main className="page-shell portfolio-page">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">BM</div>
          <div>
            <div className="brand-name">Bibhup Mishra</div>
            <div className="brand-tag">Portfolio</div>
          </div>
        </div>
        <nav className="nav">
          <Link href="/">Home</Link>
          <a href="https://www.linkedin.com/in/mishrab" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </nav>
      </header>

      <section className="section portfolio-hero">
        <div className="portfolio-panel card-panel">
          <p className="eyebrow">Future portfolio</p>
          <h1>Case studies and transformation stories are being curated.</h1>
          <p>
            This page is intentionally kept clean while the detailed portfolio work is prepared.
            The focus is on cloud modernization, platform engineering, and leadership-led delivery.
          </p>
          <Link className="primary-button" href="/">
            Return to profile
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <p className="eyebrow">What will be featured</p>
          <h2>Architecture, product outcomes, and operational transformations.</h2>
        </div>
        <div className="impact-grid">
          {upcoming.map((item, index) => (
            <div className="impact-card card-panel" key={item}>
              <span className="impact-number">0{index + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
