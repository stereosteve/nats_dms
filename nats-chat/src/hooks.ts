import { base58, base64 } from '@scure/base'
import { useState, useEffect, useMemo } from 'react'
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
import { useLocalStorage } from 'react-use'
import { AudiusUser } from './UserSearch'
import useSWR, { Key } from 'swr'
import { Address } from 'micro-eth-signer'

export const ChatClient = createContainer(useChat)
export const AuthAPI = createContainer(useAuth)

const SUBJECT = 'derpy.chat8'

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

  wallet: string
  addr: string
  handle: string
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
  const { privateKey, wallet, user } = AuthAPI.useContainer()
  const [codec, setCodec] = useState<ChantCodec>()
  const [log, setLog] = useState<ChatMsg[]>([])
  const [js, setJs] = useState<JetStreamClient>()
  const [ready, setReady] = useState(false)
  const [addr, setAddr] = useState<string>()

  useEffect(() => {
    if (!nats || !privateKey) return
    ed.getPublicKey(privateKey).then((pub) => {
      // TODO: get rid of ed25519 pubkey
      // addr is base58 ed25519 pubkey
      setAddr(base58.encode(pub))

      const codec = new ChantCodec(privateKey, pub)

      // create jetstream sub here
      const js = nats.jetstream()

      async function consume() {
        const opts = consumerOpts().deliverTo(createInbox())
        const sub = await js.subscribe(SUBJECT, opts)
        for await (const m of sub) {
          const got = await codec.decode<ChatMsg>(m.data)
          if (got) {
            const msg = got.data
            setLog((old) => [...old, msg])
          }
          // m.ack()
        }
      }

      consume()

      setJs(js)
      setCodec(codec)
      setReady(true)
    })
  }, [nats, privateKey])

  async function sendit(msg: Partial<ChatMsg>) {
    if (!wallet || !user) throw new Error(`cant sendit without user`)

    msg.timestamp = new Date()

    // TODO: demo hack
    // really should sign messages with secp256k1 so we can recover public key
    // and wallet address instead if putting it in message body where it could be arbitrarily set
    // recovered wallet addr should be used for user lookup
    msg.wallet = wallet
    msg.addr = addr
    msg.handle = user.handle

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

  type AddrAndWallet = {
    addr: string
    wallet: string
  }

  // build up a map of addr: {addr, wallet}
  // for all known people from visible messages
  // this is required since we are using ed25519 keys still
  // and it's not easy to get pubkey from eth wallet
  const buddylist = useMemo(() => {
    const byAddr: Record<string, AddrAndWallet> = {}
    for (let msg of log) {
      const { addr, wallet } = msg
      byAddr[msg.addr] = {
        addr,
        wallet,
      }
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
      result[chan] = chan.split(',').map((addr) => buddylist[addr].wallet)
    }
    return result
  }, [log])

  return { log, sendit, buddylist, roomlist, ready, addr }
}

///// --------------

// export const walletFetcher = (wallet: string) =>

export function useFetchUserByWallet(wallet: Key) {
  const { data: user } = useSWR<AudiusUser>(wallet, (wallet) =>
    fetch(`https://discoveryprovider3.audius.co/users/account?wallet=${wallet}`)
      .then((res) => res.json())
      .then((r) => r.data)
  )

  return { user }
}

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
