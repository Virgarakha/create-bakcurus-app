const ANSI = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  gray: '\u001b[90m',
  bold: '\u001b[1m'
}

function paint(color, text) {
  return `${color}${text}${ANSI.reset}`
}

export const cli = {
  info(message) { console.log(paint(ANSI.blue, message)) },
  success(message) { console.log(paint(ANSI.green, message)) },
  warn(message) { console.log(paint(ANSI.yellow, message)) },
  error(message) { console.log(paint(ANSI.red, message)) },
  dim(message) { console.log(paint(ANSI.gray, message)) },
  banner(message) { console.log(paint(ANSI.bold, message)) },
  table(rows = []) {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)))
    const line = (values) => values.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ')
    console.log(line(headers))
    console.log(widths.map((w) => '-'.repeat(w)).join('  '))
    for (const row of rows) console.log(line(headers.map((h) => row[h])))
  }
}

