import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: 'Backend not configured. Set BACKEND_URL environment variable.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    // Modal URLs use subdomain-based routing
    // Modal: https://xxx--app-simulate.modal.run -> https://xxx--app-cliff.modal.run
    // Cloud Run: https://xxx/api/simulate -> https://xxx/api/cliff
    let url: string;
    if (BACKEND_URL.includes('modal.run')) {
      // Replace 'simulate' with 'cliff' in the subdomain
      url = BACKEND_URL.replace('-simulate.modal.run', '-cliff.modal.run');
    } else {
      url = `${BACKEND_URL}/api/cliff`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Backend request failed');
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate cliff analysis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
