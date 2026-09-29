import * as vscode from 'vscode';

interface NotificationThread {
  id: number | string;
  unread?: boolean;
  updated_at?: string;
  repository?: { full_name?: string; name?: string };
  subject?: {
    title?: string;
    type?: string;
    html_url?: string;
    url?: string;
    user?: { login?: string; username?: string };
    author?: { login?: string; username?: string };
  };
  user?: { login?: string; username?: string };
  author?: { login?: string; username?: string };
}

type NotificationNode =
  | { kind: 'notification'; thread: NotificationThread }
  | { kind: 'loadMore' };

class GiteaNotificationsApi {
  constructor(
    private readonly getServerUrl: () => string | undefined,
    private readonly getToken: () => Promise<string | undefined>,
  ) {}

  async getUnreadNotifications(page: number, limit: number): Promise<NotificationThread[]> {
    const query = new URLSearchParams({ 'status-types': 'unread', page: String(page), limit: String(limit) });
    const value: unknown = await this.request(`notifications?${query.toString()}`);
    if (!Array.isArray(value)) throw new Error(vscode.l10n.t('The Gitea server returned an invalid notifications response.'));
    return value.filter(isNotificationThread);
  }

  async markAsRead(id: number | string): Promise<void> {
    await this.request(`notifications/threads/${encodeURIComponent(String(id))}?to-status=read`, { method: 'PATCH' });
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const serverAddress = this.getServerUrl();
    const token = await this.getToken();
    if (!serverAddress || !token) throw new Error(vscode.l10n.t('Connect to a Gitea server first.'));
    const baseUrl = ensureTrailingSlash(new URL(serverAddress));
    const response = await fetch(new URL(`api/v1/${path}`, baseUrl), {
      ...init,
      headers: { Authorization: `token ${token}`, Accept: 'application/json', ...init.headers },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `${response.status} ${response.statusText}`);
    }
    if (response.status === 204 || response.status === 205) return undefined;
    return await response.json();
  }
}

class NotificationsTreeProvider implements vscode.TreeDataProvider<NotificationNode> {
  private readonly changeEmitter = new vscode.EventEmitter<NotificationNode | undefined | null | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private threads: NotificationThread[] = [];
  private nextPage = 1;
  private hasMore = true;
  private loading = false;
  private loadError: string | undefined;
  private treeView: vscode.TreeView<NotificationNode> | undefined;

  constructor(private readonly api: GiteaNotificationsApi) {}

  getTreeItem(node: NotificationNode): vscode.TreeItem {
    if (node.kind === 'loadMore') {
      const item = new vscode.TreeItem(vscode.l10n.t('Load more notifications'), vscode.TreeItemCollapsibleState.None);
      item.command = { command: 'gitea.loadMoreNotifications', title: vscode.l10n.t('Load more notifications') };
      item.iconPath = new vscode.ThemeIcon('more');
      return item;
    }

    const thread = node.thread;
    const subject = thread.subject ?? {};
    const title = subject.title?.trim() || vscode.l10n.t('Untitled notification');
    const type = notificationType(subject.type);
    const item = new vscode.TreeItem(title, vscode.TreeItemCollapsibleState.None);
    const repository = thread.repository?.full_name ?? thread.repository?.name;
    const author = subject.author?.username ?? subject.author?.login ?? subject.user?.username ?? subject.user?.login
      ?? thread.author?.username ?? thread.author?.login ?? thread.user?.username ?? thread.user?.login;
    const updated = thread.updated_at ? formatDate(thread.updated_at) : undefined;
    item.description = [type, repository, author, updated].filter(Boolean).join(' · ');
    item.tooltip = item.description ? `${title}\n${item.description}` : title;
    item.contextValue = 'giteaNotification';
    item.iconPath = new vscode.ThemeIcon('bell-dot');
    const subjectUrl = subject.html_url;
    if (subjectUrl && isSafeHttpUrl(subjectUrl)) {
      item.command = {
        command: 'vscode.open',
        title: vscode.l10n.t('Open notification subject'),
        arguments: [vscode.Uri.parse(subjectUrl)],
      };
    }
    return item;
  }

  async getChildren(): Promise<NotificationNode[]> {
    if (this.loading) return this.nodes();
    if (this.threads.length === 0 && this.nextPage === 1) await this.loadPage();
    this.updateEmptyMessage();
    return this.nodes();
  }

  async refresh(): Promise<void> {
    this.threads = [];
    this.nextPage = 1;
    this.hasMore = true;
    this.loadError = undefined;
    await this.loadPage();
    this.updateEmptyMessage();
    this.changeEmitter.fire();
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore || this.loading) return;
    this.loadError = undefined;
    await this.loadPage();
    this.updateEmptyMessage();
    this.changeEmitter.fire();
  }

  async markAsRead(thread: NotificationThread): Promise<void> {
    await this.api.markAsRead(thread.id);
    this.threads = this.threads.filter((candidate) => candidate.id !== thread.id);
    this.updateEmptyMessage();
    this.changeEmitter.fire();
  }

  setTreeView(treeView: vscode.TreeView<NotificationNode>): void {
    this.treeView = treeView;
    this.updateEmptyMessage();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  private nodes(): NotificationNode[] {
    return [
      ...this.threads.map((thread): NotificationNode => ({ kind: 'notification', thread })),
      ...(this.hasMore || this.loadError ? [{ kind: 'loadMore' as const }] : []),
    ];
  }

  private updateEmptyMessage(): void {
    if (!this.treeView) return;
    this.treeView.message = this.threads.length === 0 && !this.loading && !this.loadError
      ? vscode.l10n.t('No unread notifications.')
      : undefined;
  }

  private async loadPage(): Promise<void> {
    if (!this.hasMore || this.loading) return;
    this.loading = true;
    this.loadError = undefined;
    try {
      const pageSize = 50;
      const page = await this.api.getUnreadNotifications(this.nextPage, pageSize);
      const existingIds = new Set(this.threads.map((thread) => String(thread.id)));
      const unread = page.filter((thread) => thread.unread !== false && !existingIds.has(String(thread.id)));
      this.threads.push(...unread);
      this.threads.sort((left, right) => Date.parse(right.updated_at ?? '') - Date.parse(left.updated_at ?? ''));
      this.nextPage += 1;
      this.hasMore = page.length === pageSize;
    } catch (error) {
      this.loadError = errorMessage(error);
      if (this.threads.length === 0) {
        void vscode.window.showErrorMessage(vscode.l10n.t('Could not load notifications: {0}', this.loadError));
      } else {
        void vscode.window.showErrorMessage(vscode.l10n.t('Could not load more notifications: {0}', this.loadError));
      }
    } finally {
      this.loading = false;
    }
  }
}

export function registerNotificationFeatures(
  context: vscode.ExtensionContext,
  connection: { getServerAddress(): string | undefined; getAccessToken(): Promise<string | undefined> },
): void {
  const api = new GiteaNotificationsApi(() => connection.getServerAddress(), () => connection.getAccessToken());
  const provider = new NotificationsTreeProvider(api);
  const treeView = vscode.window.createTreeView('gitea.notifications', { treeDataProvider: provider });
  provider.setTreeView(treeView);
  context.subscriptions.push(
    treeView,
    vscode.commands.registerCommand('gitea.refreshNotifications', () => provider.refresh()),
    vscode.commands.registerCommand('gitea.loadMoreNotifications', () => provider.loadMore()),
    vscode.commands.registerCommand('gitea.markNotificationAsRead', async (node: NotificationNode) => {
      if (!node || node.kind !== 'notification') return;
      try {
        await provider.markAsRead(node.thread);
      } catch (error) {
        void vscode.window.showErrorMessage(vscode.l10n.t('Could not mark notification as read: {0}', errorMessage(error)));
      }
    }),
    provider,
  );
}

function notificationType(type: string | undefined): string {
  switch (type?.toLowerCase()) {
    case 'issue': return vscode.l10n.t('Issue');
    case 'pull':
    case 'pull_request':
    case 'pullrequest': return vscode.l10n.t('Pull Request');
    case 'commit': return vscode.l10n.t('Commit');
    case 'repository': return vscode.l10n.t('Repository');
    default: return vscode.l10n.t('Notification');
  }
}

function formatDate(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isNotificationThread(value: unknown): value is NotificationThread {
  if (typeof value !== 'object' || value === null) return false;
  const thread = value as Record<string, unknown>;
  return (typeof thread.id === 'number' || typeof thread.id === 'string') && typeof thread.id !== 'undefined';
}

function ensureTrailingSlash(url: URL): URL {
  const normalized = new URL(url.toString());
  if (!normalized.pathname.endsWith('/')) normalized.pathname += '/';
  return normalized;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
