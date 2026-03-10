export default async function schedule(Schedule) {
  Schedule.command('route:list').daily()
}
