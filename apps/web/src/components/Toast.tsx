import React from 'react';

export default function Toast({ message }: { message: string }) {
  return <div role="status" className="fixed top-2 right-2 bg-black text-white p-2">{message}</div>;
}
