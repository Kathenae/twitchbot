import { CommandContext } from "..";
import database from "../../services/database";
import { Duel, Dueler, Duelmon, Move } from "./types";
import dueldex from "./dueldex";
import { pick } from "../../services/utility";

// EXAMPLE SCRIPT:
// dueler: !duel @challenged
// duelbot: @challenger has challanged @challenged to a duel. @challenged, you can type !duel @challenger to accept
// username: !duel @challenger
// duelbot: @challenged has accepted the duel. 
// duelbot: Duel started. You both have the following duelmons: charmonder, Sportle, Blabusaur
// duelbot: You can attack by typing "!duel charmonder attack Sportle.
// duelbot: @challenged its your turn, you have 2 moves.
// username: !duel charmonder attack Blabusaur
// duelbot: @challenged's Charmonder used fireball on Blabusaur, its very effective. Blabusaur has 5/10 HP Left!
// duelbot: @challenged its your last turn make it count
// username: !duel Charmonder attack Blabusaur
// duelbot: @challenged's Charmonder used fireball on Blabusaur, its very effective, Blabusaur has 0/10 HP Left! Blabusaur fainted!
// duelbot: @challenged's turn has ended. its your turn @challenger, you have 2 moves.
// .... moves occur until all the duelmons of one of the players faint
// duelbot: @cha
export async function duel(ctx : CommandContext) {
    const { irc, message, args} = ctx
    let duel = await findUserDuel(ctx, message.username)

    // Handle duel challenging
    if(args.length >= 1 && args[0].startsWith('@')) {
        const toUsername = args[0].slice(1)
        
        if(!duel) {
            duel = await createDuel(ctx, message.username, toUsername)
            irc.chat(`@${message.username} has challenged @${toUsername} to a duelmon battle. @${toUsername} type !duel @${message.username} to accept`)
        }
        else if(duel.challenger.username == toUsername && duel.accepted == false) {
            duel.accepted = true;
            await updateDuel(ctx, duel)
            irc.chat(`@${duel.challenged.username} has accepted the duel.`)
            irc.chat(`Duel started. You both have the following duelmons: ${dueldex.chardmonder.name}, ${dueldex.sportle.name}, ${dueldex.blabusaur.name}. You can attack by typing "!duel ${dueldex.chardmonder.name} attack Sportle."`, 3)
            irc.chat(`@${duel.challenged.username} its your turn, you have 2 moves.`, 5)
        }
        else if(duel.challenger.username == message.username && duel.challenged.username == toUsername) {
            irc.chat(`@${message.username} You have already challenged @${toUsername} to a duel`)
        }
        else if(duel.challenged.username == message.username && duel.accepted) {
            irc.chat(`@${message.username} You have already accepted @${toUsername}'s duel`)
        }
        return
    }

    // No Duel, nothing to do
    if(!duel) {
        return
    }

    const isChallenger = duel.challenger.username == message.username
    const dueler = isChallenger? duel.challenger : duel.challenged
    const otherDueler = isChallenger? duel.challenged : duel.challenger

    // Handle attack order
    if(args[1].toLowerCase() == 'attack' && args.length >= 3) {
        const sourceStr = args[0].toLowerCase().trim()
        const targetStr = args[2].toLowerCase().trim()
        const sourceDuelmon = dueler.dulmons.find(dmn => dmn.name.toLowerCase().trim() == sourceStr)
        if(!sourceDuelmon) {
            irc.chat(`@${dueler.username} you don't have a Duelmon called ${sourceStr}.`)
            return
        }
        
        const targetDuelmon = otherDueler.dulmons.find(dmn => dmn.name.toLowerCase().trim() == targetStr)
        if(!targetDuelmon) {
            irc.chat(`${sourceDuelmon.name} is confused, @${otherDueler} doesn't have a Duelmon called ${targetStr}`)
            return
        }

        const move = pick(sourceDuelmon.move)
        const outcome = attack(sourceDuelmon, targetDuelmon, move)
        
        let effectivenessStr = '...'
        switch (outcome.effectiveness) {
            case 'miss':
                effectivenessStr = 'It missed!'
                break;
            case 'low':
                effectivenessStr = `Its not very effective...`
                break;
            case 'normal':
                effectivenessStr = 'Right on!'
                break;
            case 'high':
                effectivenessStr = `Its extremely effective!`
                break;
            default:
                break;
        }

        await updateDuel(ctx, duel)
        irc.chat(`@${dueler.username}'s ${sourceDuelmon?.name} used ${move.name} on ${targetDuelmon?.name}. ${effectivenessStr} ${targetDuelmon.name} has ${targetDuelmon.hp}/${targetDuelmon.maxHp} HP Left.`, 5)
    }
}

function makeDueler(username: string) : Dueler {
    return {
        username,
        dulmons: [
            {...dueldex.chardmonder},
            {...dueldex.blabusaur},
            {...dueldex.sportle},
        ]
    }
}

async function createDuel(ctx: CommandContext, fromUsername: string, toUsername: string) {
    const path = `/channel/${ctx.irc.channel}/duels/${fromUsername}vs${toUsername}`
    const duel = {
        challenger: makeDueler(fromUsername),
        challenged : makeDueler(toUsername),
        accepted: false,
        timestamp: Date.now()
    }
    await database.put(path, duel)
    return duel
}

async function updateDuel(ctx: CommandContext, duel: Duel) {
    const path = `/channel/${ctx.irc.channel}/duels/${duel.challenger.username}vs${duel.challenged.username}`
    await database.put(path, duel)
}

async function findUserDuel(ctx : CommandContext, username: string) {
    const basepath = `/channel/${ctx.irc.channel}/duels`
    const duels = await database.get<Record<string, Duel>>(basepath)   
    if(!duels) {
        return null
    }
    
    const duelBetweenPlayers = Object.values(duels).find(d => {
        const isChallenger = (d.challenger.username == username)
        const isChallenged = (d.challenged.username == username)
        return isChallenger || isChallenged
    })

    return duelBetweenPlayers ?? null
}

function attack(source: Duelmon, target: Duelmon, move: Move) {
    let effectiveness : ('miss' | 'low' | 'normal' | 'high') = pick(['miss', 'low', 'normal', 'high'])
    let damage = move.power
    target.hp -= damage
    return {
        damage,
        effectiveness
    }
}