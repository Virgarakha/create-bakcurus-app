import Model from 'backurus/core/model'

export default class User extends Model {
  static table = 'users'
  static softDeletes = true
  static hidden = ['password']
}
