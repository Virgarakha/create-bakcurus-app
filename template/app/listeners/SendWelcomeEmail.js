export default async function SendWelcomeEmail(event, container) {
  const queue = container.make('queue')
  const { default: SendEmailJob } = await import('../jobs/SendEmailJob')
  await queue.dispatch(new SendEmailJob(event.user))
}
