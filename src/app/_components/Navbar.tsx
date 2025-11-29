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
              <SquareSplitHorizontal className="h-6 w-6 text-primary" />
              <span className="font-semibold text-xl">Split Screen</span>
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
