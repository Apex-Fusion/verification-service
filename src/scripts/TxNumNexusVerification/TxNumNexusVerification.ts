import { VerificationScript } from '../../interfaces/VerificationScript';
import axios from 'axios';
import manifest from './manifest.json';

const numTxNexus = async (address: string): Promise<number> => {
    const res = await axios.get('https://explorer.nexus.testnet.apexfusion.org/api', {
        params: {
            module: 'account',
            action: 'txlist',
            address: address,
            page: 1, // Start from first page
            sort: 'desc'
        }
    });

    if (!res.data.result || res.data.result.length === 0) {
        return 0;
    }

    // Filter only outgoing transfers (not contract calls)
    const outgoingTxs = res.data.result.filter((tx: { from: string; to: string; input: string; isError: string; }) =>
        tx.from.toLowerCase() === address.toLowerCase() &&  // Ensure it's sent from the address
        tx.to && tx.to !== '' &&                            // Exclude transactions without a recipient
        (!tx.input || tx.input === '0x') &&                 // Exclude contract calls
        tx.isError === '0'                                   // Exclude failed transactions
    );

    return outgoingTxs.length;
};

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