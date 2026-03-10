import { Resource } from '../../core/resource'

export default class ProductResource extends Resource {
  toJSON() {
    return this.resource
  }
}
