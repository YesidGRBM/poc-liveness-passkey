import { createAuthClient } from 'better-auth/client'
import { anonymousClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000/api/auth',
  plugins: [anonymousClient(), passkeyClient()],
})
