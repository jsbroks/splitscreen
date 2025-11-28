import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Policy | SplitScreen",
  description: "Digital Millennium Copyright Act (DMCA) Policy for SplitScreen",
};

const LAST_UPDATED = "November 28, 2025";

export default function DMCAPage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 font-bold text-4xl">DMCA Copyright Policy</h1>
          <p className="text-muted-foreground">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm">
            SplitScreen respects the intellectual property rights of others and
            expects our users to do the same. We respond to notices of alleged
            copyright infringement that comply with the Digital Millennium
            Copyright Act ("DMCA").
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
              <a className="text-primary hover:underline" href="#notice">
                2. Filing a DMCA Notice
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#counter">
                3. Counter-Notification
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#repeat">
                4. Repeat Infringer Policy
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#misuse">
                5. Misrepresentation Warning
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#agent">
                6. Designated Copyright Agent
              </a>
            </li>
          </ol>
        </nav>

        <section className="space-y-8">
          <div className="space-y-4" id="overview">
            <h2 className="font-bold text-2xl">1. Overview</h2>
            <p>
              If you believe that content available on SplitScreen infringes
              your copyright, you may submit a DMCA takedown notice. We will
              review all complete notices and take appropriate action, which may
              include removing or disabling access to the allegedly infringing
              content.
            </p>
            <p>
              <strong>Important:</strong> Before submitting a DMCA notice,
              please ensure that:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                You are the copyright owner or authorized to act on their behalf
              </li>
              <li>
                The content you're reporting actually infringes your copyright
              </li>
              <li>
                You have considered fair use and other exceptions to copyright
              </li>
            </ul>
          </div>

          <div className="space-y-4" id="notice">
            <h2 className="font-bold text-2xl">2. Filing a DMCA Notice</h2>
            <p>
              To file a DMCA takedown notice, you must provide a written
              communication (by email or physical mail) that includes all of the
              following:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Required Information:</h3>
                <ol className="mt-3 ml-6 list-decimal space-y-3 text-sm">
                  <li>
                    <strong>Identification of the copyrighted work:</strong>{" "}
                    Describe the copyrighted work that you claim has been
                    infringed. If multiple works are covered by a single
                    notification, provide a representative list.
                  </li>
                  <li>
                    <strong>Identification of the infringing material:</strong>{" "}
                    Provide the URL(s) or other specific location(s) on our
                    Service where the material you claim is infringing is
                    located. Include enough information to allow us to locate
                    the material.
                  </li>
                  <li>
                    <strong>Contact information:</strong> Provide your name,
                    mailing address, telephone number, and email address.
                  </li>
                  <li>
                    <strong>Good faith statement:</strong> Include the following
                    statement: "I have a good faith belief that use of the
                    copyrighted material described above is not authorized by
                    the copyright owner, its agent, or the law."
                  </li>
                  <li>
                    <strong>Accuracy statement:</strong> Include the following
                    statement: "I swear, under penalty of perjury, that the
                    information in this notification is accurate and that I am
                    the copyright owner or am authorized to act on behalf of the
                    owner of an exclusive right that is allegedly infringed."
                  </li>
                  <li>
                    <strong>Signature:</strong> Provide your physical or
                    electronic signature.
                  </li>
                </ol>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-semibold">Example DMCA Notice:</h3>
                <pre className="mt-3 whitespace-pre-wrap text-xs">
                  {`To: DMCA Agent, SplitScreen
From: [Your Name]
Date: [Date]

I, [Your Name], am the owner (or authorized agent of the owner) of certain 
intellectual property rights in the following copyrighted work:

[Description of your copyrighted work]

I have a good faith belief that the following material available on SplitScreen 
infringes my copyright:

[URL(s) of allegedly infringing content]

This unauthorized use is not authorized by me, my agent, or the law.

I swear, under penalty of perjury, that the information in this notification 
is accurate and that I am the copyright owner or authorized to act on behalf 
of the owner.

Contact Information:
Name: [Your Full Name]
Address: [Your Address]
Phone: [Your Phone Number]
Email: [Your Email Address]

Signature: [Your Signature]
Date: [Date]`}
                </pre>
              </div>
            </div>

            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="font-semibold">Warning:</p>
              <p className="mt-2 text-sm">
                Under Section 512(f) of the DMCA, any person who knowingly
                materially misrepresents that material is infringing may be
                subject to liability for damages. We may forward your DMCA
                notice, including your contact information, to the user who
                posted the allegedly infringing content.
              </p>
            </div>
          </div>

          <div className="space-y-4" id="counter">
            <h2 className="font-bold text-2xl">3. Counter-Notification</h2>
            <p>
              If you believe that content you posted was removed or disabled as
              a result of a mistake or misidentification, you may file a
              counter-notification with us.
            </p>

            <h3 className="font-semibold text-xl">3.1 Requirements</h3>
            <p>A counter-notification must include all of the following:</p>
            <div className="rounded-lg border p-4">
              <ol className="ml-6 list-decimal space-y-3 text-sm">
                <li>
                  <strong>Identification:</strong> Identify the material that
                  was removed or disabled and the location where it appeared
                  before removal.
                </li>
                <li>
                  <strong>Good faith statement:</strong> Include the following
                  statement: "I swear, under penalty of perjury, that I have a
                  good faith belief that the material was removed or disabled as
                  a result of mistake or misidentification."
                </li>
                <li>
                  <strong>Consent to jurisdiction:</strong> Include a statement
                  that you consent to the jurisdiction of the Federal District
                  Court for the judicial district in which your address is
                  located (or if outside the US, any judicial district in which
                  we may be found), and that you will accept service of process
                  from the person who filed the original DMCA notice or their
                  agent.
                </li>
                <li>
                  <strong>Contact information:</strong> Provide your name,
                  address, phone number, and email address.
                </li>
                <li>
                  <strong>Signature:</strong> Provide your physical or
                  electronic signature.
                </li>
              </ol>
            </div>

            <h3 className="font-semibold text-xl">3.2 What Happens Next</h3>
            <p>Upon receiving a valid counter-notification, we will:</p>
            <ol className="ml-6 list-decimal space-y-2">
              <li>Forward a copy to the original complaining party</li>
              <li>
                Inform them that we will restore the content in 10-14 business
                days
              </li>
              <li>
                Restore the content in 10-14 business days unless the copyright
                owner files a court action seeking an injunction
              </li>
            </ol>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold">Note:</p>
              <p className="mt-2 text-sm">
                We will forward your counter-notification, including your
                contact information, to the party who submitted the original
                DMCA notice. By submitting a counter-notification, you consent
                to this disclosure.
              </p>
            </div>
          </div>

          <div className="space-y-4" id="repeat">
            <h2 className="font-bold text-2xl">4. Repeat Infringer Policy</h2>
            <p>
              In accordance with the DMCA and other applicable laws, we have
              adopted a policy of terminating, in appropriate circumstances,
              users who are deemed to be repeat infringers.
            </p>

            <h3 className="font-semibold text-xl">
              4.1 What is a Repeat Infringer?
            </h3>
            <p>
              We consider the following factors when determining whether a user
              is a repeat infringer:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                The number of DMCA notices received about a user's content
              </li>
              <li>
                Whether the user has received warnings about copyright
                infringement
              </li>
              <li>The nature and severity of the infringements</li>
              <li>Whether counter-notifications were filed and upheld</li>
            </ul>

            <h3 className="font-semibold text-xl">4.2 Consequences</h3>
            <p>Users identified as repeat infringers may face:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Warnings and temporary suspension of upload privileges</li>
              <li>Permanent suspension or termination of account</li>
              <li>Removal of all content uploaded by the user</li>
              <li>Ban from creating new accounts</li>
            </ul>
          </div>

          <div className="space-y-4" id="misuse">
            <h2 className="font-bold text-2xl">5. Misrepresentation Warning</h2>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="font-semibold">Important Legal Notice:</p>
              <p className="mt-2 text-sm">
                Under Section 512(f) of the DMCA, 17 U.S.C. § 512(f), any person
                who knowingly materially misrepresents that:
              </p>
              <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                <li>Material or activity is infringing, or</li>
                <li>
                  Material or activity was removed or disabled by mistake or
                  misidentification
                </li>
              </ul>
              <p className="mt-2 text-sm">
                shall be liable for any damages, including costs and attorneys'
                fees, incurred by the alleged infringer or by us.
              </p>
            </div>

            <h3 className="font-semibold text-xl">5.1 Before You File</h3>
            <p>Before filing a DMCA notice, please consider:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Fair Use:</strong> Does the use qualify as fair use
                under US law? Educational, commentary, parody, and
                transformative uses may be protected.
              </li>
              <li>
                <strong>Authorization:</strong> Did you authorize the use? Have
                you licensed the content under Creative Commons or similar?
              </li>
              <li>
                <strong>Public Domain:</strong> Is the work in the public
                domain?
              </li>
              <li>
                <strong>Ownership:</strong> Are you certain you own the
                copyright?
              </li>
            </ul>

            <p className="mt-4">
              If you're unsure about any of these issues, we encourage you to
              seek legal advice before filing a DMCA notice.
            </p>
          </div>

          <div className="space-y-4" id="agent">
            <h2 className="font-bold text-2xl">
              6. Designated Copyright Agent
            </h2>
            <p>
              Our designated agent for notice of claims of copyright
              infringement can be reached as follows:
            </p>

            <div className="space-y-3 rounded-lg bg-muted p-6">
              <p>
                <strong>DMCA Agent</strong>
              </p>
              <p>SplitScreen</p>
              <p>[Your Company Legal Name]</p>
              <p>[Street Address]</p>
              <p>[City, State ZIP Code]</p>
              <p className="pt-3">
                <strong>Email:</strong> dmca@splitscreen.com
              </p>
              <p>
                <strong>Phone:</strong> [Phone Number]
              </p>
            </div>

            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <p className="font-semibold">Note to Copyright Owners:</p>
              <p className="mt-2 text-sm">
                Please send only DMCA notices to the designated agent above.
                Other inquiries (such as requests for technical assistance or
                customer service) will not receive a response through this
                channel. For non-DMCA matters, please use our regular support
                channels.
              </p>
            </div>

            <h3 className="font-semibold text-xl">6.1 Registration</h3>
            <p className="text-muted-foreground text-sm">
              Our designated agent is registered with the United States
              Copyright Office under the DMCA. You can verify this registration
              at the{" "}
              <a
                className="text-primary hover:underline"
                href="https://www.copyright.gov/"
                rel="noopener noreferrer"
                target="_blank"
              >
                U.S. Copyright Office website
              </a>
              .
            </p>
          </div>

          <div className="space-y-4 border-t pt-8">
            <h2 className="font-bold text-2xl">Additional Information</h2>

            <h3 className="font-semibold text-xl">Processing Time</h3>
            <p>
              We strive to process all valid DMCA notices within 24-48 hours.
              However, processing time may vary depending on the complexity of
              the notice and our current workload.
            </p>

            <h3 className="font-semibold text-xl">Transparency</h3>
            <p>
              We believe in transparency regarding copyright enforcement. We may
              publish aggregated data about DMCA notices received and processed
              (without disclosing personal information).
            </p>

            <h3 className="font-semibold text-xl">Questions?</h3>
            <p>
              If you have questions about our DMCA procedures, please contact us
              at legal@splitscreen.com. Note that this email address is for
              general inquiries only; DMCA notices must be sent to
              dmca@splitscreen.com.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
