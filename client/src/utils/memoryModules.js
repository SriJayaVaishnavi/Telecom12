// src/utils/memoryModules.js

const loadFromSession = (key, defaultValue) => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.warn(`Failed to load ${key} from sessionStorage`, e);
      return defaultValue;
    }
  };
  
  const saveToSession = (key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Failed to save ${key} to sessionStorage`, e);
    }
  };
  
  export let ticketMemoryModule = loadFromSession('ticketMemoryModule', []);
  export let kbMemoryModule = loadFromSession('kbMemoryModule', []);
  
  export const syncTicketMemory = () => {
    saveToSession('ticketMemoryModule', ticketMemoryModule);
  };
  
  export const syncKbMemory = () => {
    saveToSession('kbMemoryModule', kbMemoryModule);
  };

  export const addKbEntryFromTicket = (ticket) => {
    const exists = kbMemoryModule.some(entry => entry.ticketId === ticket.id);
    if (!exists) {
      kbMemoryModule = [
        ...kbMemoryModule,
        {
          ticketId: ticket.id,
          title: `${ticket.status === 'Resolved' ? '✅' : '⚠️'} ${ticket.status}: ${ticket.issueSummary.substring(0, 60)}${ticket.issueSummary.length > 60 ? '...' : ''}`,
          issue: ticket.issueSummary,
          solution: ticket.solution,
          context: (ticket.transcript || '').slice(0, 300) + '...',
          timestamp: new Date().toISOString(),
          status: ticket.status // Include the status in the KB entry
        }
      ];
      syncKbMemory();
      return true;
    }
    return false;
  };
  
  // Auto-sync on exit
  window.addEventListener('beforeunload', () => {
    syncTicketMemory();
    syncKbMemory();
  });