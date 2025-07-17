import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';
export class YoutubeSubscriptionVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: { apiKey: string; apexChannelId: string; userChannelId: string }): Promise<boolean> {
        const { apiKey, apexChannelId, userChannelId } = params;

        const url = `https://www.googleapis.com/youtube/v3/subscriptions?part=id&channelId=${apexChannelId}&forChannelId=${userChannelId}&key=${apiKey}`;
        try {
            const response = await axios.get(url);
            return response.data.items.length > 0;
        } catch (error) {
            console.error('Error verifying YouTube subscription:', error);
            return false;
        }
    }
}