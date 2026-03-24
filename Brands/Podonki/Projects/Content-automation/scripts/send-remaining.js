import https from 'https'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const TOKEN = '8656548869:AAG7-MGcZVOaEoFhfGtlR8AHDmZx5YrsDNs'
const CHAT = '358580133'
const BASE = 'c:/Users/Пох кто/OneDrive/Рабочий стол/Projects/Podonki/Projects/Content-automation/Материалы'

const posts = [
  { name: 'Mini', image: `${BASE}/Канал Podonki OFF/Жевательный табак/PDNK Mini/Готовые картинки/1.jpg`,
    caption: '<i><b>Помещается в кармане, работает на полную</b>\n\nPodonki Mini для тех, кто всегда в движении. Жевательный табак, 6,5 гр, 20 порций\n\n6 вкусов: виноград, малина, вишнёвая кола, сладкая мята, вишня, лесные ягоды\n\nМаленький формат – не значит слабый. Компактный, удобный, везде с собой\n\nКакой вкус затестишь первым?</i>' },
  { name: 'Original (tobacco)', image: `${BASE}/Канал Podonki OFF/Жевательный табак/Podonki Original/Мокапы/SWEET MINT.png`,
    caption: '<i><b>5 оттенков мяты. Каждый – другой</b>\n\nPodonki Original жевательный табак для тех, кто знает, чего хочет\n\nМята. Ментол. Сладкая мята. Cold dry. Двойная мята – крепче и ярче\n\nДва формата на выбор: Normal или Slim. Свежесть без химозного привкуса\n\nТы за классику или за двойную мяту?</i>' },
  { name: 'Click', image: `${BASE}/Канал Podonki OFF/Жевательный табак/PDNK Click (с капсулой)/Готовые картинки/1.jpg`,
    caption: '<i><b>Сначала вкус. Потом щёлк – и ментоловый взрыв</b>\n\nPodonki Click жевательный табак с капсулой. Два вкуса в одном пауче\n\n10 вкусов: арбуз, кактус, вишня, мята, ананас, яблоко, дыня, кола, мятная жвачка, черника\n\nНадкусил капсулу – и всё меняется. Как сюжетный поворот, только во рту\n\nКто уже щёлкал?</i>' },
  { name: 'Swedish', image: `${BASE}/Канал Podonki OFF/Жевательный табак/PDNK Swedish Collection/Готовые картинки/1.jpg`,
    caption: '<i><b>Шведская технология, скандинавский дизайн, доступная цена</b>\n\nPodonki Swedish Collection жевательный табак для тех, кто ценит качество без понтов\n\n4 вкуса: Mint, Double Mint, Cold Dry, Cherry. 16 паучей, 10 гр\n\nКрасно-белая минималистичная упаковка – выглядит дороже, чем стоит. Классика, проверенная временем\n\nCherry или Double Mint – что ближе?</i>' },
  { name: 'Классическая', image: `${BASE}/Канал Podonki OFF/Конструкторы/Классическая линейка Podgonki/Готовые картинки/image_2026-01-25_14-57-06.png`,
    caption: '<i><b>43 вкуса. Крепкость – какую хочешь. Конструктор, который собираешь сам</b>\n\nКлассическая линейка Podgonki для парней, которые не хотят компромиссов\n\nФрукты, ягоды, газировки, сладости – 43 штуки. Выбираешь крепкость сам: 0 мг, 20 мг, 50 мг или своя\n\nКаждый вкус полностью тестирован, стабильность от флакона к флакону\n\nКакой вкус соберёшь?</i>' },
  { name: 'Кислая', image: `${BASE}/Канал Podonki OFF/Конструкторы/Кислая линейка Podgonki/Готовые картинки/1.jpg`,
    caption: '<i><b>Было 15. Стало 25. Кислая линейка выросла вдвое</b>\n\nКислая линейка Podgonki для тех, кто любит когда кислота будит рецепторы\n\n25 вкусов: ягоды, фрукты, мармелад, напитки, экзотика. Кислота пробуждает и дарит яркие ощущения\n\nКрепкость на выбор: 0 мг, 20 мг, 50 мг или своя. Продано 1 млн+ конструкторов\n\nКакой вкус выберешь?</i>' },
  { name: 'Американская', image: `${BASE}/Канал Podonki OFF/Конструкторы/Американская линейка Podgonki/Готовые картинки/1.jpg`,
    caption: '<i><b>10 американских ароматизаторов. Без химозных нот, только чистые миксы</b>\n\nАмериканская линейка Podgonki премиум конструктор в бруклинском стиле\n\nВысокая концентрация – флакона хватает дольше. Нет нагара, нет забитых испарителей. Сюрприз в каждой упаковке\n\nQR-код на розыгрыш Chevrolet Camaro. Лимитка – потом не будет\n\nСобрал уже или только начинаешь?</i>' }
]

async function sendPhoto(caption, imagePath) {
  let sendPath = imagePath
  const tmpPath = path.join(path.dirname(imagePath), '_tmp.jpg')
  const stats = fs.statSync(imagePath)
  const ext = path.extname(imagePath).toLowerCase()

  if (stats.size > 10 * 1024 * 1024 || ext === '.webp') {
    const pyCmd = `from PIL import Image; img = Image.open(r'${imagePath}'); img = img.convert('RGB'); img.save(r'${tmpPath}', 'JPEG', quality=85)`
    execSync(`python -c "${pyCmd}"`)
    sendPath = tmpPath
  }

  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(sendPath)
    const boundary = '----FB' + Math.random().toString(36).slice(2)
    const sendExt = path.extname(sendPath).toLowerCase().slice(1) || 'jpg'
    const mime = sendExt === 'png' ? 'image/png' : 'image/jpeg'

    const parts = []
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="photo.${sendExt}"\r\nContent-Type: ${mime}\r\n\r\n`))
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
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath) } catch {}
        const r = JSON.parse(d)
        if (r.ok) resolve(r.result.message_id)
        else reject(new Error(r.description))
      })
    })
    req.write(body)
    req.end()
  })
}

async function main() {
  for (let i = 0; i < posts.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1500))
    try {
      const id = await sendPhoto(posts[i].caption, posts[i].image)
      console.log(`${posts[i].name} -> msg ${id}`)
    } catch (e) {
      console.error(`${posts[i].name} ERROR: ${e.message}`)
    }
  }
}

main()
