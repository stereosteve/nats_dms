import * as P from 'micro-packed'
import * as secp from '@noble/secp256k1'
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
    const messageHash = await secp.utils.sha256(bytes)
    const [signature, recovery] = await secp.sign(messageHash, privateKey, {
      recovered: true,
      extraEntropy: true,
    })
    const signed = msgpack.encode([bytes, messageHash, signature, recovery])
    return signed
  }

  private async unsign(signedBytes: Uint8Array) {
    const [bytes, messageHash, signature, recovery] = msgpack.decode(
      signedBytes
    ) as Uint8Array[]

    const publicKey = secp.recoverPublicKey(
      messageHash,
      signature,
      recovery as any
    )
    const valid = secp.verify(signature, messageHash, publicKey)

    // const valid = await ed.verify(signature, bytes, publicKey)
    return { bytes, publicKey, signature, valid }
  }

  private async encryptAsym(bytes: Uint8Array, publicKey: Uint8Array) {
    const ephemPrivateKey = secp.utils.randomPrivateKey()
    const ephemPublicKey = secp.getPublicKey(ephemPrivateKey)
    // TODO: slice is a bit sus
    const shared = secp
      .getSharedSecret(ephemPrivateKey, publicKey, true)
      .slice(0, 32)
    console.log(shared)
    const ciphertext = await aes.encrypt(shared, bytes)
    return msgpack.encode([ephemPublicKey, ciphertext])
  }

  private async decryptAsym(bytes: Uint8Array, privateKey: Uint8Array) {
    const [ephemPublicKey, ciphertext] = msgpack.decode(bytes) as Uint8Array[]
    // TODO: slice is a bit sus
    const shared = secp
      .getSharedSecret(privateKey, ephemPublicKey, true)
      .slice(0, 32) // len: 32
    const clear = await aes.decrypt(shared, ciphertext)
    return clear
  }
}
