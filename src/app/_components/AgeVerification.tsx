"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const AGE_VERIFICATION_KEY = "splitscreen_age_verified";
const VERIFICATION_VERSION = "1.0";

export function AgeVerification() {
  const [showGate, setShowGate] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has already verified their age
    const verified = localStorage.getItem(AGE_VERIFICATION_KEY);

    if (verified) {
      try {
        const verificationData = JSON.parse(verified);
        if (
          verificationData.version === VERIFICATION_VERSION &&
          verificationData.verified
        ) {
          setShowGate(false);
        }
      } catch {
        // Invalid data, show gate
        setShowGate(true);
      }
    }

    setIsChecking(false);
  }, []);

  const handleAccept = () => {
    const verificationData = {
      version: VERIFICATION_VERSION,
      verified: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(
      AGE_VERIFICATION_KEY,
      JSON.stringify(verificationData),
    );
    setShowGate(false);
  };

  const handleDecline = () => {
    // Redirect away from the site
    window.location.href = "https://www.google.com";
  };

  // Don't render anything while checking to avoid flash
  if (isChecking) {
    return null;
  }

  if (!showGate) {
    return null;
  }

  return (
    <>
      {/* Backdrop blur */}
      <div className="fixed inset-0 z-50 backdrop-blur-xl" />

      {/* Age gate modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <span className="font-bold text-3xl">18+</span>
            </div>
            <CardTitle className="text-2xl">
              Age Verification Required
            </CardTitle>
            <CardDescription className="text-base">
              This website contains age-restricted content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-muted bg-muted/50 p-4">
              <p className="text-center text-sm">
                You must be at least <strong>18 years old</strong> to access
                this website. By clicking "I am 18 or older", you confirm that
                you meet this age requirement.
              </p>
            </div>
            <div className="space-y-2 text-center text-muted-foreground text-xs">
              <p>
                This site uses cookies and similar technologies. By entering,
                you agree to our use of cookies as described in our Cookie
                Policy.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" onClick={handleAccept} size="lg">
              I am 18 or older - Enter
            </Button>
            <Button
              className="w-full"
              onClick={handleDecline}
              size="lg"
              variant="outline"
            >
              I am under 18 - Exit
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
