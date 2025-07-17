import { VerificationScript } from '../../interfaces/VerificationScript';
import { hashMessage, recoverAddress } from 'ethers';
const { COSESign1, COSEKey, Label, Int, BigNum } = require("@emurgo/cardano-message-signing-nodejs");
const { Address, PublicKey, Ed25519Signature, RewardAddress } = require("@emurgo/cardano-serialization-lib-nodejs");
import manifest from './manifest.json';

/**
 * Verifies a Prime wallet signature.
 *
 * It expects that the signed payload is exactly:
 *    "Connect:<expectedSignerAddress>"
 *
 * The signature is verified using the public key extracted from the COSEKey.
 */
const verifyPrimeAddressSignature = (
  expectedSignerAddress: string,
  sigData: any,
  isStakingAddress = false
): boolean => {
  try {
    console.log("Starting Prime verification");

    // Decode the COSESign1 signature from hex.
    const decoded = COSESign1.from_bytes(Buffer.from(sigData.signature, "hex"));
    console.log("Decoded COSESign1:", decoded);

    // Get the payload and convert it to a UTF8 string.
    const payload = decoded.payload();
    const utf8Payload = Buffer.from(payload).toString("utf8");
    console.log("Payload (UTF8):", utf8Payload);

    // Construct the expected payload.
    const expectedPayload = `Connect:${expectedSignerAddress}`;
    console.log("Expected Payload:", expectedPayload);

    // Check that the payload is as expected.
    if (utf8Payload !== expectedPayload) {
      console.log("Payload does not match expected value.");
      return false;
    }

    // Get the bytes that were signed.
    const receivedData = decoded.signed_data().to_bytes();

    // Extract the public key from the COSEKey.
    // In CIP-30 the public key is stored under the negative label -2.
    const key = COSEKey.from_bytes(Buffer.from(sigData.key, "hex"));
    console.log("Decoded COSEKey:", key);
    const pubKeyBytes = key
      .header(Label.new_int(Int.new_negative(BigNum.from_str("2"))))
      .as_bytes();
    const publicKey = PublicKey.from_bytes(pubKeyBytes);
    console.log("Extracted PublicKey:", publicKey);

    // Verify the signature.
    const signature = Ed25519Signature.from_bytes(decoded.signature());
    const isVerified = publicKey.verify(receivedData, signature);
    console.log("Signature verification result:", isVerified);

    // (Optional) If you need to check that the public key corresponds to the expected address,
    // you would derive the address from the public key. That is more involved and is not included here.

    return isVerified;
  } catch (err) {
    console.error("Error in verifyPrimeAddressSignature:", err);
    return false;
  }
};

/**
 * Verifies a Vector wallet signature.
 *
 * It expects that the signed payload is exactly:
 *    "Connect:<expectedSignerAddress>"
 *
 * The signature is verified using the public key extracted from the COSEKey.
 */
const verifyVectorAddressSignature = (
  expectedSignerAddress: string,
  sigData: any,
  isTestnet = true
): boolean => {
  try {
    console.log("Starting Vector verification");

    // Decode the COSESign1 signature from hex.
    const decoded = COSESign1.from_bytes(Buffer.from(sigData.signature, "hex"));
    console.log("Decoded COSESign1:", decoded);

    // Get the payload and convert it to a UTF8 string.
    const payload = decoded.payload();
    const utf8Payload = Buffer.from(payload).toString("utf8");
    console.log("Payload (UTF8):", utf8Payload);

    // Construct the expected payload.
    const expectedPayload = `Connect:${expectedSignerAddress}`;
    console.log("Expected Payload:", expectedPayload);

    // Check that the payload is as expected.
    if (utf8Payload !== expectedPayload) {
      console.log("Payload does not match expected value.");
      return false;
    }

    // Get the bytes that were signed.
    const receivedData = decoded.signed_data().to_bytes();

    // Extract the public key from the COSEKey.
    const key = COSEKey.from_bytes(Buffer.from(sigData.key, "hex"));
    console.log("Decoded COSEKey:", key);
    const pubKeyBytes = key
      .header(Label.new_int(Int.new_negative(BigNum.from_str("2"))))
      .as_bytes();
    const publicKey = PublicKey.from_bytes(pubKeyBytes);
    console.log("Extracted PublicKey:", publicKey);

    // Verify the signature.
    const signature = Ed25519Signature.from_bytes(decoded.signature());
    const isVerified = publicKey.verify(receivedData, signature);
    console.log("Signature verification result:", isVerified);

    return isVerified;
  } catch (err) {
    console.error("Error in verifyVectorAddressSignature:", err);
    return false;
  }
};

/**
 * Verifies a Nexus wallet signature.
 *
 * It expects the message to be "I am <address>".
 */
const verifyNexusAddressSignature = (address: string, signature: any): boolean => {
  try {
    console.log("Starting Nexus verification");
    const message = `I am ${address}`;
    const messageHex = Buffer.from(message, 'utf8').toString('hex');
    console.log("Message:", message, "MessageHex:", messageHex);
    const extractedSigner = recoverAddress(hashMessage(messageHex), signature);
    console.log("Extracted signer:", extractedSigner, "Expected address:", address);
    return extractedSigner === address;
  } catch (err) {
    console.error("Error in verifyNexusAddressSignature:", err);
    return false;
  }
};

export class WalletVerification implements VerificationScript {
  name = manifest.name;
  description = manifest.description;

  async execute(params: any): Promise<boolean> {
    const { walletAddress, network, signature, isTestnet, isStakingAddress } = params;
    console.log("Executing wallet verification with params:", params);

    switch (network) {
      case 'prime':
        console.log("Verifying Prime address signature");
        return verifyPrimeAddressSignature(walletAddress, signature, isStakingAddress);
      case 'vector':
        console.log("Verifying Vector address signature");
        return verifyVectorAddressSignature(walletAddress, signature, isTestnet);
      case 'nexus':
        console.log("Verifying Nexus address signature");
        return verifyNexusAddressSignature(walletAddress, signature);
      default:
        throw new Error(`Unrecognized network: ${network}`);
    }
  }
}