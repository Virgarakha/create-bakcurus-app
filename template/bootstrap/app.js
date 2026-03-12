import { createApp as createFrameworkApp } from 'backurus'
import User from '../app/models/User.js'
import SendWelcomeEmail from '../app/listeners/SendWelcomeEmail.js'
import UserRegistered from '../app/events/UserRegistered.js'

export async function createApp() {
  const server = await createFrameworkApp()

  server.container.singleton('auth.userProvider', () => async (id) => User.find(id))

  server.container.make('events').listen(UserRegistered.name, SendWelcomeEmail)
  server.queue.register('SendEmailJob', async (job, runtimeContainer) => {
    runtimeContainer.make('ws').emit('notification', {
      message: `Queued welcome email for ${job.user.email}`
    })
  })

  return server
}

