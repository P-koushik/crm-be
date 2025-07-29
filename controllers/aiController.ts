import { Request, Response } from "express";
import { 
  getAllAvailableModels, 
  getRecommendedFallbacks, 
  isModelAvailable,
  AI_PROVIDERS,
  disableProvider,
  enableProvider,
  streamTextWithFallback
} from "../lib/aiProviders";

export const getAvailableModels = async (req: Request, res: Response) => {
  try {
    const models = getAllAvailableModels();
    const modelInfo = models.map(model => ({
      name: model,
      available: isModelAvailable(model),
      fallbacks: getRecommendedFallbacks(model),
    }));

    res.json({
      success: true,
      models: modelInfo,
      providers: AI_PROVIDERS,
    });
  } catch (error) {
    console.error("Error fetching available models:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch available models" 
    });
  }
};

export const getModelStatus = async (req: Request, res: Response) => {
  try {
    const { modelName } = req.params;
    
    if (!modelName) {
      return res.status(400).json({ 
        success: false, 
        error: "Model name is required" 
      });
    }

    const available = isModelAvailable(modelName);
    const fallbacks = getRecommendedFallbacks(modelName);

    res.json({
      success: true,
      model: {
        name: modelName,
        available,
        fallbacks,
      },
    });
  } catch (error) {
    console.error("Error fetching model status:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch model status" 
    });
  }
};

export const toggleProvider = async (req: Request, res: Response) => {
  try {
    const { providerName, enabled } = req.body;
    
    if (!providerName || typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: "Provider name and enabled status are required" 
      });
    }

    if (enabled) {
      enableProvider(providerName);
    } else {
      disableProvider(providerName);
    }

    res.json({
      success: true,
      message: `${providerName} provider ${enabled ? 'enabled' : 'disabled'} successfully`,
      provider: {
        name: providerName,
        enabled,
      },
    });
  } catch (error) {
    console.error("Error toggling provider:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to toggle provider" 
    });
  }
};

export const testModel = async (req: Request, res: Response) => {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({ 
        success: false, 
        error: "Model name is required" 
      });
    }

    // Simple test message to check if model works
    const testMessage = "Hello, this is a test message. Please respond with 'OK' if you can see this.";
    
    const result = await streamTextWithFallback({
      modelName,
      messages: [
        {
          role: 'user',
          content: testMessage
        }
      ],
      temperature: 0.1,
      maxTokens: 50,
    }, []); // No fallbacks for testing

    if (result.success) {
      res.json({
        success: true,
        message: "Model test successful",
        provider: result.provider,
        model: result.model,
      });
    } else {
      res.json({
        success: false,
        message: "Model test failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error testing model:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to test model" 
    });
  }
}; 