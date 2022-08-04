import {
  TextInput,
  PasswordInput,
  Checkbox,
  Anchor,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Button,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { HedgehogLite } from './hedgehog'
import { AuthAPI, ChatClient } from './hooks'

export function AuthenticationTitle() {
  const { setPrivateKey } = AuthAPI.useContainer()

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  })

  const doLogin = form.onSubmit(async ({ email, password }) => {
    const hedgehog = new HedgehogLite()
    try {
      const hdkey = await hedgehog.login(email, password)
      setPrivateKey(hdkey.privateKey!)
    } catch (e) {
      console.log('login failed', e)
    }
  })

  return (
    <Container size={420} my={40}>
      <Title
        align="center"
        sx={(theme) => ({
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          fontWeight: 900,
        })}
      >
        Audius Chat
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Log in with Audius username + password
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={doLogin}>
          <TextInput
            label="Email"
            placeholder="you@mantine.dev"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps('password')}
          />

          <Button fullWidth mt="xl" type="submit">
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  )
}
