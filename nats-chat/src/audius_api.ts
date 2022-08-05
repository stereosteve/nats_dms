import useSWR, { Key } from 'swr'

export type AudiusTrack = {
  id: string
  title: string
  artwork: {
    '150x150': string
  }
  duration: number
  permalink: string
  user: {
    id: string
    handle: string
    name: string
    cover_photo: {
      '640x': string
      '2000x': string
    }
  }

  // added later
  mp3: string

  // added cause mantine autocomplete is weird about extra props
  // todo: look into that
  user_name?: string
  artwork150?: string
}

export type AudiusUser = {
  handle: string
  name: string
  creator_node_endpoint: string
  profile_picture_sizes: string
  avatar_url: string

  profile_picture?: {
    '150x150': string
  }
}

export function useFetchUserByWallet(wallet: Key) {
  const { data: user } = useSWR<AudiusUser>(wallet, (wallet) =>
    fetch(`https://discoveryprovider3.audius.co/users/account?wallet=${wallet}`)
      .then((res) => res.json())
      .then((r) => {
        const user = r.data as AudiusUser
        if (user.profile_picture_sizes) {
          user.avatar_url = user.creator_node_endpoint
            .split(',')
            .map(
              (h: string) =>
                `${h}/ipfs/${user.profile_picture_sizes}/150x150.jpg`
            )[0]
        }

        return user
      })
  )

  return { user }
}

export function useFetchTrackById(trackId: Key) {
  const { data: track } = useSWR<AudiusTrack>(trackId, (trackId) =>
    fetch(`https://discoveryprovider3.audius.co/v1/full/tracks/${trackId}`)
      .then((res) => res.json())
      .then((r) => {
        const track = r.data
        // probably a better way to do this
        track.mp3 =
          new URL(track.artwork['150x150']).origin +
          `/tracks/stream/${track.id}`

        return track
      })
  )

  return { track }
}
