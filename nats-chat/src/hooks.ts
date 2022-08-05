import { base58, base64 } from '@scure/base'
import { useState, useEffect, useMemo } from 'react'
import { ChantCodec } from './codec'
import {
  connect,
  consumerOpts,
  createInbox,
  JetStreamClient,
  NatsConnection,
} from 'nats.ws'
import { createContainer } from 'unstated-next'
import { useLocalStorage } from 'react-use'
import useSWR, { Key } from 'swr'
import { Address } from 'micro-eth-signer'
import { useFetchUserByWallet } from './audius_api'

export const ChatClient = createContainer(useChat)
export const AuthAPI = createContainer(useAuth)

const SUBJECT = 'derpy.chat12'

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

// export const

export type ChatMsg = {
  timestamp: Date
  msg: string
  chan?: string
  trackId?: string

  wallet: string
  addr: string
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
  const { privateKey, wallet } = AuthAPI.useContainer()
  const [codec, setCodec] = useState<ChantCodec>()
  const [log, setLog] = useState<ChatMsg[]>([])
  const [js, setJs] = useState<JetStreamClient>()
  const [ready, setReady] = useState(false)
  const [addr, setAddr] = useState<string>()

  useEffect(() => {
    if (!nats || !privateKey) return
    // hack to prevent double js init on login
    if (js) return

    const codec = new ChantCodec(privateKey)
    setAddr(base58.encode(codec.publicKey))

    // create jetstream sub here
    const jetstream = nats.jetstream()

    async function consume() {
      const opts = consumerOpts().deliverTo(createInbox())
      const sub = await jetstream.subscribe(SUBJECT, opts)
      // spools up messages from nats and calls setLog when pending == 0
      // to prevent history from loading all one at a time
      const spool = []
      for await (const m of sub) {
        const got = await codec.decode<ChatMsg>(m.data)
        if (got) {
          const msg = got.data
          // rewrite publicKey and wallet based on "real" values
          // from signature key recover...
          // todo: separate schema for outgoing and incoming message
          msg.addr = base58.encode(got.publicKey)
          msg.wallet = Address.fromPublicKey(got.publicKey)
          spool.push(msg)
          if (m.info.pending == 0) {
            setLog([...spool])
          }
        }
        // m.ack()
      }
    }

    consume()

    setJs(jetstream)
    setCodec(codec)
    setReady(true)
  }, [nats, privateKey])

  async function sendit(msg: Partial<ChatMsg>) {
    if (!wallet) throw new Error(`cant sendit without wallet`)

    msg.timestamp = new Date()

    // hack for "spin" message...
    // set timestamp in future to give all peers a chance to receive message and buffer audio
    if (msg.trackId) msg.timestamp.setSeconds(msg.timestamp.getSeconds() + 1)

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

  // build up a map of addr: {addr, wallet}
  // for all known people from visible messages
  // this is required since we are using ed25519 keys still
  // and it's not easy to get pubkey from eth wallet
  const buddylist = useMemo(() => {
    const byAddr: Record<string, string> = {}
    for (let msg of log) {
      const { addr, wallet } = msg
      byAddr[msg.addr] = wallet
    }

    return byAddr
  }, [log])

  // build up a map of chan: [wallet]
  // this is a hack since chan names are still ed25519 pubkeys
  // but we want to show happy users with wallets
  const roomlist = useMemo(() => {
    const chanSet = new Set(
      log.map((c) => c.chan).filter(Boolean)
    ) as Set<string>
    const result: Record<string, string[]> = {}
    for (let chan of chanSet) {
      result[chan] = chan.split(',').map((addr) => buddylist[addr])
    }
    return result
  }, [log])

  return { log, sendit, buddylist, roomlist, ready, addr }
}

///// --------------

function useAuth() {
  const [privateKey, setPrivateKey, clearPrivateKey] = useLocalStorage(
    'audius_creds',
    undefined,
    {
      raw: false,
      deserializer: base64.decode,
      serializer: base64.encode,
    }
  )

  const wallet = useMemo(
    () => (privateKey ? Address.fromPrivateKey(privateKey) : undefined),
    [privateKey]
  )

  const { user } = useFetchUserByWallet(wallet)
  const loading = wallet && !user

  return {
    loading,
    privateKey,
    setPrivateKey,
    clearPrivateKey,
    wallet,
    user,
  }
}
