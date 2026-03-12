import 'dotenv/config'

export default {
  default: process.env.DB_CONNECTION || 'sqlite',
  connections: {
    sqlite: {
      client: 'sqlite',
      filename: process.env.DB_DATABASE || 'storage/database.sqlite'
    },
    mysql: {
      client: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_DATABASE || 'mydb',
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || ''
    }
  },
  migrations: 'database/migrations',
  seeders: 'database/seeders'
}

