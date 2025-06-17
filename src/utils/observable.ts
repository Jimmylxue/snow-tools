export default class Observable<T> {
  observers: ((payload: T) => void)[] = []

  subscribe(fn: (payload: T) => void) {
    this.observers.push(fn)
    return () => {
      const i = this.observers.findIndex((ob) => ob == fn)
      this.observers.splice(i, 1)
    }
  }

  notify(payload: T) {
    for (const ob of this.observers) {
      ob(payload)
    }
  }

  hasObservers() {
    return !!this.observers.length
  }

  // 只会监听一次
  onceSubscribe(fn: (payload: T) => void) {
    if (this.observers.length) {
      this.observers = []
    }
    this.observers.push(fn)
    return () => {
      const i = this.observers.findIndex((ob) => ob == fn)
      this.observers.splice(i, 1)
    }
  }
}
