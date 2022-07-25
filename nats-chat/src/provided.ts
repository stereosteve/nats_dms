import { connect } from 'nats.ws'
import { JetstreamStream } from './Stream'

/*

for now some module globals...
  probably should be some react provider stuff

*/

export type ChatMsg = {
  handle: string
  msg: string
}

export const chatStream = new JetstreamStream<ChatMsg>('derpy.chat2')

connect({
  servers: [
    'ws://localhost:4241',
    'ws://localhost:4242',
    'ws://localhost:4243',
  ],
})
  .then((nc) => {
    console.log('nats connected')
    chatStream.setNats(nc)
  })
  .catch((err) => console.error('nats connect failed', err))
