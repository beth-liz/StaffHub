/**
 * AI Session Manager — Per-User Isolated Sessions
 * 
 * Every user gets their own conversation history, list context,
 * and slot-filling state. Sessions are keyed by userId string.
 * On logout the session is wiped completely.
 */

const MAX_HISTORY = 20;

// ─── In-Memory Session Store ──────────────────────────────────────────────────
const sessions = new Map();

/**
 * Get or create a session for the given userId.
 */
export const getSession = (userId) => {
  const key = userId.toString();
  if (!sessions.has(key)) {
    sessions.set(key, {
      history: [],       // { role: 'user'|'assistant', content: string }[]
      listContext: [],    // { number: 1, id: string, label: string, type: string }[]
      slotSession: null,  // active slot-filling session (local intent engine)
    });
  }
  return sessions.get(key);
};

/**
 * Add a message to the user's conversation history.
 * Keeps only the last MAX_HISTORY messages.
 */
export const addToHistory = (userId, role, content) => {
  const session = getSession(userId);
  session.history.push({ role, content });
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
};

/**
 * Get the conversation history for the given userId.
 */
export const getHistory = (userId) => {
  return getSession(userId).history;
};

/**
 * Store a numbered list context for selection.
 * Items should be: { number, id, label, type, meta? }
 */
export const setListContext = (userId, items) => {
  const session = getSession(userId);
  session.listContext = items;
};

/**
 * Retrieve the current list context.
 */
export const getListContext = (userId) => {
  return getSession(userId).listContext;
};

/**
 * Get a specific item from the list context by its number.
 */
export const getListItemByNumber = (userId, number) => {
  const items = getListContext(userId);
  return items.find(item => item.number === number) || null;
};

/**
 * Set the active slot-filling session.
 */
export const setSlotSession = (userId, session) => {
  getSession(userId).slotSession = session;
};

/**
 * Get the active slot-filling session.
 */
export const getSlotSession = (userId) => {
  return getSession(userId).slotSession;
};

/**
 * Clear the slot-filling session.
 */
export const clearSlotSession = (userId) => {
  getSession(userId).slotSession = null;
};

/**
 * Completely wipe a user's session (called on logout).
 */
export const clearSession = (userId) => {
  const key = userId.toString();
  sessions.delete(key);
  console.log(`[AI Session] Cleared session for user ${key}`);
};

/**
 * Check if a session exists for the given userId.
 */
export const hasSession = (userId) => {
  return sessions.has(userId.toString());
};
