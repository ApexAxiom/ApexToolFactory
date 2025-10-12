import { notFound } from 'next/navigation';
import { Form } from '@/components/forms/Form';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type InvitePageProps = {
  params: { token: string };
};

export default function InvitePage({ params }: InvitePageProps) {
  if (!params.token) {
    notFound();
  }
  return (
    <div className="mx-auto max-w-xl">
      <Form
        title="Accept invitation"
        description="Join your pest-control workspace as a teammate."
        actions={<Button type="submit">Activate</Button>}
      >
        <FormField label="Email">
          <Input type="email" name="email" required placeholder="you@example.com" />
        </FormField>
        <FormField label="Password">
          <Input type="password" name="password" required placeholder="Create a secure password" />
        </FormField>
      </Form>
    </div>
  );
}
