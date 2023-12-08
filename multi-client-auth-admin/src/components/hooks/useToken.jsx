import { useLocalStorageValue, useSessionStorageValue } from '@react-hookz/web'

export default function useToken() {
  const rememberMe = useLocalStorageValue('remember_me', {
    defaultValue: false,
    initializeWithValue: false,
  })
  const localToken = useLocalStorageValue('token', {
    initializeWithValue: false,
  })
  const sessionToken = useSessionStorageValue('token', {
    initializeWithValue: false,
  })

  const token = rememberMe.value ? localToken : sessionToken

  return {
    // not undefined, but 'undefined'
    ready: (typeof token.value != 'undefined'),
    rememberMe: rememberMe.value || false,
    setRememberMe(value) {
      rememberMe.set(value)
    },
    value: token.value,
    set(data) {
      this.remove()
      token.set(data)
    },
    remove() {
      localToken.remove()
      sessionToken.remove()
    },
  }
}