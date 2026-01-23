// ============================================
// Static Data Service for Email Classification
// ============================================

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'tempail.com', 'fakeinbox.com', 'sharklasers.com',
  'trashmail.com', 'getnada.com', 'maildrop.cc', 'yopmail.com', 'temp-mail.org',
  'discard.email', 'mailnesia.com', 'emailondeck.com', 'mytemp.email',
  'tempr.email', 'burnermail.io', 'guerrillamail.info', 'grr.la', 'mohmal.com',
  'emailfake.com', 'mintemail.com', 'tempmailer.com', 'spamgourmet.com',
  'throwawaymail.com', 'disposemail.com', 'jetable.org', 'getairmail.com',
  'anonymbox.com', 'incognitomail.com', 'dispostable.com', 'fakemail.net',
  'tempinbox.com', 'mailcatch.com', 'bobmail.info', 'spamobox.com',
]);

// Free email provider domains
const FREE_PROVIDER_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr',
  'yahoo.de', 'yahoo.es', 'yahoo.it', 'yahoo.co.jp', 'yahoo.com.br',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.es',
  'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de', 'live.com',
  'live.co.uk', 'msn.com', 'aol.com', 'protonmail.com', 'proton.me',
  'icloud.com', 'me.com', 'mac.com', 'zoho.com', 'mail.com', 'gmx.com',
  'gmx.de', 'gmx.net', 'yandex.com', 'yandex.ru', 'mail.ru', 'inbox.com',
  'fastmail.com', 'tutanota.com', 'pm.me', 'seznam.cz', 'wp.pl', 'onet.pl',
]);

// Role-based email prefixes
const ROLE_BASED_PREFIXES = new Set([
  'info', 'contact', 'support', 'help', 'admin', 'sales', 'marketing',
  'billing', 'accounts', 'hr', 'jobs', 'careers', 'press', 'media',
  'webmaster', 'postmaster', 'hostmaster', 'abuse', 'noreply', 'no-reply',
  'donotreply', 'feedback', 'newsletter', 'subscribe', 'unsubscribe',
  'office', 'team', 'staff', 'hello', 'enquiries', 'enquiry', 'questions',
  'orders', 'service', 'customerservice', 'reception', 'legal', 'compliance',
]);

// Known catch-all domains (large providers that accept all)
const KNOWN_CATCH_ALL_PROVIDERS = new Set([
  'apple.com', 'microsoft.com', 'amazon.com', 'facebook.com', 'meta.com',
]);

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

export function isFreeEmailProvider(domain: string): boolean {
  return FREE_PROVIDER_DOMAINS.has(domain.toLowerCase());
}

export function isRoleBasedEmail(email: string): boolean {
  const localPart = email.split('@')[0]?.toLowerCase();
  if (!localPart) return false;
  return ROLE_BASED_PREFIXES.has(localPart);
}

export function isKnownCatchAll(domain: string): boolean {
  return KNOWN_CATCH_ALL_PROVIDERS.has(domain.toLowerCase());
}

export function validateEmailSyntax(email: string): boolean {
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts[1]?.toLowerCase() || '';
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Generate a random email address for catch-all testing
export function generateRandomTestEmail(domain: string): string {
  const randomString = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `test_${randomString}_${timestamp}@${domain}`;
}

// Get all static data for inspection/debugging
export function getStaticDataStats() {
  return {
    disposableDomains: DISPOSABLE_DOMAINS.size,
    freeProviderDomains: FREE_PROVIDER_DOMAINS.size,
    roleBasedPrefixes: ROLE_BASED_PREFIXES.size,
    knownCatchAllProviders: KNOWN_CATCH_ALL_PROVIDERS.size,
  };
}
