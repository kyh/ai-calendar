import { createGateway } from "ai";

/**
 * Single place the model is configured. Agents import `createModel` so
 * swapping providers/models is a one-line change.
 */
const MODEL_ID = "openai/gpt-5.1-instant";

export const createModel = (apiKey: string) => createGateway({ apiKey })(MODEL_ID);
