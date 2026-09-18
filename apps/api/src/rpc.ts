export class NimiqRpcClient {
  private url: string;

  constructor(url?: string) {
    this.url = url || process.env.NIMIQ_RPC_URL || 'https://rpc.nimiqwatch.com';
  }

  async call<T = any>(method: string, params: any[] = [], retries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
          })
        });

        if (!res.ok) {
          throw new Error(`RPC HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as any;
        if (data.error) {
          throw new Error(`RPC Error (${data.error.code}): ${data.error.message} - ${data.error.data || ''}`);
        }

        return data.result?.data !== undefined ? data.result.data : data.result;
      } catch (err: any) {
        lastError = err;
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
    }
    throw lastError;
  }

  async getBlockNumber(): Promise<number> {
    return await this.call<number>('getBlockNumber');
  }

  async getTransactionByHash(hash: string): Promise<any> {
    return await this.call('getTransactionByHash', [hash]);
  }

  async getTransactionsByAddress(address: string, limit = 10, startHash: string | null = null): Promise<any[]> {
    return await this.call<any[]>('getTransactionsByAddress', [address, limit, startHash]);
  }

  async getAccountByAddress(address: string): Promise<any> {
    return await this.call('getAccountByAddress', [address]);
  }
}

export const rpcClient = new NimiqRpcClient();
