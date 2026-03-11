import Siswa from '../../app/models/Siswa'
import User from '../../app/models/User'
import UserSeeder from './UserSeeder'

function pad(value, width = 6) {
  return String(value).padStart(width, '0')
}

export default {
  async run(container) {
    // Ensure base users exist regardless of seeder execution order.
    await UserSeeder.run(container)

    const users = await User.query().where('role', 'user').orderBy('id', 'asc').get()

    for (let i = 0; i < users.length; i += 1) {
      const user = users[i]
      const existing = await Siswa.query().where('user_id', user.id).first()
      if (existing) continue

      const nisn = `NISN${pad(user.id)}`
      const siswaExisting = await Siswa.query().where('nisn', nisn).first()
      if (siswaExisting) continue

      await Siswa.create({
        user_id: user.id,
        nisn,
        nama: user.name,
        jenis_kelamin: i % 2 === 0 ? 'L' : 'P',
        tanggal_lahir: null,
        kelas: 'XII',
        jurusan: 'RPL',
        no_hp: `08${pad(100000 + user.id, 8)}`,
        alamat: `Alamat siswa ${user.name}`,
        wali_nama: `Wali ${user.name}`,
        wali_hp: `08${pad(200000 + user.id, 8)}`,
        ipk: '3.50',
        meta: { seeded: true },
        aktif: true
      })
    }
  }
}

