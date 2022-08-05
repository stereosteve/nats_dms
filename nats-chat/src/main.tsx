import { MantineProvider } from '@mantine/core'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { SWRConfig } from 'swr'
import { Demo } from './App'
import { AuthAPI, ChatClient } from './hooks'
// import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthAPI.Provider>
    <ChatClient.Provider>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
        }}
      >
        <MantineProvider
          withGlobalStyles
          withNormalizeCSS
          theme={{ colorScheme: 'light' }}
        >
          <Demo />
        </MantineProvider>
      </SWRConfig>
    </ChatClient.Provider>
  </AuthAPI.Provider>
)
