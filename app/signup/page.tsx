import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SignupForm } from "@/components/forms/signup-form";
import { BrandMark } from "@/components/ui/brand";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-pine px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-panel lg:grid-cols-[1fr_420px]">
        <section className="px-8 py-10 text-white sm:px-12">
          <BrandMark dark />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-emerald">Start free trial</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
            Launch a production-ready pest control workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/72">
            Signup creates your Cognito user, company workspace, owner membership, and trial subscription record. After email confirmation, sign in and complete MFA setup.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              "Cognito email confirmation",
              "Owner membership created",
              "Trial subscription record",
              "MFA setup at first login"
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                {item}
              </div>
            ))}
          </div>
          <Link href="/" className="mt-10 inline-block text-sm text-white/70 underline underline-offset-4">
            Back to marketing site
          </Link>
        </section>

        <section className="border-t border-white/10 bg-white/[0.04] px-8 py-10 lg:border-l lg:border-t-0">
          <div className="mb-6">
            <div className="text-2xl font-semibold text-white">Create account</div>
            <p className="mt-2 text-sm text-white/65">Use a verified work email for production access.</p>
          </div>
          <SignupForm />
          <p className="mt-5 text-sm text-white/65">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
