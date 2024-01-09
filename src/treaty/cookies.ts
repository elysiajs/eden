import { Cookie, CookieJar } from 'tough-cookie'

export const addCookiesToJar = (
    jar: CookieJar,
    setCookieHeaders: string[],
    requestUrl: string
) => {
    for (const setCookieHeader of setCookieHeaders) {
        const cookie = Cookie.parse(setCookieHeader, { loose: true })
        if (!cookie) {
            continue
        }

        jar.setCookieSync(cookie, requestUrl)
    }
}
