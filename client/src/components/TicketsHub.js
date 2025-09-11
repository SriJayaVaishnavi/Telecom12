// src/components/TicketsHub.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketMemoryModule, kbMemoryModule, syncKbMemory } from '../utils/memoryModules';

const TicketsHub = () => {
  const [addedToKb, setAddedToKb] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('My Open Tickets');
  const navigate = useNavigate();

  const handleAddToKB = (ticket) => {
    const exists = kbMemoryModule.some(entry => entry.ticketId === ticket.id);
    if (!exists) {
      // Add to KB memory
      kbMemoryModule.push({
        ticketId: ticket.id,
        title: `Resolved: ${ticket.issueSummary.substring(0, 60)}...`,
        issue: ticket.issueSummary,
        solution: ticket.solution,
        context: ticket.transcript.slice(0, 300) + '...',
        timestamp: new Date().toISOString(),
        publishedBy: 'Jennifer Miller'
      });

      // Sync to sessionStorage
      syncKbMemory();

      // Update UI state
      setAddedToKb(prev => new Set([...prev, ticket.id]));

      // Feedback
      alert(`✅ Ticket ${ticket.id} published to Knowledge Base!`);

      // Navigate to knowledge hub
      navigate('/knowledge-hub');
    }
  };

  // Filter tickets based on search
  const filteredTickets = ticketMemoryModule.filter(ticket =>
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.issueSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.customerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.appContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <h1 style={styles.headerH1}>Ticket Hub</h1>
        </div>
        <nav style={styles.nav}>
          <a href="#dashboard" style={{...styles.navLink}}>Dashboard</a>
          <a href="#tickets" style={{...styles.navLink, ...styles.activeNavLink}}>All Tickets</a>
          <a href="#new" style={styles.navLink}>New Ticket</a>
        </nav>
      </header>

      {/* Main Layout */}
      <main style={styles.mainLayout}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <h3 style={styles.sidebarH3}>Filter Tickets</h3>
          <ul style={styles.sidebarUl}>
            {[
              { name: 'My Open Tickets', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
              { name: 'Unassigned', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
              { name: 'High Priority', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0z"/><line x1="12" y1="22" x2="12" y2="15"/></svg> },
              { name: 'Recently Resolved', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
            ].map((filter) => (
              <li
                key={filter.name}
                style={{
                  ...styles.sidebarLi,
                  ...(activeCategory === filter.name ? styles.activeSidebarLi : {}),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  lineHeight: '1.2',
                  margin: '4px 0'
                }}
                onClick={() => setActiveCategory(filter.name)}
              >
                {filter.icon}
                <span>{filter.name}</span>
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
                placeholder="Search tickets by ID, subject, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button style={styles.searchButton}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="white" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Ticket List */}
          <div style={styles.ticketListContainer}>
            <header style={styles.ticketListHeader}>
              <div>Ticket ID</div>
              <div>Subject</div>
              <div>Customer</div>
              <div>Status</div>
              <div>Last Update</div>
              <div>Actions</div>
            </header>
            <div style={styles.ticketListBody}>
              {filteredTickets.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d', fontStyle: 'italic' }}>
                  No tickets found.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  // Format date
                  const createdAt = new Date(ticket.createdAt);
                  const now = new Date();
                  let timeLabel;
                  const diffInHours = (now - createdAt) / (1000 * 60 * 60);

                  if (diffInHours < 1) {
                    timeLabel = 'Just now';
                  } else if (diffInHours < 24) {
                    timeLabel = `${Math.floor(diffInHours)} hours ago`;
                  } else {
                    timeLabel = `${Math.floor(diffInHours / 24)} days ago`;
                  }

                  return (
                    <div
                      key={ticket.id}
                      style={{
                        ...styles.ticketRow,
                        ...(addedToKb.has(ticket.id) ? styles.ticketRowNewlyCreated : {})
                      }}
                    >
                      <div><strong>{ticket.id}</strong></div>
                      <div className="ticket-subject">{ticket.issueSummary}</div>
                      <div>{ticket.customerId}</div>
                      <div>
                        <span
                          style={{
                            ...styles.statusTag,
                            ...(ticket.status === 'Open' && styles.statusPending),
                            ...(ticket.status === 'Resolved' && styles.statusResolved),
                            ...(ticket.status === 'Escalated' && styles.statusOpen),
                            ...(addedToKb.has(ticket.id) && styles.statusNew)
                          }}
                        >
                          {addedToKb.has(ticket.id) ? 'New' : ticket.status}
                        </span>
                      </div>
                      <div>{timeLabel}</div>
                      <div>
                        <button
                          onClick={() => handleAddToKB(ticket)}
                          disabled={addedToKb.has(ticket.id)}
                          style={{
                            ...styles.actionButton,
                            opacity: addedToKb.has(ticket.id) ? 0.6 : 1,
                            cursor: addedToKb.has(ticket.id) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14m-7-7h14"/>
                          </svg>
                          <span>Add to KB</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketsHub;

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
    flexShrink: 0,
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
  ticketListContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e9ecef',
    overflow: 'hidden',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  ticketListHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 3fr 2fr 1.5fr 1.5fr 1.5fr',
    gap: '20px',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #e9ecef',
    fontWeight: 600,
    color: '#6c757d',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
  },
  ticketListBody: {
    overflowY: 'auto',
    flexGrow: 1,
  },
  ticketRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 3fr 2fr 1.5fr 1.5fr 1.5fr',
    gap: '20px',
    alignItems: 'center',
    padding: '15px 20px',
    fontSize: '0.95rem',
    borderBottom: '1px solid #e9ecef',
    transition: 'background-color 0.2s ease',
  },
  ticketRowNewlyCreated: {
    backgroundColor: '#f3e8ff60',
    borderLeft: '3px solid #7C3AED',
    paddingLeft: '17px',
  },
  statusTag: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.8rem',
    textAlign: 'center',
    width: 'fit-content',
  },
  statusOpen: { backgroundColor: '#e6f7ff', color: '#1890ff' },
  statusPending: { backgroundColor: '#fffbe6', color: '#faad14' },
  statusNew: { backgroundColor: '#f3e8ff', color: '#7c3aed' },
  statusResolved: { backgroundColor: '#f6ffed', color: '#52c41a' },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid #c2a1f4',
    backgroundColor: '#F3E8FF',
    color: '#7C3AED',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};