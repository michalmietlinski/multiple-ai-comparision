import express, { Request, Response } from "express";
import { StorageService } from "../services/storage.js";
import { OpenAIService } from "../services/openai.js";
import { baseMessage, ErrorResponse, ThreadMessage } from "../types/api.types.js";
import {
  ThreadsListResponse,
  ThreadChatRequest,
  ThreadChatResponse,
  ThreadErrorResponse,
  ThreadParams,
  ThreadSuccessResponse,
  ThreadState,
  ChatUsage
} from "../types/threads.types.js";
import { TypedRequest } from "../types/api.types.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

const router = express.Router();
const storage = StorageService.getInstance();

// Get thread by ID
router.get(
  "/:threadId",
  async (
    req: Request<ThreadParams>,
    res: Response<ThreadState | ErrorResponse>
  ) => {
    try {
      const thread = await storage.getThread(req.params.threadId);
      const threadState: ThreadState = {
        id: thread.id,
        models: thread.models,
        isActive: true,
        updatedAt: thread.updatedAt,
        createdAt: thread.createdAt,
        messages: thread.messages
      };
      res.json(threadState);
    } catch (error) {
      console.error("Error getting thread:", error);
      res.status(404).json({ error: "Thread not found" });
    }
  }
);

// TODO: Refactor to simplify the code and make it more readable
router.post(
  "/thread-chat",
  async (
    req: TypedRequest<ThreadChatRequest>,
    res: Response<ThreadChatResponse | ThreadErrorResponse>
  ) => {
    const { threadId, prompt, models, previousMessages } = req.body;
    
    if (!threadId) {
      return res.status(400).json({ 
        error: "threadId is required",
        responses: models.map(model => ({
          model,
          response: "Error: threadId is required"
        }))
      });
    }

    console.log(
      `[${new Date().toISOString()}] ThreadsRoute: Received chat request`,
      {
        threadId,
        models,
        promptLength: prompt.length,
        historyLength: previousMessages?.length || 0,
      }
    );

    try {
      const openai = await OpenAIService.getInstance();
      let thread;
      
      try {
        thread = await storage.getThread(threadId);
      } catch (error) {
        // Thread doesn't exist, create it
        console.log(`[${new Date().toISOString()}] ThreadsRoute: Creating new thread`, { threadId });
        const timestamp = new Date().toISOString();
        thread = {
          id: threadId,
          models,
          messages: [],
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await storage.saveThread(thread);
      }

      // Convert thread messages to OpenAI format
      const messageHistory: ChatCompletionMessageParam[] = [];
      
      // Iterate through messages and add to history
      (thread.messages || []).forEach((msg: ThreadMessage) => {
        messageHistory.push({
          role: msg.userMessage.role as any, // Type assertion to avoid role type issues
          content: msg.userMessage.content,
        });
        
        msg.responses.forEach((response) => {
          messageHistory.push({
            role: response.role as any, // Type assertion to avoid role type issues
            content: response.content,
          });
        });
      });

      console.log(
        `[${new Date().toISOString()}] ThreadsRoute: Sending message to OpenAI with history`,
        {
          historyLength: messageHistory.length,
          modelCount: models.length
        }
      );

      // Process all models and collect responses
      const modelResponses: {
        model: string;
        response: string;
        usage: ChatUsage | null;
      }[] = [];
      
      const assistantResponses = [];
      let combinedContent = "";
      const timestamp = new Date().toISOString();
	  
      for (const model of models) {
        try {
          console.log(`[${new Date().toISOString()}] ThreadsRoute: Processing model ${model}`);
          const { content: response, usage } = await openai.sendMessage(
            prompt,
            model,
            messageHistory
          );
          
          // Add to modelResponses for API response
          modelResponses.push({
            model,
            response,
            usage,
          });
          
          // Add to assistantResponses for storage
          assistantResponses.push({
            role: "assistant" as "user" | "assistant" | "system",
            model,
            content: response,
            usage,
            timestamp,
          });
          
          // Add model response to combined content
          combinedContent += `\n\n### ${model} Response:\n${response}`;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ERROR ThreadsRoute: Failed to process model ${model}`, error);
          
          const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
          
          // Add to modelResponses for API response
          modelResponses.push({
            model,
            response: errorMsg,
            usage: null,
          });
          
          // Add to assistantResponses for storage
          assistantResponses.push({
            role: "assistant" as "user" | "assistant" | "system",
            model,
            content: errorMsg,
            usage: null,
            timestamp,
          });
        }
      }

      // Save assistant response with combined content from all models
      thread = await storage.saveMessage(thread.id, {
        userMessage: {
          role: "user",
          content: prompt,
          timestamp: timestamp,
        },
        responses: assistantResponses,
        timestamp,
        usage: modelResponses[0]?.usage || null, // Use first model's usage as a fallback
      });

      // Update thread models if needed
      if (thread.models.join(",") !== models.join(",")) {
        thread.models = models;
        thread.updatedAt = timestamp;
        await storage.saveThread(thread);
      }

      const responseData = {
        threadId: thread.id,
        responses: modelResponses,
        history: thread.messages,
      };

      console.log(
        `[${new Date().toISOString()}] ThreadsRoute: Sending response`,
        {
          threadId: responseData.threadId,
          responseCount: responseData.responses.length,
          historyLength: responseData.history.length,
        }
      );
      res.json(responseData);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] ERROR ThreadsRoute: Failed to process chat request`,
        error
      );
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        responses: models.map((modelId) => ({
          model: modelId,
          response: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        })),
      });
    }
  }
);

// Get all threads
router.get(
  "/",
  async (_req: Request, res: Response<ThreadsListResponse | ErrorResponse>) => {
    try {
      const threads = await storage.listThreads();
      res.json({ threads });
    } catch (error) {
      console.error("Error listing threads:", error);
      res.status(500).json({ error: "Failed to list threads" });
    }
  }
);

// Delete all threads
router.delete(
  "/",
  async (
    _req: Request,
    res: Response<ThreadSuccessResponse | ErrorResponse>
  ) => {
    try {
      await storage.deleteAllThreads();
      res.json({ message: "All threads deleted successfully" });
    } catch (error) {
      console.error("Error deleting all threads:", error);
      res.status(500).json({ error: "Failed to delete all threads" });
    }
  }
);

// Delete a thread
router.delete(
  "/:threadId",
  async (
    req: Request<ThreadParams>,
    res: Response<ThreadSuccessResponse | ErrorResponse>
  ) => {
    try {
      await storage.deleteThread(req.params.threadId);
      res.json({ message: "Thread deleted successfully" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to delete thread" });
    }
  }
);

export default router;
