import https from 'https'
import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const TOKEN = '8656548869:AAG7-MGcZVOaEoFhfGtlR8AHDmZx5YrsDNs'
const APPROVAL_CHAT = '358580133'

export async function sendPost(caption, imagePath) {
  // Compress if needed
  const stats = fs.statSync(imagePath)
  let sendPath = imagePath
  const tmpPath = path.join(path.dirname(imagePath), '_tmp_compressed.jpg')

  if (stats.size > 10 * 1024 * 1024) {
    execSync(`python -c "from PIL import Image; img = Image.open(r'${imagePath.replace(/'/g, "\\'")}'); img = img.convert('RGB'); img.save(r'${tmpPath.replace(/'/g, "\\'")}', 'JPEG', quality=80)"`)
    sendPath = tmpPath
  }

  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(sendPath)
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
    const ext = path.extname(sendPath).slice(1) || 'jpg'
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'

    const parts = []
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${APPROVAL_CHAT}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="photo.${ext}"\r\nContent-Type: ${mime}\r\n\r\n`))
    parts.push(imageData)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendPhoto`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
        const r = JSON.parse(d)
        if (r.ok) resolve(r.result.message_id)
        else reject(new Error(d))
      })
    })
    req.write(body)
    req.end()
  })
}

// CLI usage
const args = process.argv.slice(2)
if (args.length >= 2) {
  const caption = args[0]
  const imagePath = args[1]
  sendPost(caption, imagePath)
    .then(id => console.log(`OK message_id: ${id}`))
    .catch(e => console.error('Error:', e.message))
}
