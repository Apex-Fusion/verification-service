import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class TwitterFollowVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: { bearerToken: string; apexTwitterId: string; userTwitterId: string }): Promise<boolean> {
        const { bearerToken, apexTwitterId, userTwitterId } = params;

        const url = `https://api.twitter.com/2/users/${userTwitterId}/following/${apexTwitterId}`;
        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${bearerToken}` },
            });
            return response.status === 200;
        } catch (error : any) {
            console.error('Error verifying Twitter follow:', error);
            return false;
        }
    }
}