import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | SplitScreen",
  description: "Terms of Service for SplitScreen video sharing platform",
};

const LAST_UPDATED = "November 28, 2025";

export default function TermsOfServicePage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 font-bold text-4xl">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm">
            <strong>Important:</strong> Please read these Terms of Service
            carefully before using SplitScreen. By accessing or using our
            service, you agree to be bound by these terms.
          </p>
        </div>

        <nav className="rounded-lg border bg-muted/50 p-6">
          <h2 className="mb-4 font-semibold text-lg">Table of Contents</h2>
          <ol className="space-y-2 text-sm">
            <li>
              <a className="text-primary hover:underline" href="#acceptance">
                1. Acceptance of Terms
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#eligibility">
                2. Eligibility
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#account">
                3. Account Registration
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#content">
                4. User Content
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#prohibited">
                5. Prohibited Activities
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#dmca">
                6. Copyright and DMCA
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#termination">
                7. Termination
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#liability">
                8. Limitation of Liability
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#disputes">
                9. Dispute Resolution
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#changes">
                10. Changes to Terms
              </a>
            </li>
          </ol>
        </nav>

        <section className="space-y-8">
          <div className="space-y-4" id="acceptance">
            <h2 className="font-bold text-2xl">1. Acceptance of Terms</h2>
            <p>
              By accessing or using SplitScreen ("Service", "we", "us", or
              "our"), you agree to be bound by these Terms of Service and all
              applicable laws and regulations. If you do not agree with any part
              of these terms, you may not use our Service.
            </p>
          </div>

          <div className="space-y-4" id="eligibility">
            <h2 className="font-bold text-2xl">2. Eligibility</h2>
            <p>
              <strong>Age Requirements:</strong> You must be at least 18 years
              old to use this Service. If you are under 18, you may not create
              an account or use our Service. By using the Service, you represent
              and warrant that you are at least 18 years of age.
            </p>
            <p>
              <strong>COPPA Compliance:</strong> Our Service is not directed to
              children under 18 years of age, and we do not knowingly collect
              personal information from children under 18. If we learn that we
              have collected personal information from a child under 18, we will
              take steps to delete such information as soon as possible.
            </p>
            <p>
              <strong>Location:</strong> The Service is controlled and operated
              from the United States. If you access the Service from outside the
              United States, you are responsible for compliance with local laws.
            </p>
          </div>

          <div className="space-y-4" id="account">
            <h2 className="font-bold text-2xl">3. Account Registration</h2>
            <p>
              To access certain features of the Service, you must register for
              an account. You agree to:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Provide accurate, current, and complete information during
                registration
              </li>
              <li>
                Maintain and promptly update your account information to keep it
                accurate and complete
              </li>
              <li>
                Maintain the security of your password and accept all risks of
                unauthorized access to your account
              </li>
              <li>
                Immediately notify us of any unauthorized use of your account
              </li>
              <li>
                Be responsible for all activities that occur under your account
              </li>
            </ul>
            <p>
              We reserve the right to refuse service, terminate accounts, or
              remove or edit content at our sole discretion.
            </p>
          </div>

          <div className="space-y-4" id="content">
            <h2 className="font-bold text-2xl">4. User Content</h2>

            <h3 className="font-semibold text-xl">4.1 Your Content</h3>
            <p>
              You retain all ownership rights to content you upload, post, or
              display on or through the Service ("Your Content"). By submitting
              Your Content, you grant us a worldwide, non-exclusive,
              royalty-free, transferable license to use, reproduce, distribute,
              prepare derivative works of, display, and perform Your Content in
              connection with the Service.
            </p>

            <h3 className="font-semibold text-xl">4.2 Content Standards</h3>
            <p>You represent and warrant that Your Content:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Does not violate any third-party rights, including copyright,
                trademark, privacy, or publicity rights
              </li>
              <li>
                Does not contain illegal content or violate any applicable laws
              </li>
              <li>
                Does not contain malicious code, viruses, or harmful components
              </li>
              <li>Does not depict minors in any manner</li>
              <li>
                Complies with our{" "}
                <Link
                  className="text-primary hover:underline"
                  href="/guidelines"
                >
                  Content Guidelines
                </Link>
              </li>
            </ul>

            <h3 className="font-semibold text-xl">4.3 Content Moderation</h3>
            <p>
              We reserve the right to review, monitor, and remove any content at
              our sole discretion. All uploaded content is subject to review and
              approval before being made publicly available. We may reject,
              remove, or refuse to display content that we believe violates
              these Terms or is otherwise objectionable.
            </p>

            <h3 className="font-semibold text-xl">4.4 Creator Attribution</h3>
            <p>
              When uploading content featuring or created by others, you must
              accurately tag and attribute the appropriate creators. Failure to
              properly attribute creators may result in content removal or
              account suspension.
            </p>
          </div>

          <div className="space-y-4" id="prohibited">
            <h2 className="font-bold text-2xl">5. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Violate any applicable laws, regulations, or third-party rights
              </li>
              <li>
                Upload content depicting or involving minors in any manner
              </li>
              <li>
                Upload content that infringes on intellectual property rights
              </li>
              <li>
                Engage in any form of harassment, abuse, or hateful conduct
              </li>
              <li>Impersonate any person or entity</li>
              <li>
                Attempt to gain unauthorized access to the Service or other
                users' accounts
              </li>
              <li>
                Use automated systems (bots, scrapers) without our permission
              </li>
              <li>Spam, solicit, or send unsolicited commercial messages</li>
              <li>
                Interfere with or disrupt the Service or servers/networks
                connected to the Service
              </li>
              <li>Upload content containing viruses or malicious code</li>
              <li>Create multiple accounts to evade restrictions or bans</li>
            </ul>
          </div>

          <div className="space-y-4" id="dmca">
            <h2 className="font-bold text-2xl">6. Copyright and DMCA</h2>
            <p>
              We respect the intellectual property rights of others and expect
              our users to do the same. We respond to notices of alleged
              copyright infringement that comply with the Digital Millennium
              Copyright Act ("DMCA").
            </p>
            <p>
              If you believe that your copyrighted work has been copied in a way
              that constitutes copyright infringement, please see our{" "}
              <Link className="text-primary hover:underline" href="/dmca">
                DMCA Policy
              </Link>{" "}
              for information on how to file a notice of infringement.
            </p>
            <p>
              <strong>Repeat Infringer Policy:</strong> We will terminate the
              accounts of users who are repeat infringers of intellectual
              property rights.
            </p>
          </div>

          <div className="space-y-4" id="termination">
            <h2 className="font-bold text-2xl">7. Termination</h2>

            <h3 className="font-semibold text-xl">7.1 Termination by You</h3>
            <p>
              You may terminate your account at any time by contacting us or
              using the account deletion feature if available.
            </p>

            <h3 className="font-semibold text-xl">7.2 Termination by Us</h3>
            <p>
              We may suspend or terminate your account and access to the Service
              at any time, with or without cause or notice, including if:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>You breach these Terms of Service</li>
              <li>You violate our Content Guidelines</li>
              <li>We receive valid DMCA takedown notices</li>
              <li>Your account is inactive for an extended period</li>
              <li>We are required to do so by law</li>
              <li>We decide to discontinue the Service</li>
            </ul>

            <h3 className="font-semibold text-xl">7.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Service will immediately
              cease. We may delete your account and content, though some content
              may remain in backups for a limited time. Sections of these Terms
              that by their nature should survive termination will survive.
            </p>
          </div>

          <div className="space-y-4" id="liability">
            <h2 className="font-bold text-2xl">8. Limitation of Liability</h2>

            <h3 className="font-semibold text-xl">
              8.1 Disclaimer of Warranties
            </h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT
              NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE,
              OR ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
            </p>

            <h3 className="font-semibold text-xl">8.2 Limitation of Damages</h3>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
              INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
              GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                Your access to or use of or inability to access or use the
                Service
              </li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>Unauthorized access, use, or alteration of your content</li>
            </ul>
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIMS UNDER THESE TERMS SHALL NOT
              EXCEED THE AMOUNT YOU PAID US, IF ANY, IN THE PAST SIX MONTHS.
            </p>

            <h3 className="font-semibold text-xl">8.3 Indemnification</h3>
            <p>
              You agree to indemnify, defend, and hold harmless SplitScreen and
              its officers, directors, employees, and agents from any claims,
              liabilities, damages, losses, and expenses, including legal fees,
              arising out of or in any way connected with:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any content you submit or transmit through the Service</li>
            </ul>
          </div>

          <div className="space-y-4" id="disputes">
            <h2 className="font-bold text-2xl">9. Dispute Resolution</h2>

            <h3 className="font-semibold text-xl">9.1 Governing Law</h3>
            <p>
              <strong>For Users in the United States:</strong> These Terms shall
              be governed by and construed in accordance with the laws of the
              State of [Your State], without regard to its conflict of law
              provisions.
            </p>
            <p>
              <strong>For Users in the European Union:</strong> You may also
              have rights under the laws of your country of residence. Nothing
              in these Terms affects your rights as a consumer under mandatory
              consumer protection laws.
            </p>

            <h3 className="font-semibold text-xl">9.2 Dispute Resolution</h3>
            <p>
              Most disputes can be resolved informally. Before filing a claim,
              you agree to contact us at legal@splitscreen.com to attempt to
              resolve the dispute informally.
            </p>
            <p>
              <strong>For US Users:</strong> Any dispute that cannot be resolved
              informally shall be resolved through binding arbitration in
              accordance with the American Arbitration Association rules.
            </p>
            <p>
              <strong>For EU Users:</strong> You have the right to bring
              proceedings in the courts of your country of residence or in the
              courts where we are established.
            </p>
          </div>

          <div className="space-y-4" id="changes">
            <h2 className="font-bold text-2xl">10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will
              notify users of material changes by:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Posting the updated Terms on this page</li>
              <li>Updating the "Last Updated" date at the top</li>
              <li>
                Sending an email notification to registered users (for major
                changes)
              </li>
            </ul>
            <p>
              Your continued use of the Service after changes become effective
              constitutes your acceptance of the revised Terms. If you do not
              agree to the new Terms, you must stop using the Service.
            </p>
          </div>

          <div className="space-y-4 border-t pt-8">
            <h2 className="font-bold text-2xl">Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p>
                <strong>Email:</strong> legal@splitscreen.com
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
