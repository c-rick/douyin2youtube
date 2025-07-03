declare module 'lowdb' {
  interface LowdbSync<T> {
    defaults(defaults: T): LowdbSync<T>
    get<K extends keyof T>(name: K): LowdbChain<T[K]>
    set<K extends keyof T>(name: K, value: T[K]): LowdbSync<T>
    write(): void
  }

  interface LowdbChain<T> {
    value(): T
    push(...items: T extends Array<infer U> ? U[] : never[]): LowdbChain<T>
    find(predicate: Partial<T extends Array<infer U> ? U : never>): LowdbChain<T extends Array<infer U> ? U : never>
    filter(predicate: (item: T extends Array<infer U> ? U : never) => boolean): LowdbChain<T>
    orderBy(iteratees: string[], orders?: Array<'asc' | 'desc'>): LowdbChain<T>
    size(): LowdbChain<number>
    remove(predicate: (item: T extends Array<infer U> ? U : never) => boolean): LowdbChain<T>
    assign(source: Partial<T extends Array<infer U> ? U : never>): LowdbChain<T>
  }

  function low<T>(adapter: any): LowdbSync<T>
  export = low
}

declare module 'lowdb/adapters/FileSync' {
  class FileSync<T> {
    constructor(filename: string)
  }
  export = FileSync
} 