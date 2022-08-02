import { useState, useRef, forwardRef } from 'react'
import { Autocomplete, Avatar, Group, Loader, Text } from '@mantine/core'
import useSWR, { Key } from 'swr'
import { Track } from '@mantine/core/lib/Slider/Track/Track'
import { useAudio } from 'react-use'

function useTrackSearch(q: Key) {
  const { data, ...rest } = useSWR(q, (q: string) =>
    fetch(
      `https://discoveryprovider3.audius.co/v1/tracks/search?query=${encodeURIComponent(
        q
      )}`
    )
      .then((r) => r.json())
      .then((r) =>
        r.data.map((track: any) => {
          let mp3 =
            new URL(track.artwork['150x150']).origin +
            `/tracks/stream/${track.id}`

          return {
            value: track.id,
            title: track.title,
            artwork: track.artwork['150x150'] || '',
            user_name: track.user.name,
            stream_url: mp3,
          }
        })
      )
  )

  // console.log(data)
  const tracks = data

  return { tracks, ...rest }
}

export type AudiusTrack = {
  title: string
  artwork: string
  user_name: string
  stream_url: string
}

const TrackItem = forwardRef<HTMLDivElement, AudiusTrack>(
  ({ user_name, title, artwork, ...others }: AudiusTrack, ref) => (
    <div ref={ref} {...others}>
      <Group noWrap>
        <Avatar src={artwork} />

        <div>
          <Text>{user_name}</Text>
          <Text>{title}</Text>
        </div>
      </Group>
    </div>
  )
)

export function AutocompleteLoading() {
  const [q, setQ] = useState('')
  const { tracks, isValidating } = useTrackSearch(q)
  const [track, setTrack] = useState<AudiusTrack>()
  const [audio, state, controls, ref] = useAudio({
    src: track ? track.stream_url : '',
    // autoPlay: true,
  })

  function handleSelect(item: any) {
    console.log('play track', item)
    setTrack(item)
    setQ('')
  }

  return (
    <div>
      {track && (
        <div>
          {track.title}
          {audio}
          {state.duration}
          <br />
          <button onClick={controls.play}>play</button>
          <button onClick={controls.pause}>pause</button>
          {/* <audio src={track.stream_url} controls preload="auto" /> */}
        </div>
      )}
      <Autocomplete
        itemComponent={TrackItem}
        value={q}
        data={tracks || []}
        onChange={setQ}
        onItemSubmit={handleSelect}
        rightSection={isValidating ? <Loader size={16} /> : null}
        label="Track Search"
        placeholder="Search for track"
        filter={() => true}
      />
    </div>
  )
}

export function TrackSearch() {
  return (
    <div>
      <AutocompleteLoading />
    </div>
  )
}
