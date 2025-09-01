// src/components/Suggestions.js

const Suggestions = ({ suggestions }) => {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  if (safeSuggestions.length === 0) {
    return (
      <div style={{
        margin: '16px 0',
        padding: '12px',
        backgroundColor: '#f9f9fb',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '16px' }}>AI Assistant</h3>
        <p style={{ color: '#777', marginTop: '8px' }}>No suggestions available.</p>
      </div>
    );
  }

  return (
    <div style={{
      margin: '16px 0',
      padding: '12px',
      backgroundColor: '#f9f9fb',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '16px' }}>AI Assistant Suggestions</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
        {safeSuggestions.map((suggestion, index) => (
          <li key={index} style={{
            padding: '8px 0',
            borderBottom: '1px solid #eee',
            fontSize: '14px',
            color: '#212121'
          }}>
            <strong style={{ color: '#0066cc' }}>{suggestion}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Suggestions;