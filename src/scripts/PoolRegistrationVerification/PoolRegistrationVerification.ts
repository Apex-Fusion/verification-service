import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class PoolRegistrationVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

  async execute(params: any): Promise<any> {
    // Expected parameters:
    // - ticker: string (pool ticker to search for)
    // - network: string ('testnet' or 'mainnet')
    // - expectedCode: text (the expected verification_code)
    const { ticker, network, expectedCode} = params;
    if (!ticker || expectedCode === undefined || !network) {
      console.error('Missing required parameters: ticker, expectedCode, network');
      return { result: false, message: 'Missing required parameters: ticker, expectedCode, network' };
    }

    // Choose the base URL based on the network parameter.
    const baseUrl =
      network === 'mainnet'
        ? process.env.KOIOS_MAINNET_URL || 'https://beta-explorer-koios.prime.mainnet.apexfusion.org/api/v1'
        : process.env.KOIOS_TESTNET_URL || 'https://beta-explorer-koios.prime.testnet.apexfusion.org/api/v1';

    try {
      const response = await fetch(`${baseUrl}/pool_metadata`);
      if (!response.ok) {
        console.error('Failed to fetch pool metadata. Status:', response.status);
        return { result: false, message: `Failed to fetch pool metadata. Status: ${response.status}` };
      }
      const poolMetadataArray = await response.json();

      // First, try to find the pool by checking the meta_json field (if available)
      let candidate = poolMetadataArray.find(
        (pool: any) =>
          pool.pool_status === 'registered' &&
          pool.meta_json &&
          pool.meta_json.ticker === ticker
      );

      if (!candidate) {
        console.error(`Pool with ticker ${ticker} not found among registered pools.`);
        return { result: false, message: `Pool with ticker ${ticker} not found among registered pools.` };
      }

      // Now fetch the metadata from the candidate's meta_url
      let metaData;
      try {
        const metaResponse = await fetch(candidate.meta_url);
        if (!metaResponse.ok) {
          console.error(`Failed to fetch meta_url ${candidate.meta_url}. Status: ${metaResponse.status}`);
          return { result: false, message: `Failed to fetch meta_url ${candidate.meta_url}. Status: ${metaResponse.status}` };
        }
        metaData = await metaResponse.json();
      } catch (error: any) {
        console.error(`Error fetching meta_url ${candidate.meta_url}:`, error);
        return { result: false, message: `Error fetching meta_url ${candidate.meta_url}: ${error.message}` };
      }

      // Check if the fetched metadata has the verification_code property
      if (metaData.verification_code !== undefined) {
        if (metaData.verification_code === expectedCode) {
          console.log(`Pool ${ticker} has the expected verification_code ${expectedCode} in meta_url data.`);
          return true;
        } else {
          console.error(`Pool ${ticker} has verification_code ${metaData.verification_code} in meta_url data, expected ${expectedCode}.`);
          return { result: false, message: `Pool ${ticker} has verification_code ${metaData.verification_code} in meta_url data, expected ${expectedCode}.` };
        }
      }

      // If verification_code is not found in metaData, check if an extended URL is provided
      if (metaData.extended) {
        try {
          const extendedResponse = await fetch(metaData.extended);
          if (!extendedResponse.ok) {
            console.error(`Failed to fetch extended URL ${metaData.extended}. Status: ${extendedResponse.status}`);
            return { result: false, message: `Failed to fetch extended URL ${metaData.extended}. Status: ${extendedResponse.status}` };
          }
          const extendedData = await extendedResponse.json();
          if (extendedData.info.about.verification_code !== undefined) {
            if (extendedData.info.about.verification_code === expectedCode) {
              console.log(`Pool ${ticker} has the expected verification_code ${expectedCode} in extended data.`);
              return true;
            } else {
              console.error(`Pool ${ticker} has verification_code ${extendedData.verification_code} in extended data, expected ${expectedCode}.`);
              return { result: false, message: `Pool ${ticker} has verification_code ${extendedData.verification_code} in extended data, expected ${expectedCode}.` };
            }
          } else {
            console.error(`verification_code not found in extended data for pool ${ticker}.`);
            return { result: false, message: `verification_code not found in extended data for pool ${ticker}.` };
          }
        } catch (error: any) {
          console.error(`Error fetching or parsing extended data from ${metaData.extended}:`, error);
          return { result: false, message: `Error fetching or parsing extended data from ${metaData.extended}: ${error.message}` };
        }
      } else {
        console.error(`verification_code not found in meta data for pool ${ticker} and no extended URL provided.`);
        return { result: false, message: `verification_code not found in meta data for pool ${ticker} and no extended URL provided.` };
      }
    } catch (error: any) {
      console.error('Error during pool metadata verification:', error);
      return { result: false, message: `Error during pool metadata verification: ${error.message}` };
    }
  }
}