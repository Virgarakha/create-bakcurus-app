export default class StoreProductRequest {
  rules() {
    return {
      name: 'required|min:3',
      price: 'required',
      stock: 'required'
    }
  }
}
