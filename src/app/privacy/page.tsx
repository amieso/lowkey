"use client"

import { Header } from "@/components/layout/header"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[560px] px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-semibold text-foreground mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-sm text-muted leading-relaxed">
          <p className="text-muted-dark">Last updated: January 2026</p>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">1. Information We Collect</h2>
            <p>
              Lowkey collects minimal information. The only personal data we collect is your email
              address if you choose to subscribe to our newsletter. This is entirely optional.
            </p>
            <p>
              We also store your theme preference (dark or light mode) locally in your browser.
              This data never leaves your device.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">2. How We Use Your Information</h2>
            <p>If you subscribe to our newsletter, we use your email address to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Send you updates about new videos on Lowkey</li>
              <li>Share platform news and announcements</li>
            </ul>
            <p>
              We do not track your video viewing activity, browsing behavior, or any other usage
              patterns on our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">3. Email Service Provider</h2>
            <p>
              We use Resend as our email service provider to manage newsletter subscriptions and
              send emails. When you subscribe, your email address is stored with Resend. You can
              review their privacy policy at{" "}
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                resend.com/legal/privacy-policy
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">4. Local Storage</h2>
            <p>
              We use your browser&apos;s local storage to remember your theme preference (dark or
              light mode). This data is stored only on your device and is not transmitted to our
              servers or any third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">5. Video Content</h2>
            <p>
              Videos on Lowkey are hosted by Mux, a video streaming platform. When you watch a
              video, your browser connects directly to Mux&apos;s servers. We do not track which
              videos you watch or how long you watch them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">6. Third-Party Links</h2>
            <p>
              Our platform contains links to company websites and social media profiles. These
              external sites have their own privacy policies, and we are not responsible for their
              practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">7. Data Retention</h2>
            <p>
              If you subscribe to our newsletter, your email address is retained until you
              unsubscribe. You can unsubscribe at any time using the link in any of our emails,
              and your email will be removed from our mailing list.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Unsubscribe from our newsletter at any time</li>
              <li>Request deletion of your email from our mailing list</li>
              <li>Clear your local storage to remove theme preferences</li>
            </ul>
            <p>
              To request deletion of your data, contact us at{" "}
              <a href="mailto:dennis@amie.so" className="text-foreground hover:underline">
                dennis@amie.so
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will post any changes on
              this page and update the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">10. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us at{" "}
              <a href="mailto:dennis@amie.so" className="text-foreground hover:underline">
                dennis@amie.so
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
