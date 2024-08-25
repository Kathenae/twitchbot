import db from './database';

const client_id = process.env.TTV_CLIENT_ID!
const client_secret = process.env.TTV_CLIENT_SECRET!
const redirect_uri = process.env.TTV_REDIRECT_URI!

type State = string;
type AuthorizationFlowResult = { code: string }
type AuthorizationPromise = { resolve: (result: AuthorizationFlowResult) => void, reject: (reason: any) => void }

type AuthCredentials = {
    nickname: string,
    access_token: string,
}

export const authorizationQueue: Record<State, AuthorizationPromise> = {}

export async function isValidAccessToken(access_token: string) {
    try {
        const headers = new Headers()
        headers.append("Authorization", `OAuth ${access_token}`)
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: headers
        })
        const data = await response.json()
        if(response.status != 200){
            return false
        }
        return {
            username: data.login,
            user_id: data.user_id,
            scopes: data.scopes
        }
    } catch (error) {
        return false;
    }
}

export async function requestAuthorizationCode() {
    const state = `req_${crypto.randomUUID().replaceAll("-", "")}`;
    const uri_param = `redirect_uri=${redirect_uri}`;
    const id_param = `client_id=${client_id}`
    const scopes_param = "scope=chat:read%20chat:edit"
    const type_param = "response_type=code"
    const authorize_endpoint = `https://id.twitch.tv/oauth2/authorize?${id_param}&${type_param}&${scopes_param}&${uri_param}&state=${state}`
    console.log(`Authorize at: ${authorize_endpoint}`)
    return await new Promise<AuthorizationFlowResult> ((resolve, reject) => {
        authorizationQueue[state] = { resolve, reject }
    })
}

export async function requestAccessToken(code: string): Promise<{ access_token?: string; }> {
    const auth_endpoint = "https://id.twitch.tv/oauth2/token"
    const grant_type = "authorization_code"
    const form = new FormData()
    form.append("client_id", client_id)
    form.append("client_secret", client_secret)
    form.append("grant_type", grant_type)
    form.append("code", code)
    form.append("redirect_uri", redirect_uri)
    form.append("scopes", "chat:read chat:write")
    const response = await fetch(auth_endpoint, {
        method: 'POST',
        body: form
    })

    const json = await response.json()
    return {access_token: json.access_token}
}

/**
 * Request twitch authentication credentials
 */
export async function requestCredentials(): Promise<AuthCredentials | false> {
    
    const path = "/auth/credentials"
    let existing_credentials = await db.getSecret<AuthCredentials>(path)
    if(existing_credentials && existing_credentials.access_token && existing_credentials.nickname && await isValidAccessToken(existing_credentials.access_token)) {
        return existing_credentials as AuthCredentials
    }

    const { code } = await requestAuthorizationCode()
    if (!code) {
        console.log("[Authenticate] No authorization code")
        return false
    }

    const { access_token } = await requestAccessToken(code)
    if (!access_token) {
        console.log("[Authenticate] No Access token")
        return false;
    }

    const result = await isValidAccessToken(access_token)
    if(result == false) {
        return false
    }

    const new_credentials = {
        id: result.user_id,
        nickname: result.username,
        scopes: result.scopes,
        access_token: access_token
    } as AuthCredentials

    db.putSecret(path, new_credentials)

    return new_credentials
}