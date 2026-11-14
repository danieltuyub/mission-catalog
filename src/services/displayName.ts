const first = (text: string) => Array.from(text.trim())[0] ?? ''

/** "Ana Pérez"; just "Ana" when there is no last name; empty when there is no name at all. */
export function fullName(firstName: string, lastName: string): string {
  return [firstName, lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

/** "AP"; a single letter when only one of the names is filled in. */
export function initials(firstName: string, lastName: string): string {
  return (first(firstName) + first(lastName)).toLocaleUpperCase('es')
}
