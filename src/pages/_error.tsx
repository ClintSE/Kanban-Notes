import React from 'react';

export default function ErrorPage(): React.ReactElement {
  return (
    <div style={{padding: 40, fontFamily: 'Inter, system-ui, -apple-system'}}>
      <h1 style={{fontSize: 24}}>Something went wrong</h1>
      <p>We are sorry — an unexpected error occurred.</p>
    </div>
  );
}
