import { Form } from '@/components/forms/Form';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Form
        heading="Company settings"
        description="Customize brand, defaults, and pricing controls for your organization."
        actions={<Button type="submit">Save changes</Button>}
      >
        <FormField label="Brand name">
          <Input name="brandName" defaultValue="Sample Pest Control" />
        </FormField>
        <FormField label="Primary gradient from">
          <Input type="color" name="brandPrimaryFrom" defaultValue="#3b82f6" />
        </FormField>
        <FormField label="Primary gradient to">
          <Input type="color" name="brandPrimaryTo" defaultValue="#10b981" />
        </FormField>
        <FormField label="Accent color">
          <Input type="color" name="brandAccent" defaultValue="#0ea5e9" />
        </FormField>
        <FormField label="Currency">
          <Select defaultValue="USD" name="currency">
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
          </Select>
        </FormField>
        <FormField label="Tax rate (%)">
          <Input type="number" step="0.01" defaultValue={8.25} />
        </FormField>
        <FormField label="Pricing mode">
          <Select defaultValue="margin" name="pricingMode">
            <option value="margin">Margin</option>
            <option value="markup">Markup</option>
          </Select>
        </FormField>
        <FormField label="Target margin / markup (%)">
          <Input type="number" step="0.01" defaultValue={45} />
        </FormField>
        <FormField label="Hourly wage ($)">
          <Input type="number" step="0.25" defaultValue={22} />
        </FormField>
        <FormField label="Burden percent (%)">
          <Input type="number" step="0.01" defaultValue={28} />
        </FormField>
        <FormField label="Quote expiry days">
          <Input type="number" defaultValue={30} />
        </FormField>
        <FormField label="Terms and disclaimers">
          <Input name="terms" defaultValue="Payment due upon completion." />
        </FormField>
      </Form>
    </div>
  );
}
