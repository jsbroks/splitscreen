import { SquareSplitHorizontal, Upload } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { AuthDialog } from "./AuthDialog";
import { LogoutButton } from "./LogoutButton";
import { SearchBar } from "./SearchBar";

const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      aria-label="Split Haven Logo"
      className={className}
      fill="none"
      height="238"
      viewBox="0 0 300 238"
      width="300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Split Haven Logo</title>
      <path
        d="M184 107.742C192.667 112.745 192.667 125.255 184 130.258L141.25 154.94C132.583 159.944 121.75 153.689 121.75 143.682L121.75 94.3183C121.75 84.3109 132.583 78.0562 141.25 83.0599L184 107.742Z"
        fill={"oklch(62.7% 0.265 303.9)"}
      />
      <path
        d="M232.5 24C255.972 24 275 43.0279 275 66.5V81.3564L250 98.4482V66.5C250 56.835 242.165 49 232.5 49H66.5C56.835 49 49 56.835 49 66.5V171.5C49 181.165 56.835 189 66.5 189H117.552L80.9844 214H66.5C43.0279 214 24 194.972 24 171.5V66.5C24 43.0279 43.0279 24 66.5 24H232.5ZM275 171.5C275 194.972 255.972 214 232.5 214H151.858L188.426 189H232.5C242.165 189 250 181.165 250 171.5V146.902L275 129.811V171.5Z"
        fill={"oklch(62.7% 0.265 303.9)"}
      />
      <path
        d="M264.16 137.222C271.35 142.702 275.992 151.355 275.992 161.094V184.094C275.992 200.662 262.561 214.094 245.992 214.094H211.992C198.366 214.094 186.864 205.009 183.207 192.566L264.16 137.222Z"
        fill={"oklch(62.7% 0.265 303.9)"}
      />
    </svg>
  );
};

export function Navbar({
  user,
}: {
  user?: {
    id: string;
    email: string;
    image?: string | null;
    username?: string | null;
  };
}) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-6">
            <a className="flex items-center space-x-2" href="/">
              <Logo className="h-10 w-10 text-primary" />
              <span className="font-semibold text-xl">Split Haven</span>
            </a>
          </div>

          {/* Search Bar */}
          <SearchBar />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {!user && (
              <>
                <AuthDialog
                  mode="signin"
                  trigger={
                    <Button size="sm" variant="ghost">
                      Sign In
                    </Button>
                  }
                />
                <AuthDialog
                  mode="signup"
                  trigger={<Button size="sm">Sign Up</Button>}
                />
              </>
            )}

            {user && (
              <>
                <Link
                  className={buttonVariants({ size: "sm", className: "mr-2" })}
                  href="/upload"
                >
                  <Upload className="h-4 w-4" /> Upload
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar>
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback>
                        {user.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.username}`}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <LogoutButton />
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="mb-4">
          <NavigationMenu>
            <NavigationMenuList className="flex-wrap">
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/">Home</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/trending">Trending</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/popular">Popular</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/creators">Creators</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div>
                    <Link href="/">PMV</Link>
                    <Link href="/">Cute vs Slut</Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>
    </nav>
  );
}
