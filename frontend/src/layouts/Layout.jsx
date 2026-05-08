import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'

function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <main key={location.pathname} className="page-enter mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
