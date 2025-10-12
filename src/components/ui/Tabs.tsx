import type { PropsWithChildren, ReactNode } from 'react';
import { Button } from './Button';

export interface TabDefinition {
  id: string;
  label: ReactNode;
}

export interface TabsProps {
  tabs: TabDefinition[];
  activeId: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, activeId, onTabChange, children }: PropsWithChildren<TabsProps>) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={tab.id === activeId ? 'primary' : 'secondary'}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}
