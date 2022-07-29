import { scrypt } from 'ethereum-cryptography/scrypt'
import { decrypt, encrypt } from 'ethereum-cryptography/aes'
import {
  utf8ToBytes,
  bytesToHex,
  hexToBytes,
  bytesToUtf8,
} from 'ethereum-cryptography/utils'
import {
  entropyToMnemonic,
  generateMnemonic,
  mnemonicToEntropy,
  mnemonicToSeed,
} from 'ethereum-cryptography/bip39'
import { wordlist } from 'ethereum-cryptography/bip39/wordlists/english'
import { HDKey } from 'ethereum-cryptography/hdkey'
import { Address } from 'micro-eth-signer'
import { getRandomBytes } from 'ethereum-cryptography/random'

/*
hedgehog login:

1. username:::password, hardcodedSalt -> lookup key
2. get payload from identity server
3. decrypt payload using username:::password , randomSalt
*/

type hexString = string

type AuthDeets = {
  cipherText: string
  iv: string
  lookupKey: string
}

export class HedgehogLite {
  async signup(username: string, password: string): Promise<AuthDeets> {
    // generate entropy
    const mnemonic = generateMnemonic(wordlist)
    const entropy = mnemonicToEntropy(mnemonic, wordlist)

    // generate ranomd iv
    const iv = await getRandomBytes(16)
    const ivHex = bytesToHex(iv)

    // encrypt
    const key = await this.scrypt(password, ivHex)
    const cipherText = await this.encryptEntropy(entropy, key, iv)

    // user lookup key
    const lookupKey = await this.lookupKey(username, password)

    const deets: AuthDeets = {
      iv: ivHex,
      cipherText,
      lookupKey,
    }
    return deets
  }

  async login(username: string, password: string): Promise<HDKey> {
    const authDeets = await this.fetchLookup(username, password)
    const hdkey = await this.decryptEntropy(
      hexToBytes(authDeets.cipherText),
      password,
      authDeets.iv
    )
    return hdkey
  }

  async fetchLookup(username: string, password: string): Promise<AuthDeets> {
    const lookupKey = await this.lookupKey(username, password)
    const u = new URL('https://identityservice.audius.co/authentication')
    u.searchParams.set('username', username)
    u.searchParams.set('lookupKey', lookupKey)
    const resp = await fetch(u.toString())
    const body = await resp.json()
    return body
  }

  async lookupKey(username: string, password: string): Promise<string> {
    const combined = `${username.toLowerCase()}:::${password}`
    const salt = '0x4f7242b39969c3ac4c6712524d633ce9'
    const result = await this.scrypt(combined, salt)
    return bytesToHex(result)
  }

  async encryptEntropy(
    entropy: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
  ): Promise<hexString> {
    const prefixedEntropy = this.prefixAdd(entropy)
    const encrypted = await encrypt(prefixedEntropy, key, iv, 'aes-256-cbc')
    return bytesToHex(encrypted)
  }

  async decryptEntropy(
    cipher: Uint8Array,
    password: string,
    ivHex: string
  ): Promise<HDKey> {
    const key = await this.scrypt(password, ivHex)
    const iv = hexToBytes(ivHex)
    const decrypted = await decrypt(cipher, key, iv, 'aes-256-cbc')
    const entropy = this.prefixRemove(decrypted)
    return this.entropyToHDKey(entropy)
  }

  async entropyToHDKey(entropy: Uint8Array): Promise<HDKey> {
    const mneumonic = entropyToMnemonic(entropy, wordlist)
    const seed = await mnemonicToSeed(mneumonic)

    const hdroot = HDKey.fromMasterSeed(seed)
    const hdsub = hdroot.derive("m/44'/60'/0'/0/0")
    return hdsub
  }

  async scrypt(password: string, ivHex: string): Promise<Uint8Array> {
    const N = 32768
    const r = 8
    const p = 1
    const dkLen = 32
    return scrypt(utf8ToBytes(password), utf8ToBytes(ivHex), N, p, r, dkLen)
  }

  private hedgehogEntropyPrefix = 'hedgehog-entropy:::'

  private prefixAdd(b: Uint8Array): Uint8Array {
    const prefixedText = this.hedgehogEntropyPrefix + bytesToHex(b)
    return utf8ToBytes(prefixedText)
  }

  private prefixRemove(b: Uint8Array): Uint8Array {
    const prefixedText = bytesToUtf8(b)
    if (prefixedText.indexOf(this.hedgehogEntropyPrefix) !== 0) {
      throw new Error(`prefix ${this.hedgehogEntropyPrefix} missing`)
    }
    const withoutPrefix = prefixedText.replace(this.hedgehogEntropyPrefix, '')
    return hexToBytes(withoutPrefix)
  }
}

export async function tester() {
  const hedgehog = new HedgehogLite()

  {
    const deets = await hedgehog.signup('root', 'password')
    console.log({ deets })
    const hdkey = await hedgehog.decryptEntropy(
      hexToBytes(deets.cipherText),
      'password',
      deets.iv
    )
    const addr = Address.fromPrivateKey(hdkey.privateKey!)
    console.log({ hdkey, addr })
  }
}

// tester();
