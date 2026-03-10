import Product from '../../app/models/Product'

const products = [
  {
    name: 'Mechanical Keyboard',
    description: '87-key wireless keyboard for API developers',
    price: 1299000,
    stock: 25
  },
  {
    name: 'Ergonomic Mouse',
    description: 'Vertical mouse with silent click switch',
    price: 549000,
    stock: 40
  }
]

export default {
  async run() {
    for (const item of products) {
      const existing = await Product.query().where('name', item.name).first()
      if (!existing) {
        await Product.create(item)
      }
    }
  }
}
