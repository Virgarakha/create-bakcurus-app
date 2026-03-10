import { appContainer } from './runtime'

function now() {
  return appContainer.make('db').formatDate()
}

function serializeValue(value) {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : value
}

export default class Model {
  static table = null
  static primaryKey = 'id'
  static timestamps = true
  static softDeletes = false

  static db() {
    return appContainer.make('db')
  }

  static query() {
    return new QueryBuilder(this)
  }

  static with(...relations) {
    return this.query().with(...relations)
  }

  static where(...args) {
    return this.query().where(...args)
  }

  static orderBy(column, direction = 'asc') {
    return this.query().orderBy(column, direction)
  }

  static limit(limit) {
    return this.query().limit(limit)
  }

  static paginate(perPage = 15, page = 1) {
    return this.query().paginate(page, perPage)
  }

  static async all() {
    return this.query().get()
  }

  static async find(id) {
    return this.query().where(this.primaryKey, id).first()
  }

  static async create(payload) {
    const data = { ...payload }
    if (this.timestamps) {
      data.created_at = data.created_at || now()
      data.updated_at = data.updated_at || now()
    }
    const keys = Object.keys(data)
    const placeholders = keys.map(() => '?').join(', ')
    const values = keys.map((key) => serializeValue(data[key]))
    const result = await this.db().run(`INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`, values)
    const insertedId = result.lastInsertRowid || result.insertId
    return this.find(insertedId)
  }

  static async update(id, payload) {
    const data = { ...payload }
    if (this.timestamps) data.updated_at = now()
    const keys = Object.keys(data)
    const setSql = keys.map((key) => `${key} = ?`).join(', ')
    const values = keys.map((key) => serializeValue(data[key]))
    await this.db().run(`UPDATE ${this.table} SET ${setSql} WHERE ${this.primaryKey} = ?`, [...values, id])
    return this.find(id)
  }

  static async delete(id) {
    if (this.softDeletes) {
      await this.db().run(`UPDATE ${this.table} SET deleted_at = ? WHERE ${this.primaryKey} = ?`, [now(), id])
      return true
    }
    await this.db().run(`DELETE FROM ${this.table} WHERE ${this.primaryKey} = ?`, [id])
    return true
  }

  static hasMany(RelatedModel, foreignKey, localKey = this.primaryKey) {
    return {
      type: 'hasMany',
      RelatedModel,
      foreignKey,
      localKey
    }
  }

  static hasOne(RelatedModel, foreignKey, localKey = this.primaryKey) {
    return {
      type: 'hasOne',
      RelatedModel,
      foreignKey,
      localKey
    }
  }

  static belongsTo(RelatedModel, foreignKey, ownerKey = RelatedModel.primaryKey) {
    return {
      type: 'belongsTo',
      RelatedModel,
      foreignKey,
      ownerKey
    }
  }

  static belongsToMany(RelatedModel, pivotTable, foreignPivotKey, relatedPivotKey, parentKey = this.primaryKey, relatedKey = RelatedModel.primaryKey) {
    return {
      type: 'belongsToMany',
      RelatedModel,
      pivotTable,
      foreignPivotKey,
      relatedPivotKey,
      parentKey,
      relatedKey
    }
  }

  static async loadRelations(records, relations = []) {
    if (!records?.length || !relations.length) return records

    for (const relationName of relations) {
      const relationFactory = this[relationName]
      if (typeof relationFactory !== 'function') {
        throw new Error(`Relation [${relationName}] is not defined on model [${this.name}].`)
      }

      const relation = relationFactory.call(this)
      for (const record of records) {
        if (relation.type === 'hasMany') {
          record[relationName] = await relation.RelatedModel.where(relation.foreignKey, record[relation.localKey]).get()
        } else if (relation.type === 'hasOne') {
          record[relationName] = await relation.RelatedModel.where(relation.foreignKey, record[relation.localKey]).first()
        } else if (relation.type === 'belongsTo') {
          record[relationName] = await relation.RelatedModel.where(relation.ownerKey, record[relation.foreignKey]).first()
        } else if (relation.type === 'belongsToMany') {
          record[relationName] = await this.db().all(
            `SELECT related.* FROM ${relation.RelatedModel.table} related
             INNER JOIN ${relation.pivotTable} pivot ON pivot.${relation.relatedPivotKey} = related.${relation.relatedKey}
             WHERE pivot.${relation.foreignPivotKey} = ?`,
            [record[relation.parentKey]]
          )
        }
      }
    }

    return records
  }
}

class QueryBuilder {
  constructor(model) {
    this.model = model
    this.wheres = []
    this.orderByClause = ''
    this.limitValue = null
    this.offsetValue = null
    this.relations = []
  }

  with(...relations) {
    this.relations.push(...relations.flat())
    return this
  }

  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator
      operator = '='
    }
    this.wheres.push({ column, operator, value })
    return this
  }

  orderBy(column, direction = 'asc') {
    this.orderByClause = ` ORDER BY ${column} ${direction.toUpperCase()}`
    return this
  }

  limit(limit) {
    this.limitValue = limit
    return this
  }

  offset(offset) {
    this.offsetValue = offset
    return this
  }

  buildWhere() {
    const clauses = []
    const params = []
    if (this.model.softDeletes) clauses.push('deleted_at IS NULL')
    for (const where of this.wheres) {
      clauses.push(`${where.column} ${where.operator} ?`)
      params.push(where.value)
    }
    return {
      sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
      params
    }
  }

  buildTail() {
    const fragments = []
    if (this.orderByClause) fragments.push(this.orderByClause.trim())
    if (this.limitValue !== null) fragments.push(`LIMIT ${this.limitValue}`)
    if (this.offsetValue !== null) fragments.push(`OFFSET ${this.offsetValue}`)
    return fragments.length ? ` ${fragments.join(' ')}` : ''
  }

  async get() {
    const { sql, params } = this.buildWhere()
    const rows = await this.model.db().all(`SELECT * FROM ${this.model.table}${sql}${this.buildTail()}`, params)
    return this.model.loadRelations(rows, this.relations)
  }

  async first() {
    const { sql, params } = this.buildWhere()
    const row = await this.model.db().get(`SELECT * FROM ${this.model.table}${sql}${this.orderByClause} LIMIT 1`, params)
    if (!row) return null
    const [record] = await this.model.loadRelations([row], this.relations)
    return record
  }

  async paginate(page = 1, perPage = 15) {
    const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1
    const safePerPage = Number.isFinite(Number(perPage)) && Number(perPage) > 0 ? Number(perPage) : 15
    const { sql, params } = this.buildWhere()
    const offset = (safePage - 1) * safePerPage
    const items = await this.model.db().all(`SELECT * FROM ${this.model.table}${sql}${this.orderByClause} LIMIT ${safePerPage} OFFSET ${offset}`, params)
    const countRow = await this.model.db().get(`SELECT COUNT(*) as total FROM ${this.model.table}${sql}`, params)
    const hydratedItems = await this.model.loadRelations(items, this.relations)
    return {
      data: hydratedItems,
      meta: {
        total: countRow?.total || 0,
        perPage: safePerPage,
        currentPage: safePage,
        lastPage: Math.ceil((countRow?.total || 0) / safePerPage) || 1
      }
    }
  }
}
