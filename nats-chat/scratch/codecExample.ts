import * as secp from '@noble/secp256k1'
import { Address } from 'micro-eth-signer'
import { ChantCodec } from '../src/codec'

async function main() {
  const myPrivate = secp.utils.randomPrivateKey()
  const chantCodec = new ChantCodec(myPrivate)

  const message = {
    handle: 'steve',
    message: 'I like dirt',
  }

  const signed = await chantCodec.encode(message)
  const unsigned = await chantCodec.decode(signed)

  if (unsigned) {
    const wallet = Address.fromPublicKey(unsigned?.publicKey)
    console.log(wallet, unsigned.data)
  }
}

main()
