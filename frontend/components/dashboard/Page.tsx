type PageProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function Page({ title, subtitle, children }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
      <header className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm md:text-base text-gray-500">
            {subtitle}
          </p>
        )}
      </header>

      <section>
        {children}
      </section>
    </div>
  )
}
