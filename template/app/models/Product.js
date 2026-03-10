import Model from '../../core/model'

export default class Product extends Model {
  static table = 'products'
  static softDeletes = true
}
