import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';
export class TwitterLikeRetweetVerification implements VerificationScript {
    name = 'TwitterLikeRetweetVerification';
    description = 'Verifies if a user has liked and retweeted Apex Fusion posts';

    async execute(params: { bearerToken: string; apexTwitterId: string; userTwitterId: string, noPosts: number }): Promise<boolean> {
        const { bearerToken, apexTwitterId, userTwitterId, noPosts } = params;

        const url = `https://api.twitter.com/2/users/${userTwitterId}/tweets`;
        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${bearerToken}` },
            });

            const userTweets = response.data.data;
            const likedAndRetweeted = userTweets.filter((tweet: any) =>
                tweet.author_id === apexTwitterId && tweet.retweeted
            );

            return likedAndRetweeted.length >= noPosts;
        } catch (error) {
            console.error('Error verifying Twitter engagement:', error);
            return false;
        }
    }
}