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
import { Address } from 'micro-eth-signer'
import { HedgehogLite } from './hedgehog'
import { AuthAPI } from './hooks'

export function AuthenticationTitle() {
  const { setCreds } = AuthAPI.useContainer()

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
      const addr = Address.fromPrivateKey(hdkey.privateKey!)
      setCreds({ privateKey: hdkey.privateKey!, wallet: addr })
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
        Welcome back!
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor<'a'>
          href="#"
          size="sm"
          onClick={(event) => event.preventDefault()}
        >
          Create account
        </Anchor>
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
