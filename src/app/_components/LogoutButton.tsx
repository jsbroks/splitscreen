"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { authClient } from "~/server/better-auth/client";

export const LogoutButton: React.FC = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>;
};
