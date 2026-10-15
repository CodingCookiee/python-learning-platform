/**
 * Field names that must never sit in a URL. A form submitted before its page's script loads used to
 * be sent as a GET, with the email and password in the address (browser history, server logs). The
 * forms now post; a page that still receives these in its query redirects to a clean address.
 */
const SECRET_FIELDS = ["password", "confirmPassword", "currentPassword", "newPassword", "apiKey", "email"];

export function hasCredentialsInQuery(params: Record<string, string | string[] | undefined>): boolean {
  return SECRET_FIELDS.some((f) => params[f] !== undefined);
}
