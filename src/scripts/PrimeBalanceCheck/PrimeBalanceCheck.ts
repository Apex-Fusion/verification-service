import { VerificationScript } from '../../interfaces/VerificationScript';
import axios, { AxiosInstance } from 'axios';
import manifest from './manifest.json';

interface BalanceResult {
    result: string;
    data?: {
        address: string;
        balance: number;
        minimumBalance: number;
        balanceADA: number;
        minimumBalanceADA: number;
        hasMinimumBalance: boolean;
        network: string;
    };
    message: string;
}

class KoiosService {
    private client: AxiosInstance;

    constructor(network: string = 'mainnet') {
        const baseURL = network === 'mainnet'
            ? process.env.KOIOS_MAINNET_URL || 'https://beta-explorer-koios.prime.mainnet.apexfusion.org/api/v1'
            : process.env.KOIOS_TESTNET_URL || 'https://beta-explorer-koios.prime.testnet.apexfusion.org/api/v1';

        this.client = axios.create({
            baseURL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async getAccountBalance(address: string): Promise<number> {
        try {
            console.log(`Fetching balance for address: ${address}`);
            const response = await this.client.post('/address_info', {
                _addresses: [address]
            });

            if (response.data && response.data.length > 0 && response.data[0]) {
                const balance = parseInt(response.data[0].balance || '0');
                console.log(`Balance found: ${balance} lovelace`);
                return balance;
            }
            
            console.log('No balance data found, returning 0');
            return 0;
        } catch (error) {
            console.error('Error fetching account balance:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    // Address not found, return 0 balance
                    console.log('Address not found, returning 0 balance');
                    return 0;
                }
                throw new Error(`Koios API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw new Error(`Failed to retrieve balance from Prime blockchain API: ${error}`);
        }
    }
}

export class PrimeBalanceCheck implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    private validateAddress(address: string): boolean {
        // Prime addresses should start with 'addr1'
        return address.startsWith('addr1');
    }

    private convertLovelaceToADA(lovelace: number): number {
        return lovelace / 1000000;
    }

    async execute(params: any): Promise<BalanceResult> {
        const { 
            address, 
            minimumBalance = 1000000, 
            network = 'mainnet' 
        } = params;

        // Validate required parameters
        if (!address) {
            return {
                result: 'error',
                message: 'Address parameter is required'
            };
        }

        // Validate address format
        if (!this.validateAddress(address)) {
            return {
                result: 'error',
                message: 'Invalid Prime address format. Address must start with \'addr1\''
            };
        }

        // Validate network
        if (network !== 'mainnet' && network !== 'testnet') {
            return {
                result: 'error',
                message: 'Invalid network. Must be \'mainnet\' or \'testnet\''
            };
        }

        // Validate minimum balance
        if (typeof minimumBalance !== 'number' || minimumBalance < 0) {
            return {
                result: 'error',
                message: 'Invalid minimum balance. Must be a positive number'
            };
        }

        const koiosService = new KoiosService(network);

        try {
            const balance = await koiosService.getAccountBalance(address);
            const hasMinimumBalance = balance >= minimumBalance;
            
            const balanceADA = this.convertLovelaceToADA(balance);
            const minimumBalanceADA = this.convertLovelaceToADA(minimumBalance);

            const responseData = {
                address,
                balance,
                minimumBalance,
                balanceADA: Math.round(balanceADA * 1000000) / 1000000, // Round to 6 decimal places
                minimumBalanceADA: Math.round(minimumBalanceADA * 1000000) / 1000000,
                hasMinimumBalance,
                network
            };

            if (hasMinimumBalance) {
                return {
                    result: 'success',
                    data: responseData,
                    message: `Address has sufficient balance: ${balanceADA.toFixed(1)} ADA (minimum required: ${minimumBalanceADA.toFixed(1)} ADA)`
                };
            } else {
                return {
                    result: 'error',
                    data: responseData,
                    message: `Address has insufficient balance: ${balanceADA.toFixed(1)} ADA (minimum required: ${minimumBalanceADA.toFixed(1)} ADA)`
                };
            }
        } catch (error) {
            console.error('Balance verification failed:', error);
            const err = error as Error;
            return {
                result: 'error',
                message: err.message
            };
        }
    }
} 