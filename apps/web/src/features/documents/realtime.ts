type Message = { type: string; room?: string; [key: string]: any };
class Realtime {
  socket: WebSocket | null = null;
  private listeners = new Set<(message: Message) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private refs = 0;
  private retry = 0;
  private sessionExpired = false;

  retain() {
    if (++this.refs === 1) {
      this.retry = 0;
      this.sessionExpired = false;
      window.addEventListener("offline", this.offline);
      window.addEventListener("online", this.online);
      this.connect();
    }
    return () => {
      if (--this.refs === 0) {
        clearTimeout(this.timer);
        this.closeSocket();
        window.removeEventListener("offline", this.offline);
        window.removeEventListener("online", this.online);
      }
    };
  }
  subscribe(fn: (message: Message) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit(m: Message) {
    this.listeners.forEach((fn) => fn(m));
  }
  get connected() {
    return navigator.onLine && this.socket?.readyState === WebSocket.OPEN;
  }
  send(m: Message) {
    if (!this.connected) return false;
    this.socket!.send(JSON.stringify(m));
    return true;
  }
  private closeSocket() {
    const ws = this.socket;
    this.socket = null;
    ws?.close();
  }
  private offline = () => {
    clearTimeout(this.timer);
    if (!this.socket) return;
    this.closeSocket();
    this.emit({ type: "disconnected" });
  };
  private online = () => {
    clearTimeout(this.timer);
    this.retry = 0;
    this.connect();
  };
  private connect() {
    if (!this.refs || this.socket || this.sessionExpired || !navigator.onLine)
      return;
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/v1/ws`,
    );
    this.socket = ws;
    ws.onmessage = (e) => {
      if (this.socket !== ws) return;
      try {
        const m = JSON.parse(e.data);
        if (m.type === "ready") {
          this.retry = 0;
          this.emit({ type: "connected" });
        } else this.emit(m);
      } catch {
        this.emit({ type: "connection.error" });
      }
    };
    ws.onclose = (e) => {
      if (this.socket !== ws) return;
      this.socket = null;
      this.sessionExpired = e.code === 4401;
      this.emit({ type: "disconnected", code: e.code });
      if (this.sessionExpired) {
        window.dispatchEvent(new Event("session-expired"));
        return;
      }
      if (this.refs && navigator.onLine && !this.socket)
        this.timer = setTimeout(
          () => this.connect(),
          Math.min(15000, 1000 * 2 ** this.retry++) + Math.random() * 300,
        );
    };
    ws.onerror = () => ws.close();
  }
}
export const realtime = new Realtime();
export const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
export const fromBase64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
