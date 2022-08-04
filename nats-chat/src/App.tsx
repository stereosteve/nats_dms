import {
  AppShell,
  Avatar,
  AvatarProps,
  Button,
  Group,
  Header,
  Input,
  Modal,
  Navbar,
  Text,
  Tooltip,
} from '@mantine/core'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
import { TrackSearch } from './TrackSearch'
import { UserSearch } from './UserSearch'

export function Demo() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Room />} />
          <Route path="/new_chat" element={<NewRoom />} />
          <Route path="/dm/:chan" element={<Room />} />
          <Route path="/who" element={<UserSearch />} />
          <Route path="/track" element={<TrackSearch />} />
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
    <div style={{ display: 'flex' }}>
      <Navbar width={{ base: 200 }} p="xs">
        <Navbar.Section grow className="leftnav">
          <NavLink to="/">Lobby</NavLink>
          {Object.entries(roomlist).map(([path, wallets]) => (
            <NavLink key={path} to={`/dm/${path}`}>
              <Avatar.Group spacing="xs">
                {wallets.map((w) => (
                  <UserFace key={w} wallet={w} radius="xl" />
                ))}
              </Avatar.Group>
            </NavLink>
          ))}
          <NavLink to="/new_chat">+ New Chat</NavLink>
        </Navbar.Section>

        <Navbar.Section>
          <Group>
            <UserFace wallet={wallet} />
            <Button variant="subtle" onClick={clearPrivateKey}>
              logout
            </Button>
          </Group>
        </Navbar.Section>
      </Navbar>

      <div style={{ flexGrow: 1 }}>
        <Outlet />
      </div>
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
    <div
      style={{
        height: '100vh',
        // width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flexGrow: 1, overflow: 'auto', padding: 5 }}>
        {visibleLog.length == 0 ? (
          <h3>Say something to get it started!</h3>
        ) : null}
        {visibleLog.map((msg, idx) => (
          <ChatRow msg={msg} key={idx} />
        ))}
        <AlwaysScrollToBottom messages={log} />
      </div>

      <form onSubmit={sendMessage}>
        <Group p={12} spacing="xs">
          <Input
            style={{ flexGrow: 1 }}
            type="text"
            value={msg}
            onChange={(e: any) => setMsg(e.target.value)}
            placeholder="Say something..."
            required
          />
          <Button type="submit">say</Button>
        </Group>
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
      {Object.entries(buddylist).map(([addr, wallet]) => (
        <label style={{ display: 'block' }} key={addr}>
          <Group my={10}>
            <input type="checkbox" name={addr} />
            <UserFaceAndName wallet={wallet} />
          </Group>
        </label>
      ))}
      <br />
      <Button type="submit">Chat</Button>
    </form>
  )
}

// ----

function SpinModal() {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Introduce yourself!"
      >
        {/* Modal content */}
      </Modal>

      <Group position="center">
        <Button onClick={() => setOpened(true)}>Open Modal</Button>
      </Group>
    </>
  )
}

function ChatRow({ msg }: { msg: ChatMsg }) {
  const { user } = useFetchUserByWallet(msg.wallet)
  if (!user) return null
  return (
    <div>
      <Group style={{ alignItems: 'flex-start', margin: 10 }}>
        <Avatar src={user.avatar_url} />

        <div style={{ flex: 1 }}>
          <Text size="xs" weight={700} title={user.handle}>
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

function UserFace({ wallet, ...rest }: { wallet: string } & AvatarProps) {
  const { user } = useFetchUserByWallet(wallet)
  if (!user) return null
  return (
    <Tooltip label={user.name} withArrow>
      <Avatar src={user.avatar_url} {...rest} />
    </Tooltip>
  )
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

const AlwaysScrollToBottom = (props: { messages: any[] }) => {
  const elementRef = useRef<HTMLDivElement>()

  useEffect(() => {
    // @ts-ignore
    elementRef.current.scrollIntoView()
  })

  // @ts-ignore
  return <div ref={elementRef} />
}
