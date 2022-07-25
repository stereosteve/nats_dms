import { connect } from 'nats'
import { JetstreamStream } from '../src/Stream'

async function main() {
  const nc = await connect({
    servers: ['localhost:4221', 'localhost:4222', 'localhost:4223'],
  })

  type DerpChat = {
    handle: string
    msg: string
  }

  const stream = new JetstreamStream<DerpChat>('derpy.chat')
  stream.setNats(nc)
  stream.addListener(() => {
    const last = stream.history[stream.history.length - 1]
    console.log('ping', last.handle, ':: ', last.msg)
  })

  setInterval(() => {
    stream.pub({ handle: 'vitest', msg: `it works ${new Date()}` })
  }, 1000)
}

main()
