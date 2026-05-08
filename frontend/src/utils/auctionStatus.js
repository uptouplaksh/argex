function formatDuration(milliseconds) {
  if (milliseconds <= 0 || Number.isNaN(milliseconds)) {
    return ''
  }

  const minutes = Math.floor(milliseconds / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const remainingMinutes = minutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }

  return `${Math.max(remainingMinutes, 1)}m`
}

export function getAuctionState(auction, now = Date.now()) {
  const start = new Date(auction.start_time).getTime()
  const end = new Date(auction.end_time).getTime()

  if (auction.status === 'cancelled') {
    return {
      label: 'Cancelled',
      status: 'cancelled',
      timeLabel: '',
      tone: 'red',
    }
  }

  if (auction.status === 'ended' || Number.isNaN(end) || now >= end) {
    return {
      label: 'Ended',
      status: 'ended',
      timeLabel: '',
      tone: 'slate',
    }
  }

  if (!Number.isNaN(start) && now < start) {
    return {
      label: 'Upcoming',
      status: 'upcoming',
      timeLabel: `Starts in ${formatDuration(start - now)}`,
      tone: 'sky',
    }
  }

  return {
    label: 'Active',
    status: 'active',
    timeLabel: `Ends in ${formatDuration(end - now)}`,
    tone: 'emerald',
  }
}

export const getAuctionStatus = getAuctionState

export function getAuctionStateClasses(tone) {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-200',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-100',
  }

  return tones[tone] || tones.slate
}
