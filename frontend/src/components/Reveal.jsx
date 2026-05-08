import { useEffect, useRef, useState } from 'react'

function Reveal({ as = 'div', children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const revealProps = {
    ref,
    className: `reveal ${isVisible ? 'reveal-visible' : ''} ${className}`,
    style: { transitionDelay: `${delay}ms` },
  }

  useEffect(() => {
    const node = ref.current

    if (!node) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (as === 'section') {
    return <section {...revealProps}>{children}</section>
  }

  return <div {...revealProps}>{children}</div>
}

export default Reveal
