// @see https://javascript.info/mixins

type EventCallback = (args: any) => boolean;
type GlobalEventCallback = (_self: any, args: any) => boolean;

class EventMixin {
    private _eventHandlers: { [key: string]: EventCallback[] };

    /**
     * Subscribe to event, usage:
     *  menu.on('select', function(item) { ... }
     */
    public on(eventName: string, handler: EventCallback): void {
        if (!this._eventHandlers) this._eventHandlers = {};
        if (!this._eventHandlers[eventName]) {
            this._eventHandlers[eventName] = [];
        }
        this._eventHandlers[eventName].push(handler);
    }

    /**
     * Cancel the subscription, usage:
     *  menu.off('select', handler)
     */
    public off(eventName: string, handler: EventCallback): void {
        let handlers = this._eventHandlers?.[eventName];
        if (!handlers) return;
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i] === handler) {
                handlers.splice(i--, 1);
            }
        }
    }

    static _globalEventHandlers: { [key: string]: { [key: string]: GlobalEventCallback[] } } = {};

    /**
     * Subscribe to event, usage:
     *  menu.on('select', function(item) { ... }
     */
    static register(eventName: string, handler: GlobalEventCallback): void {
        if (!this._globalEventHandlers[this.name]) {
            this._globalEventHandlers[this.name] = {};
        }
        if (!this._globalEventHandlers[this.name][eventName]) {
            this._globalEventHandlers[this.name][eventName] = [];
        }
        this._globalEventHandlers[this.name][eventName].push(handler);
    }

    /**
     * Cancel the subscription, usage:
     *  menu.off('select', handler)
     */
    static deregister(eventName: string, handler: GlobalEventCallback): void {
        let handlers = this._globalEventHandlers[this.constructor.name]?.[eventName];
        if (!handlers) return;
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i] === handler) {
                handlers.splice(i--, 1);
            }
        }
    }

    /**
     * Generate an event with the given name and data
     *  this.trigger('select', data1, data2);
     */
    public trigger(eventName: string, ...args: any): boolean {
        if (this._eventHandlers && this._eventHandlers[eventName]) {
            // call the handlers, breaks of a handler returns false
            const canceled = this._eventHandlers[eventName].every(handler => handler.apply(this, args) !== false);
            if (!canceled) return canceled;
        }
        let handlers = (<typeof EventMixin><unknown>this.constructor)._globalEventHandlers;
        if (handlers) {
            let clazz = this.constructor;
            do {
                if (handlers[clazz.name] && handlers[clazz.name][eventName]) {
                    // call the handlers, breaks of a handler returns false
                    const proceed = handlers[clazz.name][eventName].every(handler => handler(this, args) !== false);
                    if (!proceed) {
                        return false;
                    }
                }
                clazz = Object.getPrototypeOf(clazz);
            } while (clazz !== null)
        }

        return true; // no handlers for that event name
    }
}

export default EventMixin;