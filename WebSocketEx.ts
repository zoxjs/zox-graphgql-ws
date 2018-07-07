import {BasicEventTarget} from "./BasicEventTarget";

/*
Events:

* Forwarded from WebSocket:
- open
- close
- error
- message

* Special:
- start: Fired just before the first open event
- reopen: Fired just before each open event except the first
- stop: Fired just before the wanted close event
- disconnected: Fired just before each close event unless wanted
- abort: Exceeded max attempts; The close event is also triggered

Properties:

timeout: After how many ms to try to reconnect
maxAttempts:
- case > 0 : after how many attempts to quit
- case = 0 : do not attempt to reconnect
- case < 0 : attempt to reconnect infinitely

 */

export class WebSocketEx extends BasicEventTarget
{
    private ws: WebSocket;
    private hasStarted: boolean = false;
    private shouldClose: boolean;
    public timeout: number = 2000;
    public maxAttempts: number = 20;
    private attempt: number = 0;

    public get readyState(): number
    {
        return this.ws.readyState;
    }

    public get started(): boolean
    {
        return !this.hasStarted;
    }

    public get active(): boolean
    {
        return !this.shouldClose;
    }

    constructor(url: string, protocols?: string | string[])
    {
        super();
        this.connect(url, protocols);
    }

    public connect(url: string, protocols?: string | string[]): void
    {
        this.shouldClose = false;
        this.ws = new WebSocket(url, protocols);
        this.ws.addEventListener('open', e =>
        {
            if (this.hasStarted)
            {
                this.dispatchEvent(new Event('reopen', e));
            }
            else
            {
                this.dispatchEvent(new Event('start', e));
            }
            this.attempt = 0;
            this.hasStarted = true;
            this.dispatchEvent(new Event(e.type, e));
        }, false);
        this.ws.addEventListener('close', e =>
        {
            if (this.shouldClose)
            {
                this.dispatchEvent(new CloseEvent('stop', e));
            }
            else
            {
                this.dispatchEvent(new CloseEvent('disconnected', e));
                if (this.maxAttempts < 0 || this.attempt <= this.maxAttempts)
                {
                    ++this.attempt;
                    setTimeout(this.connect.bind(this, url, protocols), this.timeout);
                }
                else
                {
                    this.dispatchEvent(new CloseEvent('abort', e));
                }
            }
            this.dispatchEvent(new CloseEvent(e.type, e));
        }, false);
        this.ws.addEventListener('error', e => this.dispatchEvent(new Event(e.type, e)), false);
        this.ws.addEventListener('message', e => this.dispatchEvent(new MessageEvent(e.type, e as any)), false);
    }

    public close(code?: number, reason?: string): void
    {
        this.hasStarted = false;
        this.shouldClose = true;
        this.ws.close(code, reason);
    }

    public send(data: string | ArrayBuffer | Blob | ArrayBufferView): void
    {
        this.ws.send(data);
    }

    public sendJson(data: any): void
    {
        this.ws.send(JSON.stringify(data));
    }
}
