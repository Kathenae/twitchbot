import crypto from 'crypto'

const algorithm = "aes-192-cbc"
const secret = process.env.APP_SECRET!

async function encrypt(text: string) {
    return new Promise<string>((resolve, reject) => {
        try {
            const key = crypto.scryptSync(secret, 'salt', 24)
            const iv = crypto.randomFillSync(new Uint8Array(16))
            const cipher = crypto.createCipheriv(algorithm, key, iv)
            let encrypted = cipher.update(text, 'utf8', 'hex')
            encrypted += cipher.final('hex');
            const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]).toString('base64')
            resolve(combined)
        } catch (error) {
            reject(error)
        }
    })
}

async function decrypt(text: string) {
    return new Promise<string>((resolve, reject) => {
        try {
            const data = Buffer.from(text, 'base64')
            const key = crypto.scryptSync(secret, 'salt', 24)
            const iv = data.subarray(0, 16)
            const encrypted = data.subarray(16).toString('hex')
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8')
            resolve(decrypted)
        } catch (error) {
            reject(error)
        }
    })
}

export default { encrypt, decrypt }