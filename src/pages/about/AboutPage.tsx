import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/shared/lib/i18n'

const GITHUB_URL = 'https://github.com/CorazonCruzo/saccada'
const ISSUES_URL = 'https://github.com/CorazonCruzo/saccada/issues'
const LINKEDIN_URL = 'https://www.linkedin.com/in/anastasiia-chestnykh-0953922a8/'

export default function AboutPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-text-bright">
            {t.about.title}
          </h1>
          <button
            onClick={() => navigate('/')}
            className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
          >
            {t.common.back}
          </button>
        </div>

        <div className="mt-10 space-y-10">
          <Section title={t.about.ideaTitle} body={t.about.ideaBody} />
          <Section title={t.about.soundTitle} body={t.about.soundBody} />
          <Section title={t.about.eyeTrackingTitle} body={t.about.eyeTrackingBody} />
          <Section title={t.about.evidenceTitle} body={t.about.evidenceBody} />
          <Section title={t.about.controlsTitle} body={t.about.controlsBody} />
          <Section title={t.about.privacyTitle} body={t.about.privacyBody} />
          {/* Author */}
          <section>
            <h2 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              {t.about.authorTitle}
            </h2>
            <p className="mt-3 font-body text-sm font-light leading-relaxed text-text-muted">
              {t.about.authorBody.split(t.about.authorName).map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-normal text-text-bright underline decoration-gold/40 underline-offset-2 transition-colors hover:text-turmeric hover:decoration-turmeric/60"
                    >
                      {t.about.authorName}
                    </a>
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </p>
          </section>

          {/* Support */}
          <section>
            <h2 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              {t.about.supportTitle}
            </h2>
            <p className="mt-3 font-body text-sm font-light leading-relaxed text-text-muted">
              {t.about.supportBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border-ornament px-4 py-2 font-heading text-sm font-semibold text-text-bright transition-colors hover:bg-bg-surface"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                  <path d="M8 .2a8 8 0 00-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.01 8.01 0 008 .2z" />
                </svg>
                {t.about.starOnGithub}
              </a>
            </div>
          </section>

          {/* Feedback */}
          <section>
            <h2 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              {t.about.feedbackTitle}
            </h2>
            <p className="mt-3 font-body text-sm font-light leading-relaxed text-text-muted">
              {t.about.feedbackBody}
            </p>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-heading text-sm font-semibold text-teal transition-colors hover:text-teal/80"
            >
              {t.about.openIssue} &rarr;
            </a>
          </section>
        </div>

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="font-heading text-xs tracking-widest text-turmeric uppercase">
        {title}
      </h2>
      <p className="mt-3 font-body text-sm font-light leading-relaxed text-text-muted">
        {body}
      </p>
    </section>
  )
}
