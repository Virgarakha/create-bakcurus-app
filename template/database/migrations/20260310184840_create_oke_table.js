export default {
  async up(schema) {
    await schema.create('oke', (table) => {
      table.id()
      table.string('nama')
      table.timestamps()
    })
  },

  async down(schema) {
    await schema.drop('oke')
  }
}
