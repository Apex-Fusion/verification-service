import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';

export class TwitterFollowVerification implements VerificationScript {
    name = 'TwitterFollowVerification';
    description = 'Verifies if a user follows the Apex Fusion account on Twitter';

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