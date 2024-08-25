import { CommandContext } from ".";
import database from "../services/database";

interface Lurker {
    id: string,
    username: string,
    timestamp: number,
}

const NO_LURKERS = `Yay! No lurkers`

export async function lurk({ irc, message }: CommandContext) {
    const path = `/channel/${irc.channel}/lurkers/${message.userId}`
    let lurker = await database.get<Lurker>(path)
    if (!lurker) {
        lurker = { id: message.userId, username: message.username, timestamp: Date.now() } as Lurker
        database.put<Lurker>(path, lurker)
        irc.chat(`@${lurker.username} is now lurking`)
    } else {
        await database.del(path)
        irc.chat(`@${lurker.username} is no longer lurking`)
    }
}

export async function lurkers({ irc }: CommandContext) {
    const path = `/channel/${irc.channel}/lurkers`
    let record = await database.get<Record<string, Lurker>>(path)
    if(!record) {
        irc.chat(NO_LURKERS)
        return
    }
    
    const entries = Object.values(record);
    if(entries.length <= 0){
        irc.chat(NO_LURKERS)
        return
    }

    const usernames = entries.reduce((m, lurker) => `${m}, ${lurker.username}` , '').replace(', ', '')
    let desc = "chatters are lurking"
    if(entries.length == 1){
        desc = "chatter is lurking"
    }

    irc.chat(`${entries.length} ${desc}: ${usernames}`)
}