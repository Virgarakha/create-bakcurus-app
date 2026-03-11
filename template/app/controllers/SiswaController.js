import Siswa from '../models/Siswa'
import StoreSiswaRequest from '../requests/StoreSiswaRequest'
import { validate } from '../../core/validator'

function normalizePayload(body) {
  return {
    user_id: Number(body.user_id),
    nisn: body.nisn,
    nama: body.nama,
    jenis_kelamin: body.jenis_kelamin,
    tanggal_lahir: body.tanggal_lahir || null,
    kelas: body.kelas || null,
    jurusan: body.jurusan || null,
    no_hp: body.no_hp || null,
    alamat: body.alamat || null,
    wali_nama: body.wali_nama || null,
    wali_hp: body.wali_hp || null,
    ipk: body.ipk === undefined || body.ipk === null || body.ipk === '' ? null : String(body.ipk),
    meta: body.meta || null,
    aktif: body.aktif === undefined ? true : Boolean(body.aktif)
  }
}

export default class SiswaController {
  async index(req, res) {
    const data = await Siswa.with('user').orderBy('id', 'desc').get()
    return res.success(data)
  }

  async show(req, res) {
    const siswa = await Siswa.with('user').where('id', req.params.id).first()
    if (!siswa) return res.notFound('Siswa not found')
    return res.success(siswa)
  }

  async store(req, res) {
    await validate(req, StoreSiswaRequest)
    const siswa = await Siswa.create(normalizePayload(req.body))
    const hydrated = await Siswa.with('user').where('id', siswa.id).first()
    return res.created(hydrated, 'Siswa created')
  }

  async update(req, res) {
    const existing = await Siswa.find(req.params.id)
    if (!existing) return res.notFound('Siswa not found')
    await validate(req, StoreSiswaRequest)
    await Siswa.update(req.params.id, normalizePayload(req.body))
    const hydrated = await Siswa.with('user').where('id', req.params.id).first()
    return res.success(hydrated, 'Siswa updated')
  }

  async destroy(req, res) {
    const existing = await Siswa.find(req.params.id)
    if (!existing) return res.notFound('Siswa not found')
    await Siswa.delete(req.params.id)
    return res.success(null, 'Siswa deleted')
  }
}

