import { test, assert, expect } from 'vitest'
import * as secp from '@noble/secp256k1'

test('secp256k1', async () => {
  const payloadBytes = new TextEncoder().encode('hello world')
  const privateKey = secp.utils.randomPrivateKey()
  const publicKey = secp.getPublicKey(privateKey)

  const messageHash = await secp.utils.sha256(payloadBytes)
  const [signature, recovery] = await secp.sign(messageHash, privateKey, {
    recovered: true,
    extraEntropy: true,
  })
  console.log({
    ctx: 'secp',
    sigLen: signature.length,
    pubkeyLen: publicKey.length,
    recovery,
  })

  // verify + recover pubkey
  {
    const isValid = secp.verify(signature, messageHash, publicKey)
    assert(isValid)
    const recovered = secp.recoverPublicKey(messageHash, signature, recovery)
    // console.log({ publicKey, recovered })
    expect(recovered).toStrictEqual(publicKey)
  }
})
