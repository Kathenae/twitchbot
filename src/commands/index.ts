import { ChatMessage, TwitchIRC } from "../services/twitch-irc";
import { lurk, lurkers } from "./lurk";


export interface CommandContext {
    message: ChatMessage,
    args: string[],
    argStr: string,
    irc: TwitchIRC
}

export type CommandHandler = (ctx: CommandContext) => void

// Register commands here
const commands : Record<string, CommandHandler> = { list, echo, lurk, lurkers }

async function echo({ irc, message, argStr }: CommandContext) {
    irc.chat(`@${message.username} said${argStr}`)
}

async function list({irc, message}: CommandContext) {
    const commandStr = Object.keys(commands).map(cmd => '!' + cmd).join(', ');
    irc.chat(`@${message.username} Available commands: ${commandStr}`)
}

export default commands