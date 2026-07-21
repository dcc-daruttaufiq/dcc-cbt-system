import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('404 - Halaman Tidak Ditemukan')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <AlertTriangle className="h-10 w-10 text-warning" strokeWidth={1.75} />
      <h1 className="font-display text-3xl font-bold">404</h1>
      <p className="max-w-sm text-text-secondary">
        Halaman yang kamu cari tidak ditemukan atau sudah dipindahkan.
      </p>
      <Link to="/" className="btn-primary mt-2">
        Kembali ke Beranda
      </Link>
    </div>
  )
}
