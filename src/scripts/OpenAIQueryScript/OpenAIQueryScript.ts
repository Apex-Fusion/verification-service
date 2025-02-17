import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class OpenAIQueryScript implements VerificationScript {
  name = manifest.name;
  description = manifest.description;

  async execute(params: any): Promise<any> {
    const { question, text } = params;
    if (!question || !text) {
      console.error('Missing required parameters: question, text');
      return { result: false, message: 'Missing required parameters: question, text' };
    }

    // Retrieve API key from environment variables
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY not set in environment variables');
      return { result: false, message: 'OPENAI_API_KEY not set in environment variables' };
    }

    // Retrieve model from environment variables, defaulting to "gpt-4o"
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // Construct the prompt by combining the question and text, and instruct the assistant to respond in JSON.
    const prompt = `${question}\n\n${text}\n\nPlease respond with a valid JSON object with exactly two keys: "result" (a boolean) and "comment" (a string). Do not include any additional text.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send request to ChatGPT API. Status:', response.status);
        return { result: false, message: `Failed to send request to ChatGPT API. Status: ${response.status}` };
      }

      const responseData = await response.json();

      if (
        responseData.choices &&
        responseData.choices.length > 0 &&
        responseData.choices[0].message &&
        responseData.choices[0].message.content
      ) {
        const answerRaw = responseData.choices[0].message.content.trim();
        let answerJson;
        try {
          answerJson = JSON.parse(answerRaw);
        } catch (error) {
          console.error('Response from ChatGPT is not valid JSON:', answerRaw);
          return { result: false, message: 'Response from ChatGPT is not valid JSON.' };
        }
        // Validate that the JSON has the expected structure: "result" as boolean and "comment" as string.
        if (typeof answerJson.result !== 'boolean' || typeof answerJson.comment !== 'string') {
          console.error('Invalid JSON structure from ChatGPT response:', answerJson);
          return { result: false, message: 'Invalid JSON structure from ChatGPT response.' };
        }
        console.log('Answer received from ChatGPT:', answerJson);
        return answerJson;
      } else {
        console.error('ChatGPT did not return the expected data.');
        return { result: false, message: 'ChatGPT did not return the expected data.' };
      }
    } catch (error: any) {
      console.error('Error during communication with ChatGPT API:', error);
      return { result: false, message: `Error during communication with ChatGPT API: ${error.message}` };
    }
  }
}