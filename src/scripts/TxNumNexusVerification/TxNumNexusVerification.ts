import { VerificationScript } from '../../interfaces/VerificationScript';
import axios from 'axios';
import manifest from './manifest.json';

const numTxNexus = async (address: string): Promise<number> => {
    const res = await axios.get('https://explorer.nexus.testnet.apexfusion.org/api', { params: {
        module: 'account',
        action: 'txlist',
        address: address,
        page: 0,
        sort: 'desc'
    }})

    return res.data.result.length > 0 ? res.data.result.length : 0;
}

export class TxNumNexusVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: any): Promise<boolean> {
        const { address, network, minTxThreshold } = params;
        let numTx = 0;

        switch (network) {
            case 'nexus':
                numTx = await numTxNexus(address);
                console.log(`Number of transactions for ${address} on Nexus: ${numTx}`);
                break; // Prevent falling through
            default:
                throw new Error('Unimplemented method');
        }

        return numTx > minTxThreshold;
    }
}