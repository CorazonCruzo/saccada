import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6">
      {/* Decorative Sanskrit */}
      <p className="font-devanagari text-lg text-gold">
        दृष्टि भेद
      </p>

      {/* Title */}
      <h1 className="mt-2 font-heading text-5xl font-bold tracking-tight text-text-bright">
        Saccada
      </h1>

      {/* Tagline */}
      <p className="mt-3 max-w-md text-center font-body text-base font-light leading-relaxed text-text-muted">
        Eye movement therapy — Drishti Bheda × EMDR × Neuroscience
      </p>

      {/* Category filter tabs */}
      <Tabs defaultValue="all" className="mt-8">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="drishti">Drishti Bheda</TabsTrigger>
          <TabsTrigger value="emdr">EMDR</TabsTrigger>
          <TabsTrigger value="sleep">Sleep</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* CTA buttons */}
      <Button className="mt-8" size="lg">
        Start Session
      </Button>

      <Button variant="outline" className="mt-3 border-gold/60 text-gold hover:border-gold hover:text-turmeric">
        Learn More
      </Button>
    </div>
  )
}
