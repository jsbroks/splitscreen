"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/server/better-auth/client";

interface AuthDialogProps {
  mode?: "signin" | "signup";
  trigger?: React.ReactNode;
}

export function AuthDialog({ mode = "signin", trigger }: AuthDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(mode === "signin");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await authClient.signIn.username({
          username: formData.username,
          password: formData.password,
        });

        if (result.error) {
          toast.error(result.error.message || "Failed to login");
        } else {
          toast.success("Successfully logged in!");
          setIsOpen(false);
          router.refresh();
        }
      } else {
        // Sign up
        const result = await authClient.signUp.email({
          name: formData.username,
          email: formData.email,
          password: formData.password,
          username: formData.username,
        });

        if (result.error) {
          toast.error(result.error.message || "Failed to sign up");
        } else {
          toast.success("Account created successfully!");
          setIsOpen(false);
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: "", password: "", username: "" });
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
      open={isOpen}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isLogin ? "Sign In" : "Create Account"}</DialogTitle>
            <DialogDescription>
              {isLogin
                ? "Enter your credentials to access your account"
                : "Sign up to get started with SplitScreen"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                disabled={isLoading}
                id="username"
                name="username"
                onChange={handleInputChange}
                placeholder=""
                required
                type="text"
                value={formData.username}
              />
            </div>
            {!isLogin && (
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  disabled={isLoading}
                  id="email"
                  name="email"
                  onChange={handleInputChange}
                  placeholder=""
                  required={!isLogin}
                  type="email"
                  value={formData.email}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                disabled={isLoading}
                id="password"
                minLength={8}
                name="password"
                onChange={handleInputChange}
                placeholder=""
                required
                type="password"
                value={formData.password}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button className="w-full" disabled={isLoading} type="submit">
              {isLoading
                ? "Please wait..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>{" "}
              <button
                className="font-medium text-primary hover:underline"
                disabled={isLoading}
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                type="button"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
