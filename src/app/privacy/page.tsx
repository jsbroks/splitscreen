import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Split Haven",
  description:
    "Privacy Policy for Split Haven - Learn how we collect, use, and protect your data",
};

const LAST_UPDATED = "November 28, 2025";

export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 font-bold text-4xl">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm">
            <strong>Your Privacy Matters:</strong> This Privacy Policy explains
            how Split Haven collects, uses, shares, and protects your personal
            information. We are committed to protecting your privacy and
            complying with data protection laws including GDPR and COPPA.
          </p>
        </div>

        <nav className="rounded-lg border bg-muted/50 p-6">
          <h2 className="mb-4 font-semibold text-lg">Table of Contents</h2>
          <ol className="space-y-2 text-sm">
            <li>
              <a className="text-primary hover:underline" href="#overview">
                1. Overview
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#collection">
                2. Information We Collect
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#use">
                3. How We Use Your Information
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#sharing">
                4. Information Sharing
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#storage">
                5. Data Storage and Security
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#retention">
                6. Data Retention
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#rights">
                7. Your Rights (GDPR)
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#cookies">
                8. Cookies and Tracking
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#children">
                9. Children's Privacy (COPPA)
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#international">
                10. International Data Transfers
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#changes">
                11. Changes to This Policy
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#contact">
                12. Contact Us
              </a>
            </li>
          </ol>
        </nav>

        <section className="space-y-8">
          <div className="space-y-4" id="overview">
            <h2 className="font-bold text-2xl">1. Overview</h2>
            <p>
              Split Haven ("we", "us", "our") operates a video sharing platform.
              This Privacy Policy applies to information we collect when you use
              our website, mobile applications, and services (collectively, the
              "Service").
            </p>
            <p>
              <strong>Data Controller:</strong> For the purposes of GDPR,
              Split Haven is the data controller responsible for your personal
              data.
            </p>
            <p>
              <strong>Contact:</strong> For privacy-related inquiries, contact
              us at privacy@splitscreen.com.
            </p>
          </div>

          <div className="space-y-4" id="collection">
            <h2 className="font-bold text-2xl">2. Information We Collect</h2>

            <h3 className="font-semibold text-xl">
              2.1 Information You Provide
            </h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Account Information:</strong> Username, email address,
                password (encrypted), display name, and profile picture
              </li>
              <li>
                <strong>Content:</strong> Videos, thumbnails, titles,
                descriptions, tags, and creator attributions you upload
              </li>
              <li>
                <strong>Communications:</strong> Messages you send to us,
                including support requests and report submissions
              </li>
              <li>
                <strong>Report Information:</strong> When reporting content, we
                collect your name, email, reasons for reporting, and details
              </li>
            </ul>

            <h3 className="font-semibold text-xl">
              2.2 Automatically Collected Information
            </h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Device Fingerprints:</strong> We use FingerprintJS to
                generate a unique identifier for your device to prevent abuse,
                track anonymous views, and enable reactions without requiring
                login
              </li>
              <li>
                <strong>Usage Data:</strong> Pages viewed, videos watched, time
                spent, interactions (likes, dislikes), search queries
              </li>
              <li>
                <strong>Technical Data:</strong> IP address, browser type and
                version, device type, operating system, referring URLs
              </li>
              <li>
                <strong>Video Metadata:</strong> Upload timestamps, video
                duration, file size, processing status
              </li>
            </ul>

            <h3 className="font-semibold text-xl">2.3 Cookies and Tracking</h3>
            <p>
              We use cookies and similar tracking technologies. For detailed
              information, see our{" "}
              <Link className="text-primary hover:underline" href="/cookies">
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4" id="use">
            <h2 className="font-bold text-2xl">
              3. How We Use Your Information
            </h2>
            <p>We use collected information for the following purposes:</p>

            <h3 className="font-semibold text-xl">
              3.1 Service Provision and Improvement
            </h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process and transcode uploaded videos</li>
              <li>
                Enable content discovery through search and recommendations
              </li>
              <li>Track video views and engagement metrics</li>
              <li>Analyze usage patterns to improve user experience</li>
            </ul>

            <h3 className="font-semibold text-xl">
              3.2 Authentication and Security
            </h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>Authenticate users and manage accounts</li>
              <li>Prevent fraud, abuse, and unauthorized access</li>
              <li>Detect and prevent spam and inappropriate content</li>
              <li>Use device fingerprints to prevent multiple abuse reports</li>
            </ul>

            <h3 className="font-semibold text-xl">3.3 Content Moderation</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>Review uploaded content before publication</li>
              <li>Process and respond to content reports</li>
              <li>Enforce our Terms of Service and Content Guidelines</li>
              <li>Respond to DMCA takedown notices</li>
            </ul>

            <h3 className="font-semibold text-xl">3.4 Communications</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>Send service-related notifications</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Notify you of content approval or rejection</li>
              <li>
                Send important updates about changes to our policies (with your
                consent where required)
              </li>
            </ul>

            <h3 className="font-semibold text-xl">3.5 Legal Compliance</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Comply with legal obligations and law enforcement requests
              </li>
              <li>Protect our rights and property</li>
              <li>Investigate and prevent illegal activities</li>
            </ul>
          </div>

          <div className="space-y-4" id="sharing">
            <h2 className="font-bold text-2xl">4. Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your
              information in the following circumstances:
            </p>

            <h3 className="font-semibold text-xl">4.1 Service Providers</h3>
            <p>
              We share information with third-party service providers who
              perform services on our behalf:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Cloud Storage:</strong> Amazon S3 or compatible services
                for video and image storage
              </li>
              <li>
                <strong>Database:</strong> PostgreSQL database hosting providers
              </li>
              <li>
                <strong>Search:</strong> Typesense for search functionality
              </li>
              <li>
                <strong>Device Fingerprinting:</strong> FingerprintJS for fraud
                prevention
              </li>
              <li>
                <strong>Hosting:</strong> Cloud infrastructure providers
              </li>
            </ul>
            <p>
              These providers have access only to information necessary to
              perform their functions and are obligated to protect your
              information.
            </p>

            <h3 className="font-semibold text-xl">4.2 Public Information</h3>
            <p>
              Information you choose to make public is accessible to other
              users:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Your username and profile information</li>
              <li>Videos you upload (after approval)</li>
              <li>Comments and reactions on videos</li>
              <li>Public activity (views, uploads)</li>
            </ul>

            <h3 className="font-semibold text-xl">4.3 Legal Requirements</h3>
            <p>
              We may disclose information if required by law or if we believe
              such action is necessary to:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Comply with legal processes or government requests</li>
              <li>Enforce our Terms of Service</li>
              <li>
                Protect the rights, property, or safety of Split Haven, our
                users, or others
              </li>
              <li>Investigate fraud or security issues</li>
            </ul>

            <h3 className="font-semibold text-xl">4.4 Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of assets,
              your information may be transferred. We will notify you of any
              change in ownership or use of your personal information.
            </p>
          </div>

          <div className="space-y-4" id="storage">
            <h2 className="font-bold text-2xl">5. Data Storage and Security</h2>

            <h3 className="font-semibold text-xl">5.1 Security Measures</h3>
            <p>
              We implement appropriate technical and organizational measures to
              protect your information:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>
                Encrypted password storage using industry-standard hashing
              </li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure cloud infrastructure</li>
            </ul>
            <p>
              However, no method of transmission over the Internet or electronic
              storage is 100% secure. While we strive to protect your
              information, we cannot guarantee absolute security.
            </p>

            <h3 className="font-semibold text-xl">5.2 Data Location</h3>
            <p>
              Your information is stored on servers located in the United
              States. If you are accessing the Service from outside the US, your
              information will be transferred to and processed in the US.
            </p>
          </div>

          <div className="space-y-4" id="retention">
            <h2 className="font-bold text-2xl">6. Data Retention</h2>
            <p>We retain your information for as long as necessary to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Provide the Service to you</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Maintain business records</li>
            </ul>
            <p>Specific retention periods:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Account Data:</strong> Retained while your account is
                active and for a reasonable period after deletion
              </li>
              <li>
                <strong>Video Content:</strong> Retained while published; backup
                copies may persist for up to 90 days after deletion
              </li>
              <li>
                <strong>Logs and Analytics:</strong> Typically retained for
                12-24 months
              </li>
              <li>
                <strong>Report Data:</strong> Retained for compliance and legal
                purposes, typically 3-7 years
              </li>
            </ul>
          </div>

          <div className="space-y-4" id="rights">
            <h2 className="font-bold text-2xl">
              7. Your Rights (GDPR Compliance)
            </h2>
            <p>
              If you are in the European Economic Area (EEA), UK, or other
              jurisdictions with data protection laws, you have certain rights
              regarding your personal data:
            </p>

            <h3 className="font-semibold text-xl">7.1 Right to Access</h3>
            <p>
              You have the right to request a copy of the personal information
              we hold about you.
            </p>

            <h3 className="font-semibold text-xl">
              7.2 Right to Rectification
            </h3>
            <p>
              You have the right to correct inaccurate or incomplete personal
              information.
            </p>

            <h3 className="font-semibold text-xl">7.3 Right to Erasure</h3>
            <p>
              You have the right to request deletion of your personal
              information ("right to be forgotten"), subject to certain
              exceptions.
            </p>

            <h3 className="font-semibold text-xl">
              7.4 Right to Data Portability
            </h3>
            <p>
              You have the right to receive your personal information in a
              structured, commonly used, and machine-readable format and to
              transmit it to another controller.
            </p>

            <h3 className="font-semibold text-xl">
              7.5 Right to Restrict Processing
            </h3>
            <p>
              You have the right to request restriction of processing of your
              personal information.
            </p>

            <h3 className="font-semibold text-xl">7.6 Right to Object</h3>
            <p>
              You have the right to object to processing of your personal
              information based on legitimate interests.
            </p>

            <h3 className="font-semibold text-xl">
              7.7 Right to Withdraw Consent
            </h3>
            <p>
              Where processing is based on consent, you have the right to
              withdraw consent at any time.
            </p>

            <h3 className="font-semibold text-xl">
              7.8 Exercising Your Rights
            </h3>
            <p>
              To exercise any of these rights, contact us at
              privacy@splitscreen.com. We will respond to your request within 30
              days. You also have the right to lodge a complaint with your local
              data protection authority.
            </p>
          </div>

          <div className="space-y-4" id="cookies">
            <h2 className="font-bold text-2xl">8. Cookies and Tracking</h2>
            <p>
              We use cookies, web beacons, and similar tracking technologies.
              For detailed information about the cookies we use and your choices
              regarding cookies, please see our{" "}
              <Link className="text-primary hover:underline" href="/cookies">
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4" id="children">
            <h2 className="font-bold text-2xl">
              9. Children's Privacy (COPPA Compliance)
            </h2>
            <p>
              Our Service is not intended for children under 13 years of age (or
              16 in the EEA). We do not knowingly collect personal information
              from children under these ages.
            </p>
            <p>
              If you are a parent or guardian and believe your child has
              provided us with personal information, please contact us at
              privacy@splitscreen.com. We will take steps to delete such
              information from our systems.
            </p>
            <p>
              <strong>Age Verification:</strong> Users must be at least 18 years
              old to create an account. We may request additional verification
              if we suspect a user is underage.
            </p>
          </div>

          <div className="space-y-4" id="international">
            <h2 className="font-bold text-2xl">
              10. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your country of residence. These countries may have
              data protection laws that differ from those of your country.
            </p>
            <p>
              <strong>For EEA/UK Users:</strong> When we transfer your personal
              information outside the EEA/UK, we ensure appropriate safeguards
              are in place, such as:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Standard Contractual Clauses approved by the European Commission
              </li>
              <li>Adequacy decisions by the European Commission</li>
              <li>Other legally recognized transfer mechanisms</li>
            </ul>
          </div>

          <div className="space-y-4" id="changes">
            <h2 className="font-bold text-2xl">
              11. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Posting the updated policy on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>
                Sending an email notification to registered users (for
                significant changes)
              </li>
              <li>
                Displaying a prominent notice on our Service (for significant
                changes)
              </li>
            </ul>
            <p>
              Your continued use of the Service after changes become effective
              constitutes acceptance of the updated Privacy Policy.
            </p>
          </div>

          <div className="space-y-4" id="contact">
            <h2 className="font-bold text-2xl">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy
              practices, please contact us:
            </p>
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p>
                <strong>Privacy Inquiries:</strong> privacy@splitscreen.com
              </p>
              <p>
                <strong>Data Protection Officer:</strong> dpo@splitscreen.com
              </p>
              <p>
                <strong>General Support:</strong> support@splitscreen.com
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-primary/50 bg-primary/10 p-4">
              <p className="font-semibold">For EU Residents:</p>
              <p className="mt-2 text-sm">
                You have the right to lodge a complaint with a supervisory
                authority if you believe we have not complied with applicable
                data protection laws. Contact your local data protection
                authority for more information.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
