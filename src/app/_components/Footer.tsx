import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">SplitScreen</h3>
            <p className="text-muted-foreground text-sm">
              A platform for discovering and sharing split-screen video content.
            </p>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/terms"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/privacy"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/cookies"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/dmca"
                >
                  DMCA Policy
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/guidelines"
                >
                  Content Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="mailto:support@splitscreen.com"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/guidelines#reporting"
                >
                  Report Content
                </Link>
              </li>
              <li>
                <a
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="mailto:appeals@splitscreen.com"
                >
                  Appeals
                </a>
              </li>
              <li>
                <a
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="mailto:dmca@splitscreen.com"
                >
                  DMCA Requests
                </a>
              </li>
            </ul>
          </div>

          {/* Community Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/upload"
                >
                  Upload Video
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/search"
                >
                  Search Videos
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/guidelines"
                >
                  Community Rules
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-muted-foreground text-sm">
              © {currentYear} SplitScreen. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">18+</strong> Adult Content
              </p>
              <p className="text-muted-foreground">
                Made with ❤️ for the community
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
