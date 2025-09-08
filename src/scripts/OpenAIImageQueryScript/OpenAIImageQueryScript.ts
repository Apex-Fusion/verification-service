import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class OpenAIImageQueryScript implements VerificationScript {
  name = manifest.name;
  description = manifest.description;

  /**
   * Extract JSON from a response that might be wrapped in markdown code blocks
   */
  private extractJsonFromResponse(response: string): string {
    const trimmed = response.trim();
    
    // Check if response is wrapped in ```json ... ``` or ``` ... ```
    const jsonBlockMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }
    
    // If no code block found, return the original response
    return trimmed;
  }

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
              'You are an image analyzer. Your task is to analyze the image provided and determine if it contains what is asked in the question. You MUST respond with a valid JSON object with exactly two keys: "result" (a boolean) and "comment" (a string). Never respond with plain text. Always use JSON format. Example: {"result": true, "comment": "The image contains the requested element"}',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${question}\n\nIMPORTANT: Respond only with valid JSON format: {"result": boolean, "comment": "your analysis"}`,
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
          response_format: { type: "json_object" },
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
      
      // Log the complete response for debugging
      console.log('Complete OpenAI API response:', JSON.stringify(responseData, null, 2));
      
      // Log specific parts of the response structure
      console.log('Response has choices:', !!responseData.choices);
      console.log('Choices length:', responseData.choices?.length || 0);
      console.log('First choice message:', responseData.choices?.[0]?.message || 'No message');
      console.log('Message content:', responseData.choices?.[0]?.message?.content || 'No content');

      if (
        responseData.choices &&
        responseData.choices.length > 0 &&
        responseData.choices[0].message &&
        responseData.choices[0].message.content
      ) {
        const answerRaw = responseData.choices[0].message.content.trim();
        const extractedJson = this.extractJsonFromResponse(answerRaw);
        let answerJson;
        try {
          answerJson = JSON.parse(extractedJson);
        } catch (error) {
          console.error('Response from OpenAI is not valid JSON:', answerRaw);
          console.error('Extracted content:', extractedJson);
          
          // Fallback: if OpenAI returns plain text instead of JSON, create a JSON response
          // This handles cases where the model ignores JSON format instructions
          console.log('Attempting fallback: converting plain text to JSON format');
          answerJson = {
            result: false,
            comment: `OpenAI returned plain text instead of JSON: ${extractedJson}`
          };
          console.log('Fallback JSON created:', answerJson);
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
        console.error('Missing data analysis:');
        console.error('- responseData exists:', !!responseData);
        console.error('- responseData.choices exists:', !!responseData.choices);
        console.error('- responseData.choices is array:', Array.isArray(responseData.choices));
        console.error('- responseData.choices.length:', responseData.choices?.length || 'N/A');
        if (responseData.choices && responseData.choices.length > 0) {
          console.error('- first choice exists:', !!responseData.choices[0]);
          console.error('- first choice.message exists:', !!responseData.choices[0]?.message);
          console.error('- first choice.message.content exists:', !!responseData.choices[0]?.message?.content);
          console.error('- first choice.message.content value:', responseData.choices[0]?.message?.content || 'EMPTY/NULL');
        }
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