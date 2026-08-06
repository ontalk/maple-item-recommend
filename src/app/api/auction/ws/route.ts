import { createMapleWebSocketClient, AUCTION_WS_URL } from '@/lib/maple-websocket';
import { NextRequest, NextResponse } from 'next/server';

let wsClient: ReturnType<typeof createMapleWebSocketClient> | null = null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'connect') {
    if (wsClient?.isConnected) {
      return NextResponse.json({ status: 'already_connected' });
    }

    const url = process.env.NEXT_PUBLIC_AUCTION_WS_URL || AUCTION_WS_URL;
    
    wsClient = createMapleWebSocketClient({ url });

    try {
      await wsClient.connect();
      
      wsClient.onConnectionChange((connected) => {
        console.log('WebSocket connection changed:', connected);
      });

      wsClient.onError((error) => {
        console.error('WebSocket error:', error);
      });

      return NextResponse.json({ status: 'connected' });
    } catch (error) {
      return NextResponse.json(
        { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  if (action === 'disconnect') {
    wsClient?.disconnect();
    wsClient = null;
    return NextResponse.json({ status: 'disconnected' });
  }

  if (action === 'status') {
    return NextResponse.json({ 
      connected: wsClient?.isConnected ?? false,
      readyState: wsClient?.readyState 
    });
  }

  if (action === 'search') {
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    
    if (!wsClient?.isConnected) {
      return NextResponse.json(
        { status: 'error', message: 'Not connected' },
        { status: 400 }
      );
    }

    wsClient.search(keyword, page, pageSize);
    return NextResponse.json({ status: 'search_sent' });
  }

  if (action === 'subscribe') {
    const itemIds = searchParams.get('itemIds')?.split(',').filter(Boolean) || [];
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    
    if (!wsClient?.isConnected) {
      return NextResponse.json(
        { status: 'error', message: 'Not connected' },
        { status: 400 }
      );
    }

    wsClient.subscribe(itemIds, categories);
    return NextResponse.json({ status: 'subscribed' });
  }

  return NextResponse.json(
    { status: 'error', message: 'Invalid action' },
    { status: 400 }
  );
}