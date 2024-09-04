import { Duelmon } from "./types";

export default {
    "chardmonder" : { 
        type: "fire",
        name: "Chardmonder",
        hp: 10, maxHp: 10,
        move: [
            { name: "tackle", element: "normal", power: 2 },
            { name: "fireball", element: "fire", power: 5 }
        ]
    },
    "sportle" : { 
        type: "water",
        name: "Sportle",
        hp: 10, maxHp: 10,
        move: [
            { name: "tackle", element: "normal", power: 2 },
            { name: "Water Blast", element: "water", power: 5 }
        ]
    },
    "blabusaur" : { 
        type: "grass",
        name: "Blabusaur",
        hp: 10, maxHp: 10,
        move: [
            { name: "tackle", element: "normal", power: 2 },
            { name: "Vine slap", element: "grass", power: 5 }
        ]
    },
} as Record<string, Duelmon> 