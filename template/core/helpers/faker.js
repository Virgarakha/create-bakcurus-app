import { randomInt, randomUUID } from 'node:crypto'

const firstNames = ['Rakha', 'Alya', 'Dimas', 'Siti', 'Budi', 'Nadia', 'Fajar', 'Putri', 'Rizky', 'Andi']
const lastNames = ['Santoso', 'Wijaya', 'Saputra', 'Pratama', 'Lestari', 'Hidayat', 'Nugroho', 'Kurniawan']
const domains = ['example.com', 'mail.test', 'backurus.dev']

function pick(list) {
  return list[randomInt(0, list.length)]
}

function letters(count) {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let out = ''
  for (let i = 0; i < count; i += 1) out += chars[randomInt(0, chars.length)]
  return out
}

export function faker() {
  return {
    uuid() {
      return randomUUID()
    },
    name() {
      return `${pick(firstNames)} ${pick(lastNames)}`
    },
    email() {
      const user = `${letters(6)}.${letters(5)}`
      return `${user}@${pick(domains)}`
    }
  }
}

