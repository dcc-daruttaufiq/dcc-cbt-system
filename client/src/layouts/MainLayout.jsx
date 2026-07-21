import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-body selection:bg-indigo-500 selection:text-white flex flex-col antialiased">
      {/* Background Soft Glow - Tanpa Garis */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none" />
      
      <main className="relative z-10 flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}