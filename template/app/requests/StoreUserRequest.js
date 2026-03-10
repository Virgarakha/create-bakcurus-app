export default class StoreUserRequest {
  rules() {
    return {
      name: 'required|min:3',
      email: 'required|email',
      password: 'required|min:6'
    }
  }
}
