import { ChatMessage, TwitchIRC } from "../services/twitch-irc";
import { pick } from "../services/utility";
import { chat } from "./chat";
import { duel } from "./duelmon/duel";
import { lurk, lurkers } from "./lurk";

export interface CommandContext {
    message: ChatMessage,
    args: string[],
    argStr: string,
    irc: TwitchIRC
}

export type CommandHandler = (ctx: CommandContext) => void

// Register commands here
const commands : Record<string, CommandHandler> = { commands: list, chat, echo, duel, lurk, lurkers, today, slap }

async function echo({ irc, message, argStr }: CommandContext) {
    irc.chat(`@${message.username} said${argStr}`)
}

async function list({irc, message}: CommandContext) {
    const commandStr = Object.keys(commands).map(cmd => '!' + cmd).join(', ');
    irc.chat(`@${message.username} Available commands: ${commandStr}`)
}

async function today({irc, message}: CommandContext) {
    irc.chat(`@${message.username} Today we're setting up and deploying nhanify! For real this time`)
}

async function slap({ irc, args, message}: CommandContext) {
    if(args.length >= 1 && args[0].startsWith('@')) {
        const toUsername = args[0].slice(1)
        const messages = [
            'It hurt really badly',
            'It made them cry',
            "Didn't even phase them",
            "definetly felt that",
            "Will they react?"
        ];
        irc.chat(`@${message.username} slapped @${toUsername}, ${pick(messages)}`)
    }
}

export default commands