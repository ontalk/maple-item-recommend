/**
 * 메이플스토리 경매장 웹소켓 클라이언트
 * 주의: 비공식 웹소켓 엔드포인트 사용 시 넥슨 약관 위반 소지 있음
 * 공식 API가 제공되면 이 기능을 대체해야 함
 */

export type AuctionItem = {
  item_id: string;
  item_name: string;
  item_icon: string;
  item_level: number;
  item_rarity: string;
  price: number;
  quantity: number;
  seller_name?: string;
  end_time?: string;
};

export type WebSocketMessage = 
  | { type: 'subscribe'; payload: { item_ids?: string[]; categories?: string[] } }
  | { type: 'unsubscribe'; payload: { item_ids?: string[] } }
  | { type: 'search'; payload: { keyword: string; page: number; page_size: number } }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'auction_update'; payload: AuctionItem[] }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'connected'; payload: { session_id: string } }
  | { type: 'rate_limited'; payload: { retry_after: number } };

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

export interface MapleWebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class MapleWebSocketClient {
  private ws: WebSocket | null = null;
  private config: MapleWebSocketConfig;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalClose = false;

  constructor(config: MapleWebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isIntentionalClose = false;

      try {
        this.ws = new WebSocket(this.config.url);
      } catch (error) {
        reject(error);
        return;
      }

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifyConnectionChange(true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocket 메시지 파싱 실패:', error);
        }
      };

      this.ws.onerror = (event) => {
        const error = new Error('WebSocket 연결 오류');
        this.notifyError(error);
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(error);
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.notifyConnectionChange(false);
        
        if (!this.isIntentionalClose && this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'pong':
        break;
      case 'rate_limited':
        console.warn(`Rate limited. Retry after ${message.payload.retry_after}ms`);
        setTimeout(() => this.connect(), message.payload.retry_after);
        break;
      default:
        this.notifyMessage(message);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.min(this.reconnectAttempts, 5);
    
    console.log(`${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket이 연결되지 않음. 메시지 전송 실패:', message);
    }
  }

  subscribe(itemIds?: string[], categories?: string[]) {
    this.send({
      type: 'subscribe',
      payload: { item_ids: itemIds, categories },
    });
  }

  unsubscribe(itemIds?: string[]) {
    this.send({
      type: 'unsubscribe',
      payload: { item_ids: itemIds },
    });
  }

  search(keyword: string, page = 1, pageSize = 50) {
    this.send({
      type: 'search',
      payload: { keyword, page, page_size: pageSize },
    });
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private notifyMessage(message: WebSocketMessage) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Connection handler error:', error);
      }
    });
  }

  private notifyError(error: Error) {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error handler error:', e);
      }
    });
  }

  disconnect() {
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get readyState(): number | undefined {
    return this.ws?.readyState;
  }
}

let defaultClient: MapleWebSocketClient | null = null;

export function createMapleWebSocketClient(config: MapleWebSocketConfig): MapleWebSocketClient {
  return new MapleWebSocketClient(config);
}

export function getDefaultWebSocketClient(): MapleWebSocketClient | null {
  return defaultClient;
}

export function setDefaultWebSocketClient(client: MapleWebSocketClient | null) {
  defaultClient = client;
}

export const AUCTION_WS_URL = process.env.NEXT_PUBLIC_AUCTION_WS_URL || 'wss://auction.maplestory.nexon.com/ws';