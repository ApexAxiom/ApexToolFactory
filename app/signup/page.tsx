import Link from 'next/link';

import { Form } from '@/components/forms/Form';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Form
        heading="Create your organization"
        description="Launch a new workspace with a secure multi-tenant environment."
        actions={<Button type="submit">Create account</Button>}
      >
        <FormField label="Company name">
          <Input name="companyName" required placeholder="Sample Pest Control" />
        </FormField>
        <FormField label="Your name">
          <Input name="name" required placeholder="Jordan Carter" />
        </FormField>
        <FormField label="Email">
          <Input type="email" name="email" required placeholder="admin@example.com" />
        </FormField>
        <FormField label="Password" hint="Use at least 12 characters with upper, lower, number, and symbol.">
          <Input type="password" name="password" required />
        </FormField>
      </Form>
      <p className="mt-4 text-sm text-slate-600">
        Already a member?{' '}
        <Link href="/login" className="text-brand-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
