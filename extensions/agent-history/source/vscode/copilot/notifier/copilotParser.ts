import * as path from 'path';
import * as vscode from 'vscode';
import * as fileProcess from '@/utils/fileProcess';
import { Role, EventType } from '@/types/historyEntry';
import { ChatEventData, ChatEventPayload } from '@/types/vscodePayload';

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function extractMessageText(value: unknown): string | undefined {
	const stringValue = getStringValue(value);
	if (stringValue) {
		return stringValue;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const text = extractMessageText(item);
			if (text) {
				return text;
			}
		}
		return;
	}

	if (!isRecord(value)) {
		return;
	}

	return (
		extractMessageText(value.text) ??
		extractMessageText(value.message) ??
		extractMessageText(value.content) ??
		extractMessageText(value.value) ??
		extractMessageText(value.parts)
	);
}

function normalizeChatEntry(entry: JsonObject): JsonObject | undefined {
	const type = getStringValue(entry.type);
	if (type !== 'user.message' && type !== 'assistant.message') {
		return;
	}

	const message = extractMessageText(entry);
	if (!message) {
		return;
	}

	return {
		source: 'github.copilot',
		type,
		message,
		timestamp: entry.timestamp ?? null,
		raw: entry,
	};
}

function getLatestEntry(uri: vscode.Uri): JsonObject | undefined {
	const data = fileProcess.GetLatestRecordFromJsonl(uri.fsPath);
	console.log(`JSONL latest data : ${data}`);
	if (!data) {
		return;
	}

	try {
		const entry = JSON.parse(data) as JsonObject;
		return normalizeChatEntry(entry);
	} catch {
		console.error(`Failed to parse JSON from latest line: ${data}`);
		return;
	}
}

export function resolveRole(entry: JsonObject): Role {
	const type = getStringValue(entry.type);
	switch (type) {
		case 'user.message':
			return new Role('user', 'name');
		case 'assistant.message':
			return new Role('agent', 'copilot');
		default:
			return new Role('system', 'system');
	}
}

export function createLatestPayload(filePath: string): ChatEventPayload | undefined {
	const pathUri = vscode.Uri.file(filePath);
	const entry = getLatestEntry(pathUri);
	if (!entry) {
		return;
	}
	const session_id = path.parse(pathUri.fsPath).name;

	const event: ChatEventData = {
		session_id,
		entry,
	};

	const payload: ChatEventPayload = {
		session_data: {
			session_id,
			latest_entry: entry,
		},
		event,
		role: resolveRole(entry),
		eventType: EventType.CHAT,
	};

	console.log(`Notifying copilot chat event: ${JSON.stringify(payload.role)}`);
	return payload;
}