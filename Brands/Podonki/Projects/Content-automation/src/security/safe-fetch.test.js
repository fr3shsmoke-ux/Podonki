import { validateUrl, isDomainAllowed, allowDomain, allowPort } from './safe-fetch.js'

describe('SSRF Protection', () => {
  test('allows api.telegram.org', () => {
    expect(() => validateUrl('https://api.telegram.org/bot123/sendMessage')).not.toThrow()
  })

  test('allows localhost with known port', () => {
    expect(() => validateUrl('http://localhost:6333/collections')).not.toThrow()
  })

  test('blocks private IPs', () => {
    expect(() => validateUrl('http://192.168.1.1/admin')).toThrow('Blocked private IP')
    expect(() => validateUrl('http://10.0.0.1/secret')).toThrow('Blocked private IP')
  })

  test('blocks unknown domains', () => {
    expect(() => validateUrl('https://evil.com/steal')).toThrow('Domain not in allowlist')
  })

  test('blocks file protocol', () => {
    expect(() => validateUrl('file:///etc/passwd')).toThrow('Blocked protocol')
  })

  test('blocks unknown ports', () => {
    expect(() => validateUrl('http://localhost:9999/api')).toThrow('Port not allowed')
  })

  test('isDomainAllowed checks subdomains', () => {
    expect(isDomainAllowed('api.telegram.org')).toBe(true)
    expect(isDomainAllowed('sub.api.telegram.org')).toBe(true)
    expect(isDomainAllowed('evil.org')).toBe(false)
  })

  test('allowDomain adds new domain', () => {
    allowDomain('custom-api.example.com')
    expect(isDomainAllowed('custom-api.example.com')).toBe(true)
  })

  test('allowPort adds new port', () => {
    expect(() => validateUrl('http://localhost:9999/api')).toThrow()
    allowPort(9999)
    expect(() => validateUrl('http://localhost:9999/api')).not.toThrow()
  })
})
