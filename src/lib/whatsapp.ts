import { chromium, Browser, Page, BrowserContext } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import path from "path";
import fs from "fs";
import {
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib-whatsapp.ts");

/** @deprecated Internal dev fallback only — production uses Meta Cloud API. */
export function isWhatsAppRemoteConfigured(): boolean {
  return Boolean(process.env.BROWSERBASE_API_KEY?.trim());
}

export function isWhatsAppBlockedOnVercelServerless(): boolean {
  const onVercel =
    process.env.VERCEL === "1" &&
    ["production", "preview"].includes(process.env.VERCEL_ENV || "");
  return onVercel && !isWhatsAppRemoteConfigured();
}

export interface WhatsAppMessage {
  phoneNumber: string;
  message: string;
}

export interface WhatsAppSession {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  isAuthenticated: boolean;
}

class WhatsAppService {
  private session: WhatsAppSession = {
    browser: null,
    context: null,
    page: null,
    isAuthenticated: false,
  };

  private useRemoteBrowser = false;

  private get userDataDir(): string {
    if (process.env.VERCEL) {
      return path.join("/tmp", ".whatsapp-session");
    }
    return path.join(process.cwd(), ".whatsapp-session");
  }

  private readonly WAIT_TIMEOUT = 30000;

  private async connectBrowserbase(): Promise<void> {
    const apiKey = process.env.BROWSERBASE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("BROWSERBASE_API_KEY is not set");
    }

    const bb = new Browserbase({ apiKey });
    const contextId =
      process.env.BROWSERBASE_WHATSAPP_CONTEXT_ID?.trim() || "fitness360-whatsapp";

    const session = await bb.sessions.create({
      ...(process.env.BROWSERBASE_PROJECT_ID?.trim()
        ? { projectId: process.env.BROWSERBASE_PROJECT_ID.trim() }
        : {}),
      keepAlive: true,
      timeout: 3600,
      browserSettings: {
        context: { id: contextId, persist: true },
        viewport: { width: 1280, height: 720 },
      },
    });

    const browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    if (!context) {
      await browser.close();
      throw new Error("Browserbase session returned no browser context");
    }

    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }

    this.session.browser = browser;
    this.session.context = context;
    this.session.page = page;
    this.useRemoteBrowser = true;

    logger.info(`Browserbase session ${session.id} (context ${contextId})`);
    await this.session.page.goto("https://web.whatsapp.com", {
      waitUntil: "networkidle",
    });
    await this.checkAuthentication();
  }

  private async connectLocalChromium(): Promise<void> {
    if (isWhatsAppBlockedOnVercelServerless()) {
      throw new Error(
        `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`
      );
    }

    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    const headed =
      process.env.WHATSAPP_HEADLESS === "0" ||
      process.env.WHATSAPP_HEADLESS === "false";

    this.session.browser = await chromium.launch({
      headless: !headed,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    this.session.context = await this.session.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      storageState: fs.existsSync(path.join(this.userDataDir, "state.json"))
        ? path.join(this.userDataDir, "state.json")
        : undefined,
    });

    this.session.page = await this.session.context.newPage();
    this.useRemoteBrowser = false;

    await this.session.page.goto("https://web.whatsapp.com", {
      waitUntil: "networkidle",
    });
    await this.checkAuthentication();
  }

  async initialize(): Promise<void> {
    try {
      if (isWhatsAppRemoteConfigured()) {
        await this.connectBrowserbase();
      } else {
        await this.connectLocalChromium();
      }
    } catch (error) {
      logger.error("Error initializing WhatsApp:", error as Error);
      throw new Error(`Failed to initialize WhatsApp: ${error}`);
    }
  }

  async checkAuthentication(): Promise<boolean> {
    if (!this.session.page) {
      throw new Error("WhatsApp not initialized. Call initialize() first.");
    }

    try {
      const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
      const chatListSelector = '[data-testid="chat-list"]';

      await this.session.page.waitForSelector(
        `${qrCodeSelector}, ${chatListSelector}`,
        { timeout: 10000 }
      );

      const qrExists = await this.session.page.$(qrCodeSelector);
      this.session.isAuthenticated = !qrExists;

      if (this.session.isAuthenticated) {
        await this.saveAuthState();
      }

      return this.session.isAuthenticated;
    } catch (error) {
      logger.error("Error checking authentication:", error as Error);
      return false;
    }
  }

  async waitForAuthentication(timeout: number = 60000): Promise<boolean> {
    if (!this.session.page) {
      throw new Error("WhatsApp not initialized. Call initialize() first.");
    }

    try {
      const chatListSelector = '[data-testid="chat-list"]';
      await this.session.page.waitForSelector(chatListSelector, {
        timeout,
      });

      this.session.isAuthenticated = true;
      await this.saveAuthState();
      return true;
    } catch (error) {
      logger.error("Authentication timeout:", error as Error);
      return false;
    }
  }

  formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    return cleaned;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.session.page) {
      throw new Error("WhatsApp not initialized. Call initialize() first.");
    }

    if (!this.session.isAuthenticated) {
      throw new Error(`${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`);
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const waUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

      await this.session.page.goto(waUrl, {
        waitUntil: "networkidle",
      });

      const messageInputSelector =
        'div[contenteditable="true"][data-tab="10"], div[contenteditable="true"][data-tab="9"]';
      await this.session.page.waitForSelector(messageInputSelector, {
        timeout: this.WAIT_TIMEOUT,
      });

      await this.session.page.fill(messageInputSelector, message);
      await this.session.page.waitForTimeout(1000);

      const sendButtonSelector =
        'button[data-tab="11"] span[data-icon="send"]';
      const sendButton = await this.session.page.$(sendButtonSelector);

      if (sendButton) {
        await sendButton.click();
      } else {
        await this.session.page.press(messageInputSelector, "Enter");
      }

      await this.session.page.waitForTimeout(2000);

      const sentIcon = await this.session.page.$(
        'span[data-icon="msg-dblcheck"]'
      );

      return !!sentIcon;
    } catch (error) {
      logger.error(`Error sending message to ${phoneNumber}:`, error as Error);
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  async sendBulkMessages(
    messages: WhatsAppMessage[],
    delayMs: number = 3000
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const msg of messages) {
      try {
        await this.sendMessage(msg.phoneNumber, msg.message);
        results.success++;
        await this.session.page?.waitForTimeout(delayMs);
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send to ${msg.phoneNumber}: ${error}`);
      }
    }

    return results;
  }

  private async saveAuthState(): Promise<void> {
    if (this.useRemoteBrowser || !this.session.context) {
      return;
    }
    const statePath = path.join(this.userDataDir, "state.json");
    await this.session.context.storageState({ path: statePath });
  }

  async close(): Promise<void> {
    try {
      if (this.session.context && !this.useRemoteBrowser) {
        await this.saveAuthState();
        await this.session.context.close();
      }
      if (this.session.browser) {
        await this.session.browser.close();
      }

      this.session = {
        browser: null,
        context: null,
        page: null,
        isAuthenticated: false,
      };
      this.useRemoteBrowser = false;
    } catch (error) {
      logger.error("Error closing WhatsApp session:", error as Error);
    }
  }

  getStatus(): { isAuthenticated: boolean; hasSession: boolean } {
    return {
      isAuthenticated: this.session.isAuthenticated,
      hasSession: !!this.session.page,
    };
  }
}

let whatsappInstance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappInstance) {
    whatsappInstance = new WhatsAppService();
  }
  return whatsappInstance;
}

export { WhatsAppService };
export default WhatsAppService;
