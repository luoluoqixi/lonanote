import { BrowserLocalStorage, BrowserSessionStorage } from './storage';

export * from './storage';

const globalLocalStorage = new BrowserLocalStorage();
const globalSessionStorage = new BrowserSessionStorage();

export { globalLocalStorage, globalSessionStorage };
