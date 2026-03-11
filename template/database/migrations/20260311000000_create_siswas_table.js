export default {
  async up(schema) {
    await schema.create('siswas', (table) => {
      table.id()

      table.foreignId('user_id').index().constrained('users')

      table.string('nisn', 32).unique()
      table.string('nama', 150)
      table.enum('jenis_kelamin', ['L', 'P']).default('L')
      table.date('tanggal_lahir').nullable()

      table.string('kelas', 32).nullable()
      table.string('jurusan', 64).nullable()

      table.string('no_hp', 32).nullable()
      table.text('alamat').nullable()

      table.string('wali_nama', 150).nullable()
      table.string('wali_hp', 32).nullable()

      table.decimal('ipk', 4, 2).nullable()
      table.json('meta').nullable()

      table.boolean('aktif').default(true)

      table.timestamp('deleted_at').nullable()
      table.timestamps()
    })
  },

  async down(schema) {
    await schema.drop('siswas')
  }
}

