import { Avatar } from '@mantine/core'
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
import './App.css'
import { AuthAPI, ChatClient, useChat, useFetchUserByWallet } from './hooks'
import { AuthenticationTitle } from './Login'
import { UserSearch } from './UserSearch'

export function Demo() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Room />} />
          <Route path="/dm" element={<NewRoom />} />
          <Route path="/dm/:chan" element={<Room />} />
          <Route path="/who" element={<UserSearch />} />
          <Route path="/login" element={<AuthenticationTitle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function Layout() {
  const { loading, user, wallet, clearPrivateKey } = AuthAPI.useContainer()

  if (loading) return <div>loading</div>
  if (!wallet || !user) return <AuthenticationTitle />

  return (
    <div>
      <WallyWall wallet={wallet} />
      <button onClick={clearPrivateKey}>logout</button>
      <hr />
      <Outlet />
    </div>
  )
}

function Room() {
  // if we're in a channel
  const { chan } = useParams()
  const { log, sendit, roomlist, ready } = ChatClient.useContainer()
  const [msg, setMsg] = useState('')
  const members = chan ? roomlist[chan] : undefined

  const visibleLog = useMemo(
    () => log.filter((msg) => msg.chan == chan),
    [log, chan]
  )

  if (!ready) return <div>loading</div>

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    const data = {
      msg,
      chan,
    }
    sendit(data)
    setMsg('')
  }

  return (
    <div className="layout">
      <nav>
        <Link to="/">Lobby</Link>
        {Object.entries(roomlist).map(([path, wallets]) => (
          <Link key={path} to={`/dm/${path}`}>
            {wallets.map((w) => (
              <WallyWall key={w} wallet={w} />
            ))}
          </Link>
        ))}
        <Link to="/dm">+ New Chat</Link>
      </nav>

      <div style={{ marginLeft: 20 }}>
        <div style={{ padding: 10, background: 'aliceblue' }}>
          {members && members.map((m) => <WallyWall key={m} wallet={m} />)}
          <h2>{!members && 'Lobby'}</h2>
        </div>
        <div className="chat-log">
          {visibleLog.map((c, idx) => (
            <div className="chat-msg" key={idx}>
              <WallyWall wallet={c.wallet} />
              <b>{c.msg}</b>
              <br />
              <small>{c.timestamp.toTimeString()}</small>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage}>
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Say something..."
            required
          />
          <button>Send</button>
        </form>
        {/* <div style={{ fontSize: 10, color: '#555' }}>{wallet}</div> */}
      </div>
    </div>
  )
}

function NewRoom() {
  const navigate = useNavigate()
  const { buddylist, ready, addr } = ChatClient.useContainer()

  if (!ready) return <div>loading</div>

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
      {Object.values(buddylist).map(({ wallet, addr }) => (
        <label style={{ display: 'block' }} key={addr}>
          <input type="checkbox" name={addr} />
          <WallyWall wallet={wallet} />
        </label>
      ))}
      <button>chat</button>
    </form>
  )
}

// ----

function WallyWall({ wallet }: { wallet: string }) {
  const { user } = useFetchUserByWallet(wallet)
  if (!user) return null
  const avatarUrl = user.creator_node_endpoint
    .split(',')
    .map((h) => `${h}/ipfs/${user.profile_picture_sizes}/150x150.jpg`)[0]
  return (
    <div>
      <Avatar src={avatarUrl} />
      {user.handle}
    </div>
  )
}

/*
https://creatornode2.audius.co/ipfs/QmUSEXrrgm8vZf2Y3VMR15vtn5SPdZAYzzFT1aJNqmCeNH/150x150.jpg
*/
