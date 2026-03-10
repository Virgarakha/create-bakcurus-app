export default {
  async up(db) {
    await db.createTable('users', {
      id: 'increments',
      name: 'string',
      email: 'string',
      password: 'string',
      role: 'string',
      created_at: 'timestamp',
      updated_at: 'timestamp',
      deleted_at: 'timestamp'
    })
  },

  async down(db) {
    await db.dropTable('users')
  }
}
