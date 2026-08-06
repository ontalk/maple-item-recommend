'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuctionItem, WebSocketMessage, MapleWebSocketConfig } from '@/lib/maple-websocket';
import { createMapleWebSocketClient, AUCTION_WS_URL } from '@/lib/maple-websocket';

export interface UseAuctionWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onAuctionUpdate?: (items: AuctionItem[]) => void;
  onError?: (error: Error) => void;
}

export interface UseAuctionWebSocketReturn {
  isConnected: boolean;
  connecting: boolean;
  lastItems: AuctionItem[];
  connect: () => Promise<void>;
  disconnect: () => void;
  search: (keyword: string, page?: number, pageSize?: number) => void;
  subscribe: (itemIds?: string[], categories?: string[]) => void;
  unsubscribe: (itemIds?: string[]) => void;
  error: Error | null;
}

export function useAuctionWebSocket(
  options: UseAuctionWebSocketOptions = {}
): UseAuctionWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_AUCTION_WS_URL || AUCTION_WS_URL,
    autoConnect = false,
    onAuctionUpdate,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastItems, setLastItems] = useState<AuctionItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  const clientRef = useRef<ReturnType<typeof createMapleWebSocketClient> | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
  }, []);

  const connect = useCallback(async () => {
    if (clientRef.current?.isConnected || connecting) return;

    setConnecting(true);
    setError(null);

    const client = createMapleWebSocketClient({ url });
    clientRef.current = client;

    try {
      await client.connect();
      
      const unsubConnection = client.onConnectionChange((connected) => {
        setIsConnected(connected);
        setConnecting(false);
        if (!connected) {
          setError(new Error('연결이 끊어졌습니다'));
        }
      });
      cleanupRef.current.push(unsubConnection);

      const unsubError = client.onError((err) => {
        setError(err);
        onError?.(err);
      });
      cleanupRef.current.push(unsubError);

      const unsubMessage = client.onMessage((message) => {
        if (message.type === 'auction_update') {
          const items = message.payload;
          setLastItems(items);
          onAuctionUpdate?.(items);
        }
      });
      cleanupRef.current.push(unsubMessage);

    } catch (err) {
      setConnecting(false);
      const error = err instanceof Error ? err : new Error('연결 실패');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [url, connecting, onAuctionUpdate, onError]);

  const disconnect = useCallback(() => {
    cleanup();
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setConnecting(false);
  }, [cleanup]);

  const search = useCallback((keyword: string, page = 1, pageSize = 50) => {
    clientRef.current?.search(keyword, page, pageSize);
  }, []);

  const subscribe = useCallback((itemIds?: string[], categories?: string[]) => {
    clientRef.current?.subscribe(itemIds, categories);
  }, []);

  const unsubscribe = useCallback((itemIds?: string[]) => {
    clientRef.current?.unsubscribe(itemIds);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect().catch(() => {});
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connecting,
    lastItems,
    connect,
    disconnect,
    search,
    subscribe,
    unsubscribe,
    error,
  };
}