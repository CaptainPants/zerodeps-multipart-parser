type AllResult<T extends readonly unknown[] | []> = {
    -readonly [P in keyof T]: Awaited<T[P]>;
};

export class PromisePolyfill<T> {
    private _state:
        | { label: "pending" }
        | { label: "resolved"; result: T }
        | { label: "rejected"; reason: unknown } = { label: "pending" };

    private _fulfilledListeners: ((result: T) => void)[] = [];
    private _rejectedListeners: ((reason?: unknown) => void)[] = [];

    constructor(
        callback: (
            resolve: (result: T | PromiseLike<T>) => void,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reject: (reason?: any) => void
        ) => void
    ) {
        try {
            callback(
                (result) => this._resolve(result),
                (reason) => this._reject(reason)
            );
        } catch (err) {
            this._reject(err);
        }
    }

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): PromisePolyfill<TResult1 | TResult2> {
        switch (this._state.label) {
            case "pending":
                return new PromisePolyfill<TResult1 | TResult2>(
                    (resolve, reject) => {
                        if (onfulfilled) {
                            this._fulfilledListeners.push((result) => {
                                processResult(
                                    () => onfulfilled(result),
                                    resolve,
                                    reject
                                );
                            });
                        }
                        if (onrejected) {
                            this._rejectedListeners.push((reason) => {
                                processResult(
                                    () => onrejected(reason),
                                    resolve,
                                    reject
                                );
                            });
                        }
                    }
                );

            case "rejected": {
                const state = this._state;
                if (onrejected) {
                    return new PromisePolyfill((resolve, reject) =>
                        later(() => {
                            processResult(
                                () => onrejected(state.reason),
                                resolve,
                                reject
                            );
                        })
                    );
                } else {
                    return PromisePolyfill.reject(state.reason);
                }
                // Potentially this could just be return this
            }

            case "resolved": {
                const state = this._state;
                if (onfulfilled) {
                    return new PromisePolyfill((resolve, reject) =>
                        later(() => {
                            processResult(
                                () => onfulfilled(state.result),
                                resolve,
                                reject
                            );
                        })
                    );
                } else {
                    // Potentially this could just be return this
                    return PromisePolyfill.resolve(
                        state.result as TResult1 | TResult2
                    );
                }
            }
        }
    }

    catch<TResult = never>(
        onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
    ): PromisePolyfill<T | TResult> {
        return this.then(undefined, onrejected);
    }

    finally(onfinally?: (() => void) | null | undefined): PromisePolyfill<T> {
        const handler = (): PromisePolyfill<T> => {
            const res = onfinally?.() as unknown;
            if (isPromiseLike(res)) {
                return new PromisePolyfill<T>((resolve, reject) => {
                    res.then(
                        // MDN says that a returned value should be ignored and the original
                        // result used. But a thrown error or returned rejected promise should
                        // be honoured
                        () => this.then(resolve, reject),
                        reject
                    );
                });
            } else {
                return this;
            }
        };

        return this.then(handler, handler);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _reject(reason?: any) {
        if (this._state.label !== "pending") return;
        this._state = {
            label: "rejected",
            reason: reason,
        };

        // TODO: this is supposed to raise a global event when there's no listeners - check MDN
        for (const listener of this._rejectedListeners) {
            listener(reason);
        }
    }

    private _resolve(result: T | PromiseLike<T>) {
        if (isPromiseLike<T>(result)) {
            result.then(
                (innerResult) => this._resolve(innerResult),
                (innerReason) => this._reject(innerReason)
            );
            return;
        }

        if (this._state.label !== "pending") return;
        this._state = {
            label: "resolved",
            result: result,
        };

        // TODO: this is supposed to raise a global event when there's no listeners - check MDN
        for (const listener of this._fulfilledListeners) {
            listener(result);
        }
    }

    public static resolve(): PromisePolyfill<void>;
    public static resolve<TResult>(
        result: TResult | PromiseLike<TResult>
    ): PromisePolyfill<TResult>;
    public static resolve<TResult>(
        result?: TResult | PromiseLike<TResult> | undefined
    ) {
        return new PromisePolyfill<TResult>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- resolve() needs to have an optional/undefined value
            resolve(result!);
        });
    }

    public static reject<T = never>(reason?: unknown) {
        return new PromisePolyfill<T>((_, reject) => {
            reject(reason);
        });
    }

    public static race<T extends readonly unknown[] | []>(
        values: T
    ): PromisePolyfill<Awaited<T[number]>> {
        return new PromisePolyfill<Awaited<T[number]>>((resolve, reject) => {
            for (const value of values) {
                if (isPromiseLike(value)) {
                    value.then(
                        (result) => resolve(result as Awaited<T[number]>),
                        (reason) => reject(reason)
                    );
                } else {
                    resolve(value as Awaited<T[number]>);
                }
            }
        });
    }

    public static all<T extends readonly unknown[] | []>(
        values: T
    ): PromisePolyfill<AllResult<T>> {
        return new PromisePolyfill((resolve, reject) => {
            const numberAwaited = values.length;
            let numberResolved = 0;
            const results: unknown[] = [];

            function resolveOne() {
                numberResolved += 1;
                if (numberResolved == numberAwaited) {
                    resolve(results as AllResult<T>);
                }
            }

            let i = 0;
            for (const value of values) {
                const capturedIndex = i;
                if (isPromiseLike(value)) {
                    value.then(
                        (result) => {
                            results[capturedIndex] = result;
                            resolveOne();
                        },
                        (reason) => {
                            reject(reason);
                        }
                    );
                } else {
                    results[i] = value;
                    resolveOne();
                }

                ++i;
            }
        });
    }
}

function isPromiseLike<T>(val: T | PromiseLike<T>): val is PromiseLike<T> {
    return val && typeof (val as { then: () => void }).then === "function";
}

function later(callback: () => void) {
    return setTimeout(callback, 0);
}

function processResult<TResult>(
    func: () => TResult | PromiseLike<TResult>,
    resolve: (result: TResult) => void,
    reject: (reason?: unknown) => void
) {
    try {
        const result = func();
        if (isPromiseLike(result)) {
            result.then(resolve, reject);
        } else {
            resolve(result);
        }
    } catch (err) {
        reject(err);
    }
}

export function polyfill_Promise(overwrite = false) {
    if (overwrite || typeof window.Promise === "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Missing allSettled implementation and 'species' symbol parameter
        window.Promise = PromisePolyfill as any;
    }
}