'use client';

import dynamic from 'next/dynamic';

const DealerManagementClient = dynamic(() => import('./DealerManagementClient'), { 
  ssr: false,
  // You can add a loading component here if you wish
  // loading: () => <p>Loading...</p> 
});

export default function Page() {
  return <DealerManagementClient />;
}
