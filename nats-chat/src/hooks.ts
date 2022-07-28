import { base58, base64 } from '@scure/base'
import { useState, useEffect } from 'react'
import * as ed from '@noble/ed25519'
import { ChantCodec } from './codec'
import {
  connect,
  consumerOpts,
  createInbox,
  JetStreamClient,
  NatsConnection,
} from 'nats.ws'
import { createContainer } from 'unstated-next'

export const ChatClient = createContainer(useChat)

const SUBJECT = 'derpy.chat4'

let natsServers = [
  'ws://localhost:4241',
  'ws://localhost:4242',
  'ws://localhost:4243',
]

if (import.meta.env.PROD) {
  natsServers = [
    'wss://nats4241.audius2.stereosteve.com',
    'wss://nats4242.audius2.stereosteve.com',
    'wss://nats4243.audius2.stereosteve.com',
  ]
}

export type ChatMsg = {
  addr: string
  handle: string
  msg: string
  chan?: string
}

export function useNats() {
  const [nats, setNats] = useState<NatsConnection | null>(null)

  useEffect(() => {
    connect({
      servers: natsServers,
    }).then(setNats)
  }, [])

  return nats
}

export function useChat() {
  const nats = useNats()
  const privateKey = usePrivateKey()
  const [codec, setCodec] = useState<ChantCodec>()
  const [log, setLog] = useState<ChatMsg[]>([])
  const [js, setJs] = useState<JetStreamClient>()
  const [addr, setAddr] = useState<string>()
  const [handleMap, setHandleMap] = useState<Record<string, string>>({})
  const [chanList, setChanList] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!nats || !privateKey) return
    ed.getPublicKey(privateKey).then((pub) => {
      const codec = new ChantCodec(privateKey, pub)

      // create jetstream sub here
      const js = nats.jetstream()
      const opts = consumerOpts().deliverTo(createInbox())
      opts.callback(async (err, m) => {
        if (err) return console.error(err)
        if (!m) return console.error('no message')
        const got = await codec.decode<ChatMsg>(m.data)
        if (got) {
          const msg = got.data
          setHandleMap((old) => ({ ...old, [msg.addr]: msg.handle }))
          setLog((old) => [...old, got.data])
          setChanList((old) => {
            if (!msg.chan || old.includes(msg.chan)) return old
            old.push(msg.chan)
            old.sort()
            return [...old]
          })
        }
        if (m.info.pending === 0) {
          setReady(true)
        }
      })
      js.subscribe(SUBJECT, opts)

      setJs(js)
      setCodec(codec)
      setAddr(base58.encode(pub))
    })
  }, [nats, privateKey])

  async function sendit(msg: ChatMsg) {
    if (msg.chan) {
      const pubkeys = msg.chan.split(',').map((b) => base58.decode(b))
      await Promise.all(
        pubkeys.map(async (encPublicKey) => {
          const bytes = await codec!.encode(msg, { encPublicKey })
          await js?.publish(SUBJECT, bytes)
        })
      )
    } else {
      const bytes = await codec!.encode(msg)
      await js?.publish(SUBJECT, bytes)
    }
  }

  return { addr, log, sendit, handleMap, chanList, ready }
}

function usePrivateKey() {
  const [key, setKey] = useState<Uint8Array>()

  useEffect(() => {
    const name = 'nats_chat_private_key'
    if (!localStorage.getItem(name)) {
      localStorage.setItem(name, base64.encode(ed.utils.randomPrivateKey()))
    }
    setKey(base64.decode(localStorage.getItem(name)!))
  }, [])

  return key
}
