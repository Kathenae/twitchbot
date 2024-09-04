import { JsonDB, Config } from 'node-json-db'
import encryption from "./encryption";

const path = process.env.APP_DB_PATH!;
const db = new JsonDB(new Config(path, true, true))

async function put<T>(path: string, data: T) {
    await db.push(path, data);
    return
}

async function get<T>(path: string) {
    try {
        return await db.getData(path) as T
    }
    catch (error) {
        return null
    }
}

async function putSecret<T>(path: string, data: object) {
    try {
        const text = JSON.stringify(data);
        const encrypted = await encryption.encrypt(text)
        db.push(path, encrypted)
    } catch (error) {
        console.error(error)
    }
}

async function del(path: string) {
    try {
        await db.delete(path)
    }
    catch (error) {
        console.error(error)
    }
}

async function getSecret<T>(path: string): Promise<Partial<T> | null> {
    try {
        const text = await db.getData(path)
        const decrypted = await encryption.decrypt(text)
        return JSON.parse(decrypted);
    }
    catch (error) {
        return null
    }
}

export default { put, get, del, putSecret, getSecret }