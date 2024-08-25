// Import and call dotenv before anything else
// to make sure modules that depend on it
// Already have the required env variables loaded
import dotenv from './services/dotenv';
dotenv.configured()

// Other imports that require process.env
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { authorizationQueue, requestCredentials } from './services/twitch-auth';
import { TwitchIRC } from './services/twitch-irc';
import database from './services/database';
import commands, { CommandHandler } from './commands';

async function listen(channel: string) {
  const irc = await TwitchIRC.create()
  irc.connect(channel, (message) => {

    const parts = message.text.split(" ")
    let command = `${parts[0]}`.toLowerCase()
    
    if(command.startsWith('!') == false) {
      return // Not a command, don't care
    }
    
    command = command.slice(1)
    if (command in commands) {
      const handle = commands[command]
      const args = parts.slice(1)
      const argStr = args.reduce((msg, txt) => msg + ' ' + txt, '')
      handle({ message: message, args: args, argStr: argStr, irc: irc })
    } else {
      console.log(`Unrecognized command ${command}`)
    }
  })
}

const app = new Hono()
app.get('/oauth', (c) => {
  const state = c.req.query('state');

  if (!state) {
    return c.text("Are you lost child?")
  }

  if ((state in authorizationQueue) == false) {
    return c.text("I think you might be lost")
  }

  const promise = authorizationQueue[state]
  delete authorizationQueue[state]

  const error = c.req.query('error')
  const error_description = c.req.query('error_description')

  if (error) {
    promise.reject(new Error(error, { cause: error_description }))
    return c.text("Something went horribly wrong 💀")
  }

  const code = c.req.query('code');
  if (!code) {
    promise.reject(new Error("Twitch fucked up big time"))
    return c.text("Forgot to send us a token?")
  }

  promise.resolve({ code })
  return c.text("All done, we're ready to roll!")
})

const port = Number(process.env.APP_PORT ?? 6969)

console.log(`Server is running on port ${port}`)
serve({
  fetch: app.fetch,
  port
})

listen(process.env.TTV_CHANNEL_NAME!);