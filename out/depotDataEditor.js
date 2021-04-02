"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const path_1 = require("path");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const util_1 = require("./util");
class DepotEditorProvider {
    constructor(context) {
        this.context = context;
    }
    static register(context) {
        vscode.commands.registerCommand('depot.newDepotFile', () => __awaiter(this, void 0, void 0, function* () {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage("Creating new Depot files currently requires opening a workspace");
                return;
            }
            let defFile = vscode.workspace.getConfiguration('depot').get('defaults.newFileName') + "";
            const result = yield vscode_1.window.showInputBox({
                value: defFile,
                valueSelection: [0, 0],
                placeHolder: 'Enter the name of the new Depot file, including the extension'
                // validateInput: text => {
                // 	window.showInformationMessage(`Validating: ${text}`);
                // 	return text === '123' ? 'Not 123!' : null;
                // }
            });
            if (result !== undefined) {
                // @ts-ignore
                const folderUri = vscode.workspace.workspaceFolders[0].uri;
                //set these in depot settings config - default file name, default template
                // @ts-ignore
                const fileUri = folderUri.with({ path: path_1.posix.join(folderUri.path, result) });
                const writeStr = '{ "sheets": []}';
                const writeData = Buffer.from(writeStr, 'utf8');
                vscode.workspace.fs.writeFile(fileUri, writeData).then(() => {
                    vscode.commands.executeCommand('vscode.openWith', fileUri, DepotEditorProvider.viewType);
                });
            }
        }));
        return vscode.window.registerCustomEditorProvider(DepotEditorProvider.viewType, new DepotEditorProvider(context), {
            webviewOptions: {
                retainContextWhenHidden: true,
            }
        });
    }
    /**
     * Called when our custom editor is opened.
     */
    resolveCustomTextEditor(document, webviewPanel, _token) {
        return __awaiter(this, void 0, void 0, function* () {
            // Setup initial content for the webview
            webviewPanel.webview.options = {
                enableScripts: true,
            };
            webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);
            function updateWebview() {
                webviewPanel.webview.postMessage({
                    type: 'update',
                    text: document.getText(),
                });
            }
            function initWebview() {
                // This is sketched in here for people to easily extend Depot by providing their own extensions
                // That allow a different route through the scaffolded code
                // let dataType = "";
                // switch (document.fileName.split('.').pop()) 
                // {
                // 	case 'dpo':
                // 		dataType = 'depot';
                // 		break;			
                // }
                let dataType = 'depot';
                webviewPanel.webview.postMessage({
                    type: 'init',
                    text: document.getText(),
                    jsonType: dataType
                });
            }
            // Hook up event handlers so that we can synchronize the webview with the text document.
            //
            // The text document acts as our model, so we have to sync change in the document to our
            // editor and sync changes in the editor back to the document.
            // 
            // Remember that a single text document can also be shared between multiple custom
            // editors (this happens for example when you split a custom editor)
            const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.uri.toString() === document.uri.toString()) {
                    updateWebview();
                }
            });
            // Make sure we get rid of the listener when our editor is closed.
            webviewPanel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
            });
            const fileOptions = {
                canSelectMany: false,
                openLabel: 'Open',
                filters: {
                    'All files': ['*'],
                    'Text files': ['txt']
                }
            };
            // Receive message from the webview.
            webviewPanel.webview.onDidReceiveMessage(e => {
                switch (e.type) {
                    // case 'validate':
                    //     this.validateFile(document);
                    //     return;
                    case 'init-view':
                        initWebview();
                        return;
                    case 'update':
                        this.updateTextDocument(document, e.data);
                        return;
                    case 'pickFile':
                        vscode.window.showOpenDialog(fileOptions).then(fileUri => {
                            console.log(fileUri);
                            if (fileUri && fileUri[0]) {
                                console.log('Selected file: ' + fileUri[0].path + ' for key: ' + e.fileKey);
                                console.log("relative location from editor to file is: " + path.relative(document.uri.path, fileUri[0].path));
                                let uriPath = webviewPanel.webview.asWebviewUri(fileUri[0]).toString();
                                console.log(uriPath);
                                webviewPanel.webview.postMessage({
                                    type: 'filePicked',
                                    filePath: path.relative(document.uri.path, fileUri[0].path),
                                    fileKey: e.fileKey
                                });
                            }
                        });
                        return;
                }
            });
            //this is only called the first time the view is created
            //it isn't called if the view is focused again after changing to a different document
            //so instead we just manage it all in svelte onMount
            // initWebview();
        });
    }
    /**
     * Get the static html used for the editor webviews.
     */
    getHtmlForWebview(webview, document) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'compiled/bundle.js')));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'compiled/bundle.css')));
        let iconsExtensionPath = path.join(this.context.extensionPath, 'icons');
        let iconNames = fs.readdirSync(iconsExtensionPath);
        //@ts-ignore
        const iconPaths = [];
        iconNames.forEach(n => {
            iconPaths.push(n);
        });
        const icons = {};
        //@ts-ignore
        iconPaths.forEach(iconPath => {
            let filename = iconPath.split(".")[0];
            let diskPath = vscode.Uri.file(path.join(iconsExtensionPath, iconPath));
            icons[filename] = webview.asWebviewUri(diskPath);
        });
        const strung = JSON.stringify(icons);
        const docUri = webview.asWebviewUri(document.uri);
        // Use a nonce to whitelist which scripts can be run
        const nonce = util_1.getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
			<meta charset='utf-8'>
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'nonce-${nonce}'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"> -->
            <meta name='viewport' content='width=device-width,initial-scale=1'>
            <title>Depot Data Editor</title>
			<base href="${docUri}/">
            <!-- <link rel='icon' type='image/png' href='/favicon.png'> -->
            <!-- <link rel='stylesheet' href='/global.css'> -->
			<link rel='stylesheet' href="${styleUri}">
			
			<script defer nonce="${nonce}" src="${scriptUri}"></script>
		</head>
			
		<body>
		<script nonce="${nonce}">
			// console.log("${nonce}");
			// console.log(${strung});
			const nonce = "${nonce}";
			const icons = ${strung};
			const vscode = acquireVsCodeApi();
		</script>
        </body>
        </html>`;
    }
    // Could implment validation
    // private validateFile(document: vscode.TextDocument) {
    // 	const json = this.getDocumentAsJson(document);
    // 	// Validate, update doc with new json
    //     return this.updateTextDocument(document, json);
    // }
    /**
     * Try to get a current document as json text.
     */
    getDocumentAsJson(document) {
        const text = document.getText();
        if (text.trim().length === 0) {
            return {};
        }
        try {
            return JSON.parse(text);
        }
        catch (_a) {
            throw new Error('Could not get document as json. Content is not valid json');
        }
    }
    /**
     * Write out the json to a given document.
     */
    updateTextDocument(document, json) {
        const edit = new vscode.WorkspaceEdit();
        // Just replace the entire document every time for this example extension.
        // A more complete extension should compute minimal edits instead.
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(json, null, 4));
        return vscode.workspace.applyEdit(edit);
    }
}
exports.DepotEditorProvider = DepotEditorProvider;
DepotEditorProvider.viewType = 'depot.data';
//# sourceMappingURL=depotDataEditor.js.map