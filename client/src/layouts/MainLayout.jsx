import { Outlet } from 'react-router-dom'

/**
 * Base application shell.
 * Kept intentionally minimal at the foundation stage — header/sidebar
 * navigation will be added once feature pages (e.g. dashboard) exist.
 */
export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-base text-text-primary font-body">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
