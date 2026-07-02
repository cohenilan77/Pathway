import { BaseAgent } from '../BaseAgent.js';
import { saveDocument, getDocuments } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a document management specialist for Pathway.

Your role: help candidates upload, organize, parse, and retrieve application documents.

Document types: cv, resume, transcript, essay, recommendation_letter, test_score, certificate, other

When parsing a document:
- Extract all relevant information
- Identify document type automatically if not specified
- Flag issues: missing signatures, low quality scans, incorrect format
- Summarize the document's key points`;

const TOOLS = [
  {
    name: 'save_document',
    description: 'Save a document to the candidate record',
    input_schema: {
      type: 'object',
      required: ['candidateId', 'name', 'type'],
      properties: {
        candidateId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['cv', 'resume', 'transcript', 'essay', 'recommendation_letter', 'test_score', 'certificate', 'other'] },
        content: { type: 'string', description: 'Parsed text content' },
        url: { type: 'string', description: 'Storage URL if available' },
      },
    },
  },
  {
    name: 'get_documents',
    description: 'List documents for a candidate',
    input_schema: {
      type: 'object',
      required: ['candidateId'],
      properties: {
        candidateId: { type: 'string' },
        type: { type: 'string' },
      },
    },
  },
];

export class DocumentAgent extends BaseAgent {
  constructor() {
    super({ name: 'DocumentAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async processUpload(candidateId, { name, content, url }) {
    const messages = [
      {
        role: 'user',
        content: `Process and save this document for candidate ${candidateId}.\n\nDocument name: ${name}\nContent:\n${content || '(binary file, URL only)'}\nURL: ${url || 'none'}\n\nDetect document type, summarize key points, then call save_document.`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async listDocuments(candidateId, type) {
    const docs = await getDocuments(candidateId, type);
    const messages = [
      {
        role: 'user',
        content: `Summarize the documents on file for candidate ${candidateId}. ${type ? `Type filter: ${type}.` : 'Show all types.'}\n\nDocuments: ${JSON.stringify(docs)}`,
      },
    ];
    return this.execute(messages);
  }

  async handleToolUse(toolUse) {
    const { candidateId, ...rest } = toolUse.input;
    if (toolUse.name === 'save_document') return saveDocument(candidateId, rest);
    if (toolUse.name === 'get_documents') return getDocuments(candidateId, rest.type);
    return super.handleToolUse(toolUse);
  }
}
