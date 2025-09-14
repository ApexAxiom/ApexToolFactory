import React from 'react';

interface Props {
  label: string;
  badge: number;
}

export default function EntityChip({ label, badge }: Props) {
  return (
    <div className="bg-white px-2 py-1 rounded shadow text-sm">{badge}• {label}</div>
  );
}
