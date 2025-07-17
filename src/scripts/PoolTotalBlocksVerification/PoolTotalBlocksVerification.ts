import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class PoolTotalBlocksVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

  async execute(params: any): Promise<any> {
    // Expected parameters:
    // - expectedTotalBlocks: number (minimum cumulative blocks produced since inception)
    // - poolBech32: string (the pool id in bech32 format)
    // - network: string ('testnet' or 'mainnet'; default is 'mainnet')
    const { expectedTotalBlocks, poolBech32, network = 'mainnet' } = params;
    if (expectedTotalBlocks === undefined || !poolBech32) {
      console.error('Missing required parameters: expectedTotalBlocks and poolBech32');
      return { result: false, message: 'Missing required parameters: expectedTotalBlocks and poolBech32' };
    }

    // Choose base URL based on network.
    const baseUrl =
      network === 'mainnet'
        ? process.env.KOIOS_MAINNET_URL || 'https://beta-explorer-koios.prime.mainnet.apexfusion.org/api/v1'
        : process.env.KOIOS_TESTNET_URL || 'https://beta-explorer-koios.prime.testnet.apexfusion.org/api/v1';

    try {
      // POST to /pool_info with the poolBech32 to retrieve cumulative block_count.
      const payload = { _pool_bech32_ids: [poolBech32] };
      const response = await fetch(`${baseUrl}/pool_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error('Failed to fetch pool info. Status:', response.status);
        return { result: false, message: `Failed to fetch pool info. Status: ${response.status}` };
      }
      const data = await response.json();
      const poolInfo = data[0];
      if (!poolInfo) {
        console.error('Pool info not found for the given pool ID');
        return { result: false, message: 'Pool info not found for the given pool ID' };
      }
      const totalBlocks = poolInfo.block_count;
      if (totalBlocks === undefined) {
        console.error('block_count not found in pool info');
        return { result: false, message: 'block_count not found in pool info' };
      }
      console.log(`Cumulative blocks produced by pool: ${totalBlocks}`);

      if (totalBlocks >= expectedTotalBlocks) {
        console.log(`Pool has produced at least the expected total blocks (${expectedTotalBlocks}).`);
        return true;
      } else {
        const message = `Pool has produced ${totalBlocks} blocks, which is less than the expected ${expectedTotalBlocks} blocks.`;
        console.error(message);
        return { result: false, message };
      }
    } catch (error: any) {
      console.error('Error during pool total blocks verification:', error);
      return { result: false, message: `Error during pool total blocks verification: ${error.message}` };
    }
  }
}