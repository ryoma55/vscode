export enum EventType {
	CHAT = 'chat',
	EDIT = 'edit',
	COMMAND = 'command',
	OPERATE = 'operate',
}
export enum EditType {
	SAVE = 'save',
	CREATE = 'create',
	DELETE = 'delete',
	RENAME = 'rename',
}
export type EditEventObject =
	| { edit_type: string; file_id: string; file_path: string; diff: string }

export class Role {
	readonly role: 'user' | 'agent' | 'system';
	readonly name?: string;
	constructor(
		role: 'user' | 'agent' | 'system',
		name?: string,
	) {
		this.role = role;
		if (name) { this.name = name; }
	}
}


export type Payload<TEvent = Record<string, unknown>> = {
	session_data?: Record<string, unknown>;
	event: TEvent;
	role: Role;
	eventType: EventType;
}

export class HistoryEntry {
	readonly global_step: number;
	readonly role: Role;
	readonly event_type: EventType;
	readonly timestamp: number;
	readonly content: string;
	constructor(
		global_step: number,
		role: Role,
		event_type: EventType,
		event_data: string
	) {
		this.global_step = global_step;
		this.role = role;
		this.event_type = event_type;
		this.timestamp = Date.now();
		this.content = event_data;
	}

	getRecord(): Record<string, unknown> {
		return {
			global_step: this.global_step,
			role: this.role,
			event_type: this.event_type,
			timestamp: this.timestamp,
			content: this.content
		};
	}
}
