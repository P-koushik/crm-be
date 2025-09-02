"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_PROVIDERS = void 0;
exports.get_provider_for_model = get_provider_for_model;
exports.get_fallback_models = get_fallback_models;
exports.stream_text_with_fallback = stream_text_with_fallback;
exports.get_recommended_fallbacks = get_recommended_fallbacks;
exports.is_model_available = is_model_available;
exports.get_all_available_models = get_all_available_models;
exports.disable_provider = disable_provider;
exports.enable_provider = enable_provider;
exports.mark_provider_failure = mark_provider_failure;
exports.reset_provider_failures = reset_provider_failures;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const mistral_1 = require("@ai-sdk/mistral");
// Provider configurations
exports.AI_PROVIDERS = {
    openai: {
        name: 'OpenAI',
        models: ['gpt-4o-mini'],
        priority: 1,
        enabled: true,
    },
    mistral: {
        name: 'Mistral',
        models: ['mistral-large-latest'],
        priority: 2,
        enabled: true,
    },
};
// Get the appropriate provider for a model
function get_provider_for_model(modelName) {
    for (const [provider, config] of Object.entries(exports.AI_PROVIDERS)) {
        if (config.enabled && config.models.includes(modelName)) {
            return provider;
        }
    }
    throw new Error(`No provider found for model: ${modelName}`);
}
// Get fallback models for a given model
function get_fallback_models(modelName) {
    const primaryProvider = get_provider_for_model(modelName);
    const fallbacks = [];
    // Get models from other providers in priority order
    const sortedProviders = Object.entries(exports.AI_PROVIDERS)
        .filter(([provider, config]) => config.enabled && provider !== primaryProvider)
        .sort(([, a], [, b]) => a.priority - b.priority);
    for (const [provider, config] of sortedProviders) {
        fallbacks.push(...config.models);
    }
    return fallbacks;
}
// Stream text with automatic fallback
async function stream_text_with_fallback({ options, fallbackModels = [] }) {
    const all_models = [options.modelName, ...fallbackModels];
    for (const model of all_models) {
        try {
            const provider = get_provider_for_model(model);
            // Check if provider is enabled
            if (!exports.AI_PROVIDERS[provider]?.enabled) {
                continue;
            }
            const result = await stream_text_with_provider({ modelName: model, options, provider });
            if (result.success) {
                return {
                    ...result,
                    provider,
                    model,
                };
            }
            else {
                if (result.error?.includes('empty response')) {
                    mark_provider_failure(provider);
                }
            }
        }
        catch (error) {
            continue;
        }
    }
    return {
        success: false,
        error: `All models failed: ${all_models.join(', ')}`,
    };
}
// Stream text with a specific provider
async function stream_text_with_provider(params) {
    const { modelName, options, provider } = params;
    try {
        let model;
        // Check if API keys are configured
        const openai_key = process.env.OPENAI_API_KEY;
        const mistral_key = process.env.MISTRAL_API_KEY;
        switch (provider) {
            case 'openai':
                if (!openai_key) {
                    throw new Error('OpenAI API key not configured');
                }
                model = (0, openai_1.openai)(modelName);
                break;
            case 'mistral':
                if (!mistral_key) {
                    throw new Error('Mistral API key not configured');
                }
                model = (0, mistral_1.mistral)(modelName);
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
        // Add timeout for API calls
        const timeout_promise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 30000);
        });
        const stream_promise = (0, ai_1.streamText)({
            model,
            messages: options.messages,
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 1000,
        });
        const result = await Promise.race([stream_promise, timeout_promise]);
        return {
            success: true,
            textStream: result.textStream,
        };
    }
    catch (error) {
        let error_message = error instanceof Error ? error.message : 'Unknown error';
        // Check for specific error types
        if (error_message.includes('quota') || error_message.includes('RESOURCE_EXHAUSTED') || error_message.includes('rate_limit')) {
            error_message = `${provider} API quota exceeded. Please check your billing and rate limits.`;
            disable_provider(provider);
        }
        else if (error_message.includes('API key')) {
            error_message = `${provider} API key is invalid or not configured properly.`;
        }
        else if (error_message.includes('permission')) {
            error_message = `${provider} API key does not have the necessary permissions.`;
        }
        return {
            success: false,
            error: error_message,
        };
    }
}
// Get recommended fallback models based on the primary model
function get_recommended_fallbacks(primaryModel) {
    const provider = get_provider_for_model(primaryModel);
    switch (provider) {
        case 'openai':
            return ['mistral-large-latest'];
        case 'mistral':
            return ['gpt-4o-mini'];
        default:
            return ['gpt-4o-mini', 'mistral-large-latest'];
    }
}
// Check if a model is available
function is_model_available(modelName) {
    try {
        get_provider_for_model(modelName);
        return true;
    }
    catch {
        return false;
    }
}
// Get all available models
function get_all_available_models() {
    const models = [];
    for (const [provider, config] of Object.entries(exports.AI_PROVIDERS)) {
        if (config.enabled) {
            models.push(...config.models);
        }
    }
    return models;
}
// Disable a provider
function disable_provider(providerName) {
    if (exports.AI_PROVIDERS[providerName]) {
        exports.AI_PROVIDERS[providerName].enabled = false;
    }
}
// Enable a provider
function enable_provider(providerName) {
    if (exports.AI_PROVIDERS[providerName]) {
        exports.AI_PROVIDERS[providerName].enabled = true;
    }
}
// Track provider failures
const provider_failures = new Map();
// Mark a provider as failed
function mark_provider_failure(providerName) {
    const current_failures = provider_failures.get(providerName) || 0;
    provider_failures.set(providerName, current_failures + 1);
    // Disable provider after 3 consecutive failures
    if (current_failures + 1 >= 3) {
        disable_provider(providerName);
    }
}
// Reset provider failures
function reset_provider_failures(providerName) {
    provider_failures.delete(providerName);
}
