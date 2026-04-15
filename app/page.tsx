import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg tracking-tight">Stash</span>
        <nav className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Lock className="h-8 w-8" />
        </div>

        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Private marketplaces, by invitation only.
          </h1>
          <p className="text-lg text-muted-foreground">
            Stash lets you create encrypted, invite-only markets. Even we
            can&apos;t see who&apos;s inside or what&apos;s being sold.
          </p>
        </div>

        <Button size="lg" asChild>
          <Link href="/signup">Create your stash</Link>
        </Button>
      </section>

      <section className="border-t bg-muted/40 px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
          <Feature
            icon={<Lock className="h-5 w-5" />}
            title="End-to-end encrypted"
            description="All content is encrypted on your device before it ever reaches our servers."
          />
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Hidden membership"
            description="Member identities and counts are cryptographically hidden. We store only encrypted blobs."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Zero-knowledge access"
            description="Prove you belong to a stash without revealing your identity to the platform."
          />
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Stash
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
