"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

const creatorFormSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be 50 characters or less")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be 100 characters or less"),
  aliases: z.string().optional(),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  links: z.string().optional(),
});

type CreatorFormValues = z.infer<typeof creatorFormSchema>;

export default function NewCreatorPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      aliases: "",
      image: "",
      birthday: "",
      links: "",
    },
  });

  const createCreator = api.creators.create.useMutation({
    onSuccess: (data) => {
      toast.success("Creator created successfully!");
      router.push(`/creator/${data?.username}`);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  const onSubmit = (values: CreatorFormValues) => {
    setIsSubmitting(true);

    const aliases = values.aliases
      ? values.aliases
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean)
      : [];

    const links = values.links
      ? values.links
          .split("\n")
          .map((link) => link.trim())
          .filter(Boolean)
      : [];

    createCreator.mutate({
      username: values.username,
      displayName: values.displayName,
      aliases,
      image: values.image || undefined,
      birthday: values.birthday || undefined,
      links,
    });
  };

  return (
    <main>
      <div className="container mx-auto max-w-2xl space-y-6 px-6 py-12">
        <div>
          <h1 className="font-bold text-3xl">Create New Creator</h1>
          <p className="text-muted-foreground">
            Add a new creator to the platform
          </p>
        </div>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="johndoe" {...field} />
                  </FormControl>
                  <FormDescription>
                    The unique username for this creator. Can only contain
                    letters, numbers, underscores, and hyphens.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormDescription>
                    The display name that will be shown on the creator's
                    profile.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aliases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aliases (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="john, jdoe, johnny" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of alternative names or aliases.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL to the creator's profile image.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birthday (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY-MM-DD" type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Creator's date of birth (age will be calculated
                    automatically).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="links"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Links (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      placeholder="https://twitter.com/johndoe&#10;https://youtube.com/@johndoe"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    One URL per line. Social media links, website, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create Creator"}
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </main>
  );
}
