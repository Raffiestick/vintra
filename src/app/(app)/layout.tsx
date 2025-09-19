import React from "react";

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '5px solid red' }}>
      <header style={{
        backgroundColor: 'red',
        color: 'white',
        padding: '1rem',
        textAlign: 'center',
        fontSize: '1.5rem',
        fontWeight: 'bold',
      }}>
        -- THIS IS A TEST HEADER FROM THE (APP) LAYOUT --
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}