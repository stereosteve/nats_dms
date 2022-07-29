import {
  AppShell,
  Avatar,
  Group,
  Header,
  Input,
  Navbar,
  Text,
} from '@mantine/core'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useParams,
  useNavigate,
  Link,
  NavLink,
} from 'react-router-dom'
import './App.css'
import {
  AuthAPI,
  ChatClient,
  ChatMsg,
  useChat,
  useFetchUserByWallet,
} from './hooks'
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
  const { roomlist, ready } = ChatClient.useContainer()

  if (loading) return <div>loading</div>
  if (!wallet || !user) return <AuthenticationTitle />

  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 200 }} height={500} p="xs">
          <Navbar.Section grow className="leftnav">
            <NavLink to="/">Lobby</NavLink>
            {Object.entries(roomlist).map(([path, wallets]) => (
              <NavLink key={path} to={`/dm/${path}`}>
                <Group>
                  {wallets.map((w) => (
                    <UserFace key={w} wallet={w} />
                  ))}
                </Group>
              </NavLink>
            ))}
            <NavLink to="/dm">+ New Chat</NavLink>
          </Navbar.Section>

          <Navbar.Section>
            <UserFace wallet={wallet} />
            <button onClick={clearPrivateKey}>logout</button>
          </Navbar.Section>
        </Navbar>
      }
      header={
        <Header height={50} p="xs">
          <Text>Audius Chat</Text>
        </Header>
      }
    >
      <Outlet />
    </AppShell>
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
    <div>
      {/* <div style={{ padding: 10, background: 'aliceblue' }}>
        {members && members.map((m) => <WallyWall key={m} wallet={m} />)}
        <h2>{!members && 'Lobby'}</h2>
      </div> */}

      <div>
        {visibleLog.map((msg, idx) => (
          <ChatRow msg={msg} key={idx} />
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex' }}>
        <Input
          type="text"
          value={msg}
          onChange={(e: any) => setMsg(e.target.value)}
          placeholder="Say something..."
          required
        />
        <button>Send</button>
      </form>
      {/* <div style={{ fontSize: 10, color: '#555' }}>{wallet}</div> */}
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
    <form onSubmit={handleSubmit}>
      {Object.values(buddylist).map(({ wallet, addr }) => (
        <label style={{ display: 'block' }} key={addr}>
          <Group>
            <input type="checkbox" name={addr} />
            <UserFaceAndName wallet={wallet} />
          </Group>
        </label>
      ))}
      <br />
      <button>chat</button>
    </form>
  )
}

// ----

function ChatRow({ msg }: { msg: ChatMsg }) {
  const { user } = useFetchUserByWallet(msg.wallet)
  if (!user) return null
  return (
    <div>
      <Group style={{ alignItems: 'flex-start', marginBottom: 20 }}>
        <Avatar src={user.avatar_url} />

        <div style={{ flex: 1 }}>
          <Text size="sm" weight={500} title={user.handle}>
            {user.name}

            <small style={{ color: '#ccc', marginLeft: 10 }}>
              {msg.timestamp.toLocaleTimeString()}
            </small>
          </Text>

          <Text>{msg.msg}</Text>
        </div>
      </Group>
    </div>
  )
}

function UserFace({ wallet }: { wallet: string }) {
  const { user } = useFetchUserByWallet(wallet)
  if (!user) return null
  return <Avatar src={user.avatar_url} />
}

function UserFaceAndName({ wallet }: { wallet: string }) {
  const { user } = useFetchUserByWallet(wallet)
  if (!user) return null
  return (
    <Group>
      <Avatar src={user.avatar_url} />
      <Text>{user.name}</Text>
    </Group>
  )
}

/*
https://creatornode2.audius.co/ipfs/QmUSEXrrgm8vZf2Y3VMR15vtn5SPdZAYzzFT1aJNqmCeNH/150x150.jpg
*/
