import * as P from 'micro-packed'
import * as ed from '@noble/ed25519'
import * as aes from 'micro-aes-gcm'
import * as msgpack from '@msgpack/msgpack'

type EncodeOpts = {
  encPublicKey?: Uint8Array
  symKey?: Uint8Array
}

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

export class ChantCodec {
  publicKey: Uint8Array
  private privateKey: Uint8Array
  private keys: Uint8Array[] = []
  // private jsonCodec = JSONCodec()

  constructor(privateKey: Uint8Array, publicKey: Uint8Array) {
    this.privateKey = privateKey
    this.publicKey = publicKey
    this.addKey(privateKey)
  }

  addKey(key: Uint8Array) {
    this.keys.push(key)
  }

  async encode(obj: unknown, opts?: EncodeOpts) {
    const json = msgpack.encode(obj)
    const signed = await this.sign(json, this.privateKey)
    if (opts?.encPublicKey) {
      return this.encryptAsym(signed, opts.encPublicKey)
    } else if (opts?.symKey) {
      return aes.encrypt(opts.symKey, signed)
    } else {
      return signed
    }
  }

  async decode<T>(bytes: Uint8Array) {
    // attempt to decrypt using any keys
    // a magic prefix could be used to make this cheaper
    let signed = bytes
    for (let key of this.keys) {
      try {
        signed = await this.decryptAsym(bytes, key)
        break
      } catch (e) {}

      try {
        signed = await aes.decrypt(key, bytes)
        break
      } catch (e) {}
    }

    try {
      const { bytes, publicKey, valid } = await this.unsign(signed)
      if (!valid) {
        console.log('invalid signature')
        return
      }
      const data = msgpack.decode(bytes) as T
      return {
        data,
        publicKey,
      }
    } catch (e) {}
  }

  private async sign(bytes: Uint8Array, privateKey: Uint8Array) {
    const publicKey = await ed.getPublicKey(privateKey)
    const signature = await ed.sign(bytes, privateKey)
    return SignedPayload.encode({ bytes, publicKey, signature })
  }

  private async unsign(bytes: Uint8Array) {
    const struct = SignedPayload.decode(bytes)
    const valid = await ed.verify(
      struct.signature,
      struct.bytes,
      struct.publicKey
    )
    return { ...struct, valid }
  }

  private async encryptAsym(bytes: Uint8Array, publicKey: Uint8Array) {
    const ephemPrivateKey = ed.utils.randomPrivateKey()
    const ephemPublicKey = await ed.getPublicKey(ephemPrivateKey)
    const shared = await ed.getSharedSecret(ephemPrivateKey, publicKey)
    const ciphertext = await aes.encrypt(shared, bytes)
    return AsymEncrypted.encode({
      ephemPublicKey,
      ciphertext,
    })
  }

  private async decryptAsym(bytes: Uint8Array, privateKey: Uint8Array) {
    const struct = AsymEncrypted.decode(bytes)
    const shared = await ed.getSharedSecret(privateKey, struct.ephemPublicKey) // len: 32
    const clear = await aes.decrypt(shared, struct.ciphertext)
    return clear
  }
}
