import Link from 'next/link';
import DigitalTwinChat from '@/components/DigitalTwinChat';

const stats = [
  { value: '18+', label: 'years building systems' },
  { value: 'Azure', label: 'cloud modernization focus' },
  { value: '50+', label: 'consumer sites migrated' },
  { value: '67', label: 'projects transformed with DevOps' },
];

const capabilities = [
  'Azure Cloud Strategy & Migration',
  'Kubernetes & AKS Platform Design',
  'DevSecOps & Automation',
  'MLOps & AI-ready Architecture',
  'Enterprise Integration & Governance',
  'Team Leadership & Coaching',
];

const journey = [
  {
    period: '2022 — Present',
    company: 'LTIMindtree',
    role: 'Principal Architect — Cloud Engineering',
    text:
      'Leading Microsoft.com modernization to Azure Kubernetes Service, reducing cost and increasing resilience while mentoring engineering teams and partnering with Microsoft stakeholders.',
  },
  {
    period: '2017 — 2022',
    company: 'NTT DATA Services',
    role: 'Associate Director — Software Development',
    text:
      'Built Azure cloud foundations, accelerated DevOps adoption across 67 projects, and modernized digital experiences for healthcare and enterprise platforms.',
  },
  {
    period: '2009 — 2017',
    company: 'Dell Services',
    role: 'Software Development Manager II',
    text:
      'Drove integrated EMR and enterprise application delivery, built strategic partnerships, and led transformative architecture programs across complex environments.',
  },
  {
    period: '2006 — 2009',
    company: 'Satyam / Infosys',
    role: 'Technical Lead & Program Analyst',
    text:
      'Developed health information systems and enterprise .NET solutions while establishing quality, architecture, and project governance fundamentals.',
  },
];

const impact = [
  'Optimized Azure platform cost by 40% through architecture and automation work.',
  'Modernized large-scale consumer and enterprise websites for cloud-scale delivery.',
  'Driven DevOps maturity across distributed teams with measurable operational efficiency gains.',
  'Architected secure, compliant systems for regulated healthcare and enterprise environments.',
];

export default function Home() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">BM</div>
          <div>
            <div className="brand-name">Bibhup Mishra</div>
            <div className="brand-tag">Cloud Architect</div>
          </div>
        </div>
        <nav className="nav">
          <a href="#about">About</a>
          <a href="#journey">Journey</a>
          <a href="#impact">Impact</a>
          <Link href="/portfolio">Portfolio</Link>
        </nav>
      </header>

      <section className="hero section">
        <div className="hero-copy">
          <p className="eyebrow">Principal Cloud / DevOps Architect</p>
          <h1>
            I build the systems that help enterprises move faster, safer, and smarter.
          </h1>
          <p className="lede">
            With 18+ years in software architecture, I specialize in Azure, Kubernetes,
            DevOps, and cloud transformation—turning legacy complexity into resilient,
            scalable digital platforms.
          </p>
          <div className="cta-row">
            <a className="primary-button" href="mailto:bm80177@gmail.com">
              Book a conversation
            </a>
            <Link className="secondary-button" href="/portfolio">
              View portfolio
            </Link>
          </div>
          <div className="social-row">
            <a href="https://www.linkedin.com/in/mishrab" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="https://medium.com/@bibhup_mishra" target="_blank" rel="noreferrer">
              Medium
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="panel-card card-top">
            <span className="mini-label">Current focus</span>
            <strong>Azure & Kubernetes modernization</strong>
            <p>Designing secure, scalable platform strategies for high-impact digital estates.</p>
          </div>
          <div className="stats-grid">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="section-header">
          <p className="eyebrow">About me</p>
          <h2>Enterprise thinking. Product velocity. Execution that scales.</h2>
        </div>

        <div className="about-grid">
          <div className="about-copy card-panel">
            <p>
              I am a Principal Cloud and DevOps Architect with deep experience across cloud
              engineering, enterprise modernization, and platform strategy. My work sits at the
              convergence of architecture, automation, and business transformation—helping teams
              move from fragmented systems to resilient digital infrastructure.
            </p>
            <p>
              Across healthcare, Microsoft digital platform work, and large-scale modernization
              programs, I’ve designed solutions that improve performance, security, cost efficiency,
              and delivery velocity. I’m especially energized by the intersection of Azure,
              Kubernetes, DevOps maturity, and AI-ready platforms.
            </p>
          </div>

          <div className="focus-panel card-panel">
            <h3>What I bring</h3>
            <ul>
              {capabilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="journey" className="section">
        <div className="section-header">
          <p className="eyebrow">Career journey</p>
          <h2>From hands-on engineering to strategic transformation leadership.</h2>
        </div>

        <div className="timeline">
          {journey.map((item) => (
            <article className="timeline-item card-panel" key={item.period}>
              <div className="timeline-period">{item.period}</div>
              <div className="timeline-content">
                <h3>{item.company}</h3>
                <p className="role">{item.role}</p>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="impact" className="section">
        <div className="section-header">
          <p className="eyebrow">Impact</p>
          <h2>Built for performance, trust, and measurable business value.</h2>
        </div>

        <div className="impact-grid">
          {impact.map((point, index) => (
            <div className="impact-card card-panel" key={point}>
              <span className="impact-number">0{index + 1}</span>
              <p>{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="portfolio-cta card-panel">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>Selected work is in progress.</h2>
          </div>
          <Link className="primary-button" href="/portfolio">
            Explore the roadmap
          </Link>
        </div>
      </section>

      <section id="contact" className="section footer-cta">
        <p className="eyebrow">Let’s build what’s next</p>
        <h2>Need a cloud architect who can align engineering, operations, and business outcomes?</h2>
        <div className="cta-row">
          <a className="primary-button" href="mailto:bm80177@gmail.com">
            bm80177@gmail.com
          </a>
          <a className="secondary-button" href="https://www.linkedin.com/in/mishrab" target="_blank" rel="noreferrer">
            LinkedIn profile
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <p>© 2026 Bibhup Mishra</p>
        <div>
          <a href="https://www.linkedin.com/in/mishrab" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href="https://medium.com/@bibhup_mishra" target="_blank" rel="noreferrer">
            Medium
          </a>
        </div>
      </footer>

      <DigitalTwinChat />
    </main>
  );
}
