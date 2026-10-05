import { EditType, EventType, HistoryEntry, Payload } from '@/types';
import { VscodeCommandData, 
		 CreateEditData, 
		 DeleteEditData, 
		 EditEventData, 
		 RenameEditData, 
		 SaveEditData, 
		 ChatEventData, 
		 OperateEventData
		} from '@/types';
import { HISTORY_DIR_PATH, HISTORY_FILE_NAME } from '@/extention/vscodeHistoryRepository';
import { DiffBuilder } from '@/core/diffBuilder';


const diffBuilder = new DiffBuilder(HISTORY_DIR_PATH, HISTORY_FILE_NAME);

export async function buildEventHistory(step: number, data: Payload): Promise<HistoryEntry | null> {
	let content: string | null = null; // 共通のインターフェースで受ける
	try {
		switch (data.eventType) {
			case EventType.EDIT:
				content = await buildVSCodeEditContent(data.event as EditEventData);
				break;
			
			case EventType.CHAT:
				content = await buildVSCodeChatContent(data.event as ChatEventData);
				break;

			case EventType.COMMAND:
				content = await buildVSCodeCommandContent(data.event as VscodeCommandData);
				break;
			case EventType.OPERATE:
				content = await buildVSCodeOperateContent(data.event as OperateEventData);
				break;
			default:
				console.warn(`Unhandled event type: ${data.eventType}`);
				return null;
		}
		return new HistoryEntry(step, data.role, data.eventType, content);
	} catch (error) {
		console.error(`Failed to create history entry for ${data.eventType}:`, error);
		return null;
	}
}


async function buildVSCodeEditContent(data: EditEventData): Promise<string> {
	let content: string;
	switch (data.edit_type) {
		case EditType.SAVE:
			content = await buildSaveContent(data);
			break;
		case EditType.RENAME:
			content = await buildRenameContent(data);
			break;
		case EditType.DELETE:
			content = await buildDeleteContent(data);
			break;
		case EditType.CREATE:
			  content = await buildCreateContent(data);
			break;
		default:
			console.warn(`Unhandled edit type: ${data['edit_type']}`);
			content = JSON.stringify(data);
	}

	return content;
}


async function buildSaveContent(data: SaveEditData): Promise<string> {
	const type = EditType.SAVE;
	const diff = await diffBuilder.buildTextDiff(type, data.file_id, data.text, data.language_id);
	const content = {
		edit_type: type,
		file_id: data.file_id,
		file_path: data.file_path,
		diff: diff
	};
	return JSON.stringify(content);
}

async function buildRenameContent(data: RenameEditData): Promise<string> {
	const diff = await diffBuilder.buildRenameDiff(data.old_file_path, data.new_file_path);
	const content = {
		edit_type: EditType.RENAME,
		file_id: data.file_id,
		file_path: data.new_file_path,
		diff: diff
	};
	return JSON.stringify(content);
}

async function buildDeleteContent(data: DeleteEditData): Promise<string> {
	const type = EditType.DELETE;
	const diff = diffBuilder.buildTextDiff(type, data.file_id, '', data.language_id);
	const content = {
		edit_type: type,
		file_id: data.file_id,
		file_path: data.file_path,
		diff: diff
	};
	return JSON.stringify(content);
}

async function buildCreateContent(data: CreateEditData): Promise<string> {
	const diff = diffBuilder.buildTextDiff(EditType.CREATE, data.file_id, data.text, data.language_id);
	const content = {
		edit_type: EditType.CREATE,
		file_id: data.file_id,
		file_path: data.file_path,
		diff: diff
	};
	return JSON.stringify(content);
}

async function buildVSCodeChatContent(data: ChatEventData): Promise<string> {
	const content = {
		session_id: data.session_id,
		entry: data.entry,
	};
	return JSON.stringify(content);
}

async function buildVSCodeOperateContent(data: OperateEventData): Promise<string> {
	const content = {
		action: data.action,
		file_id: data.file_id,
		file_path: data.file_path,
		additional_info: data.additional_info
	};
	return JSON.stringify(content);
}

async function buildVSCodeCommandContent(data: VscodeCommandData): Promise<string> {
	const content = {
		shell_id: data.terminal_id,
		command_line: data.command_line,
		output: data.output,
		exit_code: data.exit_code
	};
	return JSON.stringify(content);
}