"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useFingerprint } from "~/app/_components/useFigureprint";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

const REPORT_REASONS = [
  { value: "underage_content", label: "Underage content" },
  { value: "abuse", label: "Abuse" },
  { value: "illegal_content", label: "Illegal Content" },
  { value: "wrong_tags", label: "Wrong Tags" },
  { value: "spam_unrelated", label: "Spam / Unrelated" },
  { value: "dmca", label: "DMCA" },
  { value: "other", label: "Other" },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export function ReportDialog({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<ReportReason[]>([]);
  const [details, setDetails] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const fingerprint = useFingerprint();

  const reportVideo = api.videos.reportVideo.useMutation({
    onSuccess: () => {
      toast.success("Report submitted successfully");
      setOpen(false);
      setSelectedReasons([]);
      setDetails("");
      setFullName("");
      setEmail("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleReasonToggle = (reason: ReportReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0) {
      toast.error("Please select at least one reason");
      return;
    }

    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email address");
      return;
    }

    if (!details.trim()) {
      toast.error("Description is required");
      return;
    }

    reportVideo.mutate({
      videoId,
      reasons: selectedReasons,
      details: details.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      fingerprint: fingerprint.fingerprint?.visitorId ?? undefined,
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="rounded-full" size="sm" variant="outline">
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report Video</DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this video. Select all that
            apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              id="fullName"
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              type="text"
              value={fullName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-3">
            <Label>
              Reason for Report <span className="text-destructive">*</span>
            </Label>
            {REPORT_REASONS.map((reason) => (
              <div className="flex items-center space-x-2" key={reason.value}>
                <Checkbox
                  checked={selectedReasons.includes(reason.value)}
                  id={reason.value}
                  onCheckedChange={() => handleReasonToggle(reason.value)}
                />
                <Label
                  className="cursor-pointer font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor={reason.value}
                >
                  {reason.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="details"
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide links and timestamps for evidence..."
              required
              rows={4}
              value={details}
            />
          </div>
        </div>

        <div className="text-muted-foreground text-xs">
          Please review the information you have provided before submitting your
          request. By typing your name in the field below, you guarantee that
          you are the person being named and represented on this form and that
          all provided information is accurate.
        </div>

        <DialogFooter>
          <Button
            disabled={reportVideo.isPending}
            onClick={() => {
              setOpen(false);
              setSelectedReasons([]);
              setDetails("");
              setFullName("");
              setEmail("");
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={
              reportVideo.isPending ||
              selectedReasons.length === 0 ||
              !fullName.trim() ||
              !email.trim() ||
              !details.trim()
            }
            onClick={handleSubmit}
            variant="destructive"
          >
            {reportVideo.isPending ? <Spinner /> : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
