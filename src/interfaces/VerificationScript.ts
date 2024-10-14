export interface VerificationScript {
    name: string;
    description: string;
    execute(params: any): Promise<boolean>;
}
