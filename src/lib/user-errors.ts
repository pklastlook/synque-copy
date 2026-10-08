// ============================================================================
// userFriendlyError — convert raw technical errors to user-facing messages.
// ----------------------------------------------------------------------------
// Most users don't care that "Cannot read properties of undefined (reading
// 'map')" happened — they need to know "something went wrong, try refreshing".
// This helper inspects the error message and returns a friendly string. When
// no known pattern matches, the original message is truncated so a long
// technical stack doesn't bleed into the toast.
//
// Usage:
//   } catch (e) {
//     toast.error(userFriendlyError(e));
//   }
//
// The helper is intentionally defensive — it must NEVER throw, even when given
// weird inputs (null, undefined, primitives, etc.).
// ============================================================================

export function userFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message ?? "";
    if (!msg) return "An unexpected error occurred. Please try again.";

    // Network / fetch failures (CORS, offline, DNS, etc.)
    if (/fetch|network|Failed to fetch|NetworkError|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
      return "Network error. Check your connection and try again.";
    }
    // Auth — session expired / not logged in
    if (/401|Unauthorized|Authentication required|JWT|token/i.test(msg)) {
      return "Your session has expired. Please log in again.";
    }
    // Forbidden — insufficient role
    if (/403|Forbidden|Access denied|Insufficient permissions|Not allowed/i.test(msg)) {
      return "You don't have permission to do this.";
    }
    // Rate-limited
    if (/429|Too many requests|Rate limit/i.test(msg)) {
      return "Too many requests. Please wait a moment and try again.";
    }
    // Server error
    if (/500|Internal server error|Server error|EAI_AGAIN/i.test(msg)) {
      return "Server error. Our team has been notified. Please try again later.";
    }
    // JS runtime crashes — usually a UI bug, not user-fixable
    if (/Cannot read properties of (undefined|null)|undefined is not an object|is not a function/i.test(msg)) {
      return "Something went wrong. Please refresh the page and try again.";
    }
    // Validation errors — pass through verbatim but cap length
    if (/required|invalid|must be|cannot be empty|already exists|not found/i.test(msg)) {
      return msg.length > 120 ? msg.slice(0, 117) + "…" : msg;
    }
    // Request failed with HTTP status code — generic catch-all
    const statusMatch = msg.match(/Request failed \((\d+)\)/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      if (code === 401) return "Your session has expired. Please log in again.";
      if (code === 403) return "You don't have permission to do this.";
      if (code === 404) return "We couldn't find that. It may have been deleted.";
      if (code === 409) return "This already exists. Try a different value.";
      if (code === 429) return "Too many requests. Please wait a moment and try again.";
      if (code >= 500) return "Server error. Our team has been notified. Please try again later.";
      return `Request failed (${code}). Please try again.`;
    }
    // Default — preserve the original message but truncate long ones so the
    // toast doesn't overflow. Most backend errors are already human-readable.
    return msg.length > 120 ? msg.slice(0, 117) + "…" : msg;
  }
  if (typeof error === "string") {
    return error.length > 120 ? error.slice(0, 117) + "…" : error;
  }
  return "An unexpected error occurred. Please try again.";
}
