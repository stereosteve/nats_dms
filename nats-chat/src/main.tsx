import React from 'react'
import ReactDOM from 'react-dom/client'
import { Demo } from './App'
import { AuthAPI, ChatClient } from './hooks'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthAPI.Provider>
    <ChatClient.Provider>
      <Demo />
    </ChatClient.Provider>
  </AuthAPI.Provider>
)
