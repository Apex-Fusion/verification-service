import { VerificationScript } from '../../interfaces/VerificationScript';
import { ethers, hashMessage } from 'ethers';
const { COSESign1, COSEKey, Label, Int, BigNum } = require("@emurgo/cardano-message-signing-nodejs");
const { Address, PublicKey, Ed25519Signature, RewardAddress } = require("@emurgo/cardano-serialization-lib-nodejs");

const verifyPrimeAddressSignature = (expectedSignerAddress: string, sigData: any, isStakingAddress = false) => {
    try {
        // Decode signature
        const decoded = COSESign1.from_bytes( Buffer.from(sigData.signature, "hex") );
        const headermap = decoded.headers().protected().deserialized_headers();
        const addressHex = Buffer.from( headermap.header( Label.new_text("address") ).to_bytes() )
            .toString("hex")
            .substring(4);

        // Extracted address from signature
        let address = Address.from_bytes( Buffer.from(addressHex, "hex") );
        
        if (isStakingAddress) {
            address = RewardAddress.from_address(address).to_address()
        }

        const key = COSEKey.from_bytes( Buffer.from(sigData.key, "hex") );
        const pubKeyBytes = key.header( Label.new_int( Int.new_negative(BigNum.from_str("2")) ) ).as_bytes();
        const publicKey = PublicKey.from_bytes(pubKeyBytes);

        const payload = decoded.payload();
        const signature = Ed25519Signature.from_bytes(decoded.signature());
        const receivedData = decoded.signed_data().to_bytes();

        const signerAddrBech32 = address.to_bech32();
        const isAddressCorrect = signerAddrBech32 === expectedSignerAddress;

        const utf8Payload = Buffer.from(payload).toString("utf8");
        const expectedPayload = `I am ${expectedSignerAddress}`; // reconstructed message

        // verify:
        const isVerified = publicKey.verify(receivedData, signature);
        const payloadAsExpected = utf8Payload == expectedPayload;
        return isVerified && payloadAsExpected && isAddressCorrect;    
    } catch (err) {
        console.log(err);
        return false
    }
}

const verifyVectorAddressSignature = (expectedSignerAddress: string, sigData: any, isTestnet=true) => {
    try {
        // Decode signature
        const decoded = COSESign1.from_bytes( Buffer.from(sigData.signature, "hex") );
        
        const headermap = decoded.headers().protected().deserialized_headers();
        
        const addressHex = Buffer.from( headermap.header( Label.new_text("address") ).to_bytes() )
            .toString("hex")
            .substring(4);

        // Extracted address from signature
       
        const address = Address.from_bytes( Buffer.from(addressHex, "hex") );

        const key = COSEKey.from_bytes( Buffer.from(sigData.key, "hex") );
        const pubKeyBytes = key.header( Label.new_int( Int.new_negative(BigNum.from_str("2")) ) ).as_bytes();
        const publicKey = PublicKey.from_bytes(pubKeyBytes);

        const payload = decoded.payload();
        const signature = Ed25519Signature.from_bytes(decoded.signature());
        const receivedData = decoded.signed_data().to_bytes();

        const signerAddrBech32 = address.to_bech32(`vector${isTestnet ? '_test' : ''}`);
        const isAddressCorrect = signerAddrBech32 === expectedSignerAddress;

        const utf8Payload = Buffer.from(payload).toString("utf8");
        const expectedPayload = `I am ${expectedSignerAddress}`; // reconstructed message

        // verify:
        const isVerified = publicKey.verify(receivedData, signature);
        const payloadAsExpected = utf8Payload == expectedPayload;
        return isVerified && payloadAsExpected && isAddressCorrect;    
    } catch (err) {
        console.log(err);
        return false
    }
}

const verifyNexusAddressSignature = (address: string, signature: any) => {
    const message = `I am ${address}`;
    const messageHex = Buffer.from(message, 'utf8').toString('hex');

    const extractedSigner = ethers.recoverAddress(hashMessage(messageHex), signature);
    return extractedSigner === address;
}

export class WalletVerification implements VerificationScript {
    name = 'WalletVerification';
    description = 'Verifies if a user owns a wallet on a given network';

    async execute(params: any): Promise<boolean> {
        const { walletAddress, network, signature, isTestnet, isStakingAddress } = params;

        switch(network) {
            case 'prime':
                return verifyPrimeAddressSignature (walletAddress, signature, isStakingAddress);
            case 'vector':
                return verifyVectorAddressSignature(walletAddress, signature, isTestnet);
            case 'nexus':
                return verifyNexusAddressSignature(walletAddress, signature);
            default:
                throw new Error(`Unrecognized network: ${network}`);
        }
    }
}
