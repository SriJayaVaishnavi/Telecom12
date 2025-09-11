// src/components/KnowledgeHub.js
import React, { useEffect, useState } from 'react';
import { kbMemoryModule } from '../utils/memoryModules';

// Icons (copy-paste from your design)
const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const IconWifi = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a8 8 0 0 1 14 0"/>
    <path d="M2 8.82a15 15 0 0 1 20 0"/>
    <path d="M8.5 16.42a4 4 0 0 1 7 0"/>
    <line x1="12" y1="20" x2="12.01" y2="20"/>
  </svg>
);

const IconMobile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);

const IconServer = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/>
    <line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>
);

const IconCreditCard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconTools = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconUserCog = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const KnowledgeHub = () => {
  const [recentArticle, setRecentArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Mobile Services');

  // Show most recent article
  useEffect(() => {
    if (kbMemoryModule.length > 0) {
      setRecentArticle(kbMemoryModule[kbMemoryModule.length - 1]);
    }
  }, []);

  const categories = [
    { name: 'Internet & WiFi', icon: <IconWifi /> },
    { name: 'Mobile Services', icon: <IconMobile />, active: true },
    { name: 'Modem Setup', icon: <IconServer /> },
    { name: 'Technical Payments', icon: <IconCreditCard /> },
    { name: 'Technical Support', icon: <IconTools /> },
    { name: 'Account Management', icon: <IconUserCog /> },
  ];

  const quickLinks = ['Quick Links', 'Top 10 FAQs', 'Billing Inquiries', 'Speed Problems', 'Service Outages'];

  const filteredArticles = kbMemoryModule.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.issue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.appContainer}>
      <style>{globalStyles}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <IconBook />
          <h1 style={styles.headerH1}>Knowledge Hub</h1>
        </div>
        <nav style={styles.nav}>
          <a href="#home" style={styles.navLink}>Home</a>
          <a href="#articles" style={{...styles.navLink, ...styles.activeNavLink}}>Articles</a>
          <a href="#new" style={styles.navLink}>New Article</a>
        </nav>
      </header>

      {/* Main Layout */}
      <main style={styles.mainLayout}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <h3 style={styles.sidebarH3}>Browse Categories</h3>
          <ul style={styles.sidebarUl}>
            {categories.map((cat) => (
              <li
                key={cat.name}
                style={cat.name === activeCategory ? {...styles.sidebarLi, ...styles.activeSidebarLi} : styles.sidebarLi}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Wrapper */}
        <div style={styles.contentWrapper}>
          {/* Search Area */}
          <div style={styles.searchContainer}>
            <div style={styles.searchBar}>
              <input
                type="text"
                placeholder="Search for articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button style={styles.searchButton}><IconSearch /></button>
            </div>
            <div style={styles.quickLinks}>
              {quickLinks.map(link => (
                <button key={link} style={styles.quickLinkButton}>{link}</button>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div style={styles.mainContent}>
            {/* Middle Column */}
            <div style={styles.contentColumn}>
              {filteredArticles.slice(0, 2).map((entry, i) => (
                <div key={`mid-${i}`} style={styles.card}>
                  <h4 style={styles.cardH4}>{entry.ticketId}</h4>
                  <p style={styles.cardP}><strong>Issue:</strong> {entry.issue}</p>
                  {i === 0 && (
                    <ul style={styles.subIssues}>
                      <li>Connection Issues</li>
                      <li>Speed Problems</li>
                      <li>Service Outages</li>
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div style={styles.contentColumn}>
              {recentArticle && (
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h4 style={styles.cardH4}>Featured Article</h4>
                    <span style={{...styles.tag, ...styles.tagResolved}}>Resolved</span>
                  </div>
                  <h5 style={styles.cardH5}>{recentArticle.title}</h5>
                  <p style={styles.cardP}><strong>Issue:</strong> {recentArticle.issue}</p>
                  <p style={styles.cardP}><strong>Solution:</strong> {recentArticle.solution}</p>
                  <div style={styles.tagsContainer}>
                    <span style={styles.tagGreen}>firmware</span>
                    <span style={styles.tagGreen}>update</span>
                    <span style={styles.tagGreen}>router</span>
                  </div>
                </div>
              )}

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h4 style={styles.cardH4}>Featured Article</h4>
                </div>
                <h5 style={styles.cardH5}>Troubleshooting Slow Internet Speeds</h5>
                <p style={styles.cardP}><strong>Issue:</strong> Customer reported internet disconnects after recent firmware update...</p>
                <p style={styles.cardP}><strong>Solution:</strong> Followed playbook KB-ONT-014...</p>
                <div style={styles.tagsContainer}>
                  <span style={styles.tagGreen}>firmware</span>
                  <span style={styles.tagGreen}>update</span>
                  <span style={styles.tagGreen}>router</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Feedback Button */}
      <button style={styles.feedbackButton}>Submit Feedback</button>
    </div>
  );
};

export default KnowledgeHub;

// JSS-like styles object
const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f4f7fa',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e9ecef',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', color: '#7C3AED' },
  headerH1: { fontSize: '1.4rem', margin: 0, fontWeight: 600 },
  nav: { display: 'flex', gap: '30px' },
  navLink: {
    textDecoration: 'none',
    color: '#6c757d',
    fontWeight: 500,
    padding: '5px 0',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  activeNavLink: { color: '#7C3AED', borderBottomColor: '#7C3AED' },
  mainLayout: { display: 'flex', flexGrow: 1, padding: '20px', gap: '20px', overflow: 'hidden' },
  sidebar: {
    flex: '0 0 260px',
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    height: 'fit-content',
  },
  sidebarH3: { marginTop: 0, fontSize: '1.1rem', color: '#333' },
  sidebarUl: { listStyleType: 'none', padding: 0, margin: 0 },
  sidebarLi: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: '#6c757d',
    fontWeight: 500,
  },
  activeSidebarLi: { backgroundColor: '#F3E8FF', color: '#7C3AED', fontWeight: 600 },
  contentWrapper: { flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  searchContainer: { marginBottom: '20px' },
  searchBar: { display: 'flex', marginBottom: '15px' },
  searchInput: {
    flexGrow: 1,
    padding: '12px 15px',
    border: '1px solid #e9ecef',
    borderRight: 'none',
    borderRadius: '6px 0 0 6px',
    fontSize: '1rem',
    outline: 'none',
  },
  searchButton: {
    padding: '0 20px',
    border: 'none',
    backgroundColor: '#7C3AED',
    color: 'white',
    borderRadius: '0 6px 6px 0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  quickLinks: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  quickLinkButton: {
    padding: '8px 15px',
    border: '1px solid #e9ecef',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '10px',
  },
  contentColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e9ecef',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  cardH4: { margin: 0, fontSize: '1rem', color: '#333' },
  cardH5: { margin: '0 0 10px 0', fontSize: '1.1rem', color: '#7C3AED' },
  cardP: { margin: '5px 0', color: '#6c757d', fontSize: '0.9rem', lineHeight: 1.5 },
  tag: { fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 },
  tagResolved: { backgroundColor: '#F3E8FF', color: '#7C3AED' },
  tagUpdated: { backgroundColor: '#fff4e5', color: '#ff9f0a' },
  tagsContainer: { marginTop: '15px', display: 'flex', gap: '8px' },
  tagGreen: {
    display: 'inline-block',
    backgroundColor: '#F3E8FF',
    color: '#7C3AED',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  subIssues: { listStyle: "'›  '", paddingLeft: '20px', marginTop: '15px', color: '#333' },
  feedbackButton: {
    position: 'fixed',
    bottom: '25px',
    right: '25px',
    padding: '12px 20px',
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 1000,
  },
};

const globalStyles = `
  .sub-issues li { cursor: pointer; padding: 5px; }
  .sub-issues li:hover { color: #7C3AED; }
  a:hover { color: #333 !important; }
  .quick-link-button:hover { background: #F3E8FF; border-color: #7C3AED; }
  .sidebar-li:hover { background-color: #f8f9fa; }
`;