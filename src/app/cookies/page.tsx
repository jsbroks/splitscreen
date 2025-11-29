import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | Split Haven",
  description:
    "Learn about how Split Haven uses cookies and tracking technologies",
};

const LAST_UPDATED = "November 28, 2025";

export default function CookiePolicyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 font-bold text-4xl">Cookie Policy</h1>
          <p className="text-muted-foreground">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm">
            This Cookie Policy explains how Split Haven uses cookies and similar
            tracking technologies. By using our Service, you consent to the use
            of cookies as described in this policy.
          </p>
        </div>

        <nav className="rounded-lg border bg-muted/50 p-6">
          <h2 className="mb-4 font-semibold text-lg">Table of Contents</h2>
          <ol className="space-y-2 text-sm">
            <li>
              <a
                className="text-primary hover:underline"
                href="#what-are-cookies"
              >
                1. What Are Cookies?
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#types">
                2. Types of Cookies We Use
              </a>
            </li>
            <li>
              <a
                className="text-primary hover:underline"
                href="#fingerprinting"
              >
                3. Device Fingerprinting
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#third-party">
                4. Third-Party Cookies
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#manage">
                5. Managing Cookies
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#updates">
                6. Updates to This Policy
              </a>
            </li>
          </ol>
        </nav>

        <section className="space-y-8">
          <div className="space-y-4" id="what-are-cookies">
            <h2 className="font-bold text-2xl">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device
              (computer, smartphone, or tablet) when you visit a website. They
              are widely used to make websites work more efficiently and provide
              information to website owners.
            </p>
            <p>
              We use cookies and similar technologies such as web beacons, local
              storage, and device fingerprinting to enhance your experience on
              Split Haven.
            </p>
          </div>

          <div className="space-y-4" id="types">
            <h2 className="font-bold text-2xl">2. Types of Cookies We Use</h2>

            <h3 className="font-semibold text-xl">
              2.1 Strictly Necessary Cookies
            </h3>
            <p>
              These cookies are essential for the Service to function properly.
              Without these cookies, certain features would not be available.
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-medium">Examples:</p>
              <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                <li>Authentication cookies (session management)</li>
                <li>Security cookies (CSRF protection)</li>
                <li>Load balancing cookies</li>
                <li>Age verification (stored in localStorage)</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Legal Basis:</strong> These cookies are necessary for
                the performance of our contract with you and do not require
                consent under GDPR. Age verification is required by law for
                adult content sites.
              </p>
            </div>

            <h3 className="font-semibold text-xl">2.2 Functional Cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalization,
              such as remembering your preferences and settings.
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-medium">Examples:</p>
              <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                <li>Language preferences</li>
                <li>Video player settings (volume, quality)</li>
                <li>Dark mode preference</li>
                <li>Cookie consent preferences</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Duration:</strong> These cookies may be session cookies
                (deleted when you close your browser) or persistent cookies
                (stored for up to 1 year).
              </p>
            </div>

            <h3 className="font-semibold text-xl">2.3 Performance Cookies</h3>
            <p>
              These cookies collect information about how you use our Service,
              such as which pages you visit and any errors you encounter. This
              helps us improve the Service.
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-medium">Examples:</p>
              <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                <li>Page load times</li>
                <li>Error tracking</li>
                <li>Navigation patterns</li>
                <li>Feature usage analytics</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Duration:</strong> Typically stored for up to 2 years.
              </p>
            </div>

            <h3 className="font-semibold text-xl">2.4 Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our
              Service by collecting and reporting information anonymously or in
              aggregate.
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-medium">Examples:</p>
              <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                <li>Video view tracking</li>
                <li>User engagement metrics</li>
                <li>Traffic sources</li>
                <li>Search query analytics</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Duration:</strong> Typically stored for up to 2 years.
              </p>
            </div>
          </div>

          <div className="space-y-4" id="fingerprinting">
            <h2 className="font-bold text-2xl">3. Device Fingerprinting</h2>
            <p>
              In addition to cookies, we use device fingerprinting technology
              (FingerprintJS) to create a unique identifier for your device
              based on its configuration.
            </p>

            <h3 className="font-semibold text-xl">
              3.1 What is Fingerprinting?
            </h3>
            <p>
              Device fingerprinting analyzes characteristics of your device and
              browser to create a unique identifier. This includes:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Screen resolution and color depth</li>
              <li>Installed fonts</li>
              <li>Time zone</li>
              <li>Hardware specifications</li>
              <li>Canvas fingerprinting</li>
            </ul>

            <h3 className="font-semibold text-xl">
              3.2 Why We Use Fingerprinting
            </h3>
            <p>We use device fingerprinting for:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Fraud Prevention:</strong> Detecting and preventing
                multiple abuse reports from the same device
              </li>
              <li>
                <strong>Anonymous Analytics:</strong> Tracking video views and
                reactions from users who are not logged in
              </li>
              <li>
                <strong>Security:</strong> Identifying suspicious activity and
                potential account compromises
              </li>
              <li>
                <strong>Rate Limiting:</strong> Preventing spam and abuse
                without requiring authentication
              </li>
            </ul>

            <h3 className="font-semibold text-xl">
              3.3 Fingerprinting and Privacy
            </h3>
            <p>
              Device fingerprints are hashed and cannot be used to directly
              identify you personally. However, they can be used to recognize
              your device across sessions. This technology is more persistent
              than cookies and cannot be easily cleared.
            </p>
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <p className="font-semibold">For EU/EEA Users:</p>
              <p className="mt-2 text-sm">
                Device fingerprinting is considered personal data under GDPR. We
                use it based on our legitimate interests in fraud prevention and
                security. You can object to this processing by contacting us at
                privacy@splitscreen.com, though this may limit your ability to
                use certain features.
              </p>
            </div>
          </div>

          <div className="space-y-4" id="third-party">
            <h2 className="font-bold text-2xl">4. Third-Party Cookies</h2>
            <p>
              We use third-party services that may set cookies on your device.
              These services have their own privacy policies:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">FingerprintJS</h4>
                <p className="mt-2 text-sm">
                  <strong>Purpose:</strong> Device identification and fraud
                  prevention
                </p>
                <p className="text-sm">
                  <strong>Privacy Policy:</strong>{" "}
                  <a
                    className="text-primary hover:underline"
                    href="https://fingerprintjs.com/privacy-policy/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    https://fingerprintjs.com/privacy-policy/
                  </a>
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Cloud Storage Providers</h4>
                <p className="mt-2 text-sm">
                  <strong>Purpose:</strong> Video and image hosting
                </p>
                <p className="text-sm">
                  Our content delivery network may use cookies for performance
                  optimization and security.
                </p>
              </div>
            </div>

            <p className="mt-4 text-muted-foreground text-sm">
              We do not control third-party cookies. Please refer to the
              respective third-party's privacy and cookie policies for more
              information.
            </p>
          </div>

          <div className="space-y-4" id="manage">
            <h2 className="font-bold text-2xl">5. Managing Cookies</h2>

            <h3 className="font-semibold text-xl">5.1 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their
              settings. You can:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies from specific websites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>

            <p className="mt-4">
              To manage cookies in your browser, visit your browser's help
              section:
            </p>
            <ul className="ml-6 list-disc space-y-1 text-sm">
              <li>
                <a
                  className="text-primary hover:underline"
                  href="https://support.google.com/chrome/answer/95647"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  className="text-primary hover:underline"
                  href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  className="text-primary hover:underline"
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  className="text-primary hover:underline"
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>

            <h3 className="font-semibold text-xl">
              5.2 Impact of Blocking Cookies
            </h3>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="font-semibold">Warning:</p>
              <p className="mt-2 text-sm">
                Blocking or deleting cookies may limit your ability to use
                certain features of our Service:
              </p>
              <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                <li>You may not be able to stay logged in</li>
                <li>Your preferences will not be saved</li>
                <li>Some features may not work properly</li>
                <li>Video playback may be affected</li>
              </ul>
            </div>

            <h3 className="font-semibold text-xl">5.3 Do Not Track</h3>
            <p>
              Some browsers have a "Do Not Track" (DNT) feature that lets you
              tell websites you do not want to be tracked. Currently, there is
              no standard for how websites should respond to DNT signals. At
              this time, we do not respond to DNT signals differently, but we
              respect your cookie preferences set in your browser.
            </p>

            <h3 className="font-semibold text-xl">
              5.4 Managing Device Fingerprinting
            </h3>
            <p>
              Device fingerprinting is more difficult to control than cookies.
              Options include:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Using browser privacy modes or extensions that block
                fingerprinting
              </li>
              <li>Using browsers with built-in fingerprinting protection</li>
              <li>
                Contacting us to opt-out (may limit Service functionality)
              </li>
            </ul>
          </div>

          <div className="space-y-4" id="updates">
            <h2 className="font-bold text-2xl">6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Any changes
              will be posted on this page with an updated "Last Updated" date.
            </p>
            <p>
              For significant changes, we will provide a more prominent notice
              or request your consent where required by law.
            </p>
          </div>

          <div className="space-y-4 border-t pt-8">
            <h2 className="font-bold text-2xl">Contact Us</h2>
            <p>
              If you have questions about our use of cookies or this Cookie
              Policy, please contact us:
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p>
                <strong>Email:</strong> privacy@splitscreen.com
              </p>
              <p>
                <strong>See also:</strong>{" "}
                <Link className="text-primary hover:underline" href="/privacy">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
