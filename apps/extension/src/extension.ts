import * as vscode from 'vscode';
import { registerPullRequestFeatures } from './pullRequests';
import { registerNotificationFeatures } from './notifications';

interface GiteaUser {
  id: number;
  username: string;
}

type ValidationResult =
  | { kind: 'valid'; user: GiteaUser }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

class GiteaApiClient {
  async validateConnection(serverUrl: URL, token: string): Promise<ValidationResult> {
    let response: Response;
    try {
      response = await fetch(new URL('api/v1/user', ensureTrailingSlash(serverUrl)), {
        headers: { Authorization: `token ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return { kind: 'unavailable' };
    }

    if (response.status === 401 || response.status === 403) {
      return { kind: 'unauthorized' };
    }
    if (!response.ok) {
      return { kind: 'unavailable' };
    }

    try {
      const body: unknown = await response.json();
      if (!isGiteaUser(body)) return { kind: 'unavailable' };
      return { kind: 'valid', user: body };
    } catch {
      return { kind: 'unavailable' };
    }
  }
}

class GiteaConnectionService {
  private static readonly serverUrlKey = 'gitea.serverUrl';
  private static readonly tokenSecretKey = 'gitea.personalAccessToken';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly apiClient: GiteaApiClient,
  ) {}

  async connect(serverInput: string, token: string): Promise<ValidationResult> {
    const serverUrl = parseServerUrl(serverInput);
    if (!serverUrl) return { kind: 'unavailable' };

    const result = await this.apiClient.validateConnection(serverUrl, token);
    if (result.kind !== 'valid') return result;

    await this.context.secrets.store(GiteaConnectionService.tokenSecretKey, token);
    await this.context.globalState.update(GiteaConnectionService.serverUrlKey, serverUrl.toString());
    return result;
  }

  getServerAddress(): string | undefined {
    return this.context.globalState.get<string>(GiteaConnectionService.serverUrlKey);
  }

  async getAccessToken(): Promise<string | undefined> {
    return await this.context.secrets.get(GiteaConnectionService.tokenSecretKey);
  }
}

class ConnectServerCommand {
  constructor(private readonly connectionService: GiteaConnectionService) {}

  async execute(): Promise<void> {
    while (true) {
      const serverInput = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter the Gitea server address'),
        placeHolder: 'https://gitea.example.com',
        ignoreFocusOut: true,
        value: this.connectionServiceServerAddress(),
      });
      if (serverInput === undefined) return;

      const normalizedAddress = serverInput.trim();
      if (!parseServerUrl(normalizedAddress)) {
        void vscode.window.showErrorMessage(vscode.l10n.t('Enter a valid HTTP or HTTPS server address.'));
        continue;
      }

      const token = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter a personal access token'),
        password: true,
        ignoreFocusOut: true,
      });
      if (token === undefined) return;
      if (!token.trim()) {
        void vscode.window.showErrorMessage(vscode.l10n.t('A personal access token is required.'));
        continue;
      }

      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Connecting to Gitea…'), cancellable: false },
        () => this.connectionService.connect(normalizedAddress, token.trim()),
      );

      if (result.kind === 'valid') {
        void vscode.window.showInformationMessage(
          vscode.l10n.t('Connected to Gitea as {0}.', result.user.username),
        );
        return;
      }

      const retry = await vscode.window.showErrorMessage(
        result.kind === 'unauthorized'
          ? vscode.l10n.t('The personal access token was not accepted. Check the token and try again.')
          : vscode.l10n.t('Could not reach the Gitea server or read a valid user profile. Check the address and try again.'),
        vscode.l10n.t('Try Again'),
      );
      if (!retry) return;
    }
  }

  private connectionServiceServerAddress(): string | undefined {
    return this.connectionService.getServerAddress();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const connectionService = new GiteaConnectionService(context, new GiteaApiClient());
  const command = new ConnectServerCommand(connectionService);
  context.subscriptions.push(
    vscode.commands.registerCommand('gitea.connectServer', () => command.execute()),
  );
  registerPullRequestFeatures(context, connectionService);
  registerNotificationFeatures(context, connectionService);
}

export function deactivate(): void {}

function parseServerUrl(input: string): URL | undefined {
  try {
    const url = new URL(input.trim());
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname || url.username || url.password) {
      return undefined;
    }
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return undefined;
  }
}

function ensureTrailingSlash(url: URL): URL {
  const normalized = new URL(url.toString());
  if (!normalized.pathname.endsWith('/')) normalized.pathname += '/';
  return normalized;
}

function isGiteaUser(value: unknown): value is GiteaUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return Number.isInteger(user.id) && typeof user.username === 'string' && user.username.length > 0;
}
