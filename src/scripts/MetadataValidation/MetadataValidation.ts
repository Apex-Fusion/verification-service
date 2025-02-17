import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';
export class MetadataValidation implements VerificationScript {
  name = manifest.name;
  description = manifest.description;

  async execute(params: any): Promise<any> {
    // Expected parameter:
    // - meta_url: string (URL pointing to the metadata JSON)
    const { meta_url } = params;
    if (!meta_url) {
      console.error('Missing required parameter: meta_url');
      return { result: false, message: 'Missing required parameter: meta_url' };
    }

    try {
      // Fetch metadata JSON from the provided URL
      const response = await fetch(meta_url);
      if (!response.ok) {
        console.error(`Failed to fetch metadata from ${meta_url}. Status: ${response.status}`);
        return { result: false, message: `Failed to fetch metadata from ${meta_url}. Status: ${response.status}` };
      }
      const metadata = await response.json();

      // Validate that required fields exist and are of type string
      const requiredFields = ['name', 'ticker', 'description', 'homepage'];
      for (const field of requiredFields) {
        if (!metadata[field]) {
          console.error(`Missing required field: ${field}`);
          return { result: false, message: `Missing required field: ${field}` };
        }
        if (typeof metadata[field] !== 'string') {
          console.error(`Field ${field} must be a string`);
          return { result: false, message: `Field ${field} must be a string` };
        }
      }

      // Validate ticker: must be between 3 and 5 characters and only uppercase letters
      const ticker = metadata.ticker;
      if (ticker.length < 3 || ticker.length > 5) {
        console.error(`Ticker must be between 3 and 5 characters. Provided ticker: ${ticker}`);
        return { result: false, message: `Ticker must be between 3 and 5 characters. Provided ticker: ${ticker}` };
      }
      if (!/^[A-Z]+$/.test(ticker)) {
        console.error(`Ticker must contain only uppercase letters. Provided ticker: ${ticker}`);
        return { result: false, message: `Ticker must contain only uppercase letters. Provided ticker: ${ticker}` };
      }

      // Validate homepage URL format
      try {
        new URL(metadata.homepage);
      } catch (e) {
        console.error(`Homepage is not a valid URL: ${metadata.homepage}`);
        return { result: false, message: `Homepage is not a valid URL: ${metadata.homepage}` };
      }

      // If an extended URL is provided, validate its format
      if (metadata.extended) {
        if (typeof metadata.extended !== 'string') {
          console.error('Field extended must be a string if provided');
          return { result: false, message: 'Field extended must be a string if provided' };
        }
        try {
          new URL(metadata.extended);
        } catch (e) {
          console.error(`Extended is not a valid URL: ${metadata.extended}`);
          return { result: false, message: `Extended is not a valid URL: ${metadata.extended}` };
        }
      }

      // Ensure that name and description are not empty (trim whitespace)
      if (!metadata.name.trim()) {
        console.error('Field name cannot be empty');
        return { result: false, message: 'Field name cannot be empty' };
      }
      if (!metadata.description.trim()) {
        console.error('Field description cannot be empty');
        return { result: false, message: 'Field description cannot be empty' };
      }

      console.log(`Metadata from ${meta_url} is valid according to Cardano standards.`);
      return true;
    } catch (error: any) {
      console.error(`Error during metadata validation: ${error.message}`);
      return { result: false, message: `Error during metadata validation: ${error.message}` };
    }
  }
}