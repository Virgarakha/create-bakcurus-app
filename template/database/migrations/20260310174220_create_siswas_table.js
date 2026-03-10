export default {
  async up(schema) {
    await schema.create('siswas', (table) => {
      table.id()
      table.string('name')
      table.text('description').nullable()
      table.timestamps()
    })
  },

  async down(schema) {
    await schema.drop('siswas')
  }
}
