import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6">
      <p className="font-devanagari text-2xl text-gold/60">&#x0936;&#x0942;&#x0928;&#x094D;&#x092F;</p>
      <h1 className="mt-2 font-heading text-6xl font-bold text-text-bright">404</h1>
      <p className="mt-3 font-body text-sm font-light text-text-muted">
        This page does not exist
      </p>
      <Button className="mt-8" onClick={() => navigate('/', { replace: true })}>
        Back to Home
      </Button>
    </div>
  )
}
