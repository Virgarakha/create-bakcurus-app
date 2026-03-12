import { roleGuard } from 'backurus/core/auth'

export default async function routes(Route) {
  Route.get('/health', async (req, res) => res.success({ status: 'ok' })).name('health')

  Route.post('/login', 'AuthController@login').name('auth.login')
  Route.post('/register', 'AuthController@register').name('auth.register')
  Route.post('/logout', 'AuthController@logout').middleware('auth').name('auth.logout')

  Route.get('/users', 'UserController@index').name('users.index')
  Route.post('/users', 'UserController@store').name('users.store')
  Route.get('/users/:id', 'UserController@show').name('users.show')
  Route.put('/users/:id', 'UserController@update').name('users.update')
  Route.delete('/users/:id', 'UserController@destroy', roleGuard('admin')).middleware('auth').name('users.destroy')
  Route.get('/profile', 'UserController@profile').middleware('auth').name('users.profile')
}
