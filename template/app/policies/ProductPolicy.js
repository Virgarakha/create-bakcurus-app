export default class ProductPolicy {
  update(user, model) {
    return user.id === model.user_id
  }
}
