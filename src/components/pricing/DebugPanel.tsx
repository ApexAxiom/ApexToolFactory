import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface DebugPanelProps {
  payload: unknown;
}

export function DebugPanel({ payload }: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card title={<span className="flex items-center gap-2">Pricing Debug <span className="text-xs font-normal text-slate-500">inspect calculation inputs</span></span>}>
      <div className="space-y-3">
        <Button type="button" variant="secondary" onClick={() => setOpen((prev) => !prev)}>
          {open ? 'Hide details' : 'Show details'}
        </Button>
        {open ? (
          <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}
      </div>
    </Card>
  );
}
