import { useEffect, useState, useRef } from 'react'
import { View, Text, Animated, AppState } from 'react-native'
import { Feather } from '@expo/vector-icons'

/**
 * Lightweight offline banner — no extra dependencies.
 * Pings Supabase health endpoint every 10s when app is active.
 * Shows red banner when offline, hides when connection returns.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [opacity] = useState(new Animated.Value(0))
  const appActive = useRef(true)

  useEffect(() => {
    const checkConnection = async () => {
      if (!appActive.current) return
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        await fetch('https://hzymsezqfxzpbcqryeim.supabase.co/rest/v1/', {
          method: 'HEAD',
          signal: controller.signal,
        })
        clearTimeout(timeout)
        setOffline(false)
      } catch {
        setOffline(true)
      }
    }

    // Check immediately, then every 10 seconds
    checkConnection()
    const interval = setInterval(checkConnection, 10000)

    const sub = AppState.addEventListener('change', (state) => {
      appActive.current = state === 'active'
      if (state === 'active') checkConnection()
    })

    return () => {
      clearInterval(interval)
      sub.remove()
    }
  }, [])

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: offline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [offline, opacity])

  if (!offline) return null

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
      backgroundColor: '#C53030', paddingTop: 50, paddingBottom: 8,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
      opacity,
    }}>
      <Feather name="wifi-off" size={14} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
        No internet connection
      </Text>
    </Animated.View>
  )
}
