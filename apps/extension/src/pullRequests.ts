import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const createFormContextKey = 'gitea.pullRequestFormActive';

class ToolkitOutput {
  private readonly channel = vscode.window.createOutputChannel(vscode.l10n.t('Gitea Classic Toolkit'));

  info(message: string): void {
    this.append('INFO', message);
  }

  error(message: string): void {
    this.append('ERROR', message);
    this.show();
  }

  show(): void {
    this.channel.show(true);
  }

  dispose(): void {
    this.channel.dispose();
  }

  private append(level: 'INFO' | 'ERROR', message: string): void {
    this.channel.appendLine(`${new Date().toISOString()} [${level}] ${message}`);
  }
}

interface GiteaPullRequest {
  number: number;
  title: string;
  body?: string;
  state: string;
  created_at: string;
  user?: { login?: string; username?: string };
  html_url?: string;
  base?: { sha?: string; ref?: string };
  head?: { sha?: string; ref?: string };
}

interface GiteaCommit {
  sha: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
  author?: { username?: string; login?: string };
}

interface GiteaChangedFile {
  filename: string;
  previous_filename?: string;
  status: string;
}

interface GiteaFileContent {
  type: string;
  encoding?: string;
  content?: string;
}

interface GiteaRepository {
  default_branch: string;
}

interface GiteaBranch {
  name: string;
}

interface RepositoryTarget {
  root: string;
  owner: string;
  repo: string;
  remoteName: string;
  currentBranch: string;
}

interface CreateFormState {
  baseBranch: string;
  branches: string[];
  currentBranch: string;
  files: string[];
  blockedByChanges: boolean;
}

type PullRequestGroup = 'open' | 'closed';

type PullRequestNode =
  | { kind: 'group'; group: PullRequestGroup; label: string }
  | { kind: 'pullRequest'; pullRequest: GiteaPullRequest }
  | { kind: 'details'; section: 'files' | 'commits'; pullRequest: GiteaPullRequest }
  | { kind: 'file'; file: GiteaChangedFile; pullRequest: GiteaPullRequest; owner: string; repo: string }
  | { kind: 'commit'; commit: GiteaCommit };

class GiteaPullRequestsApi {
  constructor(
    private readonly getServerUrl: () => string | undefined,
    private readonly getToken: () => Promise<string | undefined>,
    private readonly output: ToolkitOutput,
  ) {}

  async getRepository(owner: string, repo: string): Promise<GiteaRepository> {
    return this.request<GiteaRepository>(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }

  async getPullRequest(owner: string, repo: string, index: number): Promise<GiteaPullRequest> {
    return this.request<GiteaPullRequest>(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${index}`);
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    const branches: string[] = [];
    const pageSize = 50;
    for (let page = 1; ; page += 1) {
      const result = await this.request<GiteaBranch[]>(
        `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?page=${page}&limit=${pageSize}`,
      );
      branches.push(...result.map((branch) => branch.name));
      if (result.length < pageSize) return branches;
    }
  }

  async getPullRequests(owner: string, repo: string, state: PullRequestGroup): Promise<GiteaPullRequest[]> {
    const pullRequests: GiteaPullRequest[] = [];
    const pageSize = 50;
    for (let page = 1; ; page += 1) {
      const result = await this.request<GiteaPullRequest[]>(
        `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${state}&page=${page}&limit=${pageSize}`,
      );
      pullRequests.push(...result);
      if (result.length < pageSize) break;
    }
    return pullRequests
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, 20);
  }

  async createPullRequest(
    owner: string,
    repo: string,
    input: { title: string; body: string; head: string; base: string },
  ): Promise<void> {
    await this.request<GiteaPullRequest>(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getPullRequestCommits(owner: string, repo: string, index: number): Promise<GiteaCommit[]> {
    return this.getPages<GiteaCommit[]>(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${index}/commits`);
  }

  async getPullRequestFiles(owner: string, repo: string, index: number): Promise<GiteaChangedFile[]> {
    return this.getPages<GiteaChangedFile[]>(`repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${index}/files`);
  }

  async getFileContent(owner: string, repo: string, filePath: string, ref: string): Promise<string> {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    const file = await this.request<GiteaFileContent>(
      `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    );
    if (file.type !== 'file' || file.encoding !== 'base64' || typeof file.content !== 'string') {
      throw new Error(vscode.l10n.t('The selected file cannot be displayed as text.'));
    }
    const content = Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8');
    if (content.includes('\0')) throw new Error(vscode.l10n.t('The selected file cannot be displayed as text.'));
    return content;
  }

  private async getPages<T extends unknown[]>(path: string): Promise<T> {
    const results: unknown[] = [];
    const pageSize = 50;
    for (let page = 1; ; page += 1) {
      const result = await this.request<unknown[]>(`${path}?page=${page}&limit=${pageSize}`);
      results.push(...result);
      if (result.length < pageSize) return results as T;
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const method = init.method ?? 'GET';
    const endpoint = `/api/v1/${path}`;
    const serverAddress = this.getServerUrl();
    const token = await this.getToken();
    if (!serverAddress || !token) {
      this.output.error(vscode.l10n.t('API request blocked because no Gitea server or saved token is available.'));
      throw new Error(vscode.l10n.t('Connect to a Gitea server first.'));
    }

    const baseUrl = ensureTrailingSlash(new URL(serverAddress));
    const startedAt = Date.now();
    this.output.info(`[API] ${method} ${endpoint}`);
    let response: Response;
    try {
      response = await fetch(new URL(endpoint.slice(1), baseUrl), {
        ...init,
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      this.output.error(vscode.l10n.t('API request failed: {0} {1} — {2}', method, endpoint, errorMessage(error)));
      throw error;
    }
    const duration = Date.now() - startedAt;
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.output.error(vscode.l10n.t('API returned HTTP {0} for {1} {2} ({3} ms).', response.status, method, endpoint, duration));
      throw new Error(detail || `${response.status} ${response.statusText}`);
    }
    this.output.info(vscode.l10n.t('API request completed: {0} {1} — HTTP {2} ({3} ms).', method, endpoint, response.status, duration));
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }
}

class PullRequestTreeProvider implements vscode.TreeDataProvider<PullRequestNode> {
  private readonly changeEmitter = new vscode.EventEmitter<PullRequestNode | undefined | null | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(
    private readonly api: GiteaPullRequestsApi,
    private readonly getTarget: () => Promise<RepositoryTarget>,
    private readonly output: ToolkitOutput,
  ) {}

  getTreeItem(node: PullRequestNode): vscode.TreeItem {
    if (node.kind === 'group') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = `pullRequestGroup.${node.group}`;
      return item;
    }

    if (node.kind === 'details') {
      const label = node.section === 'files' ? vscode.l10n.t('Files') : vscode.l10n.t('Commits');
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'pullRequestDetailsGroup';
      return item;
    }

    if (node.kind === 'file') {
      const item = new vscode.TreeItem(node.file.filename, vscode.TreeItemCollapsibleState.None);
      item.description = vscode.l10n.t(node.file.status);
      if (node.file.previous_filename) item.tooltip = vscode.l10n.t('Renamed from {0}', node.file.previous_filename);
      item.contextValue = 'pullRequestChangedFile';
      const basePath = node.file.previous_filename ?? node.file.filename;
      if (node.pullRequest.base?.sha && node.pullRequest.head?.sha) {
        const left = makePullRequestFileUri(node.owner, node.repo, basePath, node.pullRequest.base.sha, 'base', node.file.status === 'added');
        const right = makePullRequestFileUri(node.owner, node.repo, node.file.filename, node.pullRequest.head.sha, 'head', node.file.status === 'removed');
        item.command = {
          command: 'vscode.diff',
          title: vscode.l10n.t('Compare Pull Request File'),
          arguments: [left, right, `${basePath} ↔ ${node.file.filename}`],
        };
      }
      return item;
    }

    if (node.kind === 'commit') {
      const item = new vscode.TreeItem(node.commit.commit?.message?.split(/\r?\n/, 1)[0] || node.commit.sha.slice(0, 7), vscode.TreeItemCollapsibleState.None);
      const date = node.commit.commit?.author?.date;
      const author = node.commit.author?.username ?? node.commit.author?.login ?? node.commit.commit?.author?.name ?? '';
      item.description = date ? `${author} · ${new Date(date).toLocaleString()}` : author;
      item.tooltip = date ? `${node.commit.commit?.message ?? ''}\n${new Date(date).toLocaleString()}` : node.commit.commit?.message;
      return item;
    }

    const pullRequest = node.pullRequest;
    const item = new vscode.TreeItem(`#${pullRequest.number} ${pullRequest.title}`, vscode.TreeItemCollapsibleState.Collapsed);
    item.description = pullRequest.user?.username ?? pullRequest.user?.login;
    item.tooltip = pullRequest.body || pullRequest.title;
    item.contextValue = 'pullRequest';
    return item;
  }

  async getChildren(node?: PullRequestNode): Promise<PullRequestNode[]> {
    if (!node) {
      return [
        { kind: 'group', group: 'open', label: vscode.l10n.t('Open') },
        { kind: 'group', group: 'closed', label: vscode.l10n.t('Closed') },
      ];
    }
    if (node.kind === 'pullRequest') {
      return [
        { kind: 'details', section: 'files', pullRequest: node.pullRequest },
        { kind: 'details', section: 'commits', pullRequest: node.pullRequest },
      ];
    }

    if (node.kind === 'details') {
      try {
        const target = await this.getTarget();
        const pullRequest = await this.api.getPullRequest(target.owner, target.repo, node.pullRequest.number);
        if (node.section === 'files') {
          const files = await this.api.getPullRequestFiles(target.owner, target.repo, pullRequest.number);
          return files.map((file) => ({ kind: 'file', file, pullRequest, owner: target.owner, repo: target.repo }));
        }
        const commits = await this.api.getPullRequestCommits(target.owner, target.repo, pullRequest.number);
        return commits.map((commit) => ({ kind: 'commit', commit }));
      } catch (error) {
        const message = errorMessage(error);
        void vscode.window.showErrorMessage(vscode.l10n.t('Could not load Pull Request details: {0}', message));
        this.output.error(vscode.l10n.t('Could not load Pull Request details: {0}', message));
        return [];
      }
    }
    if (node.kind !== 'group') return [];

    try {
      const target = await this.getTarget();
      this.output.info(vscode.l10n.t('Loading {0} Pull Requests for {1}/{2}.', node.label, target.owner, target.repo));
      const pullRequests = await this.api.getPullRequests(target.owner, target.repo, node.group);
      this.output.info(vscode.l10n.t('Loaded {0} {1} Pull Requests for {2}/{3}.', pullRequests.length, node.label, target.owner, target.repo));
      return pullRequests.map((pullRequest) => ({ kind: 'pullRequest', pullRequest }));
    } catch (error) {
      const message = errorMessage(error);
      this.output.error(vscode.l10n.t('Could not load Pull Requests: {0}', message));
      void vscode.window.showErrorMessage(vscode.l10n.t('Could not load Pull Requests: {0}', message));
      return [];
    }
  }

  refresh(): void {
    this.output.info(vscode.l10n.t('Refreshing the Pull Request tree.'));
    this.changeEmitter.fire();
  }
}

class PullRequestFileContentProvider implements vscode.TextDocumentContentProvider {
  constructor(private readonly api: GiteaPullRequestsApi) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const request = JSON.parse(decodeURIComponent(uri.query)) as { owner: string; repo: string; path: string; sha: string; empty: boolean };
    if (request.empty) return '';
    try {
      return await this.api.getFileContent(request.owner, request.repo, request.path, request.sha);
    } catch (error) {
      const message = errorMessage(error);
      void vscode.window.showErrorMessage(vscode.l10n.t('Could not load Pull Request file for comparison: {0}', message));
      throw error;
    }
  }
}

function makePullRequestFileUri(
  owner: string,
  repo: string,
  filePath: string,
  sha: string,
  side: 'base' | 'head',
  empty: boolean,
): vscode.Uri {
  const identity = {
    owner,
    repo,
    path: filePath,
    sha,
    empty,
  };
  return vscode.Uri.from({
    scheme: 'gitea-pr',
    path: `/${side}/${filePath}`,
    query: encodeURIComponent(JSON.stringify(identity)),
  });
}

class PullRequestFilesProvider implements vscode.TreeDataProvider<string> {
  private readonly changeEmitter = new vscode.EventEmitter<string | undefined | null | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private files: string[] = [];

  getTreeItem(file: string): vscode.TreeItem {
    const item = new vscode.TreeItem(file, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'pullRequestChangedFile';
    return item;
  }

  getChildren(): string[] {
    return this.files;
  }

  setFiles(files: string[]): void {
    this.files = files;
    this.changeEmitter.fire();
  }
}

class PullRequestFormProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private active = false;
  private currentState: CreateFormState | undefined;
  private titleDraft = '';
  private bodyDraft = '';
  private resolveViewReady: (() => void) | undefined;

  constructor(
    private readonly api: GiteaPullRequestsApi,
    private readonly getTarget: () => Promise<RepositoryTarget>,
    private readonly filesProvider: PullRequestFilesProvider,
    private readonly output: ToolkitOutput,
    private readonly refreshPullRequests: () => void,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.resolveViewReady?.();
    this.resolveViewReady = undefined;
    view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage((message: unknown) => this.handleMessage(message));
    view.onDidChangeVisibility(() => {
      if (this.view === view && !view.visible && this.active) {
        this.output.info(vscode.l10n.t('The creation view became hidden; treating it as cancelled.'));
        void this.cancel();
      }
    });
    view.onDidDispose(() => {
      if (this.view === view) this.view = undefined;
    });
    if (this.active) view.show(false);
    this.output.info(vscode.l10n.t('Pull Request webview resolved by VS Code.'));
  }

  async open(): Promise<void> {
    this.output.info(vscode.l10n.t('The Add Pull Request action was invoked.'));
    this.output.show();
    this.active = true;
    const viewReady = this.waitForViewResolution();
    try {
      this.output.info(vscode.l10n.t('Revealing the Pull Request creation container.'));
      await vscode.commands.executeCommand('setContext', createFormContextKey, true);
      await vscode.commands.executeCommand('workbench.view.extension.giteaPullRequestCreation');
      this.output.info(vscode.l10n.t('Pull Request creation view enabled; waiting for VS Code to resolve it.'));
      await viewReady;
      if (!this.view) {
        throw new Error(vscode.l10n.t('VS Code did not resolve the Pull Request creation webview.'));
      }
      this.view.show(false);
      this.output.info(vscode.l10n.t('Pull Request creation container opened.'));
      await this.updateForm();
    } catch (error) {
      this.output.error(vscode.l10n.t('Could not open the Pull Request creation container: {0}', errorMessage(error)));
      void vscode.window.showErrorMessage(vscode.l10n.t('Could not open the Pull Request creation container: {0}', errorMessage(error)));
    }
  }

  private waitForViewResolution(): Promise<void> {
    if (this.view) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.resolveViewReady = undefined;
        reject(new Error(vscode.l10n.t('Timed out waiting for VS Code to resolve the Pull Request creation view.')));
      }, 15_000);
      this.resolveViewReady = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  }

  async dispose(): Promise<void> {
    this.active = false;
    await vscode.commands.executeCommand('setContext', createFormContextKey, false);
  }

  private async updateForm(baseBranch?: string): Promise<void> {
    if (!this.view) return;
    try {
      this.output.info(vscode.l10n.t('Preparing Pull Request form context.'));
      const target = await this.getTarget();
      this.output.info(vscode.l10n.t('Loading repository metadata and branches for {0}/{1}.', target.owner, target.repo));
      const [repository, branches, status] = await Promise.all([
        this.api.getRepository(target.owner, target.repo),
        this.api.getBranches(target.owner, target.repo),
        git(target.root, ['status', '--porcelain', '--untracked-files=all']),
      ]);
      const dirty = status.stdout.trim().length > 0;
      const branchIsPublished = branches.includes(target.currentBranch);
      const chosenBase = baseBranch && branches.includes(baseBranch) ? baseBranch : repository.default_branch;
      this.output.info(vscode.l10n.t('Repository metadata loaded: default branch {0}; {1} branches found.', repository.default_branch, branches.length));
      this.output.info(vscode.l10n.t(branchIsPublished ? 'Source branch {0} is published on origin.' : 'Source branch {0} is not published on origin.', target.currentBranch));
      this.output.info(vscode.l10n.t(dirty ? 'The working tree has uncommitted changes.' : 'The working tree is clean.'));
      this.output.info(vscode.l10n.t('Comparing origin branches {0}...{1}.', chosenBase, target.currentBranch));
      const files = branchIsPublished
        ? await getChangedFiles(target, chosenBase)
        : [];
      this.output.info(vscode.l10n.t('Found {0} changed files.', files.length));
      this.filesProvider.setFiles(files);
      this.currentState = {
        baseBranch: chosenBase,
        branches,
        currentBranch: target.currentBranch,
        files,
        blockedByChanges: dirty || !branchIsPublished,
      };
      this.view.webview.html = this.renderHtml(this.view.webview, {
        ...this.currentState,
        dirty,
        branchIsPublished,
      });
      this.output.info(vscode.l10n.t('Pull Request form is ready.'));
    } catch (error) {
      this.output.error(vscode.l10n.t('Pull Request form preparation failed: {0}', errorMessage(error)));
      void vscode.window.showErrorMessage(vscode.l10n.t('Could not prepare the Pull Request form: {0}', errorMessage(error)));
      this.view.webview.html = this.renderErrorHtml(this.view.webview, errorMessage(error));
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isRecord(message) || typeof message.command !== 'string') return;
    if (message.command === 'cancel') {
      await this.cancel();
      return;
    }
    if (message.command === 'baseChanged' && typeof message.baseBranch === 'string') {
      this.titleDraft = typeof message.title === 'string' ? message.title : this.titleDraft;
      this.bodyDraft = typeof message.body === 'string' ? message.body : this.bodyDraft;
      this.output.info(vscode.l10n.t('The base branch was changed to {0}.', message.baseBranch));
      await this.updateForm(message.baseBranch);
      return;
    }
    if (message.command === 'draftChanged' && typeof message.title === 'string' && typeof message.body === 'string') {
      this.titleDraft = message.title;
      this.bodyDraft = message.body;
      return;
    }
    if (message.command === 'retry') {
      this.output.info(vscode.l10n.t('Retrying Pull Request form preparation.'));
      await this.updateForm();
      return;
    }
    if (message.command !== 'create' || typeof message.title !== 'string' || typeof message.body !== 'string') return;

    const title = message.title.trim();
    if (!title) {
      this.output.error(vscode.l10n.t('Pull Request creation blocked because the title is empty.'));
      await this.view?.webview.postMessage({ command: 'validationError', message: vscode.l10n.t('A title is required.') });
      return;
    }
    if (!this.currentState || this.currentState.blockedByChanges) {
      this.output.error(vscode.l10n.t('Pull Request creation blocked by repository state.'));
      await this.view?.webview.postMessage({ command: 'validationError', message: vscode.l10n.t('Resolve the repository changes before creating a Pull Request.') });
      return;
    }
    if (this.currentState.baseBranch === this.currentState.currentBranch) {
      this.output.error(vscode.l10n.t('Pull Request creation blocked because source and base branches are the same.'));
      await this.view?.webview.postMessage({ command: 'validationError', message: vscode.l10n.t('Choose a base branch different from the source branch.') });
      return;
    }

    try {
      const target = await this.getTarget();
      this.output.info(vscode.l10n.t('Submitting Pull Request for {0}/{1}: {2} → {3}.', target.owner, target.repo, this.currentState.currentBranch, this.currentState.baseBranch));
      await this.api.createPullRequest(target.owner, target.repo, {
        title,
        body: message.body,
        head: this.currentState.currentBranch,
        base: this.currentState.baseBranch,
      });
      this.output.info(vscode.l10n.t('Pull Request was created successfully.'));
      void vscode.window.showInformationMessage(vscode.l10n.t('Pull Request created successfully.'));
      this.refreshPullRequests();
      this.titleDraft = '';
      this.bodyDraft = '';
      await this.cancel();
    } catch (error) {
      this.output.error(vscode.l10n.t('Pull Request creation failed; see the API response status above.'));
      await this.view?.webview.postMessage({
        command: 'creationError',
        message: vscode.l10n.t('Could not create Pull Request: {0}', errorMessage(error)),
      });
    }
  }

  private async cancel(): Promise<void> {
    if (this.active) this.output.info(vscode.l10n.t('Pull Request creation was cancelled.'));
    this.active = false;
    this.titleDraft = '';
    this.bodyDraft = '';
    await vscode.commands.executeCommand('setContext', createFormContextKey, false);
  }

  private renderHtml(webview: vscode.Webview, state: CreateFormState & { dirty: boolean; branchIsPublished: boolean }): string {
    const nonce = createNonce();
    const optionMarkup = state.branches
      .map((branch) => `<option value="${escapeHtml(branch)}" ${branch === state.baseBranch ? 'selected' : ''}>${escapeHtml(branch)}</option>`)
      .join('');
    const filesMarkup = state.files.length
      ? `<ul>${state.files.map((file) => `<li>${escapeHtml(file)}</li>`).join('')}</ul>`
      : `<p class="muted">${escapeHtml(vscode.l10n.t('No changed files to display.'))}</p>`;
    const sameBranch = state.baseBranch === state.currentBranch;
    const blocked = state.blockedByChanges || sameBranch;
    const warnings = [
      state.dirty ? vscode.l10n.t('Uncommitted changes were found. Commit or discard them before creating the Pull Request.') : '',
      !state.branchIsPublished ? vscode.l10n.t('The current branch is not published to the configured remote.') : '',
      sameBranch ? vscode.l10n.t('Choose a base branch different from the source branch.') : '',
    ].filter(Boolean);

    return `<!DOCTYPE html>
<html lang="${escapeHtml(vscode.env.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'">
  <title>${escapeHtml(vscode.l10n.t('Create Pull Request'))}</title>
  <style nonce="${nonce}">
    body { padding: 0 12px 12px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
    label { display: block; margin: 12px 0 5px; font-weight: 600; }
    input, textarea, select { box-sizing: border-box; width: 100%; padding: 6px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); }
    textarea { min-height: 100px; resize: vertical; }
    input[readonly] { opacity: .8; }
    .row { margin: 8px 0; }
    .warning, .error { color: var(--vscode-errorForeground); }
    .muted { color: var(--vscode-descriptionForeground); }
    ul { padding-left: 20px; }
    li { overflow-wrap: anywhere; }
    .actions { display: flex; gap: 8px; margin-top: 14px; }
    button { padding: 6px 12px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    button:disabled { opacity: .5; cursor: default; }
  </style>
</head>
<body>
  <h2>${escapeHtml(vscode.l10n.t('Create Pull Request'))}</h2>
  <div class="row"><label for="base">${escapeHtml(vscode.l10n.t('Base branch'))}</label><select id="base">${optionMarkup}</select></div>
  <div class="row"><label for="head">${escapeHtml(vscode.l10n.t('Source branch'))}</label><input id="head" value="${escapeHtml(state.currentBranch)}" readonly></div>
  <div class="row"><label for="title">${escapeHtml(vscode.l10n.t('Title'))}</label><input id="title" maxlength="255" autocomplete="off" value="${escapeHtml(this.titleDraft)}"></div>
  <div class="row"><label for="body">${escapeHtml(vscode.l10n.t('Description'))}</label><textarea id="body">${escapeHtml(this.bodyDraft)}</textarea></div>
  <div id="warning" class="warning">${warnings.map(escapeHtml).join('<br>')}</div>
  <div id="error" class="error" role="alert"></div>
  <h3>${escapeHtml(vscode.l10n.t('Changed files'))}</h3>
  <div id="files">${filesMarkup}</div>
  <div class="actions">
    <button class="secondary" id="cancel">${escapeHtml(vscode.l10n.t('Cancel'))}</button>
    <button id="create" ${blocked || state.branches.length === 0 ? 'disabled' : ''}>${escapeHtml(vscode.l10n.t('Create'))}</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const base = document.getElementById('base');
    const title = document.getElementById('title');
    const body = document.getElementById('body');
    const error = document.getElementById('error');
    document.getElementById('cancel').addEventListener('click', () => vscode.postMessage({ command: 'cancel' }));
    document.getElementById('create').addEventListener('click', () => vscode.postMessage({ command: 'create', title: title.value, body: body.value }));
    base.addEventListener('change', () => vscode.postMessage({ command: 'baseChanged', baseBranch: base.value, title: title.value, body: body.value }));
    const saveDraft = () => vscode.postMessage({ command: 'draftChanged', title: title.value, body: body.value });
    title.addEventListener('input', saveDraft);
    body.addEventListener('input', saveDraft);
    window.addEventListener('message', event => {
      if (event.data.command === 'validationError' || event.data.command === 'creationError') error.textContent = event.data.message;
    });
  </script>
</body>
</html>`;
  }

  private renderErrorHtml(webview: vscode.Webview, message: string): string {
    const nonce = createNonce();
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'"><style nonce="${nonce}">body{font-family:var(--vscode-font-family);color:var(--vscode-foreground)}button{padding:6px 12px}</style></head><body><p role="alert">${escapeHtml(message)}</p><button id="retry">${escapeHtml(vscode.l10n.t('Retry'))}</button><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.getElementById('retry').addEventListener('click',()=>vscode.postMessage({command:'retry'}))</script></body></html>`;
  }
}

class PullRequestCommands {
  constructor(
    private readonly formProvider: PullRequestFormProvider,
    private readonly treeProvider: PullRequestTreeProvider,
    private readonly output: ToolkitOutput,
  ) {}

  async create(): Promise<void> {
    await this.formProvider.open();
  }

  refresh(): void {
    this.treeProvider.refresh();
  }

  async openInBrowser(node: unknown): Promise<void> {
    if (!isRecord(node) || node.kind !== 'pullRequest' || !isRecord(node.pullRequest)) return;
    const url = node.pullRequest.html_url;
    if (typeof url !== 'string') return;
    try {
      const uri = vscode.Uri.parse(url);
      if (uri.scheme !== 'http' && uri.scheme !== 'https') throw new Error(vscode.l10n.t('The Pull Request URL is invalid.'));
      await vscode.env.openExternal(uri);
    } catch (error) {
      void vscode.window.showErrorMessage(vscode.l10n.t('Could not open Pull Request in browser: {0}', errorMessage(error)));
    }
  }
}

export function registerPullRequestFeatures(
  context: vscode.ExtensionContext,
  connection: { getServerAddress(): string | undefined; getAccessToken(): Promise<string | undefined> },
): void {
  const output = new ToolkitOutput();
  const api = new GiteaPullRequestsApi(() => connection.getServerAddress(), () => connection.getAccessToken(), output);
  const getTarget = createRepositoryTargetResolver(() => connection.getServerAddress(), output);
  const filesProvider = new PullRequestFilesProvider();
  const treeProvider = new PullRequestTreeProvider(api, getTarget, output);
  const formProvider = new PullRequestFormProvider(api, getTarget, filesProvider, output, () => treeProvider.refresh());
  const fileContentProvider = new PullRequestFileContentProvider(api);
  const commands = new PullRequestCommands(formProvider, treeProvider, output);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('gitea.pullRequests', treeProvider),
    vscode.window.registerTreeDataProvider('gitea.pullRequestFiles', filesProvider),
    vscode.window.registerWebviewViewProvider('gitea.pullRequestForm', formProvider),
    vscode.workspace.registerTextDocumentContentProvider('gitea-pr', fileContentProvider),
    vscode.commands.registerCommand('gitea.refreshPullRequests', () => commands.refresh()),
    vscode.commands.registerCommand('gitea.createPullRequest', () => commands.create()),
    vscode.commands.registerCommand('gitea.openPullRequest', (node: unknown) => commands.openInBrowser(node)),
    formProvider,
    output,
  );
}

function createRepositoryTargetResolver(
  getServerAddress: () => string | undefined,
  output: ToolkitOutput,
): () => Promise<RepositoryTarget> {
  return async () => {
    output.info(vscode.l10n.t('Resolving workspace repository and origin remote.'));
    try {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) throw new Error(vscode.l10n.t('Open a Git repository in the workspace first.'));
      const serverAddress = getServerAddress();
      if (!serverAddress) throw new Error(vscode.l10n.t('Connect to a Gitea server first.'));

      const remotes = await git(root, ['remote', '-v']);
      const originLine = remotes.stdout.split(/\r?\n/).find((line) => /^origin\s+\S+\s+\(fetch\)$/.test(line));
      if (!originLine) throw new Error(vscode.l10n.t('The Git repository does not have an origin remote.'));
      const remoteUrl = originLine.replace(/^origin\s+/, '').replace(/\s+\(fetch\)$/, '');
      const parsedRemote = parseRemoteRepository(remoteUrl);
      const parsedServer = new URL(serverAddress);
      if (!parsedRemote || parsedRemote.host.toLowerCase() !== parsedServer.host.toLowerCase()) {
        throw new Error(vscode.l10n.t('The origin remote does not match the configured Gitea server.'));
      }
      const serverPrefix = parsedServer.pathname.replace(/\/$/, '');
      if (serverPrefix && parsedRemote.pathPrefix !== serverPrefix) {
        throw new Error(vscode.l10n.t('The origin remote does not match the configured Gitea server.'));
      }
      const currentBranch = (await git(root, ['branch', '--show-current'])).stdout.trim();
      if (!currentBranch) throw new Error(vscode.l10n.t('The current Git branch could not be determined.'));
      const target = {
        root,
        owner: parsedRemote.owner,
        repo: parsedRemote.repo,
        remoteName: 'origin',
        currentBranch,
      };
      output.info(vscode.l10n.t('Resolved repository {0}/{1} on {2}, branch {3} ({4}).', target.owner, target.repo, parsedRemote.host, target.currentBranch, basename(root)));
      return target;
    } catch (error) {
      output.error(vscode.l10n.t('Workspace repository resolution failed: {0}', errorMessage(error)));
      throw error;
    }
  };
}

function parseRemoteRepository(remote: string): { host: string; pathPrefix: string; owner: string; repo: string } | undefined {
  let host: string;
  let pathname: string;
  try {
    if (/^[^/@:]+@[^/:]+:/.test(remote)) {
      const match = remote.match(/^[^/@:]+@([^/:]+):(.+)$/);
      if (!match) return undefined;
      host = match[1];
      pathname = `/${match[2]}`;
    } else {
      const url = new URL(remote);
      if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'ssh:') return undefined;
      host = url.host;
      pathname = url.pathname;
    }
  } catch {
    return undefined;
  }
  pathname = pathname.replace(/\.git$/i, '').replace(/\/$/, '');
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  const owner = parts.at(-2);
  const repo = parts.at(-1);
  const pathPrefix = parts.length > 2 ? `/${parts.slice(0, -2).join('/')}` : '';
  return owner && repo ? { host, pathPrefix, owner, repo } : undefined;
}

async function getChangedFiles(target: RepositoryTarget, baseBranch: string): Promise<string[]> {
  const baseRef = `refs/remotes/${target.remoteName}/${baseBranch}`;
  const headRef = `refs/remotes/${target.remoteName}/${target.currentBranch}`;
  const [baseExists, headExists] = await Promise.all([
    git(target.root, ['rev-parse', '--verify', '--quiet', baseRef], true),
    git(target.root, ['rev-parse', '--verify', '--quiet', headRef], true),
  ]);
  if (baseExists.exitCode !== 0 || headExists.exitCode !== 0) {
    throw new Error(vscode.l10n.t('Remote branch data is unavailable. Fetch origin and retry.'));
  }
  const diff = await git(target.root, ['diff', '--name-only', '--no-renames', `${baseRef}...${headRef}`]);
  return diff.stdout.split(/\r?\n/).filter(Boolean);
}

async function git(root: string, args: string[], allowFailure = false): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execFileAsync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error) {
    const result = error as Error & { stdout?: string; stderr?: string; code?: number | string };
    if (allowFailure) {
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: typeof result.code === 'number' ? result.code : 1,
      };
    }
    throw new Error(result.stderr?.trim() || result.message);
  }
}

function ensureTrailingSlash(url: URL): URL {
  const normalized = new URL(url.toString());
  if (!normalized.pathname.endsWith('/')) normalized.pathname += '/';
  return normalized;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function createNonce(): string {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}
