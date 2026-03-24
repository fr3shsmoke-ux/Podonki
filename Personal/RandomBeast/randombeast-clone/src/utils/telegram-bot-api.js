import axios from 'axios'

const TELEGRAM_API_URL = 'https://api.telegram.org/bot'

/**
 * Telegram Bot API wrapper
 */
export class TelegramBotAPI {
  constructor(botToken) {
    this.botToken = botToken
    this.client = axios.create({
      baseURL: `${TELEGRAM_API_URL}${botToken}`,
      timeout: 10000
    })
  }

  /**
   * Check if user is member of channel
   * @param {number} userId - Telegram user ID
   * @param {number} chatId - Channel/group ID
   * @returns {Promise<boolean>}
   */
  async isUserSubscribed(userId, chatId) {
    try {
      const response = await this.client.get('/getChatMember', {
        params: {
          chat_id: chatId,
          user_id: userId
        }
      })

      if (!response.data.ok) {
        return false
      }

      const status = response.data.result.status
      // User is subscribed if status is 'member', 'administrator', 'creator'
      return ['member', 'administrator', 'creator'].includes(status)
    } catch (error) {
      console.error('Check subscription error:', error.message)
      return false
    }
  }

  /**
   * Send message to user
   * @param {number} chatId - User's Telegram ID
   * @param {string} text - Message text
   * @param {object} options - Additional options
   * @returns {Promise<object>}
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await this.client.post('/sendMessage', {
        chat_id: chatId,
        text,
        ...options
      })

      return response.data
    } catch (error) {
      console.error('Send message error:', error.message)
      throw error
    }
  }

  /**
   * Get chat info
   * @param {number} chatId - Channel/group ID
   * @returns {Promise<object>}
   */
  async getChat(chatId) {
    try {
      const response = await this.client.get('/getChat', {
        params: {
          chat_id: chatId
        }
      })

      if (!response.data.ok) {
        throw new Error('Failed to get chat info')
      }

      return response.data.result
    } catch (error) {
      console.error('Get chat error:', error.message)
      throw error
    }
  }

  /**
   * Get me (bot info)
   * @returns {Promise<object>}
   */
  async getMe() {
    try {
      const response = await this.client.get('/getMe')

      if (!response.data.ok) {
        throw new Error('Failed to get bot info')
      }

      return response.data.result
    } catch (error) {
      console.error('Get me error:', error.message)
      throw error
    }
  }
}

export default TelegramBotAPI
