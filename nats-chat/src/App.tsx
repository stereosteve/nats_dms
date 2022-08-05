import {
  ActionIcon,
  Anchor,
  AppShell,
  Avatar,
  AvatarProps,
  Button,
  Container,
  Group,
  Header,
  Input,
  Modal,
  Navbar,
  Progress,
  Text,
  Tooltip,
} from '@mantine/core'
import { useFocusTrap } from '@mantine/hooks'
import {
  IconBold,
  IconBolt,
  IconHammer,
  IconHeadphones,
  IconHeadphonesOff,
  IconPlayerPlay,
} from '@tabler/icons'
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
import { useAudio } from 'react-use'
import './App.css'
import {
  useFetchTrackById,
  AudiusTrack,
  useFetchUserByWallet,
} from './audius_api'
import { AuthAPI, ChatClient, ChatMsg, useChat } from './hooks'
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
          <Route path="/login" element={<AuthenticationTitle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function Layout() {
  const { loading, user, wallet, clearPrivateKey } = AuthAPI.useContainer()
  const { roomlist } = ChatClient.useContainer()

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

function NowPlaying({
  mostRecentSpin,
}: {
  mostRecentSpin: ChatMsg | undefined
}) {
  // bunch of hacky stuff in here to do "synced playback"
  // there's got to be a better way!  probably pulling out to a global provider type of thing
  const trackId = mostRecentSpin?.trackId
  const [muted, setMuted] = useState(false)
  const [tracksOver, setTracksOver] = useState(false)
  const { track } = useFetchTrackById(trackId)
  const [audio, state, controls, ref] = useAudio({
    src: track?.mp3 || '',
    preload: 'auto',
  })

  // compoute position in track
  function syncup() {
    if (!mostRecentSpin || !track || !ref) return
    const msOffset = new Date().getTime() - mostRecentSpin.timestamp.getTime()
    const pos = msOffset / 1000
    const drift = Math.abs(state.time - pos)

    if (msOffset < 0) {
      console.log('song is in future', msOffset)
      controls.seek(0)
      // controls.pause()
      setTimeout(syncup, Math.abs(msOffset))
      return
    }

    if (pos > track.duration) {
      console.log('tracks over')
      setTracksOver(true)
      return
    }

    setTracksOver(false)
    console.log('seek from', state.time, `to`, pos, 'drift', drift)
    controls.seek(pos)
    controls.play()
  }

  function printDebug() {
    if (!mostRecentSpin || !track || !ref) return
    const msOffset = new Date().getTime() - mostRecentSpin.timestamp.getTime()
    const pos = msOffset / 1000
    const drift = Math.abs(state.time - pos)
    console.log('seek from', state.time, `to`, pos, 'drift', drift)
    console.log(state)
  }

  useEffect(() => {
    if (!mostRecentSpin || !track || !ref) return
    setTimeout(syncup, 300)
    syncup()
  }, [mostRecentSpin, track, ref])

  function toggleMute() {
    muted ? controls.unmute() : controls.mute()
    setMuted(!muted)
  }

  if (!mostRecentSpin || !track || tracksOver) return audio
  return (
    <div
      style={{
        backgroundImage: 'url(' + track.user.cover_photo['2000x'] + ')',
        backgroundSize: 'cover',
      }}
    >
      {audio}
      <Group p={8} style={{ background: 'rgba(255,255,255,0.85)' }}>
        <Avatar src={track.artwork['150x150']} />

        <div style={{ flexGrow: 1 }}>
          <Anchor href={`https://audius.co${track.permalink}`} target="_blank">
            <b>{track.title}</b> by {track.user.name}
          </Anchor>
          <Group>
            <Progress
              value={(state.time / state.duration) * 100}
              style={{ flexGrow: 1 }}
            />
            <ActionIcon variant="subtle" onClick={toggleMute}>
              {muted ? <IconHeadphones /> : <IconHeadphonesOff />}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={syncup}
              title="start (or fix) synced playback"
            >
              <IconBolt />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={printDebug}
              title="print debug"
            >
              <IconHammer />
            </ActionIcon>
          </Group>
        </div>
      </Group>
    </div>
  )
}

function Room() {
  // if we're in a channel
  const { chan } = useParams()
  const { log, sendit, ready } = ChatClient.useContainer()
  const [msg, setMsg] = useState('')

  const visibleLog = useMemo(
    () => log.filter((msg) => msg.chan == chan),
    [log, chan]
  )

  const mostRecentSpin = useMemo(() => {
    return visibleLog
      .slice()
      .reverse()
      .find((m) => m.trackId)
  }, [visibleLog])

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
      <div>
        <NowPlaying mostRecentSpin={mostRecentSpin} />
      </div>

      <div style={{ flexGrow: 1, overflow: 'auto', padding: 5 }}>
        {visibleLog.length == 0 ? (
          <h4 style={{ color: '#555' }}>Say something to get it started!</h4>
        ) : null}
        {visibleLog.map((msg, idx) => (
          <ChatRow msg={msg} key={idx} isLast={idx == visibleLog.length - 1} />
        ))}
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
          <Button type="submit">Say</Button>
          <SpinModal />
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
  const { chan } = useParams()
  const [opened, setOpened] = useState(false)
  const { sendit } = ChatClient.useContainer()

  function onTrack(track: AudiusTrack) {
    setOpened(false)
    sendit({
      trackId: track.id,
      chan,
    })
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Select a song..."
        overlayOpacity={0.25}
        size="xl"
      >
        <TrackSearch onSelect={onTrack} />
      </Modal>

      <Group position="center">
        <Button onClick={() => setOpened(true)}>Play Song</Button>
      </Group>
    </>
  )
}

function ChatRow({ msg, isLast }: { msg: ChatMsg; isLast: boolean }) {
  const divRef = useRef<HTMLDivElement>(null)
  const { user } = useFetchUserByWallet(msg.wallet)
  const { track } = useFetchTrackById(msg.trackId)

  useEffect(() => {
    if (isLast && divRef.current) {
      divRef.current.scrollIntoView()
    }
  }, [user, track, isLast])

  if (!user) return null

  return (
    <div ref={divRef}>
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

          {track && <TrackRow track={track} />}
        </div>
      </Group>
    </div>
  )
}

function TrackRow({ track }: { track: AudiusTrack }) {
  if (!track) return null
  return (
    <div>
      <Group spacing="xs">
        <Avatar src={track.artwork['150x150']} />
        <div style={{ fontSize: '80%', lineHeight: 1.1 }}>
          <b>{track.title}</b>
          <br />
          {track.user.name}
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
