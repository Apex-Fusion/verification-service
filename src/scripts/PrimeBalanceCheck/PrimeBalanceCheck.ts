import { VerificationScript } from '../../interfaces/VerificationScript';
import axios, { AxiosInstance } from 'axios';
import manifest from './manifest.json';
import { Address as CardanoAddress } from '@emurgo/cardano-serialization-lib-nodejs';

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
        try {
            CardanoAddress.from_bech32(address);
            return true;
        } catch {
            return false;
        }
    }

    private isHexString(input: string): boolean {
        const normalized = input.startsWith('0x') ? input.slice(2) : input;
        return /^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0;
    }

    private normalizeToBech32(address: string): string {
        const trimmed = address.trim();
        if (this.isHexString(trimmed)) {
            try {
                const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
                const bech = CardanoAddress.from_bytes(Buffer.from(hex, 'hex')).to_bech32();
                return bech;
            } catch {
                return trimmed;
            }
        }
        return trimmed;
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

        // Normalize potential hex address to bech32 first
        const bech32Address = this.normalizeToBech32(address);

        // Validate address format
        if (!this.validateAddress(bech32Address)) {
            return {
                result: 'error',
                message: 'Invalid address format. Provide a valid bech32 address or a hex-encoded address'
            };
        }

        // Validate network
        if (network !== 'mainnet' && network !== 'testnet') {
            return {
                result: 'error',
                message: 'Invalid network. Must be \'mainnet\' or \'testnet\''
            };
        }

        // Validate and convert minimum balance to number
        const minBalanceNum = typeof minimumBalance === 'string' ? parseInt(minimumBalance) : minimumBalance;
        if (isNaN(minBalanceNum) || minBalanceNum < 0) {
            return {
                result: 'error',
                message: 'Invalid minimum balance. Must be a positive number'
            };
        }

        const koiosService = new KoiosService(network);

        try {
            const balance = await koiosService.getAccountBalance(bech32Address);
            const hasMinimumBalance = balance >= minBalanceNum;
            
            const balanceADA = this.convertLovelaceToADA(balance);
            const minimumBalanceADA = this.convertLovelaceToADA(minBalanceNum);

            const responseData = {
                address: bech32Address,
                balance,
                minimumBalance: minBalanceNum,
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