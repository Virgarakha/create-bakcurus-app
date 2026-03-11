import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import mysql from 'mysql2/promise'

class ColumnDefinition {
  constructor(type, name, options = {}) {
    this.type = type
    this.name = name
    this.options = options
    this.modifiers = {
      nullable: false,
      default: undefined,
      unique: false,
      index: false,
      unsigned: false
    }
    this.foreign = null
  }

  nullable() { this.modifiers.nullable = true; return this }
  default(value) { this.modifiers.default = value; return this }
  unique() { this.modifiers.unique = true; return this }
  index() { this.modifiers.index = true; return this }
  unsigned() { this.modifiers.unsigned = true; return this }
  constrained(table, column = 'id') { this.foreign = { table, column }; return this }
}

class TableBlueprint {
  constructor(name) {
    this.name = name
    this.columns = []
  }

  addColumn(type, name, options = {}) {
    const column = new ColumnDefinition(type, name, options)
    this.columns.push(column)
    return column
  }

  id(name = 'id') { return this.addColumn('id', name) }
  string(name, length = 255) { return this.addColumn('string', name, { length }) }
  text(name) { return this.addColumn('text', name) }
  integer(name) { return this.addColumn('integer', name) }
  bigInteger(name) { return this.addColumn('bigInteger', name) }
  boolean(name) { return this.addColumn('boolean', name) }
  date(name) { return this.addColumn('date', name) }
  datetime(name) { return this.addColumn('datetime', name) }
  timestamp(name) { return this.addColumn('timestamp', name) }
  enum(name, values) { return this.addColumn('enum', name, { values }) }
  json(name) { return this.addColumn('json', name) }
  float(name) { return this.addColumn('float', name) }
  double(name) { return this.addColumn('double', name) }
  decimal(name, precision = 12, scale = 2) { return this.addColumn('decimal', name, { precision, scale }) }
  foreignId(name) { return this.addColumn('foreignId', name) }
  timestamps() {
    this.timestamp('created_at').nullable()
    this.timestamp('updated_at').nullable()
  }
}

function quoteDefault(value) {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${String(value)}'`
}

function compileColumn(column, client) {
  const { type, name, options, modifiers, foreign } = column
  const sqlType = (() => {
    if (type === 'id') return client === 'mysql' ? 'INT PRIMARY KEY AUTO_INCREMENT' : 'INTEGER PRIMARY KEY AUTOINCREMENT'
    if (type === 'string') return client === 'mysql' ? `VARCHAR(${options.length || 255})` : 'TEXT'
    if (type === 'text') return 'TEXT'
    if (type === 'integer') return client === 'mysql' ? 'INT' : 'INTEGER'
    if (type === 'bigInteger') return client === 'mysql' ? 'BIGINT' : 'INTEGER'
    if (type === 'boolean') return client === 'mysql' ? 'TINYINT(1)' : 'INTEGER'
    if (type === 'date') return client === 'mysql' ? 'DATE' : 'TEXT'
    if (type === 'datetime') return client === 'mysql' ? 'DATETIME' : 'TEXT'
    if (type === 'timestamp') return client === 'mysql' ? 'TIMESTAMP' : 'TEXT'
    if (type === 'enum') return client === 'mysql' ? `ENUM(${options.values.map((item) => `'${item}'`).join(', ')})` : 'TEXT'
    if (type === 'json') return client === 'mysql' ? 'JSON' : 'TEXT'
    if (type === 'float') return 'FLOAT'
    if (type === 'double') return 'DOUBLE'
    if (type === 'decimal') return `DECIMAL(${options.precision || 12},${options.scale || 2})`
    if (type === 'foreignId') return client === 'mysql' ? 'INT' : 'INTEGER'
    return 'TEXT'
  })()

  const parts = [name, sqlType]
  if (modifiers.unsigned && client === 'mysql' && !String(sqlType).includes('UNSIGNED')) parts.push('UNSIGNED')
  if (!modifiers.nullable && type !== 'id') parts.push('NOT NULL')
  if (modifiers.default !== undefined) parts.push(`DEFAULT ${quoteDefault(modifiers.default)}`)
  if (modifiers.unique && type !== 'id') parts.push('UNIQUE')
  if (foreign) parts.push(`REFERENCES ${foreign.table}(${foreign.column})`)
  return parts.join(' ')
}

class SchemaBuilder {
  constructor(db, client) {
    this.db = db
    this.client = client
  }

  async exec(sql) {
    if (this.client === 'mysql') {
      await this.db.execute(sql)
      return
    }
    this.db.prepare(sql).run()
  }

  async indexExists(tableName, indexName) {
    if (this.client !== 'mysql') return false
    const [rows] = await this.db.execute(
      `SELECT 1 AS ok
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = ?
         AND index_name = ?
       LIMIT 1`,
      [tableName, indexName]
    )
    return Boolean(rows?.length)
  }

  async create(name, callback) {
    const blueprint = new TableBlueprint(name)
    callback(blueprint)
    const columnSql = blueprint.columns.map((column) => compileColumn(column, this.client)).join(', ')
    await this.exec(`CREATE TABLE IF NOT EXISTS ${name} (${columnSql})`)

    for (const column of blueprint.columns.filter((item) => item.modifiers.index)) {
      const indexName = `${name}_${column.name}_index`
      if (this.client === 'mysql') {
        const exists = await this.indexExists(name, indexName)
        if (exists) continue
        try {
          await this.exec(`CREATE INDEX ${indexName} ON ${name} (${column.name})`)
        } catch (error) {
          // Ignore index already exists races.
          if (String(error?.code || '') === 'ER_DUP_KEYNAME') continue
          if (String(error?.message || '').toLowerCase().includes('duplicate key name')) continue
          throw error
        }
        continue
      }
      await this.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${name} (${column.name})`)
    }
  }

  async drop(name) {
    await this.exec(`DROP TABLE IF EXISTS ${name}`)
  }

  async createTable(name, columns) {
    await this.create(name, (table) => {
      for (const [column, type] of Object.entries(columns)) {
        if (type === 'increments') table.id(column)
        else if (type === 'string') table.string(column)
        else if (type === 'text') table.text(column)
        else if (type === 'integer') table.integer(column)
        else if (type === 'bigInteger') table.bigInteger(column)
        else if (type === 'boolean') table.boolean(column)
        else if (type === 'timestamp') table.timestamp(column).nullable()
        else if (type === 'decimal') table.decimal(column)
        else table.string(column)
      }
    })
  }

  async dropTable(name) {
    await this.drop(name)
  }
}

export class DatabaseManager {
  constructor(config) {
    const connection = config.connections[config.default]
    this.connection = connection
    this.clientName = connection.client
  }

  async connect() {
    if (this.clientName === 'mysql') {
      this.client = await mysql.createPool({
        host: this.connection.host,
        port: this.connection.port,
        user: this.connection.username,
        password: this.connection.password,
        database: this.connection.database,
        waitForConnections: true,
        connectionLimit: 10
      })
      this.schema = new SchemaBuilder(this.client, 'mysql')
      await this.ensureMigrationsTable()
      return
    }

    const filename = path.resolve(process.cwd(), this.connection.filename)
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    this.client = new Database(filename)
    this.schema = new SchemaBuilder(this.client, 'sqlite')
    await this.ensureMigrationsTable()
  }

  async ensureMigrationsTable() {
    await this.schema.create('migrations', (table) => {
      table.id()
      table.string('name').unique()
      table.integer('batch')
      table.timestamp('created_at').nullable()
    })
  }

  async all(sql, params = []) {
    if (this.clientName === 'mysql') {
      const [rows] = await this.client.execute(sql, params)
      return rows
    }
    return this.client.prepare(sql).all(...params)
  }

  async get(sql, params = []) {
    if (this.clientName === 'mysql') {
      const [rows] = await this.client.execute(sql, params)
      return rows[0]
    }
    return this.client.prepare(sql).get(...params)
  }

  async run(sql, params = []) {
    if (this.clientName === 'mysql') {
      const [result] = await this.client.execute(sql, params)
      return result
    }
    return this.client.prepare(sql).run(...params)
  }

  formatDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value)
    if (this.clientName !== 'mysql') {
      return date.toISOString()
    }

    const pad = (part) => String(part).padStart(2, '0')
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-') + ' ' + [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join(':')
  }

  async close() {
    if (this.clientName === 'mysql' && this.client) {
      await this.client.end()
    }
  }
}
