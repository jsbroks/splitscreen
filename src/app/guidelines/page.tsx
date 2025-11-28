import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Content Guidelines | SplitScreen",
  description:
    "Community guidelines and content standards for SplitScreen video platform",
};

const LAST_UPDATED = "November 28, 2025";

export default function ContentGuidelinesPage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 font-bold text-4xl">Content Guidelines</h1>
          <p className="text-muted-foreground">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm">
            <strong>Welcome to SplitScreen!</strong> These Content Guidelines
            help ensure our community remains safe, respectful, and enjoyable
            for everyone. All content uploaded to SplitScreen must comply with
            these guidelines and our{" "}
            <Link className="text-primary hover:underline" href="/terms">
              Terms of Service
            </Link>
            .
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
              <a className="text-primary hover:underline" href="#prohibited">
                2. Prohibited Content
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#standards">
                3. Content Standards
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#attribution">
                4. Creator Attribution
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#moderation">
                5. Content Moderation
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#reporting">
                6. Reporting Content
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#enforcement">
                7. Enforcement
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href="#appeal">
                8. Appeals
              </a>
            </li>
          </ol>
        </nav>

        <section className="space-y-8">
          <div className="space-y-4" id="overview">
            <h2 className="font-bold text-2xl">1. Overview</h2>
            <p>
              SplitScreen is a platform for sharing video content. We want to
              maintain a positive and safe environment for all users. These
              guidelines apply to all content, including:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Videos and thumbnails</li>
              <li>Titles and descriptions</li>
              <li>Tags and categories</li>
              <li>Comments and reactions</li>
              <li>Profile information</li>
            </ul>
          </div>

          <div className="space-y-4" id="prohibited">
            <h2 className="font-bold text-2xl">2. Prohibited Content</h2>
            <p>
              The following types of content are strictly prohibited on
              SplitScreen:
            </p>

            <div className="space-y-6">
              <div className="rounded-lg border border-destructive p-4">
                <h3 className="font-semibold text-destructive text-lg">
                  2.1 Illegal Content
                </h3>
                <p className="mt-2 text-sm">
                  Content that violates any applicable laws, including but not
                  limited to:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>
                    <strong>Child Sexual Abuse Material (CSAM):</strong> Any
                    content depicting, promoting, or sexualizing minors
                  </li>
                  <li>
                    <strong>Non-consensual Content:</strong> Content filmed or
                    distributed without the consent of all parties
                  </li>
                  <li>
                    <strong>Human Trafficking:</strong> Content that promotes or
                    facilitates human trafficking or exploitation
                  </li>
                  <li>
                    <strong>Illegal Activities:</strong> Content promoting or
                    instructing illegal activities
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-destructive p-4">
                <h3 className="font-semibold text-destructive text-lg">
                  2.2 Minors
                </h3>
                <p className="mt-2 text-sm">
                  <strong>Zero Tolerance Policy:</strong> Any content featuring,
                  depicting, or involving minors (individuals under 18 years
                  old) in any manner is strictly prohibited. This includes:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>Visual depictions of minors</li>
                  <li>Audio recordings featuring minors</li>
                  <li>Content that sexualizes or exploits minors</li>
                  <li>
                    Content that appears to feature individuals who may be
                    minors
                  </li>
                </ul>
                <p className="mt-2 font-semibold text-sm">
                  Violations will result in immediate account termination and
                  reporting to law enforcement.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-lg">2.3 Violence and Harm</h3>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>Graphic violence or gore</li>
                  <li>Content promoting self-harm or suicide</li>
                  <li>
                    Content inciting violence against individuals or groups
                  </li>
                  <li>Torture or animal abuse</li>
                  <li>
                    Dangerous or harmful activities that could lead to serious
                    injury
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-lg">
                  2.4 Hate Speech and Harassment
                </h3>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>
                    Content promoting hate or violence against individuals or
                    groups based on race, ethnicity, religion, disability,
                    gender, age, nationality, sexual orientation, or gender
                    identity
                  </li>
                  <li>Harassment, bullying, or targeted abuse</li>
                  <li>Doxxing (sharing private personal information)</li>
                  <li>Threats of violence or harm</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-lg">
                  2.5 Spam and Deceptive Practices
                </h3>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>Spam, clickbait, or misleading content</li>
                  <li>Deceptive metadata (titles, descriptions, tags)</li>
                  <li>Impersonation of others</li>
                  <li>Artificially inflating views, likes, or engagement</li>
                  <li>Repetitive or duplicate uploads</li>
                  <li>Unrelated or excessive promotional content</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-lg">
                  2.6 Copyright Infringement
                </h3>
                <p className="mt-2 text-sm">
                  Content that infringes on intellectual property rights,
                  including:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>
                    Unauthorized use of copyrighted videos, music, or images
                  </li>
                  <li>Content that violates trademark rights</li>
                  <li>Pirated or stolen content</li>
                </ul>
                <p className="mt-2 text-sm">
                  See our{" "}
                  <Link className="text-primary hover:underline" href="/dmca">
                    DMCA Policy
                  </Link>{" "}
                  for more information.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-lg">2.7 Malicious Content</h3>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
                  <li>Malware, viruses, or harmful software</li>
                  <li>Phishing attempts or scams</li>
                  <li>Content designed to compromise user security</li>
                  <li>External links to malicious sites</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4" id="standards">
            <h2 className="font-bold text-2xl">3. Content Standards</h2>

            <h3 className="font-semibold text-xl">3.1 Video Quality</h3>
            <p>
              While we don't require professional-grade content, we ask that
              videos:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Are reasonably clear and watchable</li>
              <li>Have audible audio (if applicable)</li>
              <li>Are not excessively distorted or corrupted</li>
            </ul>

            <h3 className="font-semibold text-xl">3.2 Metadata Accuracy</h3>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold">Your metadata must be accurate:</p>
              <ul className="mt-2 ml-6 list-disc space-y-2 text-sm">
                <li>
                  <strong>Titles:</strong> Should accurately describe the video
                  content
                </li>
                <li>
                  <strong>Descriptions:</strong> Should provide relevant
                  information about the video
                </li>
                <li>
                  <strong>Tags:</strong> Should be relevant to the actual
                  content
                </li>
                <li>
                  <strong>Thumbnails:</strong> Should represent the video
                  content and not be misleading
                </li>
              </ul>
            </div>

            <h3 className="font-semibold text-xl">3.3 Language</h3>
            <p>
              Respectful language is encouraged in all content, titles, and
              descriptions. While adult content is permitted, excessive
              profanity or offensive language in titles may result in content
              being flagged for review.
            </p>
          </div>

          <div className="space-y-4" id="attribution">
            <h2 className="font-bold text-2xl">4. Creator Attribution</h2>

            <h3 className="font-semibold text-xl">
              4.1 Why Attribution Matters
            </h3>
            <p>
              Properly crediting creators is essential to our community. It:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Respects the work of content creators</li>
              <li>Helps users discover creators they enjoy</li>
              <li>Provides proper context for the content</li>
              <li>Builds trust within the community</li>
            </ul>

            <h3 className="font-semibold text-xl">
              4.2 Attribution Requirements
            </h3>
            <div className="rounded-lg border p-4">
              <p>When uploading content, you must:</p>
              <ul className="mt-2 ml-6 list-disc space-y-2 text-sm">
                <li>
                  <strong>Original Creator:</strong> Tag the original creator or
                  studio that produced the content (if known)
                </li>
                <li>
                  <strong>Featured Creators:</strong> Tag all performers or
                  individuals featured in the content
                </li>
                <li>
                  <strong>Accurate Information:</strong> Ensure creator names
                  and information are accurate
                </li>
                <li>
                  <strong>No False Attribution:</strong> Do not falsely claim
                  content as your own or misattribute it to others
                </li>
              </ul>
            </div>

            <h3 className="font-semibold text-xl">4.3 Unknown Creators</h3>
            <p>
              If you don't know who created or appears in the content, you may
              leave those fields empty. However, if this information is
              requested by the creator or identified by the community, you must
              update it or the content may be removed.
            </p>
          </div>

          <div className="space-y-4" id="moderation">
            <h2 className="font-bold text-2xl">5. Content Moderation</h2>

            <h3 className="font-semibold text-xl">5.1 Review Process</h3>
            <p>All uploaded content goes through a moderation process:</p>
            <ol className="ml-6 list-decimal space-y-2">
              <li>
                <strong>Initial Upload:</strong> Content is uploaded with status
                "uploaded"
              </li>
              <li>
                <strong>Processing:</strong> Videos are transcoded and processed
              </li>
              <li>
                <strong>Review Queue:</strong> Content enters the review queue
                with status "in_review"
              </li>
              <li>
                <strong>Moderation:</strong> Our team reviews content for
                compliance
              </li>
              <li>
                <strong>Decision:</strong> Content is approved or rejected with
                explanation
              </li>
            </ol>

            <h3 className="font-semibold text-xl">5.2 Review Timeline</h3>
            <p>
              We strive to review all content within 24-48 hours. However,
              review times may vary based on volume. You will be notified when
              your content is approved or rejected.
            </p>

            <h3 className="font-semibold text-xl">5.3 Rejection Reasons</h3>
            <p>
              If your content is rejected, you'll receive an explanation that
              may include:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Specific guideline violations</li>
              <li>What needs to be corrected</li>
              <li>Whether you can re-upload with corrections</li>
            </ul>
          </div>

          <div className="space-y-4" id="reporting">
            <h2 className="font-bold text-2xl">6. Reporting Content</h2>

            <h3 className="font-semibold text-xl">6.1 How to Report</h3>
            <p>
              If you see content that violates these guidelines, please report
              it using the "Report" button on the video page.
            </p>

            <h3 className="font-semibold text-xl">6.2 What to Include</h3>
            <p>When reporting content, please provide:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Reason:</strong> Select the appropriate violation
                category
              </li>
              <li>
                <strong>Details:</strong> Provide specific information about the
                violation
              </li>
              <li>
                <strong>Your Information:</strong> Name and email (required for
                follow-up)
              </li>
            </ul>

            <h3 className="font-semibold text-xl">6.3 Report Categories</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-sm">Underage Content</p>
                <p className="text-muted-foreground text-xs">
                  Content featuring or appearing to feature minors
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-sm">Abuse</p>
                <p className="text-muted-foreground text-xs">
                  Violence, harassment, or harmful content
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-sm">Illegal Content</p>
                <p className="text-muted-foreground text-xs">
                  Content violating laws
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-sm">Wrong Tags</p>
                <p className="text-muted-foreground text-xs">
                  Incorrect or misleading metadata
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-sm">Spam/Unrelated</p>
                <p className="text-muted-foreground text-xs">
                  Spam or off-topic content
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-sm">DMCA</p>
                <p className="text-muted-foreground text-xs">
                  Copyright infringement (see{" "}
                  <Link className="text-primary hover:underline" href="/dmca">
                    DMCA Policy
                  </Link>
                  )
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-xl">6.4 False Reports</h3>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="font-semibold">Warning:</p>
              <p className="mt-2 text-sm">
                Submitting false or malicious reports may result in action
                against your account. Use the reporting system responsibly.
              </p>
            </div>
          </div>

          <div className="space-y-4" id="enforcement">
            <h2 className="font-bold text-2xl">7. Enforcement</h2>

            <h3 className="font-semibold text-xl">7.1 Consequences</h3>
            <p>
              Violations of these guidelines may result in one or more of the
              following:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Content Removal:</strong> Violating content will be
                removed
              </li>
              <li>
                <strong>Warning:</strong> First-time or minor violations may
                receive a warning
              </li>
              <li>
                <strong>Temporary Suspension:</strong> Repeated violations or
                more serious infractions
              </li>
              <li>
                <strong>Permanent Ban:</strong> Severe or repeated violations,
                especially involving illegal content
              </li>
              <li>
                <strong>Legal Action:</strong> Criminal violations will be
                reported to law enforcement
              </li>
            </ul>

            <h3 className="font-semibold text-xl">7.2 Factors Considered</h3>
            <p>When determining enforcement action, we consider:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Severity of the violation</li>
              <li>Previous violations and warnings</li>
              <li>Intent (accidental vs. deliberate)</li>
              <li>Impact on the community</li>
              <li>Response to previous warnings</li>
            </ul>

            <h3 className="font-semibold text-xl">7.3 Immediate Actions</h3>
            <p>
              The following violations result in immediate account termination
              without warning:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Any content involving minors</li>
              <li>Non-consensual intimate content</li>
              <li>Content promoting human trafficking or exploitation</li>
              <li>Serious threats of violence</li>
            </ul>
          </div>

          <div className="space-y-4" id="appeal">
            <h2 className="font-bold text-2xl">8. Appeals</h2>

            <h3 className="font-semibold text-xl">8.1 How to Appeal</h3>
            <p>
              If you believe your content was incorrectly rejected or your
              account was wrongly suspended, you may appeal by contacting:
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p>
                <strong>Email:</strong> appeals@splitscreen.com
              </p>
              <p className="mt-2 text-sm">
                Include: Your username, content ID (if applicable), and a
                detailed explanation of why you believe the decision was
                incorrect.
              </p>
            </div>

            <h3 className="font-semibold text-xl">8.2 Appeal Process</h3>
            <ol className="ml-6 list-decimal space-y-2">
              <li>Submit your appeal with all required information</li>
              <li>We will review your appeal within 5-7 business days</li>
              <li>
                You will receive a response with our decision and explanation
              </li>
              <li>Our decision after appeal review is final</li>
            </ol>

            <h3 className="font-semibold text-xl">8.3 Appeal Limitations</h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>You may appeal each decision once</li>
              <li>
                Accounts terminated for illegal content (especially involving
                minors) cannot be appealed
              </li>
              <li>Frivolous or abusive appeals may result in further action</li>
            </ul>
          </div>

          <div className="space-y-4 border-t pt-8">
            <h2 className="font-bold text-2xl">Questions or Concerns?</h2>
            <p>
              If you have questions about these Content Guidelines, please
              contact us:
            </p>
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p>
                <strong>General Support:</strong> support@splitscreen.com
              </p>
              <p>
                <strong>Content Moderation:</strong> moderation@splitscreen.com
              </p>
              <p>
                <strong>Appeals:</strong> appeals@splitscreen.com
              </p>
            </div>

            <p className="text-muted-foreground text-sm">
              These guidelines may be updated from time to time. Continued use
              of SplitScreen constitutes acceptance of the current guidelines.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
