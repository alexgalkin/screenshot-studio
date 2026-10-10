import { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Screenshot Studio. Editing, export, and background removal stay in your browser. The site does not run ads or analytics.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const CONTACT_EMAIL = "kartik.labhshetwar@gmail.com";

const linkClassName =
  "text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground/60";

const INTER =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2
        className="mb-3 text-xl font-semibold tracking-[-0.02em] text-foreground"
        style={{ fontFamily: INTER }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      {children}
    </Link>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navigation />

      <main className="mx-auto max-w-3xl flex-1 px-6 pb-16 pt-28 sm:pb-24">
        <h1
          className="mb-2 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl"
          style={{ fontFamily: INTER }}
        >
          Privacy Policy
        </h1>
        <p className="mb-12 text-sm text-muted-foreground">
          Last updated: October 10, 2026
        </p>

        <div className="max-w-none space-y-8">
          <Section title="Overview">
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Screenshot Studio (screenshot-studio.com) is a free, open-source
              image editor operated by Kartik Labhshetwar. There is no account,
              no signup, and no login, so we never ask you for a name, an email
              address, or payment details to use the editor.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              The published site is a static bundle. Editing, export, video
              encoding, and background removal run in your browser. We do not
              operate an API, a database, advertising, or product analytics for
              this site. We do not sell your personal information.
            </p>
          </Section>

          <Section title="What Stays On Your Device">
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Images and videos you import are read in the browser and are not
              uploaded. The editor also stores your work in your own browser:
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Drafts:</strong> your
                in-progress canvas is autosaved to IndexedDB and deleted
                automatically after 7 days.
              </li>
              <li>
                <strong className="text-foreground">Images:</strong> imported
                images under 500KB are kept in local storage so a reload does
                not lose them. Larger images are held in memory only.
              </li>
              <li>
                <strong className="text-foreground">Preferences:</strong> aspect
                ratio, export settings, custom presets, theme, and recent
                exports.
              </li>
              <li>
                <strong className="text-foreground">Image tools:</strong> the
                compress, convert, resize, crop, rotate, background removal,
                and video compression tools process files in your browser tab
                and write the result straight to your downloads. Re-encoding
                also drops embedded EXIF metadata such as camera details and
                GPS location.
              </li>
              <li>
                <strong className="text-foreground">Engines:</strong> the
                background-removal model and the video encoder are files that
                ship with the site. Your browser loads them from the same host
                as the page and may cache them. They are not fetched from a
                third-party model host.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Clearing site data in your browser removes drafts, images, and
              preferences stored locally.
            </p>
          </Section>

          <Section title="What Leaves Your Device">
            <p className="leading-relaxed text-muted-foreground">
              Loading the site requests HTML, CSS, JavaScript, fonts, stock
              images, and the local model and encoder files from the host that
              serves Screenshot Studio. That host sees a normal page request,
              including your IP address, the same way any static website does.
              Your images and videos are not part of those requests. Links you
              choose to open, such as GitHub or X, are ordinary outbound links
              and are not loaded automatically.
            </p>
          </Section>

          <Section title="Hosting">
            <p className="leading-relaxed text-muted-foreground">
              The static files may be served by a hosting provider that keeps
              standard request logs, including IP addresses, for security and
              reliability. Those logs are the provider&apos;s. Screenshot Studio
              does not add its own analytics on top of them.
            </p>
          </Section>

          <Section id="cookies" title="Cookies">
            <p className="leading-relaxed text-muted-foreground">
              The site does not set its own cookies and does not load
              advertising or analytics scripts. Your browser may still store
              the IndexedDB drafts and local preferences described above. You
              can block or delete site data in your browser settings. The
              editor and image tools keep working without cookies.
            </p>
          </Section>

          <Section title="Legal Bases">
            <p className="leading-relaxed text-muted-foreground">
              Where data protection laws such as the GDPR apply, the only
              processing we rely on is the hosting provider&apos;s legitimate
              interest in delivering the static files and keeping that delivery
              secure. We do not process images you edit, and we do not use
              them for advertising or analytics.
            </p>
          </Section>

          <Section title="Data Retention">
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                Images and videos you edit: not stored on our servers.
              </li>
              <li>
                Drafts and preferences: stored only in your browser until you
                clear site data, or until a draft expires after 7 days.
              </li>
              <li>
                Hosting logs: retained by the hosting provider under its own
                policy.
              </li>
            </ul>
          </Section>

          <Section title="Your Rights">
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Depending on where you live, you may have the right to access,
              correct, delete, or port your personal data, to object to or
              restrict processing, and to withdraw consent at any time. Because
              we do not run accounts, we usually hold nothing that identifies
              you beyond what a static host logs for the page request itself.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              To make a request, email{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
                {CONTACT_EMAIL}
              </Link>
              . You also have the right to complain to your local data
              protection authority.
            </p>
          </Section>

          <Section title="Your Choices">
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                Clear site data in your browser to remove every draft, image,
                and preference stored locally.
              </li>
              <li>
                Use a content blocker if you want to limit what the hosting
                provider receives. The editor needs the same-origin files to
                run.
              </li>
            </ul>
          </Section>

          <Section title="Children">
            <p className="leading-relaxed text-muted-foreground">
              Screenshot Studio is not directed at children under 13 (or under
              16 in the EEA and UK), and we do not knowingly collect information
              from them.
            </p>
          </Section>

          <Section title="Open Source">
            <p className="leading-relaxed text-muted-foreground">
              Screenshot Studio is open source. Every claim on this page about
              how the editor handles your images can be checked against the{" "}
              <ExternalLink href="https://github.com/opennookorg/screenshot-studio">
                source code on GitHub
              </ExternalLink>
              .
            </p>
          </Section>

          <Section title="Changes">
            <p className="leading-relaxed text-muted-foreground">
              We update this policy when the site changes. Changes are
              reflected on this page with an updated date.
            </p>
          </Section>

          <Section title="Contact">
            <p className="leading-relaxed text-muted-foreground">
              Questions about this policy or your data: email{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
                {CONTACT_EMAIL}
              </Link>{" "}
              or use our{" "}
              <Link href="/contact" className={linkClassName}>
                contact page
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>

      <Footer brandName="Screenshot Studio" />
    </div>
  );
}
