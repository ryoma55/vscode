import * as path from 'path';
import * as vscode from 'vscode';

import { GlobalCounter } from '@/utils/globalCounter';
import { IEventNotifier } from '@/core/eventNotifier';
import { FileIdStore } from '@/utils/fileIdStore';
// import { CopilotSessionManager } from './manager/copilotSessionManager';
import { HistoryManager } from './vscodeHistoryManager';
import { ChatEventNotifier } from '@/source/vscode/cline/chatWatcher';
import { ChatEventNotifier as CopilotChatEventNotifier } from '@/source/vscode/copilot/notifier/chatWatcher';
import { ShellCommandEventNotifier } from '@/source/vscode/cli/commandEventNotifier';
import { EditEventNotifier } from '@/source/vscode/editor/editEventNotifier';
import { VSCodeHistoryRepository } from './vscodeHistoryRepository';


export class AgentHistoryController {
	private readonly historyManager: HistoryManager;

	private isRunning = false;

	constructor(
		context: vscode.ExtensionContext,
		//chatDebugFileLoggerService: IChatDebugFileLoggerService,
	) {
		const historyRepository = this.createHistoryRepository();
		const fileIdStore = new FileIdStore(context);
		const eventNotifiers: IEventNotifier[] = [];
		eventNotifiers.push(new EditEventNotifier(fileIdStore));
		eventNotifiers.push(new ShellCommandEventNotifier());
		const chatNotifier = new ChatEventNotifier();
		eventNotifiers.push(chatNotifier);
		const copilotChatNotifier = new CopilotChatEventNotifier();
		eventNotifiers.push(copilotChatNotifier);
		// const sessionManager = new CopilotSessionManager(historyRepository);
		//chatNotifier.addListener(sessionManager);
		const counter = GlobalCounter.getGlobalCounter();
		this.historyManager = new HistoryManager(historyRepository, eventNotifiers, counter);
		// this.historyManager = new HistoryManager(historyRepository, eventNotifiers, sessionManager, counter);
	}

	private createHistoryRepository(): VSCodeHistoryRepository {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '';
		const historyDirPath = path.join(workspaceRoot, '.edit-history') + path.sep;
		const currentInstaceId = vscode.env.sessionId;
		return new VSCodeHistoryRepository(historyDirPath, currentInstaceId);
	}

	public dispose(): void {
		this.stop(false);
	}

	public async start(): Promise<void> {
		if (this.isRunning) {
			return;
		}

		if (!vscode.workspace.workspaceFolders?.length) {
			vscode.window.showWarningMessage('Open a workspace before starting Agent History.');
			return;
		}

		this.isRunning = true;
		try {
			await this.historyManager.activate();
			vscode.window.showInformationMessage('Agent History Started');
		} catch {
			this.isRunning = false;
			vscode.window.showErrorMessage('Failed to start Agent History. See logs for details.');
		}
	}

	public stop(showMessage: boolean = true): void {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;
		this.historyManager.deactivate();
		if (showMessage) {
			vscode.window.showInformationMessage('Agent History Stopped');
		}
	}
}