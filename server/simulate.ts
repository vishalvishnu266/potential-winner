/** Simulates network + DB latency (300–800 ms) */
export const simulateDelay = (): Promise<void> =>
  new Promise((res) => setTimeout(res, 300 + Math.random() * 500))

/**
 * Simulates random server failures (~20% of the time).
 * Throws an Error when the "server" decides to fail.
 */
export const maybeFailRandomly = (): void => {
  if (Math.random() < 0.2) {
    throw new Error('Internal Server Error: something went wrong on the server.')
  }
}
