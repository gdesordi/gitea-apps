import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const connectCommand = vscode.commands.registerCommand(
    'gitea.connectServer',
    async () => {
      const serverAddress = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter the Gitea server address'),
        placeHolder: 'https://gitea.example.com',
        ignoreFocusOut: true,
      });
      if (!serverAddress) return;

      const personalAccessToken = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter a personal access token'),
        password: true,
        ignoreFocusOut: true,
      });
      if (!personalAccessToken) return;

      void vscode.window.showInformationMessage(
        vscode.l10n.t('Connection validation will be implemented after requirements are refined.'),
      );
    },
  );
  context.subscriptions.push(connectCommand);
}

export function deactivate(): void {}
