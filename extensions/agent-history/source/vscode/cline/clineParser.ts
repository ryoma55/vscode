import * as vscode from 'vscode';
import * as fileProcess from '@/utils/fileProcess';
import { Role, EventType} from '@/types';
import { ChatEventData, ChatEventPayload } from '@/types';

function getChatContent(path: vscode.Uri): string {
    const jsonData = JSON.parse(fileProcess.readTextFileSync(path.fsPath));
    const content = jsonData[jsonData.length - 1];
    
    //console.log(`Read chat content from ${path}: \n${JSON.stringify(content)}`);
    return content;
}

export function resolveRole(entry:any): Role {
		switch (entry?.role) {
			case 'user':
				if (distinguishUserSystem(entry) === 'user') {
					return new Role('user', 'name');
				} else {
					return new Role('system', 'system');
				}
			case 'assistant':
				const model = entry.modelInfo.modelId || 'unknown';
				return new Role('agent', model);
			default:
				return new Role('system', 'system');
		}
	}

function distinguishUserSystem(entry:any): 'user' | 'system' {
	// entry.content.text内に<task>タグまたは<feedback>タグがあればuser、なければsystemと判断する
	const contentText = entry?.content[0].text || "";
	console.log(`contentText : ${contentText}`);
    const userTags = ['<task>', '<feedback>', '<user_message>'];
    for (const tag of userTags) {
        if (contentText.includes(tag)) {
            return 'user';
        }
    }
	return 'system';
}

export function createLatestPayload(path:string): ChatEventPayload {
    const pathUri = vscode.Uri.file(path);
    const content = getChatContent(pathUri);
    const entry = JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
    const session_id = pathUri.fsPath.split('/').at(-2) || '';

    const event : ChatEventData = {
        session_id: session_id,
        entry: entry,
    };

    const payload: ChatEventPayload = {
        session_data: {
            session_id: session_id,
            latest_entry: entry,
        },
        event: event,
        role: resolveRole(entry),
        eventType: EventType.CHAT
    };

    console.log(`Notifying chat event: ${JSON.stringify(payload.role)}`);
    return payload;
}