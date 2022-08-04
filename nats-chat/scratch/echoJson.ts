import { connect } from 'nats'
import * as secp from '@noble/secp256k1'
import { ChantCodec } from '../src/codec'
import { Address } from 'micro-eth-signer'
import { headers, JSONCodec, MsgHdrsImpl } from 'nats.ws'
import { base32, base64 } from '@scure/base'

const nc = await connect({
  // servers: ['35.188.15.87:4222'],
})

const myPrivate = secp.utils.randomPrivateKey()
const chantCodec = new ChantCodec(myPrivate)
const jsonCodec = JSONCodec()

async function listen() {
  const sub = nc.subscribe('audius.>')
  for await (const m of sub) {
    const data = jsonCodec.decode(m.data)
    const sig = m.headers?.get('signature')
    const recov = m.headers?.get('recovery')
    if (!sig || !recov) {
      console.log('missing signature header... skipping')
      continue
    }
    const { publicKey, valid } = await simpleUnsign(
      m.data,
      base64.decode(sig),
      parseInt(recov)
    )
    console.log(valid, publicKey)
    console.log(data)
    // const unsigned = await chantCodec.decode(m.data)
    // if (unsigned) {
    //   const wallet = Address.fromPublicKey(unsigned.publicKey)
    //   console.log(wallet, unsigned.data)
    // }
  }
  console.log('subscription closed')
}

async function send() {
  const message = {
    handle: 'steve',
    message: 'I like dirt 2',
  }

  // const signed = await chantCodec.encode(message)
  const bytes = jsonCodec.encode(message)
  const { signature, recovery } = await simpleSign(bytes, myPrivate)

  const hdr = new MsgHdrsImpl()
  hdr.set('signature', base64.encode(signature))
  hdr.set('recovery', recovery.toString())
  nc.publish('audius.echo.json', bytes, {
    headers: hdr,
  })
  console.log('sent')
}

listen()
send()

async function simpleSign(bytes: Uint8Array, privateKey: Uint8Array) {
  const messageHash = await secp.utils.sha256(bytes)
  const [signature, recovery] = await secp.sign(messageHash, privateKey, {
    recovered: true,
    extraEntropy: true,
  })
  return { signature, recovery }
}

async function simpleUnsign(
  bytes: Uint8Array,
  signature: Uint8Array,
  recovery: any
) {
  const messageHash = await secp.utils.sha256(bytes)

  const publicKey = secp.recoverPublicKey(
    messageHash,
    signature,
    recovery as any
  )
  const valid = secp.verify(signature, messageHash, publicKey)
  return { publicKey, valid }
}
