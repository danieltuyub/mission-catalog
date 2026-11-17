// No 0/O, 1/l/I: the password is read aloud or typed from a message.
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const ALL = LOWER + UPPER + DIGITS

export const GENERATED_PASSWORD_LENGTH = 14

/** An unbiased random index below `max` (rejects the values that would favour the first ones). */
function randomBelow(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buffer = new Uint32Array(1)
  do crypto.getRandomValues(buffer)
  while (buffer[0] >= limit)
  return buffer[0] % max
}

const pick = (chars: string) => chars[randomBelow(chars.length)]

/** A random temporary password with lower case, upper case and digits (always at least one of each). */
export function generatePassword(length: number = GENERATED_PASSWORD_LENGTH): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)]
  while (chars.length < length) chars.push(pick(ALL))
  // Shuffle so the guaranteed ones are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
