import { DEFAULT_PROVIDER_CONFIGS, validateProviderConfig } from '../../config/providerConfig';

describe('Provider Configuration', () => {
  describe('DEFAULT_PROVIDER_CONFIGS', () => {
    test('should have all required providers', () => {
      expect(DEFAULT_PROVIDER_CONFIGS).toHaveProperty('openai');
      expect(DEFAULT_PROVIDER_CONFIGS).toHaveProperty('deepseek');
      expect(DEFAULT_PROVIDER_CONFIGS).toHaveProperty('anthropic');
      expect(DEFAULT_PROVIDER_CONFIGS).toHaveProperty('gemini');
    });

    test('each provider should have required properties', () => {
      Object.entries(DEFAULT_PROVIDER_CONFIGS).forEach(([provider, config]) => {
        expect(config).toHaveProperty('models');
        expect(Array.isArray(config.models)).toBe(true);
        expect(config.models.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateProviderConfig', () => {
    test('should validate correct config', () => {
      const validConfig = {
        name: 'Test API',
        provider: 'openai',
        key: 'test-key'
      };
      expect(() => validateProviderConfig(validConfig)).not.toThrow();
    });

    test('should allow custom provider', () => {
      const customConfig = {
        name: 'Custom API',
        provider: 'custom',
        key: 'test-key',
        url: 'https://custom.api'
      };
      expect(() => validateProviderConfig(customConfig)).not.toThrow();
    });

    test('should throw on missing required fields', () => {
      const invalidConfig = {
        name: 'Test API'
      };
      expect(() => validateProviderConfig(invalidConfig))
        .toThrow('Missing required fields: provider, key');
    });

    test('should throw on unsupported provider', () => {
      const invalidConfig = {
        name: 'Test API',
        provider: 'unsupported',
        key: 'test-key'
      };
      expect(() => validateProviderConfig(invalidConfig))
        .toThrow('Unsupported provider: unsupported');
    });

    test('should throw on invalid config object', () => {
      expect(() => validateProviderConfig(null))
        .toThrow('Invalid provider configuration');
      expect(() => validateProviderConfig('not an object'))
        .toThrow('Invalid provider configuration');
    });
  });
}); 
