import { connect } from 'nats'
import * as secp from '@noble/secp256k1'
import { ChantCodec } from '../src/codec'
import { Address } from 'micro-eth-signer'

const nc = await connect({
  // servers: ['35.188.15.87:4222'],
})

const myPrivate = secp.utils.randomPrivateKey()
const chantCodec = new ChantCodec(myPrivate)

async function listen() {
  const sub = nc.subscribe('audius.>')
  for await (const m of sub) {
    const unsigned = await chantCodec.decode(m.data)
    if (unsigned) {
      const wallet = Address.fromPublicKey(unsigned.publicKey)
      console.log(wallet, unsigned.data)
    }
  }
  console.log('subscription closed')
}

async function send() {
  const message = {
    handle: 'steve',
    message: 'I like dirt 2',
  }

  const signed = await chantCodec.encode(message)
  nc.publish('audius.echo', signed)
}

listen()
send()
