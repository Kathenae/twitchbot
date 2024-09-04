import { addContextLine } from "../commands/chat"
import { requestCredentials } from "./twitch-auth"
import { wait } from "./utility"
import { IRCMessage, parse } from 'irc-message-ts'

interface IRCResponse extends MessageEvent {
    message: IRCMessage
    messages: IRCMessage[]
}

export interface ChatMessage {
    id: string
    userId: string,
    username: string
    text: string
}

const IRC_NOTICE = 'NOTICE'
const IRC_JOIN = 'JOIN'

type OnChatHandler = (message: ChatMessage) => void

export class TwitchIRC extends WebSocket {
    channel: string | null
    nickname: string | null
    onchat: OnChatHandler | null

    constructor(host: string) {
        super(host)
        this.channel = null
        this.nickname = null
        this.onchat = null

        this.onmessage = (event) => {
            this._keepAlive(event.data)
            const messages = this.parse(event.data)
            if (messages.first.command == 'PRIVMSG' && this.onchat) {
                const id = messages.first.tags['id']
                const username = messages.first.tags['display-name']
                const userId = messages.first.tags['user-id']
                const text = messages.first.trailing
                this.onchat({ username, id, text, userId })
            }
        }
    }

    parse(text: string) {
        const rawMessages = text.split('\r\n')
        const messages: { first: IRCMessage, all: IRCMessage[] } = {
            first: { command: '', param: '', params: [], prefix: '', raw: '', tags: {}, trailing: '' },
            all: []
        }

        for (const message of rawMessages) {
            if (!message) {
                continue
            }

            const parsedMessage = parse(message)
            if (parsedMessage == null) {
                continue
            }

            messages.all.push(parsedMessage)
        }
        messages.first = messages.all[0]
        return messages
    }

    _keepAlive(message: string) {
        const parts = message.split(' ')
        if (parts[0] == 'PING') {
            console.log('KEEP ALIVE ', parts[1])
            this.send(`PONG ${parts[1]}`)
        }
    }

    private emit(options: { timeout?: number, msg: string[] | string }) {
        let timeout: NodeJS.Timeout

        return new Promise<IRCResponse>((resolve, reject) => {

            const onmessage = (event: MessageEvent) => {
                const result = this.parse(event.data)
                if (timeout) {
                    clearTimeout(timeout)
                }
                this.removeEventListener("message", onmessage)
                this.removeEventListener("error", onerror)
                resolve({
                    ...event,
                    messages: result.all,
                    message: result.first
                })
            }

            const onerror = (error: any) => {
                if (timeout) {
                    clearTimeout(timeout)
                }
                this.removeEventListener("message", onmessage)
                this.removeEventListener("error", onerror)
                reject(error)
            }

            if (options && options.timeout) {
                timeout = setTimeout(() => {
                    this.removeEventListener("message", onmessage)
                    this.removeEventListener("error", onerror)
                    reject(new Error("Timed out", { cause: options.msg }))
                }, options.timeout * 1000)
            }

            this.addEventListener('message', onmessage)
            this.addEventListener('error', onerror)

            if (options.msg instanceof Array) {
                options.msg.forEach(message => {
                    this.send(message)
                })
            }
            else {
                this.send(options.msg)
            }
        })
    }

    private async authenticate(nickname: string, access_token: string, capacities: string[]) {
        const capStr = `${capacities.reduce(((cap, cur) => `${cap} ${cur}`), '')}`
        let response = await this.emit({ msg: [`CAP REQ :${capStr}`] })

        if (response.message.command == 'NAK') {
            return false
        }

        response = await this.emit({
            msg: [
                `PASS oauth:${access_token}`,
                `NICK ${nickname}`
            ]
        })

        return response.message.command != IRC_NOTICE
    }

    private async join(channel: string) {
        try {
            let response = await this.emit({
                msg: `JOIN #${channel}`,
                timeout: 10
            })
            const joined = response.message.command == IRC_JOIN
            this.channel = channel
            return joined
        } catch (error) {
            return false
        }
    }

    async chat(message: string, wait_time?: number) {
        await wait(wait_time ?? 1)

        addContextLine(this.channel!, `${this.nickname}: ${message}`)
        const response = await this.emit({
            msg: `PRIVMSG #${this.channel} :${message}`
        })
        return response.messages;
    }

    static async create() {
        return new Promise<TwitchIRC>(function (resolve, reject) {
            var server = new TwitchIRC("wss://irc-ws.chat.twitch.tv:443")

            server.onopen = function () {
                resolve(server);
            };
            server.onerror = function (err) {
                reject(err);
            };

        });
    }

    async connect(channel: string, onchat: OnChatHandler) {
        const credentials = await requestCredentials()
        if (!credentials) {
            return
        }
        const authenticated = await this.authenticate(
            credentials.nickname,
            credentials.access_token,
            ['twitch.tv/membership', 'twitch.tv/tags', 'twitch.tv/commands']
        )

        if (!authenticated) {
            console.log("Failed to authenticate")
            return
        }
        else {
            console.log(`Successfully authenticated as ${credentials.nickname}`)
        }

        const joined = await this.join(channel);
        if (!joined) {
            console.log(`Failed to join channel ${channel}`)
            return
        } else {
            console.log(`Joined the #${channel} channel`)
        }

        this.nickname = credentials.nickname

        this.onchat = onchat
    }
}