"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const depotDataEditor_1 = require("./depotDataEditor");
function activate(context) {
    // context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
    context.subscriptions.push(depotDataEditor_1.DepotEditorProvider.register(context));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map