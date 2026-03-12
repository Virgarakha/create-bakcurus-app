import 'dotenv/config'

const appUrl = process.env.APP_URL || `http://127.0.0.1:${process.env.APP_PORT || 3000}`

export default {
  default: process.env.FILESYSTEM_DISK || 'local',
  disks: {
    local: {
      root: process.env.STORAGE_LOCAL_ROOT || 'storage/app'
    },
    public: {
      root: process.env.STORAGE_PUBLIC_ROOT || 'storage/app/public',
      url: `${appUrl}/storage`
    }
  }
}

