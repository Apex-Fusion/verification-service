import { VerificationScript } from "./VerificationScript";

export interface VerificationPlugin {
    name: string;
    description: string;
    path: string,
    method: VerificationScript
}
