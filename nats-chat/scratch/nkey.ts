import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils'
import { fromSeed, Prefix } from 'nkeys.js'
import { Codec } from 'nkeys.js/lib/codec'

const key = process.env.audius_delegate_private_key

if (!key) {
  const rand = bytesToHex(randomBytes())
  console.log(`  audius_delegate_private_key is not set`)
  console.log(`    e.g. export audius_delegate_private_key='${rand}' `)
  console.log(`\n`)
  process.exit(1)
}

const rand = hexToBytes(key)
const seed = Codec.encodeSeed(Prefix.User, rand)
const nk = fromSeed(seed)
console.log(` nkey is: `, nk.getPublicKey())
