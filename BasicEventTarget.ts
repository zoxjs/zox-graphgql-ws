
export class BasicEventTarget implements EventTarget
{
    private listeners = {};

    public addEventListener(type: string, callback)
    {
        if (!(type in this.listeners))
        {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    }

    public removeEventListener(type: string, callback)
    {
        if (!(type in this.listeners))
        {
            return;
        }
        const stack = this.listeners[type];
        for (let i = 0, l = stack.length; i < l; i++)
        {
            if (stack[i] === callback)
            {
                stack.splice(i, 1);
                return;
            }
        }
    }

    public dispatchEvent(event: Event): boolean
    {
        if (!(event.type in this.listeners))
        {
            return true;
        }
        const stack = this.listeners[event.type].slice();
        for (let i = 0, l = stack.length; i < l; i++)
        {
            stack[i].call(this, event);
        }
        return !event.defaultPrevented;
    }
}
