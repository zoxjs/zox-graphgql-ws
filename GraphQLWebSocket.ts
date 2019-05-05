import {WebSocketEx} from "./WebSocketEx";

export type GenericVars = {[key:string]: any}

export type RequestOptions<T = GenericVars> = {
    query?: string
    id?: string
    op?: string
    vars?: T
}

export type RequestOptionsExact<T = GenericVars> = (
    {query: string} |
    {id: string}
    ) & {
    op?: string
    vars?: T
}

export type GraphQLError = {
    message: string
    locations?: Array<{
        line: number
        column: number
    }>
    path?: Array<string>
}

export type GraphQLMessage<T = any> = {
    data?: T
    errors?: Array<GraphQLError>
}
export type MessageHandler<T = any> = (message: GraphQLMessage<T>) => void
export type DisconnectHandler = (e: CloseEvent) => void

type ActiveOperation = {
    id: number
    args: RequestOptions
    handler: MessageHandler
    onDisconnected?: DisconnectHandler
}

type EventData = {
    value: any
    done: boolean
    id: number
}

export class GraphQLWebSocket
{
    private ws: WebSocketEx;
    private readonly uri: string;
    private readonly autoReconnect: boolean;
    private next: number = 0;
    private readonly subs: Array<ActiveOperation> = [];
    private readonly queries: Array<ActiveOperation> = [];

    constructor(uri?: string, autoReconnect?: boolean)
    {
        this.autoReconnect = autoReconnect === undefined ? true : autoReconnect;
        this.uri = uri || `ws://${location.host}/graphql`;
        this.ws = new WebSocketEx(this.uri);
        this.ws.addEventListener('message', this.handleMessage.bind(this));
        this.ws.addEventListener('reopen', () =>
        {
            for (const sub of this.subs)
            {
                if (sub.args.id)
                {
                    this.ws.send(JSON.stringify({ type: 'subId', query: sub.args.id, id: sub.id }));
                }
                else
                {
                    this.ws.send(JSON.stringify({ type: 'sub', query: sub.args.query, id: sub.id }));
                }
            }
        });
        this.ws.addEventListener('close', (e: CloseEvent) =>
        {
            for (const sub of this.subs)
            {
                if (sub.onDisconnected)
                {
                    sub.onDisconnected(e);
                }
            }
            for (const query of this.queries)
            {
                if (query.onDisconnected)
                {
                    query.onDisconnected(e);
                }
            }
            this.queries.length = 0;
        });
    }

    public get promiseOnOpen(): Promise<Event>
    {
        if (this.ws.readyState === WebSocket.OPEN)
        {
            return Promise.resolve(undefined);
        }
        if (!this.ws.active)
        {
            return Promise.reject('Error: Socket is closed');
        }
        return new Promise(resolve =>
        {
            this.ws.addEventListener('open', resolve);
        });
    }

    public get readyState(): number
    {
        return this.ws.readyState;
    }

    public close(): void
    {
        this.ws.close();
        this.subs.length = 0;
    }

    private handleMessage(e: WebSocketEventMap['message']): void
    {
        const data: EventData = JSON.parse(e.data);
        if (data.done)
        {
            this.unsubscribe(data.id, true);
            return;
        }
        let found = false;
        for (let i = 0; i < this.subs.length; ++i)
        {
            if (this.subs[i].id === data.id)
            {
                this.subs[i].handler(data.value);
                found = true;
                break;
            }
        }
        if (!found)
        {
            for (let i = 0; i < this.queries.length; ++i)
            {
                if (this.queries[i].id === data.id)
                {
                    this.queries[i].handler(data.value);
                    this.queries.splice(i, 1);
                    found = true;
                    break;
                }
            }
        }
        if (!found)
        {
            console.log('Invalid subscription id:', data.id);
        }
    }

    public subscribe<TVars = GenericVars, TData = any>(
        args: RequestOptionsExact<TVars>,
        handler: MessageHandler<TData>,
        onDisconnected?: DisconnectHandler
    ): number | void
    {
        if (typeof (args as RequestOptions).id === 'string')
        {
            const id = this.next++;
            this.ws.sendJson({
                type: 'subId',
                query: (args as RequestOptions).id,
                operation: args.op,
                variables: args.vars,
                id
            });
            this.subs.push({ id, handler, args, onDisconnected });
            return id;
        }
        else if (typeof (args as RequestOptions).query === 'string')
        {
            const id = this.next++;
            this.ws.sendJson({
                type: 'sub',
                query: (args as RequestOptions).query,
                operation: args.op,
                variables: args.vars,
                id
            });
            this.subs.push({ id, handler, args, onDisconnected });
            return id;
        }
        else
        {
            console.warn('Invalid subscription args', args);
        }
    }

    public unsubscribe(id: number, isFromMessage: boolean = false): void
    {
        let found = false;
        for (let i = 0; i < this.subs.length; ++i)
        {
            if (this.subs[i].id === id)
            {
                this.subs.splice(i, 1);
                this.ws.sendJson({ type: 'subCancel', id });
                found = true;
                break;
            }
        }
        if (!found && !isFromMessage)
        {
            console.log('Invalid subscription id:', id);
        }
    }

    public query<TVars = GenericVars, TData = any>(
        args: RequestOptionsExact<TVars>,
        handler: MessageHandler<TData>,
        onDisconnected?: DisconnectHandler
    ): void
    {
        if (typeof (args as RequestOptions).id === 'string')
        {
            const id = this.next++;
            this.ws.sendJson({
                type: 'queryId',
                query: (args as RequestOptions).id,
                operation: args.op,
                variables: args.vars,
                id
            });
            this.queries.push({ id, handler, args, onDisconnected });
        }
        else if (typeof (args as RequestOptions).query === 'string')
        {
            const id = this.next++;
            this.ws.sendJson({
                type: 'query',
                query: (args as RequestOptions).query,
                operation: args.op,
                variables: args.vars,
                id
            });
            this.queries.push({ id, handler, args, onDisconnected });
        }
        else
        {
            console.warn('Invalid query args', args);
        }
    }

    public queryAsync<TVars = GenericVars, TData = any>(args: RequestOptionsExact<TVars>): Promise<GraphQLMessage<TData>>
    {
        return new Promise<any>((resolve, reject) =>
        {
            this.query(args, resolve, reject);
        });
    }
}
