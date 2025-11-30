"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { getAvatarUrl } from "~/lib/avatar-utils";
import { api } from "~/trpc/react";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: user } = api.users.getCurrentUser.useQuery();
  const utils = api.useUtils();

  const generateUploadUrl = api.users.generateAvatarUploadUrl.useMutation();
  const updateProfile = api.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      void utils.users.getCurrentUser.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    displayUsername: "",
  });

  // Initialize form data when user loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        displayUsername: user.displayUsername || "",
      });
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image must be less than 1MB");
      return;
    }

    try {
      setIsUploading(true);

      // Generate upload URL
      const { uploadUrl, publicUrl } = await generateUploadUrl.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload avatar");
      }

      // Set preview
      setAvatarPreview(publicUrl);
      toast.success("Avatar uploaded! Click Save to apply changes.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: {
      name?: string;
      displayUsername?: string;
      avatarUrl?: string;
    } = {};

    if (formData.name !== user?.name) {
      updates.name = formData.name;
    }
    if (formData.displayUsername !== user?.displayUsername) {
      updates.displayUsername = formData.displayUsername;
    }
    if (avatarPreview) {
      updates.avatarUrl = avatarPreview;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    await updateProfile.mutateAsync(updates);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const currentAvatarUrl = avatarPreview || getAvatarUrl(user);

  return (
    <main className="container mx-auto max-w-2xl px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Avatar Section */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="size-24">
                    <AvatarImage alt="Avatar" src={currentAvatarUrl} />
                    <AvatarFallback>
                      {user.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute right-0 bottom-0 rounded-full bg-primary p-2 text-primary-foreground shadow-lg hover:bg-primary/90"
                    disabled={isUploading}
                    onClick={handleAvatarClick}
                    type="button"
                  >
                    {isUploading ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                  </button>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Click the camera icon to upload a new avatar
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Max size: 1MB. Formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>
              <input
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Your name"
                type="text"
                value={formData.name}
              />
            </div>

            {/* Display Username Field */}
            <div className="space-y-2">
              <Label htmlFor="displayUsername">Display Username</Label>
              <Input
                id="displayUsername"
                onChange={(e) =>
                  setFormData({ ...formData, displayUsername: e.target.value })
                }
                placeholder="Display username"
                type="text"
                value={formData.displayUsername}
              />
              <p className="text-muted-foreground text-xs">
                This is the name displayed on your profile
              </p>
            </div>

            {/* Username (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                disabled
                id="username"
                type="text"
                value={user.username || ""}
              />
              <p className="text-muted-foreground text-xs">
                Username cannot be changed
              </p>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                disabled
                id="email"
                type="email"
                value={user.email || ""}
              />
              <p className="text-muted-foreground text-xs">
                Email cannot be changed
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                disabled={updateProfile.isPending || isUploading}
                type="submit"
              >
                {updateProfile.isPending ? <Spinner /> : "Save Changes"}
              </Button>
              <Button
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
