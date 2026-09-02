import * as vscode from 'vscode';
import { renderMap } from './renderMap';
import { dataUrlToPngBuffer, defaultPngFileName } from './savePng';

// openPreviewが使うパネルの機能だけを切り出した型（テストからは偽パネルを渡せる）
export type PreviewPanel = {
	webview: Pick<vscode.Webview, 'html' | 'options' | 'asWebviewUri' | 'onDidReceiveMessage'>;
	onDidDispose: vscode.WebviewPanel['onDidDispose'];
	dispose(): void;
};

type WebviewMessage = { type?: string; dataUrl?: string; zoom?: number };

function createPanel(): PreviewPanel {
	return vscode.window.createWebviewPanel(
		'userStoryMapping.preview',
		'User Story Map',
		vscode.ViewColumn.Beside,
		{ enableScripts: true }
	);
}

export function openPreview(document: vscode.TextDocument, extensionUri: vscode.Uri, panel: PreviewPanel = createPanel()): PreviewPanel {
	const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
	let zoom = 1;
	const buildHtml = () => `${renderMap(document.getText(), { zoom })}<script src="${scriptUri}"></script>`;
	panel.webview.html = buildHtml();
	const subscription = vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document === document) {
			panel.webview.html = buildHtml();
		}
	});
	panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
		if (message.type === 'zoom' && typeof message.zoom === 'number') {
			zoom = message.zoom;
		}
		if (message.type === 'savePng' && typeof message.dataUrl === 'string') {
			const fileName = defaultPngFileName(document.getText());
			const target = await vscode.window.showSaveDialog({
				filters: { 'PNG Image': ['png'] },
				defaultUri: document.uri.scheme === 'file' ? vscode.Uri.joinPath(document.uri, '..', fileName) : undefined,
			});
			if (target !== undefined) {
				await vscode.workspace.fs.writeFile(target, dataUrlToPngBuffer(message.dataUrl));
			}
		}
	});
	panel.onDidDispose(() => subscription.dispose());
	return panel;
}
