import { assert, test } from 'vitest'
import * as P from 'micro-packed'
import * as ed from '@noble/ed25519'
import * as aes from 'micro-aes-gcm'

const SignedPayload = P.struct({
  bytes: P.bytes(P.U32BE),
  publicKey: P.bytes(32),
  signature: P.bytes(64),
})

const AsymEncrypted = P.struct({
  magic: P.magic(P.U8, 123),
  ephemPublicKey: P.bytes(32),
  ciphertext: P.bytes(P.U32BE),
})

/*

Encoder:
- signPrivateKey
- encryptPrivateKey
- encryptSharedKey

Decoder can have multiple:
- decryptPrivateKey
- decryptSharedKey

What to do with the signature result + signature pubkey?
*/

// Edit an assertion and save to see HMR in action

test('ed25519', async () => {
  const payload = new TextEncoder().encode('steve')

  // random key
  const privateKey = ed.utils.randomPrivateKey()

  // sign message
  const signed = await sign(payload, privateKey)

  // asymetric
  {
    // asymetric encrypt it for my public key
    const publicKey = await ed.getPublicKey(privateKey)
    const encrypted = await encryptAsym(signed, publicKey)

    // asymetric decrypt it + verify
    const decrypted = await decryptAsym(encrypted, privateKey)
    const final = await unsign(decrypted)
    assert.isTrue(final.valid)
  }

  // symetric
  {
    // random shared secret
    const shared = ed.utils.randomBytes()

    // just use aes I guess
    const encrypted = await aes.encrypt(shared, signed)
    const decrypted = await aes.decrypt(shared, encrypted)
    const final = await unsign(decrypted)
    assert.isTrue(final.valid)
  }
})

async function sign(bytes: Uint8Array, privateKey: Uint8Array) {
  const publicKey = await ed.getPublicKey(privateKey)
  const signature = await ed.sign(bytes, privateKey)
  return SignedPayload.encode({ bytes, publicKey, signature })
}

async function unsign(bytes: Uint8Array) {
  const struct = SignedPayload.decode(bytes)
  const valid = await ed.verify(
    struct.signature,
    struct.bytes,
    struct.publicKey
  )
  return { ...struct, valid }
}

async function encryptAsym(bytes: Uint8Array, publicKey: Uint8Array) {
  const ephemPrivateKey = ed.utils.randomPrivateKey()
  const ephemPublicKey = await ed.getPublicKey(ephemPrivateKey)
  const shared = await ed.getSharedSecret(ephemPrivateKey, publicKey)
  const ciphertext = await aes.encrypt(shared, bytes)
  return AsymEncrypted.encode({
    ephemPublicKey,
    ciphertext,
  })
}

async function decryptAsym(bytes: Uint8Array, privateKey: Uint8Array) {
  const struct = AsymEncrypted.decode(bytes)
  const shared = await ed.getSharedSecret(privateKey, struct.ephemPublicKey) // len: 32
  const clear = await aes.decrypt(shared, struct.ciphertext)
  return clear
}
