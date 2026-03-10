# <div align="center"><img src="./docs/images/favicon.png" alt="Backurus logo" width="120" /></div>

# <div align="center">Backurus</div>

<p align="center">
  Laravel-inspired backend framework for Node.js with a fast API-first workflow.
</p>

<p align="center">
  <img alt="ESM" src="https://img.shields.io/badge/module-ESM-1f2937?style=for-the-badge">
  <img alt="API First" src="https://img.shields.io/badge/focus-API%20First-f97316?style=for-the-badge">
</p>

Backurus adalah framework backend berbasis Node.js yang dirancang untuk developer yang suka ergonomi Laravel, tapi ingin runtime JavaScript modern, struktur sederhana, dan pengalaman membangun REST API yang cepat. Fokus Backurus bukan jadi framework serba bisa yang berat, tapi jadi framework yang enak dipakai untuk membangun API production-style dengan pola yang familiar.

## Kenapa Backurus?

Backurus menggabungkan beberapa hal yang biasanya terpencar:

- routing gaya Laravel dengan action string seperti `ProductController@index`
- ORM bergaya Eloquent untuk CRUD, pagination, relationship, dan soft delete
- migration + seeder untuk workflow database yang rapi
- validasi request, JWT auth, queue, scheduler, plugin, facade, dan WebSocket
- CLI generator yang langsung usable untuk bikin module API baru
- dokumentasi lokal multilingual di folder `docs/`

Kalau tujuan Anda adalah bikin backend API dengan cepat tanpa tenggelam di boilerplate Express mentah atau kompleksitas framework besar, Backurus berada di posisi yang kuat.

## Keunggulan Dibanding Framework Lain

### 1. Lebih opinionated daripada Express

Express memberi kebebasan, tapi kebebasan itu sering berubah jadi keputusan teknis kecil yang berulang: struktur folder, validasi, auth, migration, response helper, dan pola controller. Backurus sudah menetapkan fondasi itu dari awal, jadi developer bisa langsung fokus ke business logic.

### 2. Lebih ringan secara mental daripada NestJS

NestJS sangat kuat, tapi sering terasa berat untuk project API yang hanya butuh alur cepat dan sederhana. Backurus memilih API yang lebih langsung: file-based structure yang mudah dibaca, controller sederhana, dan command CLI yang pragmatis.

### 3. Lebih familiar untuk developer Laravel/PHP

Banyak naming dan alur di Backurus sengaja dibuat familiar:

- `node urus make:controller`
- `node urus migrate`
- `node urus db:seed`
- middleware alias
- request validation class
- facade kecil untuk service penting
- `storage:link` style workflow

Artinya, onboarding dari Laravel ke Node.js terasa jauh lebih halus.

### 4. API-first dari awal

Backurus jelas diarahkan untuk backend API:

- response JSON helper
- JWT auth
- queue dan scheduler
- upload file multipart
- public storage URL
- route listing
- WebSocket bawaan

Ini bukan framework fullstack yang kebetulan bisa bikin API. Ini framework backend yang memang dibangun untuk itu.

## Fitur Inti

- `node urus` CLI untuk generator dan operational workflow
- ES Modules native
- HTTP server internal dengan router sendiri
- controller string action ala Laravel
- request parser JSON, urlencoded, dan multipart form-data
- file upload dan public disk storage
- ORM dengan CRUD, query builder, pagination, timestamps, soft deletes, relationship
- schema builder + migration untuk SQLite dan MySQL
- request validation class
- JWT authentication
- middleware alias system
- event bus, queue worker, dan scheduler
- plugin system
- facade layer untuk service framework
- WebSocket hub bawaan
- docs website lokal di `docs/`

## Siapa yang Cocok Pakai Backurus?

Backurus cocok untuk:

- developer Laravel yang ingin pindah ke Node.js tanpa kehilangan ergonomi
- tim kecil yang ingin delivery API cepat
- project admin panel backend, mobile API, internal tools, dan SaaS backend
- eksperimen framework custom yang tetap punya struktur serius

Backurus kurang cocok jika Anda butuh:

- ekosistem plugin sebesar Express/NestJS
- convention enterprise yang sangat kompleks
- integrasi frontend SSR atau fullstack rendering sebagai fokus utama

## Quick Start

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan environment

Sesuaikan `.env` Anda. Secara default project ini bisa jalan dengan SQLite di `storage/database.sqlite`.

### 3. Jalankan migration dan seeder

```bash
node urus migrate
node urus db:seed
```

### 4. Aktifkan public storage link

```bash
node urus storage:link
```

### 5. Jalankan server

```bash
node urus serve
```

Server akan berjalan sesuai `APP_PORT` pada config aplikasi.

## Pengalaman Developer

Workflow Backurus sengaja dibuat pendek:

```bash
node urus make:model Product
node urus make:controller ProductController
node urus make:migration create_products_table
node urus migrate
node urus serve
```

Dengan alur ini, Anda tidak perlu merakit stack backend dari nol setiap kali memulai module baru.

## CLI Utama

### Generators

```bash
node urus make:controller UserController
node urus make:model User
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

### Database dan runtime

```bash
node urus migrate
node urus migrate:rollback
node urus migrate:reset
node urus migrate:fresh
node urus migrate:status
node urus db:seed
node urus route:list
node urus queue:work
node urus queue:restart
node urus schedule:run
node urus serve
node urus storage:link
node urus config:cache
node urus config:clear
```

## Contoh Routing

```js
router.get('/products', 'ProductController@index')
router.post('/products', 'ProductController@store')
router.put('/products/:id', 'ProductController@update').middleware('auth')
```

Routing model ini sengaja dibuat ringkas dan mudah dibaca.

## Contoh Controller

```js
import Product from '../models/Product'
import StoreProductRequest from '../requests/StoreProductRequest'
import { validate } from '../../core/validator'

export default class ProductController {
  async index(req, res) {
    const page = Number(req.query.page || 1)
    const perPage = Number(req.query.per_page || 10)
    const result = await Product.orderBy('id', 'desc').paginate(page, perPage)
    return res.paginated(result.data, result.meta)
  }

  async store(req, res) {
    await validate(req, StoreProductRequest)
    const product = await Product.create({
      name: req.body.name,
      description: req.body.description || null,
      price: Number(req.body.price),
      stock: Number(req.body.stock)
    })
    return res.created(product, 'Product created')
  }
}
```

## Upload File dan Storage Publik

Backurus sekarang sudah support upload multipart dan public storage ala workflow Laravel.

### Buat symbolic link public storage

```bash
node urus storage:link
```

Ini akan membuat:

```text
public/storage -> storage/app/public
```

### Simpan file upload di controller

```js
import { Storage } from '../../core/facades'

export default class ProductController {
  async store(req, res) {
    const image = req.file('image')
    const storedPath = image
      ? await Storage.disk('public').putFile('products', image)
      : null

    const imageUrl = storedPath
      ? Storage.disk('public').url(storedPath)
      : null

    return res.created({
      image: storedPath,
      image_url: imageUrl
    })
  }
}
```

Field upload tersedia lewat:

- `req.files`
- `req.file('fieldName')`

## Arsitektur Project

```text
app/
  controllers/
  models/
  middleware/
  requests/
  jobs/
  events/
  policies/
  modules/
bootstrap/
config/
core/
database/
  migrations/
  seeders/
routes/
plugins/
docs/
```

## Konfigurasi yang Tersedia

Backurus saat ini memuat konfigurasi utama dari:

- `config/app.js`
- `config/database.js`
- `config/auth.js`
- `config/queue.js`
- `config/storage.js`

Dengan pendekatan ini, konfigurasi tetap eksplisit dan mudah ditelusuri.

## Database Support

Driver yang sudah terlihat dipersiapkan di project:

- SQLite
- MySQL

SQLite cocok untuk development cepat, sedangkan MySQL bisa dipakai untuk deployment yang lebih tradisional.

## Dokumentasi Lokal

Backurus menyertakan website dokumentasi di folder `docs/`, termasuk:

- introduction
- installation
- quickstart
- routing
- controllers
- models
- migrations
- validation
- authentication
- queue
- websocket
- plugins
- CLI

Logo Backurus juga sudah dipakai konsisten di dokumentasi lokal tersebut.

## Posisi Backurus

Backurus bukan sekadar clone Laravel dalam JavaScript. Nilai utamanya ada pada kombinasi berikut:

- DX yang familiar
- codebase yang kecil dan mudah dipahami
- fitur backend yang sudah lengkap untuk API modern
- struktur yang cukup opinionated untuk menjaga kecepatan tim

Jika Express terlalu mentah dan NestJS terasa terlalu berat, Backurus mengisi ruang di tengah dengan pendekatan yang lebih pragmatis.

## Roadmap yang Layak Dilanjutkan

Beberapa area yang secara natural bisa memperkuat Backurus ke depan:

- test runner dan assertion utilities bawaan
- storage adapter tambahan seperti S3-compatible disk
- cache driver yang lebih kaya
- mailer abstraction
- OpenAPI generation yang lebih dalam
- rate limiting dan observability yang lebih detail

## Ringkasnya

Backurus cocok dipamerkan sebagai framework backend Node.js yang:

- punya identitas sendiri
- jelas target penggunanya
- nyaman dipakai untuk bangun API
- familiar untuk developer Laravel
- sudah membawa banyak fitur penting tanpa setup berlapis

Jika Anda ingin framework backend API yang cepat, readable, dan terasa familiar, Backurus punya arah yang kuat.
