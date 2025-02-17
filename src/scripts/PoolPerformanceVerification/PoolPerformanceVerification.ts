import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';
export class PoolPerformanceVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

  async execute(params: any): Promise<any> {
    // Expected parameters:
    // - thresholdMissedPct: number (allowed percentage of missed blocks, e.g. 5 for 5%)
    // - minProducedBlocks: number (minimum total produced blocks required over the epochs)
    // - poolBech32: string (the pool id in bech32 format)
    // - historyEpochs: number (optional, number of past epochs to aggregate; default is 1 for current epoch only)
    // - network: string ('testnet' or 'mainnet'; default is 'mainnet')
    const { thresholdMissedPct, minProducedBlocks, poolBech32, historyEpochs = 1, network = 'mainnet' } = params;
    if (thresholdMissedPct === undefined || minProducedBlocks === undefined || !poolBech32) {
      console.error('Missing required parameters: thresholdMissedPct, minProducedBlocks, or poolBech32');
      return { result: false, message: 'Missing required parameters: thresholdMissedPct, minProducedBlocks, or poolBech32' };
    }

    // Choose the base URL based on the network parameter.
    const baseUrl =
      network === 'mainnet'
        ? process.env.KOIOS_MAINNET_URL || 'https://beta-explorer-koios.prime.mainnet.apexfusion.org/api/v1'
        : process.env.KOIOS_TESTNET_URL || 'https://beta-explorer-koios.prime.testnet.apexfusion.org/api/v1';

    try {
      // 1. Retrieve current epoch number from the /tip endpoint.
      const tipResponse = await fetch(`${baseUrl}/tip`);
      if (!tipResponse.ok) {
        console.error('Failed to fetch tip data. Status:', tipResponse.status);
        return { result: false, message: `Failed to fetch tip data. Status: ${tipResponse.status}` };
      }
      const tipData = await tipResponse.json();
      const currentEpoch = tipData[0]?.epoch_no;
      if (currentEpoch === undefined) {
        console.error('Current epoch number not found in tip data');
        return { result: false, message: 'Current epoch number not found in tip data' };
      }
      console.log(`Current Epoch: ${currentEpoch}`);

      // 2. Retrieve current pool info using /pool_info (POST) to get current sigma.
      const poolInfoPayload = { _pool_bech32_ids: [poolBech32] };
      const poolInfoResponse = await fetch(`${baseUrl}/pool_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poolInfoPayload)
      });
      if (!poolInfoResponse.ok) {
        console.error('Failed to fetch pool info. Status:', poolInfoResponse.status);
        return { result: false, message: `Failed to fetch pool info. Status: ${poolInfoResponse.status}` };
      }
      const poolInfoData = await poolInfoResponse.json();
      const poolInfo = poolInfoData[0];
      if (!poolInfo) {
        console.error('Pool info not found for the given pool ID');
        return { result: false, message: 'Pool info not found for the given pool ID' };
      }
      const currentSigma = poolInfo.sigma;
      if (currentSigma === undefined) {
        console.error('Sigma (stake fraction) not found in pool info');
        return { result: false, message: 'Sigma (stake fraction) not found in pool info' };
      }
      console.log(`Current pool sigma (stake fraction): ${currentSigma}`);

      if (historyEpochs > 1) {
        // Aggregated performance over historical epochs (excluding current epoch).
        // 3. Fetch full pool history for the pool.
        const poolHistoryResponse = await fetch(`${baseUrl}/pool_history?_pool_bech32=${poolBech32}`);
        if (!poolHistoryResponse.ok) {
          console.error('Failed to fetch pool history. Status:', poolHistoryResponse.status);
          return { result: false, message: `Failed to fetch pool history. Status: ${poolHistoryResponse.status}` };
        }
        const poolHistoryData = await poolHistoryResponse.json();
        // console.log('Pool history data:', poolHistoryData);

        // Exclude the current epoch. Aggregate over epochs from (currentEpoch - historyEpochs) to (currentEpoch - 1).
        const minEpoch = currentEpoch - historyEpochs; // e.g., if currentEpoch=54 and historyEpochs=3, minEpoch = 54 - 3 = 51.
        const relevantHistory = poolHistoryData.filter((record: any) =>
          record.epoch_no >= minEpoch && record.epoch_no < currentEpoch
        );
        if (relevantHistory.length === 0) {
          console.error(`No pool history data found for epochs ${minEpoch} to ${currentEpoch - 1}`);
          return { result: false, message: `No pool history data found for epochs ${minEpoch} to ${currentEpoch - 1}` };
        }

        let totalExpectedBlocks = 0;
        let totalProducedBlocks = 0;

        // Process each epoch record in the relevant history.
        for (const record of relevantHistory) {
          const epoch = record.epoch_no;
          // 4a. Fetch epoch info for this epoch to obtain total blocks (blk_count).
          const epochInfoResponse = await fetch(`${baseUrl}/epoch_info?_epoch_no=${epoch}`);
          if (!epochInfoResponse.ok) {
            console.error(`Failed to fetch epoch info for epoch ${epoch}. Status:`, epochInfoResponse.status);
            return { result: false, message: `Failed to fetch epoch info for epoch ${epoch}. Status: ${epochInfoResponse.status}` };
          }
          const epochInfoData = await epochInfoResponse.json();
          const epochBlkCount = epochInfoData[0]?.blk_count;
          if (epochBlkCount === undefined) {
            console.error(`blk_count not found in epoch info for epoch ${epoch}`);
            return { result: false, message: `blk_count not found in epoch info for epoch ${epoch}` };
          }
          // 4b. Calculate expected blocks for the epoch using currentSigma.
          const expectedBlocks = epochBlkCount * currentSigma;
          // 4c. Use the block_cnt from the pool_history record as the produced block count.
          const producedCount = record.block_cnt;
          console.log(`Epoch ${epoch}: blk_count=${epochBlkCount}, (using sigma=${currentSigma.toFixed(4)}), produced=${producedCount}, expected=${expectedBlocks.toFixed(2)}`);
          totalExpectedBlocks += expectedBlocks;
          totalProducedBlocks += producedCount;
        }

        const totalMissedBlocks = totalExpectedBlocks > totalProducedBlocks ? totalExpectedBlocks - totalProducedBlocks : 0;
        const overallMissedPercentage = totalExpectedBlocks > 0 ? (totalMissedBlocks / totalExpectedBlocks) * 100 : 0;
        console.log(`Aggregated over epochs ${minEpoch}-${currentEpoch - 1}: Expected blocks=${totalExpectedBlocks.toFixed(2)}, Produced blocks=${totalProducedBlocks}, Missed blocks=${totalMissedBlocks.toFixed(2)} (${overallMissedPercentage.toFixed(2)}% missed)`);

        if (overallMissedPercentage <= thresholdMissedPct && totalProducedBlocks >= minProducedBlocks) {
          console.log(`Aggregated pool performance is acceptable.`);
          return true;
        } else {
          const message = `Aggregated pool performance not acceptable: missed ${overallMissedPercentage.toFixed(2)}% (allowed: ${thresholdMissedPct}%) or produced blocks ${totalProducedBlocks} is less than minimum required ${minProducedBlocks}.`;
          console.error(message);
          return { result: false, message };
        }
      } else {
        // If historyEpochs is 1, check only the current epoch.
        // 3b. Fetch produced blocks for the current epoch via /pool_blocks.
        const poolBlocksResponse = await fetch(`${baseUrl}/pool_blocks?_pool_bech32=${poolBech32}&_epoch_no=${currentEpoch}`);
        if (!poolBlocksResponse.ok) {
          console.error(`Failed to fetch pool blocks for epoch ${currentEpoch}. Status:`, poolBlocksResponse.status);
          return { result: false, message: `Failed to fetch pool blocks for epoch ${currentEpoch}. Status: ${poolBlocksResponse.status}` };
        }
        const poolBlocksData = await poolBlocksResponse.json();
        const producedBlocks = Array.isArray(poolBlocksData) ? poolBlocksData.length : 0;
        console.log(`Blocks produced by pool in current epoch (via /pool_blocks): ${producedBlocks}`);

        // 3c. Fetch epoch info for the current epoch.
        const epochInfoResponse = await fetch(`${baseUrl}/epoch_info?_epoch_no=${currentEpoch}`);
        if (!epochInfoResponse.ok) {
          console.error('Failed to fetch epoch info. Status:', epochInfoResponse.status);
          return { result: false, message: `Failed to fetch epoch info. Status: ${epochInfoResponse.status}` };
        }
        const epochInfoData = await epochInfoResponse.json();
        const totalEpochBlocks = epochInfoData[0]?.blk_count;
        if (totalEpochBlocks === undefined) {
          console.error('blk_count not found in epoch info');
          return { result: false, message: 'blk_count not found in epoch info' };
        }
        console.log(`Total blocks in current epoch (blk_count): ${totalEpochBlocks}`);

        // Calculate expected blocks for the current epoch using currentSigma.
        const expectedBlocks = totalEpochBlocks * currentSigma;
        console.log(`Expected blocks for pool in current epoch: ${expectedBlocks.toFixed(2)}`);

        const missedBlocks = expectedBlocks > producedBlocks ? expectedBlocks - producedBlocks : 0;
        const missedPercentage = expectedBlocks > 0 ? (missedBlocks / expectedBlocks) * 100 : 0;
        console.log(`Missed blocks: ${missedBlocks.toFixed(2)} (${missedPercentage.toFixed(2)}% of expected)`);

        if (missedPercentage <= thresholdMissedPct && producedBlocks >= minProducedBlocks) {
          console.log(`Pool performance is acceptable.`);
          return true;
        } else {
          const message = `Pool performance not acceptable: missed ${missedPercentage.toFixed(2)}% (allowed: ${thresholdMissedPct}%) or produced blocks ${producedBlocks} is less than minimum required ${minProducedBlocks}.`;
          console.error(message);
          return { result: false, message };
        }
      }
    } catch (error: any) {
      console.error('Error during pool performance verification:', error);
      return { result: false, message: `Error during pool performance verification: ${error.message}` };
    }
  }
}