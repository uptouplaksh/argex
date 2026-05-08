const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function parseDateTime(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatReadableDateTime(value, fallback = 'Not scheduled') {
  const date = parseDateTime(value)

  if (!date) {
    return fallback
  }

  return `${dateFormatter.format(date)} • ${timeFormatter.format(date)}`
}

export function formatReadableTime(value, fallback = 'Unknown time') {
  const date = parseDateTime(value)

  if (!date) {
    return fallback
  }

  return timeFormatter.format(date)
}

export function formatRelativeDateTime(value, fallback = 'Unknown time') {
  const date = parseDateTime(value)

  if (!date) {
    return fallback
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))

  if (diffSeconds < 45) {
    return 'Just now'
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return formatReadableDateTime(value, fallback)
}
