import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class OpenAIImageQueryScript implements VerificationScript {
  name = manifest.name;
  description = manifest.description;

  async execute(params: any): Promise<any> {
    // Expected parameters:
    // - question: string (e.g., "Is there a cat in this image?")
    // - imageUrl: string (the URL of the image provided via API)
    const { question, imageUrl } = params;
    if (!question || !imageUrl) {
      console.error('Missing required parameters: question, imageUrl');
      return {
        result: false,
        message: 'Missing required parameters: question, imageUrl',
      };
    }

    // Retrieve API key from environment variables
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY not set in environment variables');
      return {
        result: false,
        message: 'OPENAI_API_KEY not set in environment variables',
      };
    }

    // Retrieve model from environment variables with default value "gpt-4o"
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // Construct messages with a system message instructing the assistant
    // to respond only with a valid JSON object with keys "result" (boolean) and "comment" (string)
    const messages = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text:
              'You are an image analyzer. Your task is to analyze the image provided and determine if it contains what is asked in the question. Respond only with a valid JSON object with exactly two keys: "result" (a boolean) and "comment" (a string). Do not include any additional text or formatting.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: question,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        console.error('Failed to fetch from OpenAI API. Status:', response.status);
        return {
          result: false,
          message: `Failed to fetch from OpenAI API. Status: ${response.status}`,
        };
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
          console.error('Response from OpenAI is not valid JSON:', answerRaw);
          return { result: false, message: 'Response from OpenAI is not valid JSON.' };
        }
        // Validate that the JSON has exactly two keys with expected types
        if (typeof answerJson.result !== 'boolean' || typeof answerJson.comment !== 'string') {
          console.error('Invalid JSON structure from OpenAI response:', answerJson);
          return { result: false, message: 'Invalid JSON structure from OpenAI response.' };
        }
        console.log('Answer received from OpenAI:', answerJson);
        return answerJson;
      } else {
        console.error('OpenAI did not return expected data.');
        return { result: false, message: 'OpenAI did not return expected data.' };
      }
    } catch (error: any) {
      console.error('Error during communication with OpenAI API:', error);
      return {
        result: false,
        message: `Error during communication with OpenAI API: ${error.message}`,
      };
    }
  }
}