export default class StoreSiswaRequest {
  rules() {
    return {
      user_id: 'required|integer',
      nisn: 'required|string|min:5|max:32',
      nama: 'required|alpha_spaces|min:3|max:150',
      jenis_kelamin: 'required|string',
      tanggal_lahir: 'string',
      kelas: 'string|max:32',
      jurusan: 'string|max:64',
      no_hp: 'string|max:32',
      alamat: 'string|max:2000',
      wali_nama: 'string|max:150',
      wali_hp: 'string|max:32',
      ipk: 'string',
      aktif: 'boolean'
    }
  }

  sanitize() {
    return {
      nisn: 'trim',
      nama: 'trim',
      kelas: 'trim',
      jurusan: 'trim',
      no_hp: 'trim',
      wali_nama: 'trim',
      wali_hp: 'trim'
    }
  }
}

