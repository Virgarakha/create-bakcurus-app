import Model from '../../core/model'
import User from './User'

export default class Siswa extends Model {
  static table = 'siswas'
  static softDeletes = true

  static user() {
    return this.belongsTo(User, 'user_id')
  }
}

