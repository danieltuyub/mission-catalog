import type { SelectHTMLAttributes } from 'react'

/**
 * A `<select>` sized like the text inputs of a form. The native control ignores padding on macOS
 * and comes out thinner, so it is drawn without its own look and gets a chevron instead.
 */
export default function FormSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${className} appearance-none pr-9`}>
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 stroke-gray-500"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}
