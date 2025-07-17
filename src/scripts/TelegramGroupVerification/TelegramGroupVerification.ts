import axios from 'axios';
import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class TelegramGroupVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: { botToken: string; chatId: string; userId: number }): Promise<boolean> {
        const { botToken, chatId, userId } = params;

        if (!botToken || !chatId || !userId) {
            console.error('Missing required parameters: botToken, chatId, or userId.');
            return false;
        }

        const url = `https://api.telegram.org/bot${botToken}/getChatMember`;

        try {
            const response = await axios.post(url, {
                chat_id: chatId,
                user_id: userId,
            });

            const { status } = response.data.result;
            const isMember = ['member', 'administrator', 'creator'].includes(status);
            return isMember;
        } catch (error: any) {
            if (error.response) {
                const { error_code, description } = error.response.data;
                console.error(`Telegram API error ${error_code}: ${description}`);
            } else {
                console.error(`Error: ${error.message}`);
            }
            return false;
        }
    }
}