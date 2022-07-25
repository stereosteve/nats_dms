import {
  consumerOpts,
  createInbox,
  JetStreamClient,
  JsMsg,
  NatsConnection,
  JSONCodec,
} from 'nats.ws'

export class JetstreamStream<MsgType> {
  history: MsgType[] = []
  private codec = JSONCodec()
  private listeners = new Set<() => void>()
  private nats: NatsConnection | undefined
  private js: JetStreamClient | undefined

  constructor(public topic: string) {}

  setNats(nats: NatsConnection) {
    // TODO: reuse jetstream instance?
    this.nats = nats
    this.js = this.nats.jetstream()
    const opts = consumerOpts().deliverTo(createInbox())
    opts.callback((err, m) => {
      if (err) this.onError(err)
      else if (m) this.onMessage(m)
    })

    // TODO: capture subscription for unsubscribing later?
    this.js.subscribe(this.topic, opts)
  }

  async pub(msg: MsgType) {
    const got = await this.js!.publish(this.topic, this.codec.encode(msg))
    console.log('published', got)
  }

  addListener(cb: () => void) {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  onError(err: Error) {
    console.error('bad news', err)
  }

  onMessage(m: JsMsg) {
    try {
      const data = this.codec.decode(m.data) as MsgType
      this.history.push(data)
      if (m.info.pending == 0) {
        this.listeners.forEach((l) => l())
      }
    } catch (e: any) {
      console.error(this.topic, e.message)
    }
  }
}
