import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';
export class YoutubeSubscriptionVerification implements VerificationScript {
    name = 'YoutubeSubscriptionVerification';
    description = 'Verifies if a user is subscribed to the Apex Fusion YouTube channel';

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