import { FormEvent, useEffect, useState } from 'react'
import './App.css'
import { ChatMsg, chatStream } from './provided'

function App() {
  const [handle, setHandle] = useState('')
  const [msg, setMsg] = useState('')
  const [log, setLog] = useState<ChatMsg[]>(chatStream.history)

  useEffect(() => {
    return chatStream.addListener(() => {
      setLog([...chatStream.history])
    })
  }, [])

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    chatStream.pub({ handle, msg })
    setMsg('')
  }

  return (
    <div className="App">
      <h2>Chat 4</h2>
      <div className="chat-log">
        {log.map((c, idx) => (
          <div className="chat-msg" key={idx}>
            <b>{c.handle}</b>: {c.msg}
          </div>
        ))}
      </div>

      <hr />

      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="handle"
          required
        />
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Say something..."
          required
        />
        <button>Send</button>
      </form>
    </div>
  )
}

export default App
