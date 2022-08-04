import { assert, expect, test } from 'vitest'
import * as secp from '@noble/secp256k1'

import { ChantCodec } from './codec'

test('codec', async () => {
  const myPrivate = secp.utils.randomPrivateKey()
  const myPublic = secp.getPublicKey(myPrivate)

  const message = {
    handle: 'steve',
    message: 'I like dirt',
  }

  const chantCodec = new ChantCodec(myPrivate)

  // no options signs message
  {
    const encoded = await chantCodec.encode(message)
    const decoded = await chantCodec.decode(encoded)
    expect(decoded).toBeDefined()

    const { publicKey, data } = decoded!
    expect(publicKey).toStrictEqual(myPublic)
    expect(data).toStrictEqual(message)
  }

  const friendPrivate = secp.utils.randomPrivateKey()
  const friendPublic = secp.getPublicKey(friendPrivate)
  const friendChantProto = new ChantCodec(friendPrivate)

  // shared secret
  {
    const shared = secp.utils.randomBytes()
    const encrypted = await chantCodec.encode(message, {
      symKey: shared,
    })

    // I can't decrypt at first
    const nope = await chantCodec.decode(encrypted)
    expect(nope).toBeUndefined()

    // but friend can add shared... and it works
    friendChantProto.addKey(shared)
    const yup = await friendChantProto.decode(encrypted)
    expect(yup).toBeDefined()
  }

  // encrypt for friend
  {
    const encrypted = await chantCodec.encode(message, {
      encPublicKey: friendPublic,
    })

    // I can't decrypt the message
    const nope = await chantCodec.decode(encrypted)
    expect(nope).toBeUndefined()

    // but friend can
    const yup = await friendChantProto.decode(encrypted)
    expect(yup).toBeDefined()
  }
})
