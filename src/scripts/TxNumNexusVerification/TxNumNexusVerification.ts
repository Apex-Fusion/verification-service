import { VerificationScript } from '../../interfaces/VerificationScript';
import axios from 'axios';

const numTxNexus = async (address: string): Promise<number> => {
    const res = await axios.get('https://explorer.nexus.testnet.apexfusion.org/api', { params: {
        module: 'account',
        action: 'txlist',
        address: address,
        page: 0,
        sort: 'desc'
    }})

    const result = res.data;

    return result > 0 ?
        result[0].nonce
        :
        0
}

export class TxNumNexusVerification implements VerificationScript {
    name = 'TxNumNexusVerification';
    description = 'Verifies if a user has created more than `minTxThreshold` transactions on a given network';

    async execute(params: any): Promise<boolean> {
        const { address, network, minTxThreshold } = params;
        let numTx = 0;

        switch (network) {
            case 'nexus': 
                numTx = await numTxNexus(address);
            default:
                throw new Error('Unimplemented method')
        }

        return numTx > minTxThreshold;
    }
}
