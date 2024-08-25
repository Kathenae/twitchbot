
/**
 * Async timout
 * @param seconds number of seconds to wait
 */
export async function wait(seconds: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, seconds * 1000)
    })
}