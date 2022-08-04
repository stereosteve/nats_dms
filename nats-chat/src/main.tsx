import { MantineProvider } from '@mantine/core'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Demo } from './App'
import { AuthAPI, ChatClient } from './hooks'
// import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthAPI.Provider>
    <ChatClient.Provider>
      <MantineProvider withGlobalStyles withNormalizeCSS>
        <Demo />
      </MantineProvider>
    </ChatClient.Provider>
  </AuthAPI.Provider>
)
