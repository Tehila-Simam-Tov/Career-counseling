/**
 * MCP Client
 *
 * Responsibilities:
 *   - Spawn the MCP server as a child process (stdio transport)
 *   - discoverTools()  — list all tools the server exposes
 *   - verifyTool()     — confirm a specific tool exists before calling it
 *   - callTool()       — invoke a tool and parse the JSON result
 *
 * The client is a lazy singleton: the process is spawned once on first use
 * and reused for every subsequent call.
 */

const path = require('path');
const { Client }              = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const MCP_SERVER_PATH = path.resolve(__dirname, 'mcpServer.js');

let clientInstance   = null;
let connectingPromise = null;

// ── Connect (lazy singleton) ──────────────────────────────────────────────

async function getClient() {
  if (clientInstance) return clientInstance;

  // Prevent race: if a connection is already in progress, wait for it
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    console.log('🔌 MCP Client: spawning MCP server process...');

    const transport = new StdioClientTransport({
      command: 'node',
      args:    [MCP_SERVER_PATH],
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL:   process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      }
    });

    const client = new Client({ name: 'career-backend-client', version: '1.0.0' });
    await client.connect(transport);

    clientInstance   = client;
    connectingPromise = null;
    console.log('✅ MCP Client: connected to MCP server');
    return client;
  })();

  return connectingPromise;
}

// ── discoverTools ─────────────────────────────────────────────────────────

/**
 * Returns the full list of tools the MCP server currently exposes.
 * @returns {Promise<Array<{ name: string, description: string, inputSchema: object }>>}
 */
async function discoverTools() {
  const client = await getClient();
  console.log('🔍 MCP Client: discovering tools...');
  const response = await client.listTools();
  const tools = response?.tools || [];
  console.log('🔍 MCP Client: discovered tools:', tools.map(t => t.name));
  return tools;
}

// ── verifyTool ────────────────────────────────────────────────────────────

/**
 * Checks that a required tool is present in the discovered list.
 * Throws a descriptive error if the tool is not found.
 *
 * @param {string} toolName
 * @param {Array}  discoveredTools  — result of discoverTools()
 */
function verifyTool(toolName, discoveredTools) {
  const found = discoveredTools.find(t => t.name === toolName);
  if (!found) {
    throw new Error(
      `MCP tool "${toolName}" was not found on the MCP server. ` +
      `Available tools: [${discoveredTools.map(t => t.name).join(', ')}]`
    );
  }
  console.log(`✅ MCP Client: tool "${toolName}" verified`);
  return found;
}

// ── callTool ──────────────────────────────────────────────────────────────

/**
 * Full discovery → verify → invoke sequence.
 * This is the ONLY public entry point for invoking an MCP tool.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {Promise<object>}  Parsed JSON result from the tool
 */
async function callTool(toolName, args) {
  // Step 1: discover
  const discoveredTools = await discoverTools();

  // Step 2: verify
  verifyTool(toolName, discoveredTools);

  // Step 3: invoke
  console.log(`📡 MCP Client: calling tool "${toolName}"`);
  const result = await (await getClient()).callTool({
    name:      toolName,
    arguments: args
  });

  const textContent = (result?.content || []).find(c => c.type === 'text');
  if (!textContent?.text) {
    throw new Error(`MCP tool "${toolName}" returned empty content`);
  }

  try {
    return JSON.parse(textContent.text);
  } catch {
    throw new Error(`MCP tool "${toolName}" returned non-JSON content: ${textContent.text}`);
  }
}

module.exports = { discoverTools, verifyTool, callTool };
