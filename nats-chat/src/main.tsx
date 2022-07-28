import React from 'react'
import ReactDOM from 'react-dom/client'
import { Demo } from './App'
import { ChatClient } from './hooks'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ChatClient.Provider>
      <Demo />
    </ChatClient.Provider>
  </React.StrictMode>
)
