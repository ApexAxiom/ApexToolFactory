import { Card } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <div className="space-y-6 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Get started with your first quote</h2>
          <p className="text-slate-600">
            Build a professional quote by selecting a customer, property, and service template. The
            pricing engine will calculate labor, materials, travel, tax, and rounding for you.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/quotes/new" className="gradient-button">Create a quote</a>
            <a href="/services" className="btn-secondary">Manage service templates</a>
          </div>
          <div className="mx-auto max-w-xl text-left text-sm text-slate-600">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Pick the customer and property</li>
              <li>Choose a service template</li>
              <li>Adjust scope, travel, and pricing</li>
              <li>Review line items and save</li>
              <li>Generate a PDF to send</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
