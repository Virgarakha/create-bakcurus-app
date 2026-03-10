import Product from '../models/Product'
import StoreProductRequest from '../requests/StoreProductRequest'
import { validate } from '../../core/validator'

function normalizePayload(body) {
  return {
    name: body.name,
    description: body.description || null,
    price: Number(body.price),
    stock: Number(body.stock)
  }
}

export default class ProductController {
  async index(req, res) {
    const data = await Product.all()
    return res.success(data, 200)
  }

  async show(req, res) {
    const product = await Product.find(req.params.id)
    if (!product) return res.notFound('Product not found')
    return res.success(product)
  }

  async store(req, res) {
    await validate(req, StoreProductRequest)
    const product = await Product.create(normalizePayload(req.body))
    return res.created(product, 'Product created')
  }

  async update(req, res) {
    const existing = await Product.find(req.params.id)
    if (!existing) return res.notFound('Product not found')
    await validate(req, StoreProductRequest)
    const product = await Product.update(req.params.id, normalizePayload(req.body))
    return res.success(product, 'Product updated')
  }

  async destroy(req, res) {
    const existing = await Product.find(req.params.id)
    if (!existing) return res.notFound('Product not found')
    await Product.delete(req.params.id)
    return res.success(null, 'Product deleted')
  }
}
