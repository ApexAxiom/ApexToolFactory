import React from 'react';

export default function AskBar() {
  return (
    <form className="fixed bottom-0 w-full p-2 bg-white shadow">
      <input
        aria-label="Ask"
        className="w-full border p-2"
        placeholder="Ask..."
      />
    </form>
  );
}
