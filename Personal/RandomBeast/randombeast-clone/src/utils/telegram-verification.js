import crypto from 'crypto'

/**
 * Verify Telegram Web App initialization data
 * @param {string} initData - Raw initData from Telegram.WebApp
 * @param {string} botToken - Bot token from @BotFather
 * @returns {boolean} - Is data valid
 */
export function verifyTelegramWebApp(initData, botToken) {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')

    if (!hash) {
      return false
    }

    params.delete('hash')

    // Create data check string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Create secret key using SHA256
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return hash === calculatedHash
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}

/**
 * Parse user data from initData
 * @param {string} initData - Raw initData from Telegram.WebApp
 * @returns {object|null} - Parsed user object or null
 */
export function parseUserData(initData) {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')

    if (!userStr) {
      return null
    }

    return JSON.parse(userStr)
  } catch (error) {
    console.error('Parse user error:', error)
    return null
  }
}

/**
 * Check if user is subscription is valid
 * @param {object} startParam - Start parameter from Telegram
 * @returns {object} - Subscription check result
 */
export function parseStartParam(initData) {
  try {
    const params = new URLSearchParams(initData)
    return params.get('start_param') || null
  } catch (error) {
    console.error('Parse start param error:', error)
    return null
  }
}
