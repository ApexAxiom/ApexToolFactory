import Link from 'next/link';
import { Form } from '@/components/forms/Form';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Form title="Sign in" description="Welcome back! Access your pest-control workspace." actions={<Button type="submit">Sign in</Button>}>
        <FormField label="Email">
          <Input type="email" name="email" required placeholder="you@example.com" />
        </FormField>
        <FormField label="Password" hint={<Link href="/forgot" className="text-xs">Forgot password?</Link>}>
          <Input type="password" name="password" required placeholder="Password123!" />
        </FormField>
      </Form>
      <p className="mt-4 text-sm text-slate-600">
        Need an account?{' '}
        <Link href="/signup" className="text-brand-accent">
          Create an organization
        </Link>
      </p>
    </div>
  );
}
