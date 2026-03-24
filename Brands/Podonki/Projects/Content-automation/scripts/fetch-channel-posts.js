import https from 'https'

const TOKEN = '8656548869:AAG7-MGcZVOaEoFhfGtlR8AHDmZx5YrsDNs'
const CHANNEL_ID = '-1001662279308'

async function getChannelMessages(limit = 100) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/getChat?chat_id=${CHANNEL_ID}`,
      method: 'GET'
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.ok) {
            console.log('Channel:', result.result.title)
            console.log('Description:', result.result.description)
            console.log('Members:', result.result.members_count)
          } else {
            console.log('Error:', result.description)
          }
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

getChannelMessages().catch(console.error)
