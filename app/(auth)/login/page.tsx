import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to unlock your encrypted identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense><LoginForm /></Suspense>
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
