import { VerificationScript } from '../../interfaces/VerificationScript';
import axios, { AxiosInstance } from 'axios';
import manifest from './manifest.json';

class KoiosService {
    private client: AxiosInstance;

    constructor(network: string = 'mainnet') {
        const baseURL = network === 'mainnet'
            ? process.env.KOIOS_MAINNET_URL || 'https://beta-explorer-koios.prime.mainnet.apexfusion.org/api/v1'
            : process.env.KOIOS_TESTNET_URL || 'https://beta-explorer-koios.prime.testnet.apexfusion.org/api/v1';

        this.client = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async getStakeAddress(paymentAddress: string): Promise<string | null> {
        try {
            const response = await this.client.get('/address_info', {
                params: { _address: paymentAddress }
            });

            if (response.data && response.data.length > 0 && response.data[0].stake_address) {
                return response.data[0].stake_address;
            }
            return null;
        } catch (error) {
            console.error('Error fetching stake address:', error);
            throw new Error(`Failed to fetch stake address for ${paymentAddress}`);
        }
    }

    async isDelegated(stakeAddress: string): Promise<boolean> {
        try {
            const response = await this.client.get('/account_info', {
                params: { _stake_address: stakeAddress }
            });

            return !!(response.data?.[0]?.delegated_pool);
        } catch (error) {
            console.error('Error checking delegation status:', error);
            throw new Error(`Failed to check delegation status for ${stakeAddress}`);
        }
    }
}

export class PrimeDelegationCheck implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: any): Promise<boolean> {
        const { address, network = 'mainnet' } = params;

        if (!address) {
            throw new Error('Address parameter is required');
        }

        const koiosService = new KoiosService(network);

        try {
            const stakeAddress = await koiosService.getStakeAddress(address);
            if (!stakeAddress) {
                console.log(`No stake address found for payment address: ${address}`);
                return false;
            }

            const delegated = await koiosService.isDelegated(stakeAddress);
            console.log(`Address ${address} (stake: ${stakeAddress}) is ${delegated ? '' : 'not '}delegated`);
            return delegated;
        } catch (error) {
            console.error('Verification failed:', error);
            throw error;
        }
    }
} 