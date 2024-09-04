import { CommandContext } from ".";
import OpenAI from "openai";
import database from "../services/database";
const openai = new OpenAI()

export async function getContextLines(channelName: string) {
    const path = `/channel/${channelName}/context`
    return await database.get<string[]>(path) ?? []
}

export async function addContextLine(channelName: string, message: string) {
    const path = `/channel/${channelName}/context`
    const context = await getContextLines(channelName)
    context.push(message)
    await database.put(path, context)
}

export async function chat({irc, args, message}: CommandContext) {
    const chatContext = await getContextLines(irc.channel!)

    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            { 
                role: "system", 
                content: 'You are a twitch chat bot aswering questions, promps, or funny remarks on twitch chat. your name is KathenAI.'
            },
            { 
                role: "system", 
                content: `You are answering to a message from @${message.username}. Here's the previous context you might need: ${chatContext.slice(-50).map(m => m + "\n;")}`
            },
            {
                role: 'user',
                content: `${message.text}`  
            }
        ]
    })

    const response = completion.choices[0];
    console.log(completion.choices)
    irc.chat(response.message.content! , 3)
}