export class Resource {
  constructor(resource) {
    this.resource = resource
  }

  toJSON() {
    return this.resource
  }

  resolve() {
    return this.toJSON()
  }
}
