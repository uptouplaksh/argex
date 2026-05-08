import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAuth from '../hooks/useAuth'
import useToast from '../hooks/useToast'
import { getNotifications, markNotificationRead } from '../services/notificationService'
import { formatReadableDateTime, formatRelativeDateTime } from '../utils/dateTime'
import Button from './Button'

function notificationTone(type) {
  if (type?.includes('OUTBID')) {
    return 'bg-amber-50 text-amber-700'
  }

  if (type?.includes('BLOCK') || type?.includes('SECURITY')) {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-sky-50 text-sky-700'
}

function sortNewestFirst(notifications) {
  return [...notifications].sort((a, b) => {
    const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return dateDiff || Number(b.id || 0) - Number(a.id || 0)
  })
}

function mergeNewestFirst(currentNotifications, nextNotifications) {
  const existingById = new Map(currentNotifications.map((notification) => [notification.id, notification]))

  return sortNewestFirst(nextNotifications).map((notification) => ({
    ...existingById.get(notification.id),
    ...notification,
  }))
}

function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [highlightedIds, setHighlightedIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const notificationsRef = useRef([])
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  const loadNotifications = useCallback(async ({ highlightNew = false } = {}) => {
    if (!isAuthenticated) {
      setNotifications([])
      setHighlightedIds([])
      return
    }

    try {
      const data = await getNotifications()
      const current = notificationsRef.current
      const nextNotifications = sortNewestFirst(data || [])
      const knownIds = new Set(current.map((notification) => notification.id))
      const incomingIds = nextNotifications
        .filter((notification) => !knownIds.has(notification.id))
        .map((notification) => notification.id)

      if (highlightNew && current.length && incomingIds.length) {
        setHighlightedIds((ids) => [...new Set([...incomingIds, ...ids])])
      }

      setNotifications(mergeNewestFirst(current, nextNotifications))
    } catch {
      if (isOpen) {
        showToast('Notifications could not be loaded.', 'warning')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, isOpen, showToast])

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    const timeout = setTimeout(() => {
      setIsLoading(true)
      loadNotifications()
    }, 0)
    const interval = setInterval(() => loadNotifications({ highlightNew: true }), 30000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [isAuthenticated, loadNotifications])

  useEffect(() => {
    if (!highlightedIds.length) {
      return undefined
    }

    const timeout = setTimeout(() => setHighlightedIds([]), 2600)
    return () => clearTimeout(timeout)
  }, [highlightedIds])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

  const handleMarkRead = async (notificationId) => {
    try {
      const updated = await markNotificationRead(notificationId)
      setNotifications((current) =>
        current.map((notification) => (notification.id === notificationId ? updated : notification)),
      )
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-app-text shadow-sm transition hover:border-primary hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:text-violet-300"
        aria-label="Open notifications"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="text-lg">!</span>
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-xs font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/80 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-700">Notifications</p>
              <p className="text-xs font-semibold text-slate-500">{unreadCount} unread</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => loadNotifications({ highlightNew: true })}>
              Refresh
            </Button>
          </div>

          <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))
            ) : notifications.length ? (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-entry rounded-2xl border p-3 ${
                    notification.is_read
                      ? 'border-slate-100 bg-slate-50 dark:border-slate-700'
                      : 'border-violet-100 bg-violet-50 dark:border-violet-900'
                  } ${highlightedIds.includes(notification.id) ? 'notification-entry-new' : ''}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${notificationTone(notification.type)}`}>
                        {notification.type}
                      </span>
                      {!notification.is_read ? (
                        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[0.65rem] font-black uppercase text-white">
                          New
                        </span>
                      ) : null}
                    </div>
                    <time
                      className="shrink-0 text-xs font-semibold text-slate-500"
                      dateTime={notification.created_at}
                      title={formatReadableDateTime(notification.created_at)}
                    >
                      {formatRelativeDateTime(notification.created_at)}
                    </time>
                  </div>
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{notification.message}</p>
                  {!notification.is_read ? (
                    <button
                      type="button"
                      className="mt-3 text-xs font-black text-violet-700 transition hover:text-violet-500"
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <p className="font-black text-app-text">No notifications</p>
                <p className="mt-2 text-sm text-slate-500">Alerts and approvals will appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationPanel
