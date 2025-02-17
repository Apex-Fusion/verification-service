import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';
export class DiscordJoinVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: { botToken: string; serverId: string; userId: string }): Promise<boolean> {
        const { botToken, serverId, userId } = params;

        const url = `https://discord.com/api/v9/guilds/${serverId}/members/${userId}`;
        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bot ${botToken}` },
            });
            return response.status === 200;
        } catch (error) {
            console.error('Error verifying Discord membership:', error);
            return false;
        }
    }
}