// OmniDial - Click to Call Content Script
// Intercepts tel: links and opens them in OmniDial

const DEFAULT_DIALER_URL = "http://localhost:3000";

function extractPhoneNumber(href) {
  // Remove "tel:" prefix and decode URI components
  const raw = decodeURIComponent(href.replace(/^tel:/i, ""));
  // Strip whitespace but preserve +, digits, and common separators for the dialer to handle
  return raw.trim();
}

function handleTelClick(e) {
  const link = e.target.closest('a[href^="tel:"], a[href^="Tel:"], a[href^="TEL:"]');
  if (!link) return;

  e.preventDefault();
  e.stopPropagation();

  const phone = extractPhoneNumber(link.href);
  if (!phone) return;

  chrome.storage.sync.get({ dialerUrl: DEFAULT_DIALER_URL }, (settings) => {
    const baseUrl = settings.dialerUrl.replace(/\/+$/, "");
    const dialerLink = `${baseUrl}/dashboard/dialer?phone=${encodeURIComponent(phone)}`;
    window.open(dialerLink, "_blank");
  });
}

// Attach click listener to document (delegation handles dynamic elements too)
document.addEventListener("click", handleTelClick, true);

// Also observe for dynamically added tel: links and add a visual indicator
function markTelLinks(root) {
  const links = root.querySelectorAll('a[href^="tel:"], a[href^="Tel:"], a[href^="TEL:"]');
  links.forEach((link) => {
    if (!link.dataset.omniDial) {
      link.dataset.omniDial = "true";
      link.title = "Click to open in OmniDial";
    }
  });
}

// Mark existing links
markTelLinks(document);

// Watch for new links added to the DOM (SPAs, lazy-loaded content)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        markTelLinks(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
