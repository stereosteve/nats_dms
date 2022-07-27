import { base58 } from '@scure/base'
import { useState, useEffect } from 'react'

function usePubkey() {
  const [privateKey] = useLocalStorage('private_key', ed.utils.randomPrivateKey)
  const [publicKey, setPublicKey] = useState<Uint8Array | undefined>()

  useEffect(() => {
    if (!privateKey) return
    ed.getPublicKey(privateKey).then((pub) => {
      setPublicKey(pub)
      console.log('pubkey', base58.encode(pub))
    })
  }, [privateKey])

  return publicKey
}

function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    const getInitialValue = () =>
      initialValue instanceof Function ? initialValue() : initialValue

    if (typeof window === 'undefined') {
      return getInitialValue()
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : getInitialValue()
    } catch (error) {
      // If error also return initialValue
      console.log(error)
      return getInitialValue()
    }
  })
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error)
    }
  }
  return [storedValue, setValue] as const
}
