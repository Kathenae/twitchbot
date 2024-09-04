export type Move = { 
    name: string
    power: number
    element: ElementalType
}

export interface Duelmon {
    name: string,
    hp: number,
    maxHp: number,
    type: ElementalType,
    move: Move[]
}

export interface Dueler {
    username: string,
    dulmons: Duelmon[]
}

export type ElementalType = "normal" | "fire" | "grass" | "water"

export interface Duel {
    challenger: Dueler,
    challenged: Dueler,
    accepted: boolean,
    timestamp: number,
}