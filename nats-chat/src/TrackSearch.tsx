import { useState, useRef, forwardRef } from 'react'
import {
  Autocomplete,
  AutocompleteItem,
  Avatar,
  Group,
  Loader,
  Text,
} from '@mantine/core'
import useSWR, { Key } from 'swr'
import { AudiusTrack } from './audius_api'

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
            id: track.id,
            value: track.id,
            title: track.title,
            mp3: mp3,

            artwork150: track.artwork['150x150'] || '',
            user_name: track.user.name,
          }
        })
      )
  )

  // console.log(data)
  const tracks = data

  return { tracks, ...rest }
}

const TrackItem = forwardRef<HTMLDivElement, AudiusTrack>(
  ({ user_name, title, artwork150, ...others }: AudiusTrack, ref) => (
    <div ref={ref} {...others}>
      <Group noWrap>
        <Avatar src={artwork150} />

        <div>
          <Text>{user_name}</Text>
          <Text>{title}</Text>
        </div>
      </Group>
    </div>
  )
)

export function TrackSearch({
  onSelect,
}: {
  onSelect: (t: AudiusTrack) => void
}) {
  const [q, setQ] = useState('')
  const { tracks, isValidating } = useTrackSearch(q)
  const [track, setTrack] = useState<AudiusTrack>()

  // const [audio, state, controls, ref] = useAudio({
  //   src: track ? track.stream_url : '',
  //   // autoPlay: true,
  // })

  function handleSelect(item: any) {
    if (item && onSelect) {
      onSelect(item)
    }
    setTrack(item)
    setQ('')
  }

  return (
    <Autocomplete
      autoFocus
      itemComponent={TrackItem}
      value={q}
      data={tracks || []}
      onChange={setQ}
      onItemSubmit={handleSelect}
      rightSection={isValidating ? <Loader size={16} /> : null}
      placeholder="Search for track"
      filter={() => true}
      data-autofocus
    />
  )
}
