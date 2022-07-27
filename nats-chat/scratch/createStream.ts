import { connect } from 'nats'

async function main() {
  const nc = await connect({
    servers: ['localhost:4221', 'localhost:4222', 'localhost:4223'],
  })

  const jsm = await nc.jetstreamManager()

  const created = await jsm.streams.add({
    name: 'derpy',
    subjects: ['derpy.>'],
    num_replicas: 3,
    deny_delete: true,
    deny_purge: true,
  })

  console.log(created)

  nc.close()
}

main()
