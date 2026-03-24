import { execSync } from 'child_process'

export function polishWithFabric(prompt) {
  try {
    execSync('fabric --version', { stdio: 'ignore' })

    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    const result = execSync(`echo "${escaped}" | fabric -p improve_prompt`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'ignore']
    })

    return result.trim() || prompt
  } catch {
    console.log('Fabric недоступен, пропускаю полировку')
    return prompt
  }
}
