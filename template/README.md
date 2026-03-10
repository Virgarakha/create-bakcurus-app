# <div align="center"><img src="./docs/images/favicon.png" alt="Backurus logo" width="120" /></div>

# <div align="center">Backurus</div>

A Modern Backend Framework for Node.js inspired by Laravel.

## Introduction

Backurus is a backend framework built to make API development simple, fast, and structured. It combines a Laravel-like developer experience with a lightweight JavaScript runtime, modern ES Modules, and an API-first architecture that stays productive as projects grow.

Backurus includes:

- Laravel-like CLI with `node urus`
- expressive routing with controller actions
- built-in ORM with query builder and relationships
- schema migrations and seeders
- request validation classes
- JWT authentication
- middleware aliases
- hot reload development server

## Installation

To start a new Backurus project, the intended workflow is:

```bash
npx create-backurus-app my-api
cd my-api
node urus serve
```

For this repository scaffold, install dependencies and boot the framework locally:

```bash
npm install
node urus migrate
node urus db:seed
node urus serve
```

Backurus reads environment variables from `.env`. Typical keys are:

```env
APP_NAME=Backurus
APP_PORT=3000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=testfw
DB_USERNAME=root
DB_PASSWORD=secret
JWT_SECRET=supersecretkey
QUEUE_CONNECTION=sync
```

## CLI Commands

All framework commands run through `node urus`.

### Core commands

```bash
node urus serve
node urus migrate
node urus route:list
```

- `node urus serve`: start the development server with file watching and auto-restart.
- `node urus migrate`: run pending database migrations.
- `node urus route:list`: print the registered routes, methods, URIs, actions, and names.

### Generators

```bash
node urus make:model User
node urus make:controller UserController
node urus make:migration create_users_table
node urus make:middleware AuthMiddleware
node urus make:request StoreUserRequest
node urus make:job SendEmailJob
node urus make:event UserRegistered
node urus make:seeder UserSeeder
node urus make:policy UserPolicy
node urus make:resource UserResource
node urus make:module Admin
```

- `make:model`: generate a model class in `app/models`.
- `make:controller`: generate a controller in `app/controllers`.
- `make:migration`: generate a migration file in `database/migrations`.
- `make:middleware`: generate a middleware function in `app/middleware`.
- `make:request`: generate a request validation class in `app/requests`.
- `make:job`: generate a queue job class.
- `make:event`: generate an event payload class.
- `make:seeder`: generate a database seeder.
- `make:policy`: generate an authorization policy.
- `make:resource`: generate an API resource transformer.
- `make:module`: generate a module directory with common subfolders.

### Database and runtime commands

```bash
node urus migrate:rollback
node urus migrate:reset
node urus migrate:fresh
node urus migrate:status
node urus db:seed
node urus queue:work
node urus queue:restart
node urus schedule:run
node urus config:cache
node urus config:clear
node urus storage:link
```

- `migrate:rollback`: roll back the latest migration batch.
- `migrate:reset`: roll back all applied migrations.
- `migrate:fresh`: drop all known tables and re-run migrations.
- `migrate:status`: show which migrations have run.
- `db:seed`: execute all seeders, or one named seeder.
- `queue:work`: start the queue worker.
- `queue:restart`: signal long-running workers to restart.
- `schedule:run`: execute due scheduled commands.
- `config:cache`: cache resolved config to disk.
- `config:clear`: clear cached config.
- `storage:link`: create `public/storage` symlink to `storage/app/public`.

## Project Structure

```text
app/
  controllers/
  events/
  jobs/
  middleware/
  models/
  requests/
  resources/
  services/
bootstrap/
config/
core/
database/
  migrations/
  seeders/
docs/
plugins/
routes/
urus
.env
```

- `app/`: application code such as controllers, models, middleware, jobs, and requests.
- `bootstrap/`: application bootstrapping and container setup.
- `config/`: framework and app configuration files.
- `core/`: framework internals such as router, ORM, server, scheduler, queue, and facades.
- `database/`: migrations and seeders.
- `docs/`: static documentation website with EN and ID translations.
- `plugins/`: plugin entry points that auto-load on boot.
- `routes/`: route definitions and scheduled console commands.
- `urus`: CLI launcher for all Backurus commands.

## Example API

Example route:

```javascript
Route.get('/users', 'UserController@index')
```

Example controller:

```javascript
import User from '../models/User'

export default class UserController {
  async index(req, res) {
    const users = await User.all()
    return res.success(users)
  }
}
```

## Migration Example

Backurus migrations use a schema builder with Laravel-like table methods:

```javascript
await schema.create('users', (table) => {
  table.id()
  table.string('name')
  table.string('email').unique()
  table.enum('role', ['admin', 'user']).default('user')
  table.timestamps()
})
```

Supported column types include `string`, `text`, `integer`, `bigInteger`, `boolean`, `date`, `datetime`, `timestamp`, `enum`, `json`, `float`, `double`, and `decimal`.

Supported modifiers include `nullable()`, `default()`, `unique()`, `index()`, and `unsigned()`.

## ORM Example

Backurus models expose a compact Eloquent-style API:

```javascript
const users = await User.all()

const user = await User.find(1)

await User.create({
  name: 'Rakha'
})
```

Common query builder patterns:

```javascript
await User.where('age', '>', 18).get()
await User.where('email', 'rakha@email.com').first()
await User.orderBy('created_at', 'desc').limit(10).get()
await User.paginate(1, 10)
await User.with('posts').find(1)
```

## Documentation Website

The `docs/` folder contains a static documentation site with:

- introduction
- installation
- CLI commands
- routing
- controllers
- models
- migrations
- validation
- authentication
- queue and scheduler
- WebSocket
- plugins and facades

The documentation website includes:

- sidebar navigation
- top navbar
- syntax highlighted code blocks
- copy code button
- dark mode toggle
- client-side search
- English and Indonesian translations

Open [docs/index.html](/home/rakarawr/Documents/project/2026/testai/docs/index.html) in a browser to browse the local docs.

## Backurus Workflow

A typical API workflow looks like this:

```bash
node urus make:model Product
node urus make:controller ProductController
node urus make:request StoreProductRequest
node urus make:migration create_products_table
node urus migrate
node urus serve
```

Backurus is built for teams that want the ergonomics of Laravel with the runtime and ecosystem of Node.js.
