export default {
  async up(schema) {
    await schema.create('products', (table) => {
      table.id()
      table.string('name')
      table.text('description').nullable()
      table.decimal('price', 12, 2)
      table.integer('stock').default(0)
      table.timestamp('deleted_at').nullable()
      table.timestamps()
    })
  },

  async down(schema) {
    await schema.drop('products')
  }
}
