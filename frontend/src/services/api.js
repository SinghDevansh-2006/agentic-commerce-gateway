// ACG Backend API Client
const API_BASE_URL = 'http://127.0.0.1:8088';

/**
 * Fetch health status of ACG C++ HTTP backend
 */
export async function getHealthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('API /health fetch error, trying proxy:', error);
    try {
      const fallback = await fetch('/api/health');
      return await fallback.json();
    } catch {
      return null;
    }
  }
}

/**
 * Fetch transaction audit logs from backend
 */
export async function getAuditLogs() {
  try {
    const response = await fetch(`${API_BASE_URL}/logs`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('API /logs fetch error, trying proxy:', error);
    try {
      const fallback = await fetch('/api/logs');
      const data = await fallback.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}

/**
 * Trigger a new TransactionRequest
 */
export async function submitTransaction(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return { ok: response.ok, data: result };
  } catch (error) {
    console.warn('API /transaction post error, trying proxy:', error);
    try {
      const fallback = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await fallback.json();
      return { ok: fallback.ok, data: result };
    } catch (fallbackError) {
      throw new Error(`Failed to reach ACG Gateway: ${fallbackError.message}`);
    }
  }
}
