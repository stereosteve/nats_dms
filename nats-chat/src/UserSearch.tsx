import {
  Autocomplete,
  Avatar,
  Group,
  Loader,
  MultiSelect,
  SelectItem,
  Text,
} from '@mantine/core'
import { forwardRef, useRef, useState } from 'react'

export type AudiusUser = {
  handle: string
  name: string
  creator_node_endpoint: string
  profile_picture_sizes: string

  profile_picture?: {
    '150x150': string
  }
}

const UserItem = forwardRef<HTMLDivElement, AudiusUser>(
  ({ name, handle, profile_picture, ...others }: AudiusUser, ref) => (
    <div ref={ref} {...others}>
      <Group noWrap>
        <Avatar src={profile_picture ? profile_picture['150x150'] : ''} />

        <div>
          <Text>{name}</Text>
          <Text size="xs" color="dimmed">
            {handle}
          </Text>
        </div>
      </Group>
    </div>
  )
)

function AutocompleteLoading() {
  const [selected, setSelected] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SelectItem[]>([])

  const handleSearchChange = (q: string) => {
    if (!q) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(searchUrl(q))
      .then((r) => r.json())
      .then((r) => {
        const vals = r.data.map((u: AudiusUser) => ({
          name: u.name,
          handle: u.handle,
          profile_picture: u.profile_picture,
          value: u.handle,
          label: u.handle,
        }))
        setData([...selected, ...vals])
      })
  }
  return (
    <MultiSelect
      itemComponent={UserItem}
      value={selected}
      data={data}
      searchable={true}
      onSearchChange={handleSearchChange}
      onChange={setSelected}
      rightSection={loading ? <Loader size={16} /> : null}
      label="Search Users"
      placeholder="Search Users"
    />
  )
}

function searchUrl(q: string) {
  return `https://discoveryprovider3.audius.co/v1/users/search?query=${encodeURIComponent(
    q
  )}`
}

export function UserSearch() {
  return (
    <div>
      Demo
      <AutocompleteLoading />
    </div>
  )
}
