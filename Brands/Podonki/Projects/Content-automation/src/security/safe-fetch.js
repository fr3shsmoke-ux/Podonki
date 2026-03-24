/**
 * SSRF-protected fetch wrapper
 * Validates URLs against allowlist before making requests
 */

const ALLOWED_DOMAINS = [
  'api.anthropic.com',
  'api.telegram.org',
  'localhost',
  '127.0.0.1',
  'api.openai.com',
  'generativelanguage.googleapis.com',
]

const ALLOWED_PORTS = new Set([
  80, 443,
  3000, 3001, 3777,    // dev servers
  5678,                  // n8n
  6333,                  // qdrant
  8188,                  // comfyui
  11434,                 // ollama
])

const BLOCKED_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
]

/**
 * Check if a domain is in the allowlist
 */
function isDomainAllowed(hostname) {
  if (ALLOWED_DOMAINS.includes(hostname)) return true

  // Allow subdomains of allowed domains
  for (const domain of ALLOWED_DOMAINS) {
    if (hostname.endsWith('.' + domain)) return true
  }

  return false
}

/**
 * Check if IP is in a blocked private range
 */
function isPrivateIP(ip) {
  return BLOCKED_IP_RANGES.some(pattern => pattern.test(ip))
}

/**
 * Validate URL before fetching
 */
function validateUrl(urlStr) {
  let url
  try {
    url = new URL(urlStr)
  } catch {
    throw new Error(`Invalid URL: ${urlStr}`)
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Blocked protocol: ${url.protocol}`)
  }

  const hostname = url.hostname

  // Block private IPs (except localhost which is explicitly allowed)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && isPrivateIP(hostname)) {
    throw new Error(`Blocked private IP: ${hostname}`)
  }

  // Check domain allowlist
  if (!isDomainAllowed(hostname)) {
    throw new Error(`Domain not in allowlist: ${hostname}. Add it to ALLOWED_DOMAINS.`)
  }

  // Check port if specified
  const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80)
  if (!ALLOWED_PORTS.has(port)) {
    throw new Error(`Port not allowed: ${port}. Add it to ALLOWED_PORTS.`)
  }

  return url
}

/**
 * Safe fetch — validates URL before request
 */
async function safeFetch(urlStr, options = {}) {
  validateUrl(urlStr)

  // Prevent redirects to blocked destinations
  const res = await fetch(urlStr, {
    ...options,
    redirect: options.redirect || 'manual',
  })

  // If redirect, validate the target URL too
  if ([301, 302, 307, 308].includes(res.status)) {
    const location = res.headers.get('location')
    if (location) {
      const redirectUrl = new URL(location, urlStr).toString()
      validateUrl(redirectUrl)
      return fetch(redirectUrl, { ...options, redirect: 'manual' })
    }
  }

  return res
}

/**
 * Add a domain to the allowlist at runtime
 */
function allowDomain(domain) {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain)
  }
}

/**
 * Add a port to the allowlist at runtime
 */
function allowPort(port) {
  ALLOWED_PORTS.add(port)
}

export { safeFetch, validateUrl, allowDomain, allowPort, isDomainAllowed }
export default safeFetch
