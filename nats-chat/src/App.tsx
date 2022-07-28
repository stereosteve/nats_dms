import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useParams,
  useNavigate,
  Link,
} from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import './App.css'
import { ChatClient, useChat } from './hooks'

export function Demo() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Room />} />
          <Route path="/dm" element={<NewRoom />} />
          <Route path="/dm/:chan" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function Layout() {
  return (
    <div>
      <nav></nav>
      <Outlet />
    </div>
  )
}

function Room() {
  // if we're in a channel
  const { chan } = useParams()
  const { addr, log, sendit, handleMap } = ChatClient.useContainer()
  const [handle, setHandle] = useLocalStorage<string>('nats_chat_handle', '')
  const [msg, setMsg] = useState('')
  const chanAddrs = chan?.split(',').map((addr) => handleMap[addr])

  const visibleLog = useMemo(
    () => log.filter((msg) => msg.chan == chan),
    [log, chan]
  )

  // glean chan list from visible messages
  const chanMap: Record<string, string[]> = {}
  for (let msg of log) {
    let chan = msg.chan
    if (chan) {
      const nicks = chan
        .split(',')
        .map((k) => handleMap[k] || k.substring(0, 8))
      chanMap[chan] = nicks
    }
  }

  if (!addr) return null

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    const data = {
      addr: addr!,
      handle: handle!,
      msg,
      chan,
    }
    sendit(data)
    setMsg('')
  }

  return (
    <div>
      <h3>{chanAddrs ? chanAddrs?.join(', ') : 'Lobby'}</h3>

      <nav>
        <Link to="/">Lobby</Link>
        {Object.entries(chanMap).map(([chan, nicks]) => (
          <Link key={chan} to={`/dm/${chan}`}>
            {nicks.map((nick) => (
              <span key={nick}> {nick} </span>
            ))}
          </Link>
        ))}
        <Link to="/dm">+ New Chat</Link>
      </nav>

      <div className="chat-log">
        {visibleLog.map((c, idx) => (
          <div className="chat-msg" key={idx}>
            <b title={c.addr}>{handleMap[c.addr]}</b>: {c.msg}
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
      <div>You are: {addr}</div>
    </div>
  )
}

function NewRoom() {
  const navigate = useNavigate()
  const { addr, log, handleMap } = useChat()

  function handleSubmit(e: FormEvent) {
    if (!addr) return
    e.preventDefault()
    const fd = new FormData(e.target as any)
    const keys = Array.from(fd.keys())
    if (!keys.includes(addr)) keys.push(addr)
    keys.sort()
    const topic = keys.join(',')
    navigate(`/dm/${topic}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 800,
        margin: '50px auto',
        border: '1px solid #333',
        padding: 10,
      }}
    >
      {Object.entries(handleMap).map(([pubkey, nick]) => (
        <label style={{ display: 'block' }} key={pubkey}>
          <input type="checkbox" name={pubkey} />
          <b title={pubkey}>{nick}</b>
        </label>
      ))}
      <button>chat</button>
    </form>
  )
}
